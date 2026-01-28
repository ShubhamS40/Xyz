import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'

export const metadata = {
  title: 'JC261 Device Tracking',
  description: 'Real-time tracking dashboard for JC261 dashcam devices',
}

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script 
          src="https://cdn.jsdelivr.net/npm/hls.js@latest"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${inter.className} bg-[#050505] text-gray-100 min-h-screen overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  )
}
