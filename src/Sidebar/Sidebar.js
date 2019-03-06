import React, { useState, useEffect } from 'react';
import SidebarLogs from './SidebarLogs/SidebarLogs'
import SidebarActions from './SidebarActions/SidebarActions'
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
        <span
          className={`sidebar-option flex-center ${isLogs ? 'selected' : ''}`}
          onClick={() => handleBtnClick(true)}
        >
          Logs
        </span>

        <span
          className={`sidebar-option flex-center ${hasSelected ? '' : 'grey-out'} ${!isLogs ? 'selected' : ''}`}
          onClick={() => handleBtnClick(false)}
        >
          Actions
        </span>
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
