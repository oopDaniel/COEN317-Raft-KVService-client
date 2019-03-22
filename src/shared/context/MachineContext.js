import React, { useState, useEffect } from 'react'
import { useObservable } from 'rxjs-hooks'
import socketIO from 'socket.io-client'
import * as R from 'ramda'
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  fromEvent,
  forkJoin,
  combineLatest,
  from,
  merge,
} from 'rxjs'
import {
  bufferCount,
  map,
  startWith,
  first,
  share,
  filter,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  tap,
  concatMap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators'
import { getInfo } from '../api'
import { exist, log } from '../utils'
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
const toInt = n => ~~n
const unifyTimestamp = R.when(
  R.has('timer'),
  R.evolve({
    timer: R.compose(
      toInt,
      R.multiply(1000)
    ),
  })
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
      first()
    ),
    io$: fromEvent(io, 'raftEvent').pipe(
      // tap(q => log.info('<socks>', q)),
      map(
        R.compose(
          unifyTimestamp,
          setLeaderFlag,
          e => R.mergeAll([identityObj, e])
        )
      ),
      startWith(null) // Indicate socket exists
    ),
  }
})

// Connection$: indicate alive machines. (may be remove later if ever)
const connections$ = sockets.map(so => so.conn$)
const connectionReplaySubject = new ReplaySubject().pipe(share())
forkJoin(...connections$)
  .pipe(first()) // only need to recognize available machines once
  .subscribe(connectionReplaySubject)

const rawIos = sockets.map((socket, index) =>
  socket.io$.pipe(map(R.assoc('index', index)))
)
const rawIoMerged$ = merge(...rawIos).pipe(share())

// ========= Liveness of machines =========
const machineLivenessSubjects = sockets.map(socket =>
  new BehaviorSubject(true).pipe(map(alive => ({ alive, ...socket })))
)
const machineLivenessSubjectMap = sockets.reduce(
  (map, soc, idx) => (map[soc.id] = machineLivenessSubjects[idx]) && map,
  {}
)
const liveness$ = combineLatest(...machineLivenessSubjects).pipe(
  map(arr =>
    arr.reduce((m, l) => {
      m[l.id] = l.alive
      return m
    }, {})
  )
)

// ========= Stream of leader / follower / candidate =========
const isLeader = R.propEq('leader', true)
const isExistentLeader = R.both(exist, isLeader)
const isExistentAndNotLeader = R.both(exist, R.complement(isLeader))

// Follower
const rawFollowerMsg$ = rawIoMerged$.pipe(filter(isExistentAndNotLeader))
const followerMsg$ = combineLatest(rawFollowerMsg$, liveness$).pipe(
  map(([follower, liveness]) => ({ ...follower, alive: liveness[follower.id] }))
)
// Candidate
const candidate$ = new Subject() // starts leader election
// Leader
const leaderMsg$ = rawIoMerged$.pipe(
  filter(isExistentLeader),
  share()
)
// Receive individual socket msg from single component. Should also be a source of leader
const convertToLeaderMsgFromSingleSocket$ = new Subject()

const compareWithIdIfExists = R.ifElse(
  R.compose(
    R.any(R.isNil),
    R.unapply(R.identity) // to array
  ),
  R.equals,
  R.eqProps('id')
)
const filterBasedOnLiveness = ([leader, liveness]) =>
  leader && liveness[leader.id] ? leader : null

const allLeaderMsg$ = merge(
  leaderMsg$,
  convertToLeaderMsgFromSingleSocket$
).pipe(share())
const allDistinctLeaderMsg$ = allLeaderMsg$.pipe(distinctUntilKeyChanged('id'))

// The current leader. Should always be the single source of truth
const leader$ = combineLatest(allDistinctLeaderMsg$, liveness$).pipe(
  map(filterBasedOnLiveness),
  distinctUntilChanged(compareWithIdIfExists),
  tap(l => log.log('%c[leader]', 'color:yellow;font-size:2em', l && l.id))
)

// const existentLeader$ = leader$.pipe(filter(exist))
// const prevExistentLeader$ = existentLeader$.pipe(
//   pairwise(),
//   map(R.nth(0)),
//   tap(l => log.log('%c[prev leader]', 'color:green;font-size:1.2em', l && l.id))
// )

// Suppose heartbeat interval is 6 sec, 4 should be sufficient.
const leaderHeartbeat$ = combineLatest(allLeaderMsg$, liveness$).pipe(
  // tap(e => log.log(`(${e[0] && e[0].id}) heartbeating. Liveness:`, e[1])),
  filter(([leader, liveness]) => leader && liveness[leader.id]),
  map(R.nth(0)),
  throttleTime(2000)
)

// ========= UI Heartbeat - required for msg circle delivery =========
const receivedUiHeartbeat$ = new Subject().pipe(throttleTime(100))
const receivedUiAck$ = new Subject()
const receivedUiHeartbeatAndAck$ = receivedUiAck$.pipe(
  startWith(null),
  withLatestFrom(
    receivedUiHeartbeat$.pipe(
      startWith(null),
      withLatestFrom(
        followerMsg$.pipe(
          filter(R.has('timer')),
          throttleTime(200)
        )
      ),
      map(R.nth(0))
    )
  ),
  filter(R.all(exist)),
  first()
)

// ========= Timer of all followers =========
// const followerTimer$ = followerMsg$.pipe(
//   buffer(receivedUiHeartbeat$),
//   filter(R.complement(R.isEmpty)),
//   map(R.compose(
//     R.reduce((m, f) => ({...m, [f.id]: f}), {}),
//     R.map(R.unless(R.propEq('alive', true), R.assoc('timer', -1)))
//   ))
// )

// ========= Command related =========
const command$ = leaderMsg$.pipe(
  filter(R.propEq('type', 'commandReceived')),
  throttleTime(500),
  map(R.prop('cmd'))
)
const leaderHeartbeatWithCommand$ = leaderHeartbeat$.pipe(
  withLatestFrom(command$.pipe(startWith(null))),
  map(([heartbeat, cmd = '']) => {
    heartbeat.cmd = cmd
    return heartbeat
  })
)

// Machine info
const machinePosMeta$ = new ReplaySubject(5).pipe(
  bufferCount(5),
  map(pos => pos.reduce((map, pos) => (map[pos.id] = pos) && map, {})),
  share()
)

// We finally reached context!

const MachineContext = React.createContext()
export function MachineProvider(props) {
  const [logs, setLogs] = useState({})
  const [selected, setSelected] = useState(null)

  // ID, IP, positions on page, etc.
  const machines = useObservable(() => connectionReplaySubject, []) // 2nd arg: default value
  const machinePosMeta = useObservable(() => machinePosMeta$)

  const liveness = useObservable(() => liveness$)

  const leader = useObservable(() => leader$)
  useMachineStateInitializer(machines)

  return (
    <MachineContext.Provider
      value={{
        // Log related
        logs,
        selectedLogs: (selected && logs[selected] && logs[selected].logs) || [],
        updateLog: (id, newLog) =>
          setLogs({
            ...logs,
            [id]: newLog,
          }),

        // Machines and their info
        machines,
        machinePosMeta$, // Subject to emit data
        machinePosMeta, // Parsed data

        // Machine state
        machineLivenessSubjectMap,
        liveness$,
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
        candidate$,

        // Command
        command$,

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
      }}
    >
      {props.children}
    </MachineContext.Provider>
  )
}

function useMachineStateInitializer(machines) {
  useEffect(() => {
    if (machines.length) {
      const { unsubscribe } = from(machines)
        .pipe(
          concatMap(m => getInfo(m.ip)),
          map((e, i) => ({
            ...machines[i],
            alive: R.path(['data', 'on/off'], e),
          }))
        )
        .subscribe(e => {
          if (!e.alive) {
            machineLivenessSubjectMap[e.id].next(false)
          }
        })
      return unsubscribe
    }
  }, [machines])
}

export default MachineContext
