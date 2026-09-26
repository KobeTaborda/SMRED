import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bucketStatus, fillBuckets, windowFor } from '../../src/monitoring/stats.js'

describe('bucketStatus', () => {
  it('sin datos = UNKNOWN', () => assert.equal(bucketStatus({ checks: 0, ok: 0, avgLatencyMs: null }, 200), 'UNKNOWN'))
  it('mayoría de fallos = DOWN', () => assert.equal(bucketStatus({ checks: 4, ok: 1, avgLatencyMs: 10 }, 200), 'DOWN'))
  it('algún fallo = DEGRADED', () => assert.equal(bucketStatus({ checks: 4, ok: 3, avgLatencyMs: 10 }, 200), 'DEGRADED'))
  it('lento = DEGRADED', () => assert.equal(bucketStatus({ checks: 4, ok: 4, avgLatencyMs: 250 }, 200), 'DEGRADED'))
  it('todo bien = UP', () => assert.equal(bucketStatus({ checks: 4, ok: 4, avgLatencyMs: 20 }, 200), 'UP'))
})

describe('windowFor y fillBuckets', () => {
  it('alinea la ventana a la franja y cubre hasta ahora', () => {
    const now = new Date('2026-09-26T14:39:00Z')
    const { since, count } = windowFor(now, 24, 30)
    assert.equal(since.toISOString(), '2026-09-25T14:30:00.000Z')
    assert.equal(count, 49)
  })

  it('completa franjas vacías y calcula disponibilidad', () => {
    const since = new Date('2026-09-26T00:00:00Z')
    const buckets = fillBuckets([{ bucket: 1, checks: 4, ok: 3, avgLatencyMs: 12.345, maxLatencyMs: 20 }], {
      since, count: 3, bucketMs: 1_800_000, degradedLatencyMs: 200,
    })
    assert.equal(buckets.length, 3)
    assert.equal(buckets[0].status, 'UNKNOWN')
    assert.deepEqual(buckets[1], {
      start: '2026-09-26T00:30:00.000Z', checks: 4, availabilityPct: 75, avgLatencyMs: 12.3, maxLatencyMs: 20, status: 'DEGRADED',
    })
  })
})
