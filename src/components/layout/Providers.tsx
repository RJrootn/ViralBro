'use client'
// src/components/layout/Providers.tsx

import { SessionProvider } from 'next-auth/react'
import { Toaster }         from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background:   '#18181F',
            color:        '#F2F2F5',
            border:       '1px solid rgba(255,255,255,0.11)',
            borderRadius: '12px',
            fontFamily:   'var(--font-sans)',
            fontSize:     '0.85rem',
          },
          success: {
            iconTheme: { primary: '#138808', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#FF5555', secondary: '#fff' },
          },
        }}
      />
    </SessionProvider>
  )
}
