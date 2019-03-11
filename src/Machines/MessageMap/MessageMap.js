import React, { useEffect, useContext, useState } from 'react';
import { useObservable } from 'rxjs-hooks';
import * as d3 from 'd3'
import MachineContext from '../../shared/context/MachineContext'
// import { usePrevious } from '../../shared/utils'
import { HEARTBEAT_INTERVAL, MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
import './MessageMap.css';

function MessageMap () {
  const {
    machineInfo: positionMap,
    leader,
    notifySentHeartbeat,
    receivedHeartbeat$
  } = useContext(MachineContext)

  // const positionMap = useObservable(() => positions$)

  // TODO: todo
  // const prevLeader = usePrevious(leader)

  // Start sending heartbeat after positionMap initialized and there's a leader
  const [circleGroups, setCircleGroups] = useState(null)
  const [d3Timeout, setD3Timeout] = useState(null)
  const cleanD3Animation = () => {
    if (d3Timeout) d3Timeout.stop()
    setD3Timeout(null)
  }

  useEffect(() => {
    if (positionMap === null) return
    if (!leader) {
      // no leader or leader crashed => cancel animation
      cleanD3Animation()
    }
    console.log('asdasd', positionMap, leader)
    renderChart()
    // -------------------------------------
  }, [positionMap, leader]) // TODO: use alive
  // -------------------------------------

  // Reply heartbeat only when received one and msg svgs are available
  const [prevLeader, setPrevLeader] = useState(leader)
  const followerId = useObservable(() => receivedHeartbeat$)
  useEffect(() => {
    if (positionMap === null || !circleGroups) return
    replyAck()
  }, [positionMap, circleGroups, followerId])


  function renderChart () {
    const leaderPos = positionMap[leader]
    if (!leaderPos) { // No leader or leader stepped down
      if (d3Timeout) {
        d3Timeout.stop()
        setD3Timeout(null)
      }
      return
    }

    const msgSvg = d3.select('svg.msg-svg')

    let circles = circleGroups
    if (prevLeader !== leader) {
      circles = msgSvg.selectAll('.circleGroups')
        .data(Object.values(positionMap))
        .enter()
        .append('circle')
      setCircleGroups(circles)
    } else {
      if (d3Timeout) {
        d3Timeout.stop()
        setD3Timeout(null)
      }
    }

    if (leader) {
      heartbeat(leader)
      setD3Timeout(
        d3.interval(() => heartbeat(leader), HEARTBEAT_INTERVAL)
      )
    }

    if (prevLeader !== leader) {
      setPrevLeader(leader)
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
        // .filter(d => alive[d.id]) // todo
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
