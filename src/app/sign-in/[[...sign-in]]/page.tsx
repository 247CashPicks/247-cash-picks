import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
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
        <SignIn
          appearance={{
            elements: {
              rootBox: { width: '100%' },
            },
          }}
        />
      </div>
    </div>
  )
}
