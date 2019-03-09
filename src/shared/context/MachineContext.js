import React, { Component } from 'react';
import  { Subject } from 'rxjs'
import { debounceTime } from 'rxjs/operators';
const MachineContext = React.createContext();

// Workaround bug in setState with `position`
const positionCache = []

export class MachineProvider extends Component {
  state = {
    selected: null,
    alive: {},
    positions: [],
    leader: null,
    candidate: {}, // todo: different color to indicate election
    heartbeat$: new Subject(),
    receivedHeartbeat$: new Subject()
  }

  render () {
    return (
      <MachineContext.Provider value={{
        selected: this.state.selected,
        alive: this.state.alive,
        positions: this.state.positions,
        leader: this.state.leader,
        candidate: this.state.candidate,
        heartbeat$: this.state.heartbeat$.pipe(debounceTime(50)),
        receivedHeartbeat$: this.state.receivedHeartbeat$,
        select: machine => this.setState({ selected: machine }),
        unselect: () => this.setState({ selected: null }),
        loadAlive: alive => {
          // TODO: use leader from BE
          const ids = Object.keys(alive)
          const idx = ~~(Math.random() * ids.length)
          this.setState({ alive, leader: ids[idx] })
        },
        isAlive: id => this.state.alive[id] === true,
        toggleMachine: id => {
          // mock leader re-election. TODO: use leader from server
          const newState = !this.state.alive[id]
          let newLeader = null

          if (!newState && id === this.state.leader) {
            const ids = Object.keys(this.state.alive)
              .filter(aliveId => aliveId !== id)
            const idx = ~~(Math.random() * ids.length)
            newLeader = ids[idx]
            setTimeout(() => this.setState({
              leader: newLeader
            }), 30000)
          }

          if (newLeader === null) {
            this.setState({
              alive: {...this.state.alive, [id]: newState }
            })
          } else {
            this.setState({
              alive: {...this.state.alive, [id]: newState },
              leader: null
            })
          }

        },
        appendPosition: (id, newPos) => {
          // Workaround weird bug in setState for `position`
          positionCache.push({id, ...newPos})
          this.setState({ positions: [...positionCache] })
        },
        notifySentHeartbeat: () => this.state.heartbeat$.next(Math.random()),
        notifyReceivedHeartbeat: id => this.state.receivedHeartbeat$.next(id)
      }}>
        { this.props.children }
      </MachineContext.Provider>
    )
  }
}

export default MachineContext;
