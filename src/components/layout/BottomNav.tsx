import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, PlusCircle, Trophy, TrendingUp, Activity
} from 'lucide-react'

import { useStore } from '../../store/useStore'

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
}

const coachNav: NavItem[] = [
  { to: '/coach',           icon: <LayoutDashboard size={22} />, label: 'Inicio'     },
  { to: '/coach/nadadores', icon: <Users size={22} />,           label: 'Nadadores'  },
  { to: '/coach/registrar', icon: <PlusCircle size={22} />,      label: 'Registrar'  },
  { to: '/coach/similares', icon: <Activity size={22} />,        label: 'Comparar'   },
  { to: '/coach/marcas',    icon: <Trophy size={22} />,          label: 'Marcas'     },
]

const swimmerNav = (id: string): NavItem[] => [
  { to: `/nadador/${id}`,            icon: <LayoutDashboard size={22} />, label: 'Inicio'    },
  { to: `/nadador/${id}/entrenos`,   icon: <Activity size={22} />,        label: 'Entrenos'  },
  { to: `/nadador/${id}/registrar`,  icon: <PlusCircle size={22} />,      label: 'Registrar' },
  { to: `/nadador/${id}/marcas`,     icon: <Trophy size={22} />,          label: 'Marcas'    },
  { to: `/nadador/${id}/evolucion`,  icon: <TrendingUp size={22} />,      label: 'Evolución' },
]

export function BottomNav() {
  const { currentRole, currentSwimmerId } = useStore(s => ({
    currentRole:      s.currentRole,
    currentSwimmerId: s.currentSwimmerId,
  }))

  const items = currentRole === 'coach'
    ? coachNav
    : currentSwimmerId
      ? swimmerNav(currentSwimmerId)
      : []

  if (items.length === 0) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 bottom-nav-safe">
      <div className="max-w-md mx-auto flex">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/coach' || item.to.endsWith(currentSwimmerId ?? '')}
            className={({ isActive }) => [
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5',
              'text-[10px] font-medium transition-colors',
              isActive
                ? 'text-blue-700'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-blue-700' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
