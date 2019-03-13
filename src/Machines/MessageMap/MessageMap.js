import React, { useEffect, useContext, useRef } from 'react'
import { BehaviorSubject, combineLatest } from 'rxjs'
import { withLatestFrom, map } from 'rxjs/operators'
import { useObservable } from 'rxjs-hooks'
import * as d3 from 'd3'
import * as R from 'ramda'
import MachineContext from '../../shared/context/MachineContext'
import { MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
import './MessageMap.css'


function MessageMap () {
  const {
    liveness$,
    machinePosMeta$,
    leaderHeartbeatWithCommand$: leaderHeartbeat$,
    receivedUiHeartbeat$,
    receivedUiAck$,
    candidate$,
  } = useContext(MachineContext)

  // Animation of sending heartbeat and replying with ack
  const sendingMsg$ = useRef(new BehaviorSubject(false))
  useEffect(() => {
    const hbSub = leaderHeartbeat$.pipe(
      withLatestFrom(combineLatest(liveness$, machinePosMeta$)),
      withLatestFrom(sendingMsg$.current),
      map(R.flatten),
    ).subscribe(sendHeartbeatMsg)
    const ackSub = receivedUiHeartbeat$.pipe(
      withLatestFrom(liveness$),
      map(([heartbeatRes, liveness]) => {
        heartbeatRes.liveness = liveness
        return heartbeatRes
      })
    ).subscribe(replyAck)
    return R.tryCatch(() => {
      hbSub && hbSub.unsubscribe()
      ackSub && ackSub.unsubscribe()
    })
  }, [])

  // Animation of starting an election
  const newCandidateArgs = useObservable(() => candidate$.pipe(
    withLatestFrom(combineLatest(liveness$, machinePosMeta$)),
    map(R.flatten)
  ), [])
  useEffect(() => {
    if (newCandidateArgs && newCandidateArgs[0]) sendVoteRequest(newCandidateArgs)
  }, [newCandidateArgs])

  function sendHeartbeatMsg ([heartbeat, liveness, positionMap, hasSendingMsg]) {
    const { cmd, id } = heartbeat
    if (!liveness[id] || hasSendingMsg) return
    const { x: leaderX, y: leaderY } = positionMap[id]

    // Like a critical section... 😂 unlock after ack reached leader
    sendingMsg$.current.next(true)

    const msgSvg = d3.select('svg.msg-svg')
    msgSvg.selectAll('circle').remove()

    const circles = msgSvg.selectAll('.circleGroups')
      .data(R.values(R.omit([id], positionMap)))
      .enter()
      .append('circle')

    circles
      .attr('r', 10)
      .attr('cx', leaderX)
      .attr('cy', leaderY)
      .style('fill', cmd ? 'var(--msg-cmd-heartbeat)' : 'var(--msg-heartbeat)')
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .transition()
      .duration(0)
      .style('fill', 'var(--msg-ack)')
      .on('end', _ => {
        const payload = { circles, target: heartbeat, liveness, positionMap }
        if (cmd) payload.cmd = cmd
        receivedUiHeartbeat$.next(payload)
      })
  }

  function replyAck ({ circles, target, liveness, positionMap, voteRequest }) {
    const { x: leaderX, y: leaderY } = positionMap[R.prop('id', target)]
    circles
      .filter(d => liveness[d.id])
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', leaderX)
      .attr('cy', leaderY)
      .on('end', _ => {
        if (voteRequest === undefined) {
          sendingMsg$.current.next(false) // Unlock
          receivedUiAck$.next(true) // So we can show the replicate command
        }
      })
  }

  function sendVoteRequest ([candidate, liveness, positionMap]) {
    const { id } = candidate
    const { x: candidateX, y: candidateY } = positionMap[id]

    const msgSvg = d3.select('svg.msg-svg')

    // Note: no need to remove circles here.
    // voteRequst can coexist with legacy heartbeat

    const circles = msgSvg.selectAll('.circleGroups')
      .data(R.values(R.omit([id], positionMap)))
      .enter()
      .append('circle')

    circles
      .attr('r', 10)
      .attr('cx', candidateX)
      .attr('cy', candidateY)
      .style('fill', 'var(--msg-vote-request)')
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .on('end', _ => receivedUiHeartbeat$.next({
        target: candidate,
        circles,
        liveness,
        positionMap,
        voteRequest: true
      }))
  }

  return (
    <div className="message-map">
      <svg className="msg-svg"></svg>
    </div>
  )
}

export default MessageMap
