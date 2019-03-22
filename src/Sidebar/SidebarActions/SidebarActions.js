import React, { useContext, useEffect, useReducer } from 'react'
import Btn from '../../shared/Button/Button'
import NotificationContext from '../../shared/context/NotificationContext'
import './SidebarActions.css'

function reducer(state, action) {
  let newState
  switch (action.type) {
    case 'cleanFocus':
      return { ...state, fetchedFromRead: false }
    case 'updateKey':
      return { ...state, key: action.value }
    case 'updateValue':
      return { ...state, value: action.value }
    case 'startCommand':
      const isRead = action.value
      newState = {
        ...state,
        args: {
          isRead,
          data: { key: state.key, value: state.value },
        },
        [isRead ? 'isProcessingGet' : 'isProcessingSet']: true,
      }
      if (!isRead) {
        // Clean up if it's 'Set'
        newState.key = ''
        newState.value = ''
      }
      return newState
    case 'finishCommand':
      newState = {
        ...state,
        fetchedFromRead: action.value.isRead,
        value: action.value.data || '',
        isProcessingGet: false,
        isProcessingSet: false,
        args: null,
      }
      return newState
    case 'gotError':
      return {
        ...state,
        isProcessingGet: false,
        isProcessingSet: false,
        args: null,
      }
    default:
      throw new Error()
  }
}

function SidebarActions({ onCommand }) {
  const { open } = useContext(NotificationContext)
  const [
    { key, value, args, fetchedFromRead, isProcessingSet, isProcessingGet },
    dispatch,
  ] = useReducer(reducer, {
    key: '',
    value: '',
    args: null,
    isProcessingSet: false,
    isProcessingGet: false,
    fetchedFromRead: false,
  })

  useEffect(() => {
    if (args !== null) {
      callApi(args).then(dispatch)
    }

    async function callApi({ isRead, data }) {
      let nextAction
      try {
        const res = await onCommand({
          operation: isRead ? 'GET' : 'SET',
          data,
        })
        nextAction = {
          type: 'finishCommand',
          value: {
            isRead,
            data: res.data,
          },
        }
        open('Command Submitted')
      } catch (e) {
        open('An error occurred.', e)
        console.warn('Error submitting command', e)
        nextAction = { type: 'gotError' }
      }
      return nextAction
    }
  }, [args, open, dispatch])

  return (
    <div className="sidebar-actions">
      <section className="form">
        <input
          className="input"
          placeholder="Key"
          type="text"
          value={key}
          onChange={e => dispatch({ type: 'updateKey', value: e.target.value })}
        />

        <input
          className={`input ${fetchedFromRead ? 'highlight' : ''}`}
          placeholder="Value"
          type="text"
          value={value}
          onFocus={() => dispatch({ type: 'cleanFocus' })}
          onChange={e =>
            dispatch({ type: 'updateValue', value: e.target.value })
          }
        />
      </section>

      <section className="buttons">
        <Btn
          disabled={key === ''}
          processing={isProcessingSet}
          onClick={() => dispatch({ type: 'startCommand', value: false })}
        >
          Set
        </Btn>
        <Btn
          disabled={key === ''}
          processing={isProcessingGet}
          onClick={() => dispatch({ type: 'startCommand', value: true })}
        >
          Get
        </Btn>
      </section>
    </div>
  )
}

export default SidebarActions
