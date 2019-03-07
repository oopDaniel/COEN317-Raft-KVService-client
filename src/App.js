import React, { Component } from 'react';
import style from './App.css';
import Machines from './Machines/Machines'
import Sidebar from './Sidebar/Sidebar'
import { SelectionProvider } from './shared/context/SelectionContext'
import { NotificationProvider } from './shared/context/NotificationContext'
import Notification from './shared/Notification/Notification'

class App extends Component {
  render() {
    return (
      <div className="App">
        <NotificationProvider>
          <SelectionProvider>
            <Machines customClass={style.machine} />
            <Sidebar customClass={style.sidebar} />
          </SelectionProvider>
          <Notification />
        </NotificationProvider>
      </div>
    );
  }
}

export default App;
