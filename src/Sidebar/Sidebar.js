import React, { useState, useEffect } from 'react';
import SidebarLogs from './SidebarLogs/SidebarLogs'
import SidebarActions from './SidebarActions/SidebarActions'
import Btn from '../shared/Button/Button'
import './Sidebar.css';

function Sidebar ({selectedMachine, customClass}) {
  const hasSelected = selectedMachine !== null
  const [isLogs, setIsLogs] = useState(true)

  useEffect(() => {
    if (!hasSelected) setIsLogs(true)
  }, [hasSelected])

  const handleBtnClick = (isClickingLogs) => {
    if (!hasSelected) return
    setIsLogs(isClickingLogs)
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
          isLogs ? <SidebarLogs/> : <SidebarActions />
        }
        {
          hasSelected &&
          <div className="sidebar-footer flex-center">
            Status: Alive
          </div>
        }

      </div>
    </div>
  );
}

export default Sidebar;
