import React, { useState, useEffect, useContext, useCallback } from 'react'
import * as R from 'ramda'
import { FaHeart, FaSkull, FaPowerOff } from 'react-icons/fa'
import { getState, putState, turnOn, turnOff } from '../shared/api'
import SidebarLogs from './SidebarLogs/SidebarLogs'
import SidebarActions from './SidebarActions/SidebarActions'
import Btn from '../shared/Button/Button'
import MachineContext from '../shared/context/MachineContext'
import NotificationContext from '../shared/context/NotificationContext'
import './Sidebar.css'

function Sidebar({ customClass }) {
  // Machine related logic: selection and status check
  const {
    selected,
    liveness,
    toggleMachine,
    machinePosMeta,
    receivedUiHeartbeatAndAck$,
  } = useContext(MachineContext)
  const hasSelected = selected !== null
  const isAlive = hasSelected && liveness[selected]

  // Is showing logs or actions
  const [isOnLogs, setIsOnLogs] = useState(true)
  useEffect(() => {
    if (!hasSelected) setIsOnLogs(true)
  }, [hasSelected])

  const handleBtnClick = useCallback(
    isClickingLogs => () => {
      if (!hasSelected) return
      setIsOnLogs(isClickingLogs)
    },
    [hasSelected]
  )
  const switchToLogs = useCallback(handleBtnClick(true), [handleBtnClick])
  const switchToActions = useCallback(handleBtnClick(false), [handleBtnClick])

  // Open notification
  const { open } = useContext(NotificationContext)

  const handlePowerBtn = useCallback(async () => {
    if (!selected) return

    let hint = `Re-opening <${selected}>`
    let postHint = 'Opened'
    let callApi = turnOn

    // Setting machine to off
    if (isAlive) {
      hint = `Closing <${selected}>`
      postHint = 'Closed'
      callApi = turnOff
      setIsOnLogs(true) // Submit command on disconnected machine is forbidden
    }

    open(hint)
    try {
      await callApi(machinePosMeta[selected].ip)
      toggleMachine()
      open(postHint)
    } catch (e) {
      console.warn('Error toggling machine', e)
      open('<Error> Unable to toggle machine.')
    }
  }, [selected, isAlive, toggleMachine])

  // Submit command to selected machine. Also, trace all commands for client side.
  const [commands, setCommands] = useState([])
  const handleCommand = useCallback(
    newCommand => {
      newCommand.server = selected
      setCommands([...commands, newCommand])
      const promise =
        newCommand.operation === 'GET'
          ? getState(machinePosMeta[selected].ip, newCommand.data.key)
          : putState(machinePosMeta[selected].ip, newCommand.data)
      return Promise.all([
        promise,
        receivedUiHeartbeatAndAck$.toPromise(),
      ]).then(R.nth(0))
    },
    [selected, receivedUiHeartbeatAndAck$]
  )

  const renderTitle = hasSelected => {
    if (hasSelected)
      return `${isOnLogs ? 'Logs' : 'Actions'} on Machine <${selected}>`
    return 'Raft K/V Service Visualization'
  }

  return (
    <div className={`sidebar ${customClass}`}>
      <header className="sidebar-options flex-center">
        <Btn
          customClass={`sidebar-option flex-center`}
          active={isOnLogs}
          onClick={switchToLogs}
        >
          Logs
        </Btn>
        <Btn
          customClass={`sidebar-option flex-center`}
          active={!isOnLogs}
          onClick={switchToActions}
          disabled={!hasSelected || !isAlive}
        >
          Actions
        </Btn>
      </header>
      <div className="sidebar-content">
        <div className="sidebar-title flex-center">
          {renderTitle(hasSelected)}
        </div>
        {// TODO: use logs from individual machines
        isOnLogs ? (
          <SidebarLogs
            logs={commands}
            available={isAlive}
            hideFooter={hasSelected}
          />
        ) : (
          <SidebarActions onCommand={handleCommand} />
        )}
        {hasSelected && (
          <div
            className={`sidebar-footer flex-center ${
              isAlive ? 'alive' : 'dead'
            }`}
          >
            <div className="status-container flex-center">
              Status:{' '}
              {isAlive ? (
                <div>
                  <span className="status-text">Alive</span>
                  <FaHeart />
                </div>
              ) : (
                <div>
                  <span className="status-text">Dead</span>
                  <FaSkull />
                </div>
              )}
            </div>
            <span className="power-switch" onClick={handlePowerBtn}>
              <FaPowerOff />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
