import React, { Component } from 'react';
import io from 'socket.io-client';
import * as R from 'ramda'
import  {
  Subject,
  BehaviorSubject,
  ReplaySubject,
  fromEvent,
  forkJoin,
  combineLatest,
} from 'rxjs'
import {
  debounceTime,
  bufferCount,
  map,
  first,
  share,
  distinctUntilKeyChanged
} from 'rxjs/operators';
import { KNOWN_SERVER_IPS } from '../constants'

const sockets = KNOWN_SERVER_IPS.map((ip, index) => ({
  ip,
  io: io(ip),
  id: String.fromCharCode(65 + index), // id increases with index and starts from 'A'
}))

// Connection$: indicate alive machines
const connections$ = sockets.map(
  socket => fromEvent(socket.io, 'connect').pipe(
    map(_ => R.pick(['id', 'ip'], socket)),
    first()
  )
)
const connectionReplaySubject = new ReplaySubject()
forkJoin(...connections$).subscribe(connectionReplaySubject)

// Deal with socket event streams
const setLeaderFlag = R.when(
  R.propEq('type', 'broadcastingEntries'),
  R.assoc('leader', true)
)
const io$ = combineLatest(...sockets.map(
  socket => fromEvent(socket.io, 'raftEvent').pipe(
    map(R.compose(
      setLeaderFlag,
      e => R.mergeAll([R.pick(['id', 'ip'], socket), e])
    ))
  )
)).pipe(
  debounceTime(50),
  share(),
)

const isLeader = R.propEq('leader', true)
const leader$ = io$.pipe(
  map(R.compose(
    R.head,
    R.filter(isLeader)
  )),
  distinctUntilKeyChanged('id')
)

const MachineContext = React.createContext();

export class MachineProvider extends Component {
  state = {
    connected$: connectionReplaySubject,
    leader$,
    selected: null,
    alive: {},
    leader: null,
    logs: {},
    state: {}, // Leader, candidate, follower
    heartbeat$: new Subject(),
    receivedHeartbeat$: new Subject(),
    positions$: new Subject(),
    machineAlive1$: new BehaviorSubject(true),
    machineAlive2$: new BehaviorSubject(true),
    machineAlive3$: new BehaviorSubject(true),
    machineAlive4$: new BehaviorSubject(true),
    machineAlive5$: new BehaviorSubject(true),
    // alive$: combineLatest(
    //   this.state.machineAlive1$,
    //   this.state.machineAlive2$,
    //   this.state.machineAlive3$,
    //   this.state.machineAlive4$,
    //   this.state.machineAlive5$
    // )
  }

  render () {
    return (
      <MachineContext.Provider value={{
        connected$: this.state.connected$,
        leader$: this.state.leader$,
        selected: this.state.selected,
        alive: this.state.alive,
        logs: this.state.logs,
        selectedLogs: (this.state.selected && this.state.logs[this.state.selected] && this.state.logs[this.state.selected].logs) || [],
        updateLog: (id, newLog) => this.setState({
          logs: {
            ...this.state.logs,
            [id]: newLog
          }
        }),
        positions$: this.state.positions$.pipe(
          bufferCount(5),
          map(pos => pos.reduce((map, pos) => (map[pos.id] = pos) && map, {}))
        ),
        leader: this.state.leader,
        candidate: this.state.candidate,
        heartbeat$: this.state.heartbeat$.pipe(debounceTime(50)),
        receivedHeartbeat$: this.state.receivedHeartbeat$,
        select: machine => this.setState({ selected: machine }),
        unselect: () => this.setState({ selected: null }),
        // loadAlive: alive => {
        //   // TODO: use leader from BE
        //   const ids = Object.keys(alive)
        //   const idx = ~~(Math.random() * ids.length)
        //   this.setState({ alive, leader: ids[idx] })
        // },
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
        notifySentHeartbeat: () => this.state.heartbeat$.next(Math.random()),
        notifyReceivedHeartbeat: id => this.state.receivedHeartbeat$.next(id)
      }}>
        { this.props.children }
      </MachineContext.Provider>
    )
  }
}

export default MachineContext;
