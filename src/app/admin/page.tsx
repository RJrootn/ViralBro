// src/app/admin/page.tsx
//
// RJ's own business dashboard — server-gated so a direct hit to /admin from
// any other signed-in account 404s instead of momentarily flashing a
// client-rendered page before an API call fails. The actual numbers are
// fetched client-side from /api/admin/stats, which re-checks admin access
// itself (defense in depth — this page's gate and the API's gate are two
// independent checks, not one shared assumption).

import { notFound } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { isAdminEmail } from '@/lib/auth/admin'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const session = await getServerSession()
  if (!(await isAdminEmail(session?.user?.email))) {
    notFound()
  }
  return <AdminDashboard />
}
