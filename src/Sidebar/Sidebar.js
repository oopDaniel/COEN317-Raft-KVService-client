import React, { useState, useEffect } from 'react';
import SidebarLogs from './SidebarLogs/SidebarLogs'
import SidebarActions from './SidebarActions/SidebarActions'
import Btn from '../shared/Button/Button'
import { FaHeart, FaSkull, FaPowerOff } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar ({ selectedMachine, customClass, commands, appendCommand }) {
  const hasSelected = selectedMachine !== null
  const [isLogs, setIsLogs] = useState(true)
  const [isAlive, setIsAlive] = useState(true) // TODO: use status from server

  useEffect(() => {
    if (!hasSelected) setIsLogs(true)
  }, [hasSelected])

  const handleBtnClick = (isClickingLogs) => {
    if (!hasSelected) return
    setIsLogs(isClickingLogs)
  }

  const handleCommand = (newCommand) => {
    newCommand.server = selectedMachine
    // TODO: call API and return it as promiss
    appendCommand(newCommand)
  }

  // TODO: call API
  const handlePowerBtn = () => {
    setIsAlive(!isAlive)
  }

  const renderTitle = (hasSelected) => {
    if (hasSelected) return `${isLogs ? 'Logs' : 'Actions'} on Machine <${selectedMachine}>`
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
