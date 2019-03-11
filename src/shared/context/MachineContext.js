import React, { useState, useEffect } from 'react'
import { useObservable } from 'rxjs-hooks'
import io from 'socket.io-client'
import * as R from 'ramda'
import  {
  Subject,
  BehaviorSubject,
  ReplaySubject,
  fromEvent,
  forkJoin,
  combineLatest,
  from,
  timer,
  race,
  of,
} from 'rxjs'
import {
  debounceTime,
  bufferCount,
  map,
  startWith,
  take,
  first,
  share,
  filter,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  tap,
  delay,
  concatMap,
  concatMapTo,
} from 'rxjs/operators'
import { getInfo } from '../api'
import { mapIndexed, exist } from '../utils'
import { KNOWN_SERVER_IPS, HEARTBEAT_INTERVAL } from '../constants'

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
const connectionReplaySubject = new ReplaySubject().pipe(share())
forkJoin(...connections$)
  .pipe(first()) // only need to recognize available machines once
  .subscribe(connectionReplaySubject)

// Pipe socket events into streams
const setLeaderFlag = R.when(
  R.propEq('type', 'broadcastingEntries'),
  R.assoc('leader', true)
)

const io$ = combineLatest(...sockets.map(
  socket =>
    timer(0, HEARTBEAT_INTERVAL).pipe(
      concatMapTo(race(
        fromEvent(socket.io, 'raftEvent').pipe(
          // tap(q => console.log('sock', q)),
          map(R.compose(
            setLeaderFlag,
            e => R.mergeAll([R.pick(['id', 'ip'], socket), e])
          )),
          startWith(null), // Unify stream start time
          take(2)
        ),
        of('timeout').pipe(delay(1000)) // Somehow necessary
      ))
    )
)).pipe(
  debounceTime(2000),
  filter(R.complement(R.all(R.isNil))),
  share(),
)

io$.subscribe(e => console.log('%c[IO event]', 'color:lightgreen;font-size:1.2em', e))

// Liveness of machines
const machineLivenessSubjects = sockets.map(socket => ({ ...socket, sub: new BehaviorSubject(true) }))
const machineLivenessSubjectMap = machineLivenessSubjects
  .reduce((map, sub) => (map[sub.id] = sub) && map, {})
const mergedMachineLiveness$ = combineLatest(...machineLivenessSubjects.map(s => s.sub))
  .pipe(map(mapIndexed((alive, index) => ({ alive, id: sockets[index].id }))))

const liveness$ = mergedMachineLiveness$.pipe(
  map(arr => arr.reduce((m, l) => {
    m[l.id] = l.alive
    return m
  }, {}))
)

// Stream of current leader
const isLeader = R.propEq('leader', true)
const filterBasedOnLiveness = ([leader, liveness]) => liveness[leader.index].alive ? leader : null
const leaderHeartbeat$ = io$.pipe(
  map(R.compose(
    R.head,
    R.filter(isLeader),
    // Need index to find correct observable of liveness for filtering
    mapIndexed((v, index) => ({ ...v, index }))
  )),
  filter(exist),
  debounceTime(3000), // suppose heartbeat interval will greater than 3 sec
  // tap(l => console.log('%c[leader] heartbeat:', 'color:grey', l)),
)
const leaderFromIO$ = leaderHeartbeat$.pipe(
  distinctUntilKeyChanged('id'),
  tap(l => console.log('%c[leader] (distinct)', 'color:yellow;font-size:2em', l && l.id))
)
const compareWithIdIfExists = R.ifElse(
  R.compose(
    R.any(R.isNil),
    R.unapply(R.identity), // to array
  ),
  R.equals,
  R.eqProps('id')
)
const leader$ = combineLatest(
  leaderFromIO$,
  mergedMachineLiveness$
).pipe(
  map(filterBasedOnLiveness),
  distinctUntilChanged(compareWithIdIfExists)
)

// Timer of follower
const followerTimer$ = io$.pipe(
  map(R.compose(
    R.reduce((m, e) => {
      m[e.id] = e.timer * 1000 // sec to ms
      return m
    }, {}),
    R.reject(R.either(isLeader, R.complement(R.has('id')))),
    // Need index to find correct observable of liveness for filtering
    mapIndexed((v, index) => ({ ...v, index }))
  ))
)

// Machine info
const machineInfo$ = new ReplaySubject(5).pipe(
  bufferCount(5),
  map(pos => pos.reduce((map, pos) => (map[pos.id] = pos) && map, {})),
  first(),
  share()
)

const MachineContext = React.createContext()

export function MachineProvider (props) {
  const [logs, setLogs] = useState({})
  const [selected, setSelected] = useState(null)

  // ID, IP, positions on page, etc.
  const machines = useObservable(() => connectionReplaySubject, []) // 2nd arg: default value
  const machineInfo = useObservable(() => machineInfo$)

  const liveness = useObservable(() => liveness$)

  const leader = useObservable(() => leader$)

  const state = {
    heartbeat$: new Subject(),
    receivedHeartbeat$: new Subject(),
  }

  useMachineStateInitializer(machines)

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

      // Machine state
      machineLivenessSubjectMap,
      liveness,
      toggleMachine: () => {
        const prevState = liveness[selected]
        if (prevState !== undefined) {
          machineLivenessSubjectMap[selected].sub.next(!prevState)
        }
      },

      // Raft state
      leader,
      leaderHeartbeat$,
      followerTimer$,

      // TODO
      heartbeat$: state.heartbeat$.pipe(debounceTime(50)),
      receivedHeartbeat$: state.receivedHeartbeat$,

      // Machine selection
      selected,
      select: setSelected,
      unselect: () => setSelected(null),

      notifySentHeartbeat: () => state.heartbeat$.next(Math.random()),
      notifyReceivedHeartbeat: id => state.receivedHeartbeat$.next(id)
    }}>
      { props.children }
    </MachineContext.Provider>
  )
}

function useMachineStateInitializer (machines) {
  useEffect(() => {
    if (machines.length) {
      const { unsubscribe } = from(machines).pipe(
        concatMap(m => getInfo(m.ip)),
        map((e, i) => ({ ...machines[i], alive: R.path(['data', 'on/off'], e) }))
      ).subscribe(e => {
        if (!e.alive) {
          machineLivenessSubjectMap[e.id].sub.next(false)
        }
      })
      return unsubscribe
    }
  }, [machines])
}

export default MachineContext
