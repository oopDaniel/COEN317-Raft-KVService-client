import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { KNOWN_SERVER_IP } from '../shared/constants'
import { FaDatabase } from 'react-icons/fa';
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
              className="machine-container flex-center"
              key={id}
              onClick={() => props.selectMachine(id)}
            >
              <div className={`machine ${props.selectedMachine === id ? 'selected' : ''}`}>
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
