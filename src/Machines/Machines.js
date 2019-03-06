import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { KNOWN_SERVER_IP } from '../shared/constants'
import logo from './logo.svg';
import './Machines.css';

function Machines (props) {
  const [machines, setMachines] = useState([])

  const fetchMachines = async () => {
    const {data} = await Axios.get(`http://${KNOWN_SERVER_IP}/machines/all`);
    setMachines(data);
  }

  useEffect(() => { fetchMachines() }, []);

  return (
    <div className={`machines ${props.customClass}`}>
      <img src={logo} className="app-logo" alt="logo" />
      <div className="machine-list">
        {
          machines.map(id =>
            <div
              className={`machine flex-center ${props.selectedMachine === id ? 'selected' : ''}`}
              key={id}
              onClick={() => props.selectMachine(id)}
            >{id}</div>
          )
        }
      </div>

    </div>
  );
}

export default Machines;
