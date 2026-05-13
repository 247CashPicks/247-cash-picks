export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07080E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '120px',
          fontWeight: 700,
          color: 'rgba(167, 139, 250, 0.15)',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '36px',
          fontWeight: 700,
          color: '#F1F0FF',
          margin: '0 0 12px',
          letterSpacing: '1px',
        }}
      >
        PAGE NOT FOUND
      </h1>
      <p style={{ color: '#94A3B8', marginBottom: '32px', fontSize: '16px' }}>
        That page doesn&apos;t exist or you don&apos;t have access.
      </p>
      <a
        href="/"
        style={{
          background: '#6D28D9',
          color: '#F1F0FF',
          padding: '12px 32px',
          borderRadius: '8px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          letterSpacing: '0.5px',
          textDecoration: 'none',
        }}
      >
        GO HOME
      </a>
    </div>
  )
}
