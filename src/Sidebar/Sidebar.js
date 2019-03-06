import React, { useState, useEffect } from 'react';
import './Sidebar.css';

function Sidebar ({selectedMachine, customClass}) {
  const hasSelected = selectedMachine !== null
  const [isLogs, setIsLogs] = useState(true)

  useEffect(() => {
    if (!hasSelected) setIsLogs(true)
  }, [hasSelected])

  const handleBtnClick = (isClickingLogs) => setIsLogs(isClickingLogs)

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
      <div>
        <div className="sidebar-title">
          { renderTitle(hasSelected) }
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
