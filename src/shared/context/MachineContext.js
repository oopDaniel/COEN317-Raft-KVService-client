import React, { useState } from 'react';
import { useObservable } from 'rxjs-hooks';
import io from 'socket.io-client';
import * as R from 'ramda'
import  {
  Subject,
  // BehaviorSubject,
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
  distinctUntilKeyChanged,
  // tap,
} from 'rxjs/operators';
import { KNOWN_SERVER_IPS } from '../constants'

// Handle sockets
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
forkJoin(...connections$)
  .pipe(first()) // only need to recognize available machines once
  .subscribe(connectionReplaySubject)

// Pipe socket events into streams
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

export function MachineProvider (props) {
  const [logs, setLogs] = useState({})
  const [selected, setSelected] = useState(null)

  // ID, IP, positions on page, etc.
  const machines = useObservable(() => connectionReplaySubject, []) // 2nd arg: default value
  const machineInfo$ = new Subject()
  const machineInfo = useObservable(() => machineInfo$.pipe(
    bufferCount(5),
    map(pos => pos.reduce((map, pos) => (map[pos.id] = pos) && map, {})),
    first()
  ))

  const leader = useObservable(() => leader$)

  const state = {
    heartbeat$: new Subject(),
    receivedHeartbeat$: new Subject(),
  }

  return (
    <MachineContext.Provider value={{
      // Log related
      logs,
      selectedLogs: (selected && logs[selected] && logs[selected].logs) || [],
      updateLog: (id, newLog) => setLogs({
        ...logs,
        [id]: newLog
      }),

      // Machines and their info
      machines,
      machineInfo$, // Subject to emit data
      machineInfo, // Parsed data

      // Raft state
      leader,

      // TODO
      heartbeat$: state.heartbeat$.pipe(debounceTime(50)),
      receivedHeartbeat$: state.receivedHeartbeat$,

      // Machine selection
      selected,
      select: setSelected,
      unselect: () => setSelected(null),

      // TODO
      toggleMachine: id => {
        // mock leader re-election. TODO: use leader from server
        // const newState = !state.alive[id]
        // let newLeader = null

        // if (!newState && id === state.leader) {
        //   const ids = Object.keys(state.alive)
        //     .filter(aliveId => aliveId !== id)
        //   const idx = ~~(Math.random() * ids.length)
        //   newLeader = ids[idx]
        //   setTimeout(() => this.setState({
        //     leader: newLeader
        //   }), 30000)
        // }

        // if (newLeader === null) {
        //   this.setState({
        //     alive: {...state.alive, [id]: newState }
        //   })
        // } else {
        //   this.setState({
        //     alive: {...state.alive, [id]: newState },
        //     leader: null
        //   })
        // }

      },
      notifySentHeartbeat: () => state.heartbeat$.next(Math.random()),
      notifyReceivedHeartbeat: id => state.receivedHeartbeat$.next(id)
    }}>
      { props.children }
    </MachineContext.Provider>
  )

}

export default MachineContext;
