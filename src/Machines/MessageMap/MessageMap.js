import React, { useEffect, useContext } from 'react';
import * as d3 from 'd3'
import MachineContext from '../../shared/context/MachineContext'
import { HEARTBEAT_INTERVAL, MSG_SINGLE_TRIP_TIME } from '../../shared/constants'
import './MessageMap.css';

function MessageMap () {
  const { positions, leader, alive, sendHeartbeat } = useContext(MachineContext)
  useEffect(() => {
    if (!positions || positions.length === 0) return
    renderChart(positions)
  }, [positions, leader, alive])


  function renderChart (positions) {
    const leaderPos = positions.find(p => p.id === leader)
    if (!leaderPos) return

    const { x: leaderX, y: leaderY } = leaderPos
    const msgSvg = d3.select('svg.msg-svg')

    const circleGroups = msgSvg.selectAll('.circleGroups')
      .data(positions)
      .enter()
      .append('circle')

    function heartbeat () {
      circleGroups
        .filter(d => d.id !== leader)
        .attr('r', 10)
        .attr('cx', leaderX)
        .attr('cy', leaderY)
        .style('fill', 'var(--msg-heartbeat)')
        .transition().duration(MSG_SINGLE_TRIP_TIME)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .filter(d => alive[d.id])
        .transition()
        .style('fill', 'var(--msg-ack')
        .duration(0)
        .on('end', sendHeartbeat)
        .transition()
        .duration(MSG_SINGLE_TRIP_TIME)
        .attr('cx', leaderX)
        .attr('cy', leaderY)
    }

    heartbeat()

    d3.interval(heartbeat, HEARTBEAT_INTERVAL);
  }

  return (
    <div className="message-map">
      <svg className="msg-svg"></svg>
    </div>
  );
}

export default MessageMap;
