import React, { useContext } from 'react';
import { useObservable } from 'rxjs-hooks'
import * as R from 'ramda'
import MachineContext from '../../shared/context/MachineContext'
import './AppliedCommand.css'

function AppliedCommand ({ id }) {
  const command = useCommandCollector(id)
  const [ operation, key ] = R.pathOr('', ['cmd'], command).split('|')
  return (
    <div className={operation ? 'applied-cmd' : ''}>
      {operation ? `${operation}(${key})` : ''}
    </div>
  )
}

function useCommandCollector (id) {
  const {
    command$,
    commandValid$,
    leader
  } = useContext(MachineContext)
  const leaderCommand = useObservable(() => command$, '')
  const followerCommand = useObservable(() => commandValid$, '')
  const cmd = leader && id === leader.id
    ? leaderCommand
    : followerCommand
  return cmd
}

export default AppliedCommand
