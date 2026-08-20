import { describe, it, expect } from 'vitest'
import { ok, err, PLAN_LIMITS } from '@/lib/api'

describe('API response helpers', () => {
  it('ok() wraps data in the standard success envelope', async () => {
    const res = ok({ hello: 'world' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, data: { hello: 'world' } })
  })

  it('ok() respects a custom status code', async () => {
    const res = ok({ created: true }, 201)
    expect(res.status).toBe(201)
  })

  it('err() wraps a message in the standard failure envelope', async () => {
    const res = err('bad request', 400)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ success: false, error: 'bad request' })
  })
})

describe('PLAN_LIMITS', () => {
  it('defines every Plan enum value', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(['AGENCY', 'CREATOR', 'FREE', 'PRO'])
  })

  it('is monotonically non-decreasing in platform count as plans go up', () => {
    expect(PLAN_LIMITS.FREE.platforms).toBeLessThanOrEqual(PLAN_LIMITS.CREATOR.platforms)
    expect(PLAN_LIMITS.CREATOR.platforms).toBeLessThanOrEqual(PLAN_LIMITS.PRO.platforms)
    expect(PLAN_LIMITS.PRO.platforms).toBeLessThanOrEqual(PLAN_LIMITS.AGENCY.platforms)
  })

  it('marks Agency as unlimited posts (-1 sentinel)', () => {
    expect(PLAN_LIMITS.AGENCY.postsPerMonth).toBe(-1)
  })
})
