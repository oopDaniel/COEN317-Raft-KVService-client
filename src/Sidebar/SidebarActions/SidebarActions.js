import React, { useState }from 'react';
import Btn from '../../shared/Button/Button'
import './SidebarActions.css';

function SidebarActions ({ onCommand }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [isProcessingSet, setProcessingSet] = useState('')
  const [isProcessingGet, setProcessingGet] = useState('')

  const startCommand = (isRead) => async () => {
    setKey('')
    setValue('')
    const processingFunc = isRead ? setProcessingGet : setProcessingSet
    processingFunc(true)
    try {
      await onCommand({
        operation: isRead ? 'GET' : 'SET',
        data: { key, value }
      })
    } catch (e) {
      console.log('Error submitting command', e)
    } finally {
      processingFunc(false)
    }
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
          processing={isProcessingSet}
          onClick={startCommand(false)}
        >Set</Btn>
        <Btn
          disabled={key === ''}
          processing={isProcessingGet}
          onClick={startCommand(true)}
        >Get</Btn>
      </section>
    </div>
  );
}

export default SidebarActions;
