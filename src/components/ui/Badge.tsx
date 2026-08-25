import { BRAND } from '@/config/brand'

const C = BRAND.colors
const F = BRAND.fonts

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'live' | 'warning'
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const color = variant === 'live' ? C.flagAmber : variant === 'warning' ? C.flagAmber : C.dim

  return (
    <span style={{
      fontFamily: F.mono,
      fontSize: '10px',
      fontWeight: 400,
      letterSpacing: '0.1em',
      color,
      border: `1px solid ${C.border}`,
      padding: '3px 8px',
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}
