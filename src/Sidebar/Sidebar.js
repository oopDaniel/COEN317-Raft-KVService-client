import React, { useState, useEffect, useContext } from 'react';
import SidebarLogs from './SidebarLogs/SidebarLogs'
import SidebarActions from './SidebarActions/SidebarActions'
import Btn from '../shared/Button/Button'
import MachineContext from '../shared/context/MachineContext'
import NotificationContext from '../shared/context/NotificationContext'
import { FaHeart, FaSkull, FaPowerOff } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar ({ customClass }) {
  // Selected a machine
  const { selected, isAlive: isAliveFunc, toggleMachine } = useContext(MachineContext)
  const hasSelected = selected !== null
  const isAlive = hasSelected && isAliveFunc(selected)

  // Is showing logs or actions
  const [isLogs, setIsLogs] = useState(true)
  useEffect(() => {
    if (!hasSelected) setIsLogs(true)
  }, [hasSelected])

  const handleBtnClick = (isClickingLogs) => {
    if (!hasSelected) return
    setIsLogs(isClickingLogs)
  }

  // Open or close notification
  const { open, close } = useContext(NotificationContext)
  // Status of selected machine. Is it alive?
  // const [isAlive, setIsAlive] = useState(true) // TODO: use status from server
  const handlePowerBtn = () => {
    if (!selected) return

    const hint = isAlive ? `Closing <${selected}>` : `Re-opening <${selected}>`
    const postHint = isAlive ? `Closed` : `Opened`
    open(hint)

    // TODO: call API here, then toggleMachine
    toggleMachine(selected)

    setTimeout(() => open(postHint), 3000)
  }

  // Submit command to selected machine. Also, trace all commands for client side.
  const [commands, setCommands] = useState([])
  const handleCommand = (newCommand) => {
    newCommand.server = selected
    setCommands([...commands, newCommand])
    // TODO: call API and return it as promise
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
          disabled={!hasSelected}
        >
          Actions
        </Btn>

      </header>
      <div className="sidebar-content">
        <div className="sidebar-title flex-center">
          { renderTitle(hasSelected) }
        </div>
        {
          isLogs
            ? <SidebarLogs
              logs={commands}
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
                      <span className="status-text">Unreachable</span>
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
