import React from 'react'
import './AppliedCommand.css'

function AppliedCommand ({ isAlive, cmd = '' }) {
  const [ operation, key ] = cmd.split('|')
  return (
    <div className={`${operation ? 'applied-cmd' : ''} ${isAlive ? '' : 'dead'}`}>
      {operation ? `${operation}(${key})` : ''}
    </div>
  )
}

export default AppliedCommand
