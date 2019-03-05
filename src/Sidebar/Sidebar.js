import React, { Component } from 'react';
import './Sidebar.css';

class Sidebar extends Component {
  render() {
    return (
      <div className={`Sidebar ${this.props.customClass}`}>
        <header className="Sidebar-options">
          <div>Logs</div>
          <div>Actions</div>
        </header>
        <div>
          Selected: {this.props.selectedMachine === null ? 'N/A' : this.props.selectedMachine}
        </div>
      </div>
    );
  }
}

export default Sidebar;
