import React from 'react';
import './Button.css';

const noop = () => {}
function Button ({
  customClass = '',
  onClick = noop,
  children = 'Click me',
  disabled = false,
  active = false
}) {

  return (
    <span
      className={`btn ${customClass} ${disabled ? 'disabled': ''} ${active ? 'active' : ''}`}
      onClick={disabled ? noop : onClick}
    >
      { children }
    </span>
  );
}

export default Button;
