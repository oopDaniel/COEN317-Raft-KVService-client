import React, { Component } from 'react';

const NotificationContext = React.createContext();

const DEFAULT_TEXT = 'Processing...'
const OPEN_DURATION = 4000
export class NotificationProvider extends Component {
  state = {
    opened: false,
    text: DEFAULT_TEXT,
    _timeout: null
  }
  render () {
    return (
      <NotificationContext.Provider value={{
        opened: this.state.opened,
        text: this.state.text,
        open: (params = { text: DEFAULT_TEXT, blocking: false }) => {
          if (typeof params === 'string') {
            params = { text: params, blocking: false }
          }

          // Smooth animation in calling open continually
          if (this.state._timeout !== null) {
            clearTimeout(this.state._timeout)
            this.setState({ _timeout: null })
          }
          if (this.state.opened) {
            this.setState({ opened: false })
            this.setState({
              _timeout: setTimeout(() => this.setState({ opened: true, text: params.text }), 200)
            })
          } else {
            this.setState({ opened: true, text: params.text })
          }

          if (params.blocking === false) {
            this.setState({
              _timeout: setTimeout(() => this.setState({ opened: false, text: DEFAULT_TEXT }), OPEN_DURATION)
            })
          }
        },
        close: () => this.setState({ opened: false, text: DEFAULT_TEXT })
      }}>
        { this.props.children }
      </NotificationContext.Provider>
    )
  }
}

export default NotificationContext;
