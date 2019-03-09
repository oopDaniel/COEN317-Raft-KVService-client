import React, { useEffect, useContext, useState } from 'react';
import { useObservable } from 'rxjs-hooks';
import * as d3 from 'd3'
import MachineContext from '../../shared/context/MachineContext'
import { HEARTBEAT_INTERVAL, MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
import './MessageMap.css';

function MessageMap () {
  const {
    positions,
    leader,
    alive,
    notifySentHeartbeat,
    receivedHeartbeat$
  } = useContext(MachineContext)

  // Initialize positionMap
  const [positionMap, setPositionMap] = useState(null)
  useEffect(() => {
    if (!positions || positions.length === 0) return
    setPositionMap(positions.reduce((map, pos) => (map[pos.id] = pos) && map, {}))
  }, [positions])

  // Start sending heartbeat after positionMap initialized and there's a leader
  const [circleGroups, setCircleGroups] = useState(null)
  const [d3Timeout, setD3Timeout] = useState(null)
  useEffect(() => {
    if (positionMap === null) return
    renderChart()
  }, [positionMap, leader, alive])

  // Reply heartbeat only when received one and msg svgs are available
  const [prevLeader, setPrevLeader] = useState(leader)
  const followerId = useObservable(() => receivedHeartbeat$)
  useEffect(() => {
    if (positionMap === null || !circleGroups) return
    replyAck()
  }, [positionMap, circleGroups, followerId])


  function renderChart () {
    const leaderPos = positionMap[leader]
    if (!leaderPos) { // Leader stepped down
      if (d3Timeout) {
        d3Timeout.stop()
        setD3Timeout(null)
      }
      return
    }

    const msgSvg = d3.select('svg.msg-svg')

    // Only initialize once
    let circles = circleGroups
    if (!circles) {
      circles = msgSvg.selectAll('.circleGroups')
        .data(positions)
        .enter()
        .append('circle')
      setCircleGroups(circles)
    }

    if (leader) {
      heartbeat(leader)
      setD3Timeout(
        d3.interval(() => heartbeat(leader), HEARTBEAT_INTERVAL)
      )
    }

    function heartbeat (currentLeader) {
      const { x: leaderX, y: leaderY } = positionMap[currentLeader]
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
        // .filter(d => alive[d.id])
        .transition()
        .duration(0)
        .style('fill', 'var(--msg-ack')
        .on('end', () => {
          notifySentHeartbeat()
          if (currentLeader) setPrevLeader(currentLeader)
        })
    }
  }

  function replyAck () {
    const { x: leaderX, y: leaderY } = positionMap[leader || prevLeader]
    circleGroups
      .filter(d => d.id === followerId)
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
