import React, { useState, useEffect } from 'react'
import { useObservable } from 'rxjs-hooks'
import socketIO from 'socket.io-client'
import * as R from 'ramda'
import  {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  fromEvent,
  forkJoin,
  combineLatest,
  from,
  timer,
  race,
  of,
  merge,
} from 'rxjs'
import {
  debounceTime,
  bufferCount,
  map,
  startWith,
  first,
  share,
  filter,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  tap,
  delay,
  concatMap,
  concatMapTo,
  withLatestFrom,
} from 'rxjs/operators'
import { getInfo } from '../api'
import { mapIndexed, exist } from '../utils'
import { KNOWN_SERVER_IPS, HEARTBEAT_INTERVAL } from '../constants'

// Use `broadcastingEntries` to identify leader
const setLeaderFlag = R.when(
  R.anyPass([
    R.propEq('type', 'broadcastingEntries'),
    R.propEq('type', 'commandReceived'),
    R.propEq('to', 'L'),
  ]),
  R.assoc('leader', true)
)

// Handle sockets
const sockets = KNOWN_SERVER_IPS.map((ip, index) => {
  const id = String.fromCharCode(65 + index) // id increases with index and starts from 'A'
  const io = socketIO(ip)
  const identityObj = { id, ip }
  return {
    ...identityObj,
    io,
    conn$: fromEvent(io, 'connect').pipe(
      map(_ => identityObj),
      first(),
    ),
    io$: fromEvent(io, 'raftEvent').pipe(
      // tap(q => console.log('<socks>', q)),
      map(R.compose(
        setLeaderFlag,
        e => R.mergeAll([identityObj, e])
      )),
      startWith(null), // Indicate socket exists
    )
  }
})

// Connection$: indicate alive machines
const connections$ = sockets.map(so => so.conn$)
const connectionReplaySubject = new ReplaySubject().pipe(share())
forkJoin(...connections$)
  .pipe(first()) // only need to recognize available machines once
  .subscribe(connectionReplaySubject)

const rawIos = sockets.map(socket => socket.io$)
const rawIoMerged$ = combineLatest(...rawIos)

const rawIoWithTimeout$ = combineLatest(...sockets.map(
  socket =>
    timer(0, HEARTBEAT_INTERVAL).pipe(
      concatMapTo(race(
        socket.io$,
        of({ id: socket.id, ip: socket.ip, timeout: true })
          .pipe(delay(HEARTBEAT_INTERVAL)) // Somehow necessary
      ))
    )
)).pipe(share())

const io$ = rawIoWithTimeout$.pipe(
  debounceTime(1000),
  filter(R.complement(R.all(R.isNil))),
)

// rawIoWithTimeout$.subscribe(e => console.log('%c[IO event]', 'color:lightgreen;font-size:1.2em', e))

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
const isExistentLeader = R.both(exist, isLeader)
const isExistentAndNotLeader = R.both(exist, R.complement(isLeader))
const findAndAddIndexToLeader = R.converge(R.assoc('index'), [R.findIndex(isExistentLeader), R.find(isExistentLeader)])
const leaderMsg$ = rawIoMerged$.pipe(
  filter(R.any(isExistentLeader)),
  map(findAndAddIndexToLeader),
)

// Ensure new leader won't be ignore, which happens when using only `leaderMsg$` :(
const convertToLeaderMsgFromSingleSocket$ = new Subject()

const leaderHeartbeat$ = leaderMsg$.pipe(
  debounceTime(4000) // suppose heartbeat interval is 6 sec, 4 should be sufficient.
)
const compareWithIdIfExists = R.ifElse(
  R.compose(
    R.any(R.isNil),
    R.unapply(R.identity), // to array
  ),
  R.equals,
  R.eqProps('id')
)
const filterBasedOnLiveness = ([leader, liveness]) => leader && liveness[leader.index].alive ? leader : null

const allLeaderMsg$ = merge(
  leaderMsg$,
  convertToLeaderMsgFromSingleSocket$
).pipe(distinctUntilKeyChanged('id'))

const leader$ = combineLatest(allLeaderMsg$, mergedMachineLiveness$).pipe(
  map(filterBasedOnLiveness),
  distinctUntilChanged(compareWithIdIfExists),
  tap(l => console.log('%c[leader]', 'color:yellow;font-size:2em', l && l.id))
)

// Timer of all followers. Required for sending ack in MsgMap component
const followerTimer$ = io$.pipe(
  map(R.compose(
    R.reduce((m, e) => {
      m[e.id] = (e.timeout || e.timer === undefined) ? -1 : e.timer * 1000 // sec to ms
      return m
    }, {}),
    R.reject(R.anyPass([isLeader, R.complement(R.has('id'))])),
    // Need index to find correct observable of liveness for filtering
    mapIndexed((v, index) => ({ ...v, index }))
  ))
)

// Command related
const command$ = leaderMsg$.pipe(
  filter(R.propEq('type', 'commandReceived')),
  debounceTime(1000),
)

const leaderHeartbeatWithCommand$ = leaderHeartbeat$.pipe(
  withLatestFrom(command$.pipe(startWith(null))),
  map(([heartbeat, cmd]) => {
    heartbeat.cmd = cmd
    return heartbeat
  })
)

const commandValid$ = followerTimer$.pipe(
  withLatestFrom(command$),
  map(([timerMap, cmd]) => {
    const cmdSet = { ...cmd, applied: [] }
    R.keys(timerMap).forEach(id => {
      if (timerMap[id] !== -1) cmdSet.applied.push(id)
    })
    return cmdSet
  }),
  distinctUntilKeyChanged('cmd')
)

commandValid$.subscribe(e => console.log('%cvalid comnd ', 'color:green;font-size:2rem',e))

// Machine info
const machinePosMeta$ = new ReplaySubject(5).pipe(
  bufferCount(5),
  map(pos => pos.reduce((map, pos) => (map[pos.id] = pos) && map, {})),
  first(),
  share()
)

// UI Heartbeat - required for replying 1st ack
const uiHeartbeat$ = new Subject().pipe(debounceTime(50))
const receivedUiHeartbeat$ = new Subject()
const receivedUiAck$ = new Subject()
const anyFollowerTimer$ = rawIoMerged$.pipe(
  filter(R.any(isExistentAndNotLeader)),
  map(R.find(isExistentAndNotLeader)),
)
const receivedUiHeartbeatAndAck$ = receivedUiAck$.pipe(
  startWith(null),
  withLatestFrom(receivedUiHeartbeat$.pipe(
    startWith(null),
    withLatestFrom(anyFollowerTimer$.pipe(
      filter(R.has('timer')),
      debounceTime(200)
    )),
    map(R.nth(0))
  )),
  filter(R.all(exist)),
  first()
)

// Follower starts leader election
const candidate$ = new Subject()

const MachineContext = React.createContext()

export function MachineProvider (props) {
  const [logs, setLogs] = useState({})
  const [selected, setSelected] = useState(null)

  // ID, IP, positions on page, etc.
  const machines = useObservable(() => connectionReplaySubject, []) // 2nd arg: default value
  const machinePosMeta = useObservable(() => machinePosMeta$)

  const liveness = useObservable(() => liveness$)

  const leader = useObservable(() => leader$)
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
      machinePosMeta$, // Subject to emit data
      machinePosMeta, // Parsed data

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
      leaderHeartbeatWithCommand$,
      convertToLeaderMsgFromSingleSocket$,
      followerTimer$,
      candidate$,

      // Command
      command$,
      commandValid$,

      // For single machine syncing donut
      sockets,

      // UI states for circle msg
      uiHeartbeat$,
      receivedUiHeartbeat$,
      receivedUiAck$,
      receivedUiHeartbeatAndAck$,

      // Machine selection
      selected,
      select: setSelected,
      unselect: () => setSelected(null),

      // notifyUiReceivedHeartbeat: id => receivedUiHeartbeat$.next(id)
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
