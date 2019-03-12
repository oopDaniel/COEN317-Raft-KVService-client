import React, { useEffect, useRef, useContext, useState } from 'react';
import { useObservable } from 'rxjs-hooks';
import { share, filter, map, withLatestFrom, startWith, debounceTime } from 'rxjs/operators';
import * as d3 from 'd3'
import * as R from 'ramda'
import { FaDatabase, FaCrown } from 'react-icons/fa';
import { getInfo } from '../shared/api'
import { exist } from '../shared/utils'
import MachineContext from '../shared/context/MachineContext'
import AppliedCommand from './AppliedCommand/AppliedCommand'
import './Machine.css'

const DONUT_UPDATE_INTERVAL = 600
const PI_2 = 2 * Math.PI
const arc = d3.arc()
    .innerRadius(48)
    .outerRadius(56)
    .startAngle(0);

function Machine (props) {
  const { id, ip } = props

  // Machine state related
  const {
    selected,
    select,
    unselect,
    machineInfo$,
    leader,
    liveness,
    sockets,
    receivedUiHeartbeat$,
    command$,
  } = useContext(MachineContext)

  const isSelected = selected === id
  const isAlive = liveness[id]
  const selectMachine = () => {
    if (id === selected) unselect()
    else select(id)
  }

  const [cmd, setCmd] = useState(null)
  useEffect(() => {
    const { unsubscribe } = command$
      .pipe(
        filter(_ => leader && leader.id === id),
        startWith(null),
      )
      .subscribe(setCmd)
    return R.tryCatch(unsubscribe)
  }, [command$, leader])

  const newTimer = useObservable(() => receivedUiHeartbeat$.pipe(
    startWith(null),
    withLatestFrom(raft$.pipe(
      filter(R.has('timer')),
      map(R.compose(R.multiply(1000), R.prop('timer'))),
      debounceTime(100),
      startWith(Number.MAX_SAFE_INTEGER)
    )),
    map(R.compose(
      R.nth(1),
      R.when(
        R.compose(exist, R.head), // receive a heartbeat with cmd
        R.tap(R.compose(setCmd, R.nth(0)))
      )
    )
  )))

  const raft$ = sockets.find(s => s.id === id).io$.pipe(
    filter(exist),
    share()
  )

  // Update log for the selected machine
  useLogUpdater(isSelected, props)

  // Need Ref of db icon to locate the position of messages
  const dbIconRef = useRef(null)

  const [timeoutDonut, setTimeoutDonut] = useState(null)
  const [d3Interval, setD3Interval] = useState(null)
  useEffect(() => { renderDonut() }, [])

  // Reset timer (update donut) when received heartbeat
  useEffect(() => { updateDonut() }, [isAlive, newTimer])

  // Store the position to context, so msg can use it
  useEffect(() => {
    const pos = getIconPosition(dbIconRef.current)
    machineInfo$.next({ id, ip, ...pos })
  }, [])

  function renderDonut () {
    // Donut timer
    const svg = d3.select(`.machine-${id} svg.timer`)
    const width = Number(svg.attr('width'))
    const height = Number(svg.attr('height'))
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Background color of donut timer
    g.append('path')
      .datum({ endAngle: PI_2 })
      .style('fill', '#ddd')
      .attr('d', arc);

    const donut = g.append('path')
      .datum({ endAngle: 0 })
      .style('fill', 'var(--timeout-track)')
      .attr('d', arc)

    setTimeoutDonut(donut)
    updateDonut(donut)
  }

  function updateDonut (donut) {
    // Only the initialized call will pass donut instance to this function
    donut = timeoutDonut || donut
    if (!donut) return

    // cleanup old interval
    if (d3Interval) {
      d3Interval.stop()
      setD3Interval(null)
    }

    const isAlive = liveness[id]
    if (!isAlive || (leader && leader.id === id)) {
      donut.transition()
        .duration(0)
        .attrTween('d', arcTween(0))
      return
    }

    const PORTION_PER_SEC = DONUT_UPDATE_INTERVAL / newTimer

    // Start from a full donut
    let radio = 1
    donut.transition()
      .duration(300)
      .attrTween('d', arcTween(radio * PI_2))

    setD3Interval(
      d3.interval(() => {
        radio = Math.max(0, radio - PORTION_PER_SEC)
        donut.transition()
          .duration(DONUT_UPDATE_INTERVAL)
          .attrTween('d', arcTween(radio * PI_2))
        }, DONUT_UPDATE_INTERVAL)
    )
  }

  return (
    <div
      className="machine-container"
      onClick={selectMachine}
    >
      <div className={`machine machine-${id} ${isSelected ? 'selected' : ''} ${isAlive ? '' : 'dead'}`}>
        <div className="timer-container">
          <svg className="timer" width="160" height="120"></svg>
        </div>
        {
          leader && leader.id === id && (
            <div className="crown-container">
              <FaCrown/>
            </div>
          )
        }
        <div className="db-container" ref={dbIconRef}>
          <FaDatabase/>
        </div>
        <span className="machine-id">{id}</span>
        <div className='cmd'>
          {
            cmd && (
              <AppliedCommand
                isAlive={isAlive}
                cmd={cmd}
              />
            )
          }
        </div>
      </div>
    </div>
  );
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
  return (d) => {

    // To interpolate between the two angles, we use the default d3.interpolate.
    // (Internally, this maps to d3.interpolateNumber, since both of the
    // arguments to d3.interpolate are numbers.) The returned function takes a
    // single argument t and returns a number between the starting angle and the
    // ending angle. When t = 0, it returns d.endAngle; when t = 1, it returns
    // newAngle; and for 0 < t < 1 it returns an angle in-between.
    var interpolate = d3.interpolate(d.endAngle, newAngle);

    // The return value of the attrTween is also a function: the function that
    // we want to run for each tick of the transition. Because we used
    // attrTween("d"), the return value of this last function will be set to the
    // "d" attribute at every tick. (It’s also possible to use transition.tween
    // to run arbitrary code for every tick, say if you want to set multiple
    // attributes from a single function.) The argument t ranges from 0, at the
    // start of the transition, to 1, at the end.
    return (t) => {

      // Calculate the current arc angle based on the transition time, t. Since
      // the t for the transition and the t for the interpolate both range from
      // 0 to 1, we can pass t directly to the interpolator.
      //
      // Note that the interpolated angle is written into the element’s bound
      // data object! This is important: it means that if the transition were
      // interrupted, the data bound to the element would still be consistent
      // with its appearance. Whenever we start a new arc transition, the
      // correct starting angle can be inferred from the data.
      d.endAngle = interpolate(t);

      // Lastly, compute the arc path given the updated data! In effect, this
      // transition uses data-space interpolation: the data is interpolated
      // (that is, the end angle) rather than the path string itself.
      // Interpolating the angles in polar coordinates, rather than the raw path
      // string, produces valid intermediate arcs during the transition.
      return arc(d);
    };
  };
}

function getIconPosition (el) {
  let { width, height, x, y } = el.getBoundingClientRect()
  x = ~~(x + width / 2)
  y = ~~(y + height / 2)
  return { x, y }
}

function useLogUpdater (isSelected, props) {
  const { updateLog } = useContext(MachineContext)
  const { id, ip } = props
  useEffect(() => {
    if (isSelected) {
      getInfo(ip)
        .then(({ data }) => updateLog(id, data))
    }
  }, [isSelected])
}

export default Machine
