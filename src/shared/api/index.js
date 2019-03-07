import Axios from 'axios'
import {KNOWN_SERVER_IP} from '../constants'

// TODO: dynamic IP

const instance = Axios.create({
  baseURL: `http://${KNOWN_SERVER_IP}`
});

instance.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const get = async (url) => (await instance({ method: 'get', url })).data
const post = async (url, data) => (await instance({ method: 'post', url, data })).data
const del = async (url, data) => (await instance({ method: 'delete', url, data })).data

export { get, post, del }
export default instance