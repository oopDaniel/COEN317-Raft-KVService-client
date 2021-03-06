// TODO: Replace this with IP from AWS
export const KNOWN_SERVER_IP = '127.0.0.1:8080'
// TODO: Replace this with IP from AWS
export const KNOWN_SERVER_IPS = [
  'http://localhost:81',
  'http://localhost:82',
  'http://localhost:83',
  'http://localhost:84',
  'http://localhost:85'
]

export const IS_DEV = true

export const HEARTBEAT_INTERVAL = 6000
export const MSG_SINGLE_TRIP_TIME = 2000
export const ELECTION_DURATION_MIN = 24000
export const ELECTION_DURATION_MAX = 36000
export const ELECTION_DURATION_DIFF = ELECTION_DURATION_MAX - ELECTION_DURATION_MIN