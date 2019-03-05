import React from 'react';
import logo from '../logo.svg';
import './Machines.css';

const MACHINE_COUNT = 5

function Machines (props) {
  const machineIds = Array.from(new Array(MACHINE_COUNT), (_, i) => i + 1)
  return (
    <div className={`Machines ${props.customClass}`}>
      <img src={logo} className="App-logo" alt="logo" />
      <div>There will be 5 machines here</div>
      {
        machineIds.map(id =>
          <div
            key={id}
            onClick={() => props.selectMachine(id)}
          >{id}</div>
        )
      }

    </div>
  );
}

export default Machines;
