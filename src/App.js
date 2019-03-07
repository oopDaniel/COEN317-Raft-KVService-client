import React, { Component } from 'react';
import style from './App.css';
import Machines from './Machines/Machines'
import Sidebar from './Sidebar/Sidebar'
import { SelectionProvider } from './shared/context/SelectionContext'

class App extends Component {
  render() {
    return (
      <div className="App">
        <SelectionProvider>
          <Machines customClass={style.machine} />
          <Sidebar customClass={style.sidebar} />
        </SelectionProvider>
      </div>
    );
  }
}

export default App;
