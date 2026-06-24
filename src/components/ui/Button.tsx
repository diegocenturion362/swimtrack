import { type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  fullWidth?: boolean
  icon?:     React.ReactNode
}

const variants: Record<Variant, string> = {
  primary:   'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-sm',
  secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200',
  ghost:     'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600',
  danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3.5 text-base rounded-xl gap-2',
}

export function Button({
  variant = 'primary',
  size    = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: Props) {
  const isDisabled = disabled || loading
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-semibold',
        'transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={isDisabled}
      {...props}
    >
      {loading
        ? <Loader2 className="animate-spin" size={16} />
        : icon}
      {children}
    </button>
  )
}
