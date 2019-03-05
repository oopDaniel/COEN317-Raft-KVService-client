import React, { Component } from 'react';
import style from './App.css';
import Machines from './Machines/Machines'
import Sidebar from './Sidebar/Sidebar'

class App extends Component {
  constructor() {
    super()
    this.state = {
      selectedMachine: null
    }
    this.handleMachineSelection = this.handleMachineSelection.bind(this)
  }

  handleMachineSelection (selectedMachine) {
    if (this.state.selectedMachine === null || this.state.selectedMachine !== selectedMachine) {
      this.setState({ selectedMachine })
    } else {
      this.setState({ selectedMachine: null })
    }
  }

  render() {
    return (
      <div className="App">
        <Machines
          customClass={style.Machine}
          selectMachine={this.handleMachineSelection}
        />
        <Sidebar
          customClass={style.Sidebar}
          selectedMachine={this.state.selectedMachine}
        />
      </div>
    );
  }
}

export default App;
