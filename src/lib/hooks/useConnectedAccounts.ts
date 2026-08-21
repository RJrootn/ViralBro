// src/lib/hooks/useConnectedAccounts.ts
//
// Small in-memory, stale-while-revalidate cache for the "Connected Channels"
// list shown in the sidebar. Without this, every time the shared dashboard
// Sidebar unmounts and remounts — which happens whenever you navigate to
// Studio or Settings, since both sit outside src/app/dashboard/layout.tsx
// and render their own separate sidebar — it refetched /api/platforms/connect
// from an empty list and visibly flashed "None connected yet" before
// repopulating. That's the "takes time to get the channels back" lag.
//
// A module-level cache survives that unmount because the module itself
// isn't re-evaluated on client-side navigation, only the component
// instance is. First load still does a real fetch; every load after that
// shows the cached list immediately while quietly revalidating in the
// background, so a channel connected or removed elsewhere still shows up
// without ever blocking the UI on a spinner.

import { useEffect, useState } from 'react'

export interface ConnectedAccount {
  id: string
  platform: string
  platformUsername: string
}

let cache: ConnectedAccount[] | null = null
const listeners = new Set<(accounts: ConnectedAccount[]) => void>()

async function fetchAndBroadcast() {
  try {
    const res = await fetch('/api/platforms/connect')
    const data = await res.json()
    if (data.success) {
      cache = data.data.accounts
      listeners.forEach(l => l(cache as ConnectedAccount[]))
    }
  } catch {
    // Leave the existing cache in place — a transient network blip
    // shouldn't wipe out a perfectly good cached list.
  }
}

export function useConnectedAccounts(): ConnectedAccount[] {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(cache ?? [])

  useEffect(() => {
    listeners.add(setAccounts)
    fetchAndBroadcast() // always revalidate in the background, never blocks the cached render above
    return () => { listeners.delete(setAccounts) }
  }, [])

  return accounts
}

// Call this right after a channel is connected or disconnected (see
// PlatformConnector.tsx) so every mounted sidebar picks up the change
// immediately instead of waiting for its next mount.
export function invalidateConnectedAccounts() {
  fetchAndBroadcast()
}
