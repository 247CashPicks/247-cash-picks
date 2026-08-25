import { BRAND } from '@/config/brand'

const C = BRAND.colors

interface CardProps {
  children: React.ReactNode
  elevated?: boolean
  style?: React.CSSProperties
}

export default function Card({ children, elevated = false, style }: CardProps) {
  return (
    <div style={{
      background: elevated ? C.panel : C.void,
      border: `1px solid ${C.border}`,
      padding: '28px',
      ...style,
    }}>
      {children}
    </div>
  )
}
