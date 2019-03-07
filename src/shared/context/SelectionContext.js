import React, { Component } from 'react';

const SelectionContext = React.createContext();

export class SelectionProvider extends Component {
  state = {
    selected: null
  }
  render () {
    return (
      <SelectionContext.Provider value={{
        selected: this.state.selected,
        select: (machine) => this.setState({ selected: machine }),
        unselect: () => this.setState({ selected: null })
      }}>
        { this.props.children }
      </SelectionContext.Provider>
    )
  }
}

export default SelectionContext;
