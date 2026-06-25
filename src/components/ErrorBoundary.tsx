import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-bold text-slate-900">Ups, algo falló</p>
          <p className="text-sm text-red-600 font-mono max-w-md break-words">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold"
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
