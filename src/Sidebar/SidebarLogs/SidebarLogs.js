import React from 'react';
import './SidebarLogs.css';

function SidebarLogs ({ logs }) {
  return (
    <div className="sidebar-logs">
      {
        logs.length
          ? logs.map(log => {
              if (log.operation === 'GET') {
                return <div className="log">Get => ({log.data.key})</div>
              } else {
                return <div className="log">Set => ({log.data.key}:{log.data.value})</div>
              }
            })
          : <div>No available logs</div>
      }
    </div>
  );
}

export default SidebarLogs;
