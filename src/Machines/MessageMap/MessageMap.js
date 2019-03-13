import React, { useEffect, useContext, useState, useRef } from 'react';
import * as d3 from 'd3'
import * as R from 'ramda'
import MachineContext from '../../shared/context/MachineContext'
// import { usePrevious } from '../../shared/utils'
import { MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
// import { exist } from '../../shared/utils'
import './MessageMap.css';
import { useObservable } from 'rxjs-hooks';
import { withLatestFrom, map, tap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest } from 'rxjs';


function MessageMap () {
  const {
    machinePosMeta: positionMap,
    liveness$,
    // leader,
    machinePosMeta$,
    // existentLeader$,
    // prevExistentLeader$,
    liveness,
    leaderHeartbeatWithCommand$: leaderHeartbeat$,
    receivedUiHeartbeat$,
    receivedUiAck$,
    candidate$,
  } = useContext(MachineContext)

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

  const newCandidate = useObservable(() => candidate$, null)
  useEffect(() => {
    if (newCandidate) sendVoteRequest(newCandidate.id)
  }, [newCandidate])

  function sendHeartbeatMsg ([heartbeat, liveness, positionMap, hasSendingMsg]) {
    const { cmd, id } = heartbeat
    if (!liveness[id] || hasSendingMsg) return
    const { x: leaderX, y: leaderY } = positionMap[id]

    // Like a critical section... unlock after ack reached leader
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
      .style('fill', 'var(--msg-ack')
      .on('end', _ => {
        const payload = { circles, heartbeat, liveness, positionMap }
        if (cmd) payload.cmd = cmd
        receivedUiHeartbeat$.next(payload)
      })
  }

  function replyAck ({ circles, heartbeat, liveness, positionMap }) {
    const { x: leaderX, y: leaderY } = positionMap[R.prop('id', heartbeat)]
    circles
      .filter(d => liveness[d.id])
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', leaderX)
      .attr('cy', leaderY)
      .on('end', _ => {
        sendingMsg$.current.next(false) // Unlock
        receivedUiAck$.next(true) // So we can show the replicate command
      })
  }

  function sendVoteRequest (id) {
    const msgSvg = d3.select('svg.msg-svg')
    msgSvg.selectAll('circle').remove()
    const circles = msgSvg.selectAll('.circleGroups')
      .data(R.values(R.omit([id], positionMap)))
      .enter()
      .append('circle')

    const { x: candidateX, y: candidateY } = positionMap[id]
    circles
      .attr('r', 10)
      .attr('cx', candidateX)
      .attr('cy', candidateY)
      .style('fill', 'var(--msg-vote-request)')
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      // .on('end', _ => receivedUiHeartbeat$.next({ voteRequest: true }))
      .filter(d => liveness[d.id])
      .transition()
      .duration(0)
      .style('fill', 'var(--msg-ack')
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', candidateX)
      .attr('cy', candidateY)
  }

  return (
    <div className="message-map">
      <svg className="msg-svg"></svg>
    </div>
  );
}

export default MessageMap;
