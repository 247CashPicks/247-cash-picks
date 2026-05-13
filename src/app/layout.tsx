import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DataNexus — Model. Analyze. Project.',
  description: 'Precision sports analytics platform. Daily projection signals plus self-serve modeling tools for serious analysts.',
  openGraph: {
    title: 'DataNexus — Model. Analyze. Project.',
    description: 'The analytics engine serious analysts run on.',
    url: 'https://www.datanexus.ai',
    siteName: 'DataNexus',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#07080E',
          color: '#F1F0FF',
          fontFamily: "'Inter', sans-serif",
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
