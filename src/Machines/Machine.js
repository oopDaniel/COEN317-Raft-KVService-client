import React from 'react';
import { FaDatabase } from 'react-icons/fa';
import './Machine.css';

function Machine ({ id, isSelected, isAlive, onClick }) {
  return (
    <div
      className="machine-container flex-center"
      onClick={onClick}
    >
      <div className={`machine ${isSelected ? 'selected' : ''} ${isAlive ? '' : 'dead'}`}>
        <FaDatabase/>
        {id}
      </div>
    </div>
  );
}

export default Machine;
