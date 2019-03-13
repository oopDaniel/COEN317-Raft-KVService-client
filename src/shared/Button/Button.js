import React from 'react'
import './Button.css'

const noop = () => {}
function Button ({
  customClass = '',
  onClick = noop,
  children = 'Click me',
  disabled = false,
  active = false,
  processing = false
}) {
  let btnClassName = 'btn '
  if (customClass) btnClassName += customClass
  if (disabled) btnClassName += ' disabled'
  if (active) btnClassName += ' active'
  if (processing) btnClassName += ' processing'
  return (
    <span
      className={btnClassName.trim()}
      onClick={disabled ? noop : onClick}
    >
      { processing
        ? <span className="spinner-wrapper">
            <span className="spinner"></span>&nbsp;
        </span>
        : children
      }
    </span>
  )
}

export default Button
