// src/lib/hooks/useUsage.ts
//
// Shared fetch for GET /api/billing/usage — used by both the sidebar's
// always-visible usage meter and the Settings > Billing tab, so plan
// limits and this month's actual usage only get fetched/typed once.

import { useCallback, useEffect, useState } from 'react'

export interface UsageData {
  plan: 'FREE' | 'CREATOR' | 'PRO' | 'AGENCY'
  planExpiresAt: string | null
  limits: { postsPerMonth: number; aiCredits: number; platforms: number; teamMembers: number }
  usage: { postsThisMonth: number; aiCreditBalance: number }
}

export function useUsage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (): Promise<UsageData | null> => {
    try {
      const res = await fetch('/api/billing/usage')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        return json.data as UsageData
      }
      return null
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { data, loading, refresh }
}
