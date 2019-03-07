import React, { Component } from 'react';
import style from './App.css';
import Machines from './Machines/Machines'
import Sidebar from './Sidebar/Sidebar'
import { MachineProvider } from './shared/context/MachineContext'
import { NotificationProvider } from './shared/context/NotificationContext'
import Notification from './shared/Notification/Notification'

class App extends Component {
  render() {
    return (
      <div className="App">
        <NotificationProvider>
          <MachineProvider>
            <Machines customClass={style.machine} />
            <Sidebar customClass={style.sidebar} />
          </MachineProvider>
          <Notification />
        </NotificationProvider>
      </div>
    );
  }
}

export default App;
