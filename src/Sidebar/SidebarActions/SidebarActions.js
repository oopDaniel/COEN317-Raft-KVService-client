import React from 'react';
import Btn from '../../shared/Button/Button'
import './SidebarActions.css';

function SidebarActions () {
  return (
    <div className="sidebar-actions">
      <section className="form">
        <input
            className="input"
            placeholder="Key"
            type="text"
          />

        <input
          className="input"
          placeholder="Value"
          type="text"
        />
      </section>

      <section className="buttons">
        <Btn>Set</Btn>
        <Btn>Get</Btn>
      </section>
    </div>
  );
}

export default SidebarActions;
