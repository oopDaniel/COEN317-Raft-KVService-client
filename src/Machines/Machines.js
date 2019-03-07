import React, { useState, useEffect, useContext } from 'react';
import { get } from '../shared/api';
import { FaDatabase } from 'react-icons/fa';
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
          machines.map(id =>
            <div
              className="machine-container flex-center"
              key={id}
              onClick={() => selectMachine(id)}
            >
              <div className={`machine ${selected === id ? 'selected' : ''} ${isAlive(id) ? '' : 'dead'}`}>
                <FaDatabase/>
                {id}
              </div>
            </div>
          )
        }
      </div>

    </div>
  );
}

export default Machines;
