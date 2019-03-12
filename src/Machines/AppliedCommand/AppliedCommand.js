import React from 'react';
import * as R from 'ramda'
import './AppliedCommand.css'

function AppliedCommand ({ isAlive, cmd }) {
  const [ operation, key ] = R.pathOr('', ['cmd'], cmd).split('|')
  return (
    <div className={`${operation ? 'applied-cmd' : ''} ${isAlive ? '' : 'dead'}`}>
      {operation ? `${operation}(${key})` : ''}
    </div>
  )
}

export default AppliedCommand
