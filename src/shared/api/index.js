import Axios from 'axios'

const instance = Axios.create()
instance.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'

const get = async (url) => (await instance({ method: 'get', url })).data
const post = async (url, data) => (await instance({ method: 'post', url, data })).data
const del = async (url, data) => (await instance({ method: 'delete', url, data })).data

const getInfo = ip => get(`${ip}/inspect`)
const turnOn = ip => post(`${ip}/turn_on`)
const turnOff = ip => post(`${ip}/turn_off`)
const getState = (ip, key) => get(`${ip}/get?key=${key}&wait=1`)
const putState = async (ip, data) => {
  const res = await post(`${ip}/put?key=${data.key}&value=${data.value}`) // ???
  if (!res.success) throw res.message
  return res
}

export {
  get,
  post,
  del,
  getInfo,
  turnOn,
  turnOff,
  getState,
  putState,
}
export default instance