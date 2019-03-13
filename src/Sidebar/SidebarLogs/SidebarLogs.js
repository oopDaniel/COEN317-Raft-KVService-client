import React, { useContext } from 'react';
import MachineContext from '../../shared/context/MachineContext'
import './SidebarLogs.css';

function SidebarLogs ({ hideFooter }) {
  const { selectedLogs: logs = [], selected } = useContext(MachineContext)
  return (
    <div className={`sidebar-logs ${hideFooter ? 'hide-footer' : '' }`}>
      {
        logs.length
          ? logs.map((log, index) => {
            const [ operation, key, value ] = log.command.split('|')
              if (operation === 'GET') {
                return (
                  <div className="log-container" key={index}>
                    <span className="log-number flex-center">{ index }</span>
                    <span className="log">
                      <span className="log-content-server">&lt;Term {log.term}&gt;</span>
                      <span className="log-content-op">Get</span>
                      <span className="log-content-data">({key})</span>
                    </span>
                  </div>
                )
              } else {
                return (
                  <div className="log-container" key={index}>
                    <span className="log-number flex-center">{ index }</span>
                    <span className="log">
                      <span className="log-content-server">&lt;Term {log.term}&gt;</span>
                      <span className="log-content-op">Set</span>
                      <span className="log-content-data">({key} : {value})</span>
                    </span>
                  </div>
                )
              }
            })
          : selected
            ? <div className="unavailable">No available logs</div>
            : <div>Select a machine to inspect</div>
      }
    </div>
  );
}

export default SidebarLogs;
