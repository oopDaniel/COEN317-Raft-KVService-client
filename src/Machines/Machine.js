import React, {
  useEffect,
  useRef,
  useContext,
  useState,
  useCallback,
} from 'react'
import { useObservable } from 'rxjs-hooks'
import { merge, fromEvent } from 'rxjs'
import {
  share,
  tap,
  filter,
  map,
  buffer,
  withLatestFrom,
  startWith,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  throttleTime,
  debounceTime,
} from 'rxjs/operators'
import * as d3 from 'd3'
import * as R from 'ramda'
import { FaDatabase, FaCrown } from 'react-icons/fa'
import { getInfo } from '../shared/api'
import { exist, log } from '../shared/utils'
import {
  ELECTION_DURATION_DIFF,
  ELECTION_DURATION_MIN,
} from '../shared/constants'
import MachineContext from '../shared/context/MachineContext'
import AppliedCommand from './AppliedCommand/AppliedCommand'
import './Machine.css'

const getRandomTimeout = () =>
  ~~(Math.random() * ELECTION_DURATION_DIFF + ELECTION_DURATION_MIN)
const DONUT_UPDATE_INTERVAL = 600
const PI_2 = 2 * Math.PI
const arc = d3
  .arc()
  .innerRadius(48)
  .outerRadius(56)
  .startAngle(0)

function Machine(props) {
  const { id, ip } = props

  // Machine state related
  const {
    selected,
    select,
    unselect,
    machinePosMeta$,
    leader,
    liveness,
    liveness$,
    sockets,
    receivedUiHeartbeat$,
    command$,
    candidate$,
    convertToLeaderMsgFromSingleSocket$,
  } = useContext(MachineContext)

  const isSelected = selected === id
  const isAlive = liveness[id]
  const selectMachine = useCallback(() => {
    if (id === selected) unselect()
    else select(id)
  }, [selected])

  // Show cmd on a machine if there's any valid one
  const [cmd, setCmd] = useState(null)
  useEffect(() => {
    const { unsubscribe } = command$
      .pipe(
        filter(_ => leader && leader.id === id),
        startWith(null)
      )
      .subscribe(setCmd)
    return R.tryCatch(unsubscribe)
  }, [command$, leader])

  // Raft event from socket specifying to this machine
  const raft$ = useRef(
    sockets
      .find(s => s.id === id)
      .io$.pipe(
        filter(exist),
        share()
      )
  )
  const stateChange$ = useRef(
    raft$.current.pipe(
      filter(R.propEq('type', 'stateChanged')),
      distinctUntilKeyChanged('from'),
      share()
    )
  )

  // Candidate requestVote timer
  const newCandidateTimer = useObservable(
    () =>
      candidate$.pipe(
        filter(R.propEq('id', id)),
        map(R.prop('timer'))
      ),
    null
  )

  const toLeader$ = useRef(
    stateChange$.current.pipe(
      filter(R.propEq('to', 'L')),
      distinctUntilKeyChanged('id')
    )
  )
  useEffect(() => {
    const { unsubscribe } = toLeader$.current.subscribe(
      convertToLeaderMsgFromSingleSocket$
    )
    return R.tryCatch(unsubscribe)
  }, [convertToLeaderMsgFromSingleSocket$])

  const newLeaderElected = useObservable(() => toLeader$.current, null)

  // Broadcast if machine becomes candidate
  useFollowerToCandidateBroadcaster(stateChange$.current, candidate$)

  // Update timer ONLY when both received heartbeat from socket and the msg
  // circle reached the follower on the UI, unless it's a voteRequest.
  const newTimer = useObservable(() =>
    merge(
      receivedUiHeartbeat$.pipe(
        tap(
          R.when(
            R.both(exist, R.has('cmd')), // receive a heartbeat with cmd
            R.compose(
              setCmd,
              R.prop('cmd')
            )
          )
        ),
        filter(R.both(exist, R.has('voteRequest'))),
        withLatestFrom(liveness$),
        filter(([_, liveness]) => liveness[id]),
        map(getRandomTimeout)
      ),
      raft$.current.pipe(
        filter(R.both(R.has('timer'), R.propEq('type', 'heartbeatReceived'))),
        // tap(q => log.info(`%c<follower ${q.id}>`, 'color:yellow', q.timer)),
        map(R.prop('timer')),
        distinctUntilChanged(),
        buffer(receivedUiHeartbeat$),
        map(R.last)
      )
    ).pipe(
      throttleTime(1000),
      startWith(getRandomTimeout())
    )
  )

  // Update logs of the selected machine
  useLogUpdater(isSelected, props)

  // Donut related
  const [timeoutDonut, setTimeoutDonut] = useState(null)
  const [d3Interval, setD3Interval] = useState(null)
  useEffect(() => {
    renderDonut()
  }, [])

  // Reset timer (update donut) when received heartbeat
  useEffect(() => {
    updateDonut()
  }, [newTimer])

  // Hide timer for leader or dead machine
  useEffect(() => {
    resetDonutAsNeeded()
  }, [liveness, leader])

  // Reset timer (update donut) when start election
  useEffect(() => {
    if (newCandidateTimer) {
      resetDonutAsNeeded()
      updateDonut(undefined, newCandidateTimer)
    }
  }, [newCandidateTimer])

  useEffect(() => {
    newLeaderElected && resetDonutAsNeeded(true)
  }, [newLeaderElected])

  // Need Ref of db icon to locate the position of messages
  const dbIconRef = useRef(null)
  // Store the position to context, so msg can use it
  const updatePos = useCallback(() => {
    const pos = getIconPosition(dbIconRef.current)
    machinePosMeta$.next({ id, ip, ...pos })
  }, [machinePosMeta$])
  useEffect(() => {
    updatePos()
  }, [])
  useObservable(() =>
    fromEvent(window, 'resize').pipe(
      debounceTime(200),
      tap(updatePos)
    )
  )

  function renderDonut() {
    // Donut timer
    const svg = d3.select(`.machine-${id} svg.timer`)
    const width = Number(svg.attr('width'))
    const height = Number(svg.attr('height'))
    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Background color of donut timer
    g.append('path')
      .datum({ endAngle: PI_2 })
      .style('fill', '#ddd')
      .attr('d', arc)

    const donut = g
      .append('path')
      .datum({ endAngle: 0 })
      .style('fill', 'var(--timeout-track)')
      .attr('d', arc)

    setTimeoutDonut(donut)
    updateDonut(donut)
  }

  function updateDonut(donut, electionTimer = null) {
    // Only the initialized call will pass donut instance to this function
    donut = timeoutDonut || donut

    // If reset, the donut timer is invalid (leader or dead)
    if (
      R.or(
        R.isNil(donut),
        R.all(R.isNil)([electionTimer, newTimer]),
        resetDonutAsNeeded()
      )
    )
      return

    log.log(
      `[${id}] updating donut with timer ${electionTimer ||
        newTimer} ${(electionTimer && '(election)') || ''}`
    )

    // cleanup old interval
    if (d3Interval) {
      d3Interval.stop()
      setD3Interval(null)
    }

    const PORTION_PER_SEC =
      DONUT_UPDATE_INTERVAL / ((electionTimer || newTimer) - 500)

    // Start from a full donut
    let radio = 1
    donut
      .transition()
      .style(
        'fill',
        electionTimer ? 'var(--election-timeout-track)' : 'var(--timeout-track)'
      )
      .duration(300)
      .attrTween('d', arcTween(radio * PI_2))

    const itv = d3.interval(() => {
      radio = Math.max(0, radio - PORTION_PER_SEC)
      donut
        .transition()
        .duration(DONUT_UPDATE_INTERVAL)
        .attrTween('d', arcTween(radio * PI_2))
      if (radio === 0) {
        setD3Interval(null)
        itv.stop()
      }
    }, DONUT_UPDATE_INTERVAL)
    setD3Interval(itv)
  }

  function resetDonutAsNeeded(hasBecameLeader = false) {
    const isAlive = liveness[id]
    const isLeader = leader && leader.id === id
    if (!isAlive || isLeader) {
      if (d3Interval) {
        d3Interval.stop()
        setD3Interval(null)
      }
      if (timeoutDonut) {
        if (hasBecameLeader) {
          timeoutDonut
            .transition()
            .style('fill', 'var(--timeout-track)')
            .duration(100)
            .attrTween('d', arcTween(PI_2))
        } else {
          timeoutDonut
            .transition()
            .duration(100)
            .attrTween('d', arcTween(0))
        }
      }
      return true
    }
    return false
  }

  return (
    <div className="machine-container" onClick={selectMachine}>
      <div
        className={`machine machine-${id} ${isSelected ? 'selected' : ''} ${
          isAlive ? '' : 'dead'
        }`}
      >
        <div className="timer-container">
          <svg className="timer" width="160" height="120" />
        </div>
        {leader && leader.id === id && (
          <div className="crown-container">
            <FaCrown />
          </div>
        )}
        <div className="db-container" ref={dbIconRef}>
          <FaDatabase />
        </div>
        <span className="machine-id">{id}</span>
        <div className="cmd">
          {cmd && <AppliedCommand isAlive={isAlive} cmd={cmd} />}
        </div>
      </div>
    </div>
  )
}

// Returns a tween for a transition’s "d" attribute, transitioning any selected
// arcs from their current angle to the specified new angle.
function arcTween(newAngle) {
  // The function passed to attrTween is invoked for each selected element when
  // the transition starts, and for each element returns the interpolator to use
  // over the course of transition. This function is thus responsible for
  // determining the starting angle of the transition (which is pulled from the
  // element’s bound datum, d.endAngle), and the ending angle (simply the
  // newAngle argument to the enclosing function).
  return d => {
    // To interpolate between the two angles, we use the default d3.interpolate.
    // (Internally, this maps to d3.interpolateNumber, since both of the
    // arguments to d3.interpolate are numbers.) The returned function takes a
    // single argument t and returns a number between the starting angle and the
    // ending angle. When t = 0, it returns d.endAngle when t = 1, it returns
    // newAngle and for 0 < t < 1 it returns an angle in-between.
    var interpolate = d3.interpolate(d.endAngle, newAngle)

    // The return value of the attrTween is also a function: the function that
    // we want to run for each tick of the transition. Because we used
    // attrTween("d"), the return value of this last function will be set to the
    // "d" attribute at every tick. (It’s also possible to use transition.tween
    // to run arbitrary code for every tick, say if you want to set multiple
    // attributes from a single function.) The argument t ranges from 0, at the
    // start of the transition, to 1, at the end.
    return t => {
      // Calculate the current arc angle based on the transition time, t. Since
      // the t for the transition and the t for the interpolate both range from
      // 0 to 1, we can pass t directly to the interpolator.
      //
      // Note that the interpolated angle is written into the element’s bound
      // data object! This is important: it means that if the transition were
      // interrupted, the data bound to the element would still be consistent
      // with its appearance. Whenever we start a new arc transition, the
      // correct starting angle can be inferred from the data.
      d.endAngle = interpolate(t)

      // Lastly, compute the arc path given the updated data! In effect, this
      // transition uses data-space interpolation: the data is interpolated
      // (that is, the end angle) rather than the path string itself.
      // Interpolating the angles in polar coordinates, rather than the raw path
      // string, produces valid intermediate arcs during the transition.
      return arc(d)
    }
  }
}

function getIconPosition(el) {
  let { width, height, x, y } = el.getBoundingClientRect()
  x = ~~(x + width / 2)
  y = ~~(y + height / 2)
  return { x, y }
}

function useLogUpdater(isSelected, props) {
  const { updateLog } = useContext(MachineContext)
  const { id, ip } = props
  useEffect(() => {
    if (isSelected) {
      getInfo(ip).then(({ data }) => updateLog(id, data))
    }
  }, [isSelected])
}

function useFollowerToCandidateBroadcaster(stateChange$, candidate$) {
  useEffect(() => {
    const toCandidate$ = stateChange$.pipe(
      filter(R.propEq('to', 'C')),
      distinctUntilKeyChanged('id')
    )
    const { unsubscribe } = toCandidate$.subscribe(candidate$)
    return unsubscribe
  }, [stateChange$])
}

export default Machine
