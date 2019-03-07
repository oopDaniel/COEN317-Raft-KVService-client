import React, { useState, useEffect, useContext } from 'react';
import { get } from '../shared/api';
import Machine from './Machine'
import MachineContext from '../shared/context/MachineContext'
import logo from './logo.svg';
import './Machines.css';

function Machines (props) {
  const { selected, select, unselect, loadAlive, isAlive } = useContext(MachineContext)
  const selectMachine = (id) => {
    if (id === selected) unselect()
    else select(id)
  }

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
      <img src={logo} className="app-logo" alt="logo" />
      <div className="machine-list">
        {
          machines.map(id => (
            <Machine
              id={id}
              key={id}
              onClick={() => selectMachine(id)}
              isSelected={selected === id}
              isAlive={isAlive(id)}
            ></Machine>
          ))
        }
      </div>

    </div>
  );
}

export default Machines;
