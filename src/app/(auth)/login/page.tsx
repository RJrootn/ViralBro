import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const LoginClient = dynamic(() => import('./LoginClient'), { ssr: false })

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#06060A', minHeight: '100vh' }} />}>
      <LoginClient />
    </Suspense>
  )
}
