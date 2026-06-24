import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hover?:   boolean
}

const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }

export function Card({ padding = 'md', hover = false, className = '', children, ...props }: Props) {
  return (
    <div
      className={[
        'bg-white rounded-2xl border border-slate-100 shadow-sm',
        paddings[padding],
        hover ? 'active:scale-[0.99] transition-transform cursor-pointer' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
