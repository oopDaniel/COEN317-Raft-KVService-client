import React, { useEffect, useContext } from 'react';
import * as d3 from 'd3'
import MachineContext from '../../shared/context/MachineContext'
import './MessageMap.css';

function MessageMap () {
  const { positions } = useContext(MachineContext)
  useEffect(() => {
    if (!positions || positions.length === 0) return
    renderChart(positions)
  }, [positions])


  function renderChart (positions) {
    // Message to others
    const msgSvg = d3.select('svg.msg-svg')

    const circleGroups = msgSvg.selectAll('.circleGroups')
      .data(positions)
      .enter()

    const circle = circleGroups.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 10)
      .style('fill', 'red');

    circle.on('mousedown', function () {
      circle.transition()
        .duration(1500)
        .attr('cx', 500);
    })
  }

  return (
    <div className="message-map">
      <svg className="msg-svg"></svg>
    </div>
  );
}

export default MessageMap;
