import React, { useState, useEffect, useContext } from 'react';
import { get, post, turnOn, turnOff } from '../shared/api';
import SidebarLogs from './SidebarLogs/SidebarLogs'
import SidebarActions from './SidebarActions/SidebarActions'
import Btn from '../shared/Button/Button'
import MachineContext from '../shared/context/MachineContext'
import NotificationContext from '../shared/context/NotificationContext'
import { FaHeart, FaSkull, FaPowerOff } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar ({ customClass }) {
  // Machine related logic: selection and status check
  const { selected,
    /* isAlive: isAliveFunc, */
    toggleMachine,
    machineInfo,
   } = useContext(MachineContext)
  const hasSelected = selected !== null
  const isAlive = hasSelected

  // Is showing logs or actions
  const [isLogs, setIsLogs] = useState(true)
  useEffect(() => {
    if (!hasSelected) setIsLogs(true)
  }, [hasSelected])

  const handleBtnClick = (isClickingLogs) => {
    if (!hasSelected) return
    setIsLogs(isClickingLogs)
  }

  // Open notification
  const { open } = useContext(NotificationContext)

  const handlePowerBtn = async () => {
    if (!selected) return

    let hint = `Re-opening <${selected}>`
    let postHint = 'Opened'
    let callApi = turnOn

    // Setting machine to off
    if (isAlive) {
      hint = `Closing <${selected}>`
      postHint = 'Closed'
      callApi = turnOff
      setIsLogs(true) // Submit command on disconnected machine is forbidden
    }

    open(hint)
    try {
      await callApi(machineInfo[selected].ip)
      toggleMachine()
      open(postHint)
    } catch (e) {
      console.log(e)
      open('<Error> Unable to toggle machine.')
    }
  }

  // Submit command to selected machine. Also, trace all commands for client side.
  const [commands, setCommands] = useState([])
  const handleCommand = (newCommand) => {
    newCommand.server = selected
    setCommands([...commands, newCommand])
    return newCommand.operation === 'GET'
      ? get(`/state?key=${newCommand.data.key}`)
      : post('/state', newCommand.data)
  }

  const renderTitle = (hasSelected) => {
    if (hasSelected) return `${isLogs ? 'Logs' : 'Actions'} on Machine <${selected}>`
    return 'Client Log History'
  }

  return (
    <div className={`sidebar ${customClass}`}>
      <header className="sidebar-options flex-center">
        <Btn
          customClass={`sidebar-option flex-center`}
          active={isLogs}
          onClick={() => handleBtnClick(true)}
        >
          Logs
        </Btn>
        <Btn
          customClass={`sidebar-option flex-center`}
          active={!isLogs}
          onClick={() => handleBtnClick(false)}
          disabled={!hasSelected || !isAlive}
        >
          Actions
        </Btn>

      </header>
      <div className="sidebar-content">
        <div className="sidebar-title flex-center">
          { renderTitle(hasSelected) }
        </div>
        {
          // TODO: use logs from individual machines
          isLogs
            ? <SidebarLogs
              logs={commands}
              available={isAlive}
              hideFooter={hasSelected}
            />
            : <SidebarActions
              onCommand={handleCommand}
            />
        }
        {
          hasSelected &&
          <div className={`sidebar-footer flex-center ${isAlive ? 'alive' : 'dead'}`}>
            <div className="status-container flex-center">
              Status: {
                isAlive
                  ? (
                    <div>
                      <span className="status-text">Alive</span>
                      <FaHeart />
                    </div>
                  )
                  : (
                    <div>
                      <span className="status-text">Dead</span>
                      <FaSkull />
                    </div>
                  )
              }
            </div>
            <span
              className="power-switch"
              onClick={handlePowerBtn}
            >
              <FaPowerOff />
            </span>
          </div>
        }

      </div>
    </div>
  );
}

export default Sidebar;
