import React, { useContext } from 'react'
import NotificationContext from '../context/NotificationContext'
import './Notification.css'

function Notification () {
  const { opened, text } = useContext(NotificationContext)
  return (
    <div className={`notification flex-center ${opened ? 'show' : ''}`}>
      { text }
    </div>
  )
}

export default Notification
