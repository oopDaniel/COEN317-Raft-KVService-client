import React, { Component } from 'react';

const MachineContext = React.createContext();

export class MachineProvider extends Component {
  state = {
    selected: null,
    alive: {}
  }
  render () {
    return (
      <MachineContext.Provider value={{
        selected: this.state.selected,
        alive: this.state.alive,
        select: (machine) => this.setState({ selected: machine }),
        unselect: () => this.setState({ selected: null }),
        loadAlive: (alive) => this.setState({ alive }),
        isAlive: id => this.state.alive[id] === true,
        toggleMachine: id => this.setState({
          alive: {...this.state.alive, [id]: !this.state.alive[id] }
        })
      }}>
        { this.props.children }
      </MachineContext.Provider>
    )
  }
}

export default MachineContext;
