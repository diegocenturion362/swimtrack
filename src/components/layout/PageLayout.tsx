interface Props {
  children: React.ReactNode
  className?: string
}

export function PageLayout({ children, className = '' }: Props) {
  return (
    <main className={`max-w-md mx-auto px-4 pt-4 pb-28 min-h-screen ${className}`}>
      {children}
    </main>
  )
}
