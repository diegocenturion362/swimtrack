import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useStore } from '../../store/useStore'

interface Props {
  title:       string
  subtitle?:   string
  showBack?:   boolean
  backTo?:     string
  showLogout?: boolean
  right?:      React.ReactNode
}

export function Header({ title, subtitle, showBack = false, backTo, showLogout = false, right }: Props) {
  const navigate  = useNavigate()
  const clearRole = useStore(s => s.clearRole)

  const handleBack = () => {
    if (backTo) navigate(backTo)
    else        navigate(-1)
  }

  const handleLogout = () => {
    clearRole()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>

        {right}

        {showLogout && (
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            title="Cambiar rol"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
