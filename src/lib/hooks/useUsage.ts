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

// Every useUsage() call used to keep its own private state with no way for
// one instance to know another had fetched fresher data — e.g. the Settings
// > Billing tab would refresh right after a payment completed, but the
// sidebar's UsageMeter (a separate mounted instance) had no way to find out,
// and kept showing the pre-upgrade plan/limits until an unrelated remount.
// Broadcasting on this event lets every mounted instance pick up whichever
// one fetched last, without wiring a real shared store.
const USAGE_EVENT = 'vyralbro:usage-refreshed'

export function useUsage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (): Promise<UsageData | null> => {
    try {
      const res = await fetch('/api/billing/usage')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        window.dispatchEvent(new CustomEvent(USAGE_EVENT, { detail: json.data }))
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

  useEffect(() => {
    const onExternalRefresh = (e: Event) => setData((e as CustomEvent<UsageData>).detail)
    window.addEventListener(USAGE_EVENT, onExternalRefresh)
    return () => window.removeEventListener(USAGE_EVENT, onExternalRefresh)
  }, [])

  return { data, loading, refresh }
}
