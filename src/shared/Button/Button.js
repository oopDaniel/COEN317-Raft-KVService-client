import React from 'react';
import './Button.css';

function Button ({
  customClass = '',
  onClick = () => {},
  children = 'Click me',
  disabled = false,
  active = false
}) {

  return (
    <span
      className={`btn ${customClass} ${disabled ? 'disabled': ''} ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      { children }
    </span>
  );
}

export default Button;
