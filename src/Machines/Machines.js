import React, { useState, useEffect, useContext } from 'react';
import Axios from 'axios';
import { FaDatabase } from 'react-icons/fa';
import SelectionContext from '../shared/context/SelectionContext'
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

  const { selected, select, unselect } = useContext(SelectionContext)
  const selectMachine = (id) => {
    if (id === selected) unselect()
    else select(id)
  }

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
              <div className={`machine ${selected === id ? 'selected' : ''}`}>
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
