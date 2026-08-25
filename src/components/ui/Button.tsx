import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

interface ButtonProps {
  children: React.ReactNode
  href?: string
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export default function Button({ children, href, variant = 'primary', onClick }: ButtonProps) {
  const isPrimary = variant === 'primary'

  const style: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: F.mono,
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    padding: '12px 28px',
    background: isPrimary ? C.signalCyan : 'transparent',
    color: isPrimary ? '#000000' : C.platinum,
    outline: isPrimary ? 'none' : `1px solid ${C.border}`,
  }

  if (href) {
    return <a href={href} style={style}>{children}</a>
  }

  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  )
}
