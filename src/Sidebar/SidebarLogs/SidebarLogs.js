import React from 'react';
import './SidebarLogs.css';

function SidebarLogs ({ logs, hideFooter, available = true }) {
  return (
    <div className={`sidebar-logs ${hideFooter ? 'hide-footer' : '' }`}>
      {
        logs.length && available
          ? logs.map((log, index) => {
              if (log.operation === 'GET') {
                return (
                  <div className="log-container" key={index}>
                    <span className="log-number flex-center">{ index }</span>
                    <span className="log">
                      <span className="log-content-server">&lt;Machine {log.server}&gt;</span>
                      <span className="log-content-op">Get</span>
                      <span className="log-content-data">({log.data.key})</span>
                    </span>
                  </div>
                )
              } else {
                return (
                  <div className="log-container" key={index}>
                    <span className="log-number flex-center">{ index }</span>
                    <span className="log">
                      <span className="log-content-server">&lt;Machine {log.server}&gt;</span>
                      <span className="log-content-op">Set</span>
                      <span className="log-content-data">({log.data.key} : {log.data.value})</span>
                    </span>
                  </div>
                )
              }
            })
          : <div className="unavailable">No available logs</div>
      }
    </div>
  );
}

export default SidebarLogs;
