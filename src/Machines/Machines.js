import React, { useContext } from 'react';
import Machine from './Machine'
import MessageMap from './MessageMap/MessageMap'
import MachineContext from '../shared/context/MachineContext'
import './Machines.scss';

function Machines (props) {
  const { machines } = useContext(MachineContext)
  return (
    <div className={`machines ${props.customClass}`}>
      <div className="machine-list">
        {
          machines.map(m => (
            <Machine
              id={m.id}
              key={m.id}
              ip={m.ip}
            ></Machine>
          ))
        }
      </div>
      <div className="message-map-container">
        <MessageMap />
      </div>
    </div>
  );
}

export default Machines;
