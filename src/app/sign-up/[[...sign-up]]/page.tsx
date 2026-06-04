export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07080E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '32px',
            letterSpacing: '1px',
          }}
        >
          <span style={{ color: '#A78BFA' }}>Data</span>
          <span style={{ color: '#F1F0FF' }}>Nexus</span>
        </div>
        <p style={{ color: '#94A3B8', fontSize: '16px' }}>
          Authentication disabled for preview.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '24px',
            color: '#A78BFA',
            textDecoration: 'none',
            fontSize: '15px',
          }}
        >
          ← Back to home
        </a>
      </div>
    </div>
  )
}
