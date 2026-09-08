import { Component } from 'react'
import { Icon } from './Icon'
import { Link } from 'react-router-dom'
import { Button } from './Button'

/**
 * Top-level error boundary: a crash in any screen degrades to a readable
 * recovery screen instead of a raw router error dump.
 */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    // Surface in devtools; production logging can hook in here.
    console.error('App error boundary:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="app-shell__page"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70dvh' }}
        >
          <div className="card" style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }} aria-hidden>
              <Icon name="warning" size={28} aria-hidden="true" />
            </div>
            <h2 style={{ margin: '0 0 8px' }}>Something went wrong</h2>
            <p className="t-caption" style={{ marginBottom: 16 }}>
              {this.state.error?.message
                ? String(this.state.error.message).slice(0, 140)
                : 'An unexpected error occurred while rendering this screen.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button onClick={() => { this.setState({ error: null }); window.location.reload() }}>
                Reload
              </Button>
              <Link to="/home" style={{ textDecoration: 'none' }}>
                <Button variant="secondary">Back to home</Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
