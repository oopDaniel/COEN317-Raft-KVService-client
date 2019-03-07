import React, { useState, useContext }from 'react';
import Btn from '../../shared/Button/Button'
import NotificationContext from '../../shared/context/NotificationContext'
import './SidebarActions.css';

function SidebarActions ({ onCommand }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [fetchedFromRead, setFetchedFromRead] = useState(false)
  const [isProcessingSet, setProcessingSet] = useState('')
  const [isProcessingGet, setProcessingGet] = useState('')

  const { open } = useContext(NotificationContext)

  const startCommand = (isRead) => async () => {
    // Clean up for 'Set'
    if (!isRead) {
      setKey('')
      setValue('')
    }

    const processingFunc = isRead ? setProcessingGet : setProcessingSet
    processingFunc(true)
    try {
      const res = await onCommand({
        operation: isRead ? 'GET' : 'SET',
        data: { key, value }
      })
      if (isRead) {
        setValue(res.Value)
        setFetchedFromRead(true)
      } else {
        setFetchedFromRead(false)
      }
      open('Command Submitted')
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
          className={`input ${fetchedFromRead ? 'highlight' : ''}`}
          placeholder="Value"
          type="text"
          value={value}
          onFocus={() => setFetchedFromRead(false)}
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
