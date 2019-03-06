import React, { Component } from 'react';
import style from './App.css';
import Machines from './Machines/Machines'
import Sidebar from './Sidebar/Sidebar'

class App extends Component {
  constructor() {
    super()
    this.state = {
      selectedMachine: null,
      commands: []
    }
    this.handleMachineSelection = this.handleMachineSelection.bind(this)
    this.appendCommand = this.appendCommand.bind(this)
  }

  appendCommand (newCommand) {
    this.setState({ commands: [...this.state.commands, newCommand] })
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
          customClass={style.machine}
          selectMachine={this.handleMachineSelection}
          selectedMachine={this.state.selectedMachine}
        />
        <Sidebar
          customClass={style.sidebar}
          selectedMachine={this.state.selectedMachine}
          commands={this.state.commands}
          appendCommand={this.appendCommand}
        />
      </div>
    );
  }
}

export default App;
