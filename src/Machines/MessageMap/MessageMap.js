import React, { useEffect, useContext, useState } from 'react';
import * as d3 from 'd3'
import * as R from 'ramda'
import MachineContext from '../../shared/context/MachineContext'
// import { usePrevious } from '../../shared/utils'
import { MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
import { exist } from '../../shared/utils'
import './MessageMap.css';
import { useObservable } from 'rxjs-hooks';

const isDifferentLeader = (prevLeader, leader) => exist(prevLeader) && R.not(R.eqProps('id', leader, prevLeader))

function MessageMap () {
  const {
    machinePosMeta: positionMap,
    leader,
    liveness,
    leaderHeartbeatWithCommand$: leaderHeartbeat$,
    receivedUiHeartbeat$,
    receivedUiAck$,
    candidate$,
  } = useContext(MachineContext)

  // Heartbeat
  const [prevLeader, setPrevLeader] = useState(leader)
  const [circleGroups, setCircleGroups] = useState(null)
  useEffect(() => {
    // console.log('%cLeader msg', 'color:purple;font-size:1.5em', {positionMap}, {liveness}, {leader: leader && leader.id || null}, {prevLeader: prevLeader && prevLeader.id || null}, circleGroups)
    if (positionMap === null || liveness === null || !leader) return

    // console.warn('--',leader, prevLeader, isDifferentLeader(prevLeader, leader))
    const hasLeaderChanged = isDifferentLeader(prevLeader, leader)
    let sub
    if (!circleGroups || hasLeaderChanged) {
      createMsgCircles(leader)
      if (circleGroups) setPrevLeader(leader)
    } else {
      sub = leaderHeartbeat$.subscribe(sendHeartbeatMsg)
    }
    return R.tryCatch(() => {
      console.log('%cunsubscribe...sender', 'color:#000;background:#fff')
      sub && sub.unsubscribe()
    })
  }, [positionMap, liveness, leader, circleGroups])


  const newCandidate = useObservable(() => candidate$, null)
  useEffect(() => {
    if (newCandidate) sendVoteRequest(newCandidate.id)
  }, [newCandidate])

  // Acknowledgement
  const { followerTimer$ } = useContext(MachineContext)
  useEffect(() => {
    // console.log('%ccalling ack', 'color:red;font-size:1.5em', {prevLeader: prevLeader && prevLeader.id || null}, {leader: leader && leader.id || null}, {liveness}, circleGroups)
    if (!circleGroups || !prevLeader) return
    const sub = followerTimer$.subscribe(replyAck)
    return R.tryCatch(() => {
      console.log('%cunsubscribe...ack', 'color:#000;background:#fff')
      sub && sub.unsubscribe()
    }, () => {})
  }, [followerTimer$, circleGroups, prevLeader])

  function createMsgCircles (leader) {
    // console.log('<created circles> for leader', leader && leader.id)
    const msgSvg = d3.select('svg.msg-svg')
    msgSvg.selectAll('circle').remove()
    const circles = msgSvg.selectAll('.circleGroups')
      .data(R.values(R.omit([leader.id], positionMap)))
      .enter()
      .append('circle')
    setCircleGroups(circles)
  }

  function sendHeartbeatMsg (heartbeat) {
    const { cmd } = heartbeat
    // console.log(' - sending heartbeat msg circles - from leader', leader && leader.id)
    const { x: leaderX, y: leaderY } = positionMap[leader.id]
      circleGroups
        .filter(d => d.id !== leader)
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
          if (leader) setPrevLeader(leader)
          receivedUiHeartbeat$.next(cmd)
        })
  }

  function replyAck (timerMap) {
    console.warn(timerMap)
    // console.log(' (((- leader id', leader.id, 'prevLeader id:', prevLeader.id)
    const currLeader = leader || prevLeader
    if (!currLeader) {
      console.error('NO LEADER to reply')
      return
    }
    const { x: leaderX, y: leaderY } = positionMap[R.prop('id', currLeader)]
    circleGroups
      .filter(d => timerMap[d.id] !== undefined && timerMap[d.id] !== -1)
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', leaderX)
      .attr('cy', leaderY)
      .on('end', _ => receivedUiAck$.next(true))
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
      .on('end', _ => receivedUiHeartbeat$.next({ voteRequest: true }))
      .filter(d => liveness[d.id])
      .transition()
      .duration(0)
      .style('fill', 'var(--msg-ack')
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', candidateX)
      .attr('cy', candidateY)

    setCircleGroups(null) // cleanup for the followed heartbeat
  }

  return (
    <div className="message-map">
      <svg className="msg-svg"></svg>
    </div>
  );
}

export default MessageMap;
