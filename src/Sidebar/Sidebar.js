import React, { Component } from 'react';
import './Sidebar.css';

class Sidebar extends Component {
  render() {
    return (
      <div className={`sidebar ${this.props.customClass}`}>
        <header className="sidebar-options flex-center">
          <span className="sidebar-option flex-center">Logs</span>
          <span className="sidebar-option flex-center">Actions</span>
        </header>
        <div>
          Selected: {this.props.selectedMachine === null ? 'N/A' : this.props.selectedMachine}
        </div>
      </div>
    );
  }
}

export default Sidebar;
