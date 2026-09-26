/**
 * Repositorios en memoria con el mismo contrato que los de SQL Server.
 * Permiten probar la API completa sin base de datos.
 */
export function createFakeUserRepository() {
  const rows = new Map()
  let nextId = 1
  const clone = (u) => (u ? { ...u } : null)
  const byName = (name) => [...rows.values()].find((u) => u.username.toLowerCase() === name.toLowerCase())

  return {
    async findAll() {
      return [...rows.values()].sort((a, b) => a.username.localeCompare(b.username)).map(clone)
    },
    async findById(id) {
      return clone(rows.get(id))
    },
    async findByUsername(username) {
      return clone(byName(username))
    },
    async existsByUsername(username) {
      return Boolean(byName(username))
    },
    async count() {
      return rows.size
    },
    async countActiveAdmins() {
      return [...rows.values()].filter((u) => u.role === 'ADMIN' && u.enabled).length
    },
    async insert({ username, passwordHash, fullName, role }) {
      const user = { id: nextId++, username, passwordHash, fullName, role, enabled: true, createdAt: new Date() }
      rows.set(user.id, user)
      return clone(user)
    },
    async update(id, { fullName, role, enabled }) {
      Object.assign(rows.get(id), { fullName, role, enabled })
      return clone(rows.get(id))
    },
    async updatePassword(id, passwordHash) {
      rows.get(id).passwordHash = passwordHash
    },
    async delete(id) {
      rows.delete(id)
    },
  }
}

export function createFakeHostRepository() {
  const rows = new Map()
  let nextId = 1
  const clone = (h) => (h ? { ...h } : null)

  return {
    async findAll() {
      return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name)).map(clone)
    },
    async findById(id) {
      return clone(rows.get(id))
    },
    async findMonitored() {
      return [...rows.values()].filter((h) => h.monitoringEnabled).map(clone)
    },
    async existsByAddress(address, excludeId) {
      return [...rows.values()].some((h) => h.address.toLowerCase() === address.toLowerCase() && h.id !== excludeId)
    },
    async insert(data) {
      const host = {
        id: nextId++, ...data, status: 'UNKNOWN', lastLatencyMs: null, lastCheckedAt: null, lastSeenAt: null, statusChangedAt: null, createdAt: new Date(),
      }
      rows.set(host.id, host)
      return clone(host)
    },
    async update(id, data) {
      Object.assign(rows.get(id), data)
      return clone(rows.get(id))
    },
    async delete(id) {
      rows.delete(id)
    },
    async updateCheckResult(id, { status, latencyMs, checkedAt, seenAt, statusChangedAt }) {
      Object.assign(rows.get(id), { status, lastLatencyMs: latencyMs, lastCheckedAt: checkedAt, lastSeenAt: seenAt, statusChangedAt })
    },
  }
}

export function createFakePingRepository() {
  const records = []
  const toRecord = (r) => ({ checkedAt: r.checkedAt.toISOString(), reachable: r.reachable, latencyMs: r.latencyMs, packetLossPct: r.packetLossPct })
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  return {
    records,
    async findLatest(hostId, limit) {
      return records.filter((r) => r.hostId === hostId).sort((a, b) => b.checkedAt - a.checkedAt).slice(0, limit).map(toRecord)
    },
    async summarySince(hostId, since) {
      const rs = records.filter((r) => r.hostId === hostId && r.checkedAt > since)
      const lat = rs.filter((r) => r.latencyMs != null)
      const slowest = [...lat].sort((a, b) => b.latencyMs - a.latencyMs)[0]
      return {
        checks: rs.length,
        ok: rs.filter((r) => r.reachable).length,
        avgLatencyMs: avg(lat.map((r) => r.latencyMs)),
        maxLatencyMs: lat.length ? Math.max(...lat.map((r) => r.latencyMs)) : null,
        avgLossPct: avg(rs.map((r) => r.packetLossPct)),
        maxLatencyAt: slowest ? slowest.checkedAt.toISOString() : null,
      }
    },
    async bucketsSince({ hostId, since, bucketMinutes }) {
      const groups = new Map()
      for (const r of records) {
        if (r.checkedAt < since || (hostId && r.hostId !== hostId)) continue
        const bucket = Math.floor((r.checkedAt - since) / 60000 / bucketMinutes)
        if (!groups.has(bucket)) groups.set(bucket, [])
        groups.get(bucket).push(r)
      }
      return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([bucket, rs]) => {
        const lat = rs.filter((r) => r.latencyMs != null).map((r) => r.latencyMs)
        return { bucket, checks: rs.length, ok: rs.filter((r) => r.reachable).length, avgLatencyMs: avg(lat), maxLatencyMs: lat.length ? Math.max(...lat) : null }
      })
    },
    async insert(record) {
      records.push(record)
    },
    async findByHostSince(hostId, since) {
      return records
        .filter((r) => r.hostId === hostId && r.checkedAt > since)
        .map(toRecord)
    },
    async deleteOlderThan(cutoff) {
      const before = records.length
      for (let i = records.length - 1; i >= 0; i--) if (records[i].checkedAt < cutoff) records.splice(i, 1)
      return before - records.length
    },
  }
}

/** Sonda de ping falsa: responde lo que el test configure por dirección. */
export function createFakeProbe(defaultResult = { reachable: true, avgLatencyMs: 12, packetLossPct: 0 }) {
  const results = new Map()
  return {
    set(address, result) {
      results.set(address, result)
    },
    async ping(address) {
      return results.get(address) ?? defaultResult
    },
  }
}
