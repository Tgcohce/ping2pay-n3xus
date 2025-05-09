import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ping2Pay',
  description: 'Created with <3',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
