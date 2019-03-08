import React, { useState, useEffect, useContext } from 'react';
import { get } from '../shared/api';
import Machine from './Machine'
import MessageMap from './MessageMap/MessageMap'
import MachineContext from '../shared/context/MachineContext'
import './Machines.scss';

function Machines (props) {
  const { loadAlive } = useContext(MachineContext)

  const [machines, setMachines] = useState([])

  const fetchMachines = async () => {
    const data = await get('/machines/all');
    setMachines(data);
  }
  const fetchAliveMachines = async () => {
    const data = await get('/machines/alive');
    loadAlive(data.reduce((map, m) => (map[m] = true) && map, {}))
  }

  useEffect(() => { fetchMachines() }, []);
  useEffect(() => { fetchAliveMachines() }, []);

  return (
    <div className={`machines ${props.customClass}`}>
      <div className="machine-list">
        {
          machines.map(id => (
            <Machine
              id={id}
              key={id}
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
