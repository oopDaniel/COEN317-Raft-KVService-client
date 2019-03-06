import React, { useState }from 'react';
import Btn from '../../shared/Button/Button'
import './SidebarActions.css';

function SidebarActions ({ onCommand }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')

  const startCommand = (isRead) => () => {
    setKey('')
    setValue('')
    onCommand({
      operation: isRead ? 'GET' : 'SET',
      data: { key, value }
    })
  }

  return (
    <div className="sidebar-actions">
      <section className="form">
        <input
            className="input"
            placeholder="Key"
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
          />

        <input
          className="input"
          placeholder="Value"
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      </section>

      <section className="buttons">
        <Btn
          disabled={key === ''}
          onClick={startCommand(false)}
        >Set</Btn>
        <Btn
          disabled={key === ''}
          onClick={startCommand(true)}
        >Get</Btn>
      </section>
    </div>
  );
}

export default SidebarActions;
