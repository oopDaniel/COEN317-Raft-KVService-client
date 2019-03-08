import React, { Component } from 'react';

const MachineContext = React.createContext();

// Workaround bug in setState with `position`
const positionCache = []
export class MachineProvider extends Component {
  state = {
    selected: null,
    alive: {},
    positions: [],
    leader: null,
    candidate: {} // todo: different color to indicate election
  }
  render () {
    return (
      <MachineContext.Provider value={{
        selected: this.state.selected,
        alive: this.state.alive,
        positions: this.state.positions,
        leader: this.state.leader,
        candidate: this.state.candidate,
        select: machine => this.setState({ selected: machine }),
        unselect: () => this.setState({ selected: null }),
        loadAlive: alive => {
          // TODO: use leader from BE
          const ids = Object.keys(alive)
          const idx = ~~(Math.random() * ids.length)
          this.setState({ alive, leader: ids[idx] })
        },
        isAlive: id => this.state.alive[id] === true,
        toggleMachine: id => this.setState({
          alive: {...this.state.alive, [id]: !this.state.alive[id] }
        }),
        appendPosition: (id, newPos) => {
          // Workaround weird bug in setState for `position`
          positionCache.push({id, ...newPos})
          this.setState({ positions: [...positionCache] })
        }
      }}>
        { this.props.children }
      </MachineContext.Provider>
    )
  }
}

export default MachineContext;
