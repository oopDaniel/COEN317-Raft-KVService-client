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
  bufferTime,
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
import { KNOWN_SERVER_IPS } from '../constants'

// ========= Some necessary processing to the raw socket msg =========
const setLeaderFlag = R.when(
  R.anyPass([
    R.propEq('type', 'broadcastingEntries'),
    R.propEq('type', 'commandReceived'),
    R.propEq('to', 'L'),
  ]),
  R.assoc('leader', true)
)
const unifyTimestamp = R.when(
  R.has('timer'),
  R.evolve({timer: R.multiply(1000)})
)


// ========= Handle sockets =========
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
        unifyTimestamp,
        setLeaderFlag,
        e => R.mergeAll([identityObj, e])
      )),
      startWith(null), // Indicate socket exists
    )
  }
})

// Connection$: indicate alive machines. (may be remove later if ever)
const connections$ = sockets.map(so => so.conn$)
const connectionReplaySubject = new ReplaySubject().pipe(share())
forkJoin(...connections$)
  .pipe(first()) // only need to recognize available machines once
  .subscribe(connectionReplaySubject)

const rawIos = sockets.map((socket, index) => socket.io$.pipe(map(R.assoc('index', index))))
const rawIoMerged$ = merge(...rawIos)


// ========= Liveness of machines =========
const machineLivenessSubjects = sockets.map(
  socket => new BehaviorSubject(true).pipe(map(alive => ({ alive, ...socket })))
)
const machineLivenessSubjectMap = sockets
  .reduce((map, soc, idx) => (map[soc.id] = machineLivenessSubjects[idx]) && map, {})
const liveness$ = combineLatest(...machineLivenessSubjects).pipe(
  map(arr => arr.reduce((m, l) => {
    m[l.id] = l.alive
    return m
  }, {}))
)


// ========= Stream of leader / follower / candidate =========
const isLeader = R.propEq('leader', true)
const isExistentLeader = R.both(exist, isLeader)
const isExistentAndNotLeader = R.both(exist, R.complement(isLeader))

// Follower
const rawFollowerMsg$ = rawIoMerged$.pipe(filter(isExistentAndNotLeader))
const followerMsg$ = combineLatest(rawFollowerMsg$, liveness$).pipe(
  map(([follower, liveness]) => ({ ...follower, alive: liveness[follower.id] })),
)
// Candidate
const candidate$ = new Subject() // starts leader election
// Leader
const leaderMsg$ = rawIoMerged$.pipe(filter(isExistentLeader))
// Receive individual socket msg from single component. Should also be a source of leader
const convertToLeaderMsgFromSingleSocket$ = new Subject()

const compareWithIdIfExists = R.ifElse(
  R.compose(
    R.any(R.isNil),
    R.unapply(R.identity), // to array
  ),
  R.equals,
  R.eqProps('id')
)
const filterBasedOnLiveness = ([leader, liveness]) => leader && liveness[leader.id] ? leader : null

 // Suppose heartbeat interval is 6 sec, 4 should be sufficient.
const leaderHeartbeat$ = leaderMsg$.pipe(debounceTime(4000))

const allLeaderMsg$ = merge(
  leaderMsg$,
  convertToLeaderMsgFromSingleSocket$
).pipe(distinctUntilKeyChanged('id'))

// The current leader. Should always be the single source of truth
const leader$ = combineLatest(allLeaderMsg$, liveness$).pipe(
  map(filterBasedOnLiveness),
  distinctUntilChanged(compareWithIdIfExists),
  tap(l => console.log('%c[leader]', 'color:yellow;font-size:2em', l && l.id))
)


// ========= UI Heartbeat - required for msg circle delivery =========
const receivedUiHeartbeat$ = new Subject().pipe(debounceTime(100))
const receivedUiAck$ = new Subject()
const receivedUiHeartbeatAndAck$ = receivedUiAck$.pipe(
  startWith(null),
  withLatestFrom(receivedUiHeartbeat$.pipe(
    startWith(null),
    withLatestFrom(followerMsg$.pipe(
      filter(R.has('timer')),
      debounceTime(200)
    )),
    map(R.nth(0))
  )),
  filter(R.all(exist)),
  first()
)


// Timer of all followers. Required for sending ack in MsgMap component
const followerTimer$ = receivedUiHeartbeat$.pipe(
  withLatestFrom(
    followerMsg$.pipe(
      bufferTime(1000),
      map(R.compose(
        R.map(R.unless(R.propEq('alive', true), R.assoc('timer', -1))),
        R.reject(R.isNil)
      )),
      startWith([])
    )
  ),
  map(R.compose(
    R.reduce((m, f) => (m[f.id] = f.timer) && m, {}),
    R.nth(1)
  )),
  debounceTime(1000)
)


// ========= Command related =========
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

// const commandValid$ = followerTimer$.pipe(
//   withLatestFrom(command$),
//   map(([timerMap, cmd]) => {
//     const cmdSet = { ...cmd, applied: [] }
//     R.keys(timerMap).forEach(id => {
//       if (timerMap[id] !== -1) cmdSet.applied.push(id)
//     })
//     return cmdSet
//   }),
//   distinctUntilKeyChanged('cmd')
// )

// commandValid$.subscribe(e => console.log('%cvalid comnd ', 'color:green;font-size:2rem',e))

// Machine info
const machinePosMeta$ = new ReplaySubject(5).pipe(
  bufferCount(5),
  map(pos => pos.reduce((map, pos) => (map[pos.id] = pos) && map, {})),
  first(),
  share()
)

// We finally reached context!

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
          machineLivenessSubjectMap[selected].next(!prevState)
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
      // commandValid$,

      // For single machine syncing donut
      sockets,

      // UI states for circle msg
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
          machineLivenessSubjectMap[e.id].next(false)
        }
      })
      return unsubscribe
    }
  }, [machines])
}

export default MachineContext
