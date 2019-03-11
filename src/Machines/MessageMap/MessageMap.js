import React, { useEffect, useContext, useState } from 'react';
import * as d3 from 'd3'
import * as R from 'ramda'
import MachineContext from '../../shared/context/MachineContext'
// import { usePrevious } from '../../shared/utils'
import { MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
import './MessageMap.css';

function MessageMap () {
  const {
    machineInfo: positionMap,
    leader,
    liveness,
    leaderHeartbeat$
  } = useContext(MachineContext)

  const [circleGroups, setCircleGroups] = useState(null)
  useEffect(() => {
    console.log('%cLeader msg', 'color:purple;font-size:1.5em', {positionMap}, {liveness}, {leader: leader && leader.id || null}, circleGroups)
    if (positionMap === null || liveness === null || !leader) return

    let sub
    if (!circleGroups) {
      createMsgCircles()
    } else {
      sub = leaderHeartbeat$.subscribe((beat) => {
        // console.log('beat', beat)
        renderHeartbeatMsgChart()
      })
    }

    return R.tryCatch(() => {
      console.log('%cunsubscribe...sender', 'color:#000;background:#fff')
      sub && sub.unsubscribe()
    }, () => {})
  }, [positionMap, liveness, leader, circleGroups])

  // TODO: todo
  // const prevLeader = usePrevious(leader)


  const [prevLeader, setPrevLeader] = useState(leader)
  const { followerTimer$ } = useContext(MachineContext)
  useEffect(() => {
    console.log('%ccalling ack', 'color:red;font-size:1.5em', {prevLeader: prevLeader && prevLeader.id || null}, {leader: leader && leader.id || null}, {liveness}, circleGroups)
    if (!circleGroups || !prevLeader) return
    const sub = followerTimer$.subscribe(replyAck)
    return R.tryCatch(() => {
      console.log('%cunsubscribe...ack', 'color:#000;background:#fff')
      sub && sub.unsubscribe()
    }, () => {})
  }, [followerTimer$, liveness, circleGroups, prevLeader])


  // Start sending heartbeat after positionMap initialized and there's a leader
  // const [d3Timeout, setD3Timeout] = useState(null)
  // const cleanD3Animation = () => {
  //   if (d3Timeout) d3Timeout.stop()
  //   setD3Timeout(null)
  // }

  // useEffect(() => {
  //   if (positionMap === null || liveness === null) return
  //   if (!leader) {
  //     // no leader or leader crashed => cancel animation
  //     cleanD3Animation()
  //     return
  //   }
  //   console.log('%casdasd', 'color:wheat',positionMap, leader)
  //   renderHeartbeatMsgChart()
  //   // -------------------------------------
  // }, [positionMap, liveness, leader]) // TODO: use alive
  // -------------------------------------


  function createMsgCircles () {
    const msgSvg = d3.select('svg.msg-svg')
    const circles = msgSvg.selectAll('.circleGroups')
      .data(R.values(R.omit([leader.id], positionMap)))
      .enter()
      .append('circle')
    setCircleGroups(circles)
    console.log('created')
  }

  function renderHeartbeatMsgChart () {
    console.log(' - render - ')
    const msgSvg = d3.select('svg.msg-svg')

    let circles = circleGroups
    if (!circles) {
      console.log('%cno circle', 'color:green')
      circles = msgSvg.selectAll('.circleGroups')
        .data(R.values(R.omit([leader.id], positionMap)))
        .enter()
        .append('circle')
      setCircleGroups(circles)
      return false
    }

    heartbeat(leader)

    function heartbeat (currentLeader) {
      const { x: leaderX, y: leaderY } = positionMap[currentLeader.id]
      circles
        .filter(d => d.id !== leader)
        .attr('r', 10)
        .attr('cx', leaderX)
        .attr('cy', leaderY)
        .style('fill', 'var(--msg-heartbeat)')
        .transition()
        .duration(MSG_SINGLE_TRIP_TIME)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        // .filter(d => alive[d.id]) // todo
        .transition()
        .duration(0)
        .style('fill', 'var(--msg-ack')
        .on('end', () => {
          if (currentLeader) setPrevLeader(currentLeader)
        })
    }
  }

  function replyAck () {
    // console.log(' (((- leader id', leader.id, 'prevLeader id:', prevLeader.id)
    const { x: leaderX, y: leaderY } = positionMap[leader.id || prevLeader.id]
    circleGroups
      .filter(d => liveness[d.id])
      .transition()
      .duration(MSG_SINGLE_TRIP_TIME)
      .attr('cx', leaderX)
      .attr('cy', leaderY)
  }

  return (
    <div className="message-map">
      <svg className="msg-svg"></svg>
    </div>
  );
}

export default MessageMap;
