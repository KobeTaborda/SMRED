import session from 'express-session'

/**
 * Guarda las sesiones en SQL Server (tabla sessions).
 * Ventaja frente a la memoria: reiniciar el servidor (o cada guardado con --watch) no cierra las sesiones,
 * y permitiría varias instancias del backend en el futuro.
 */
export class SqlSessionStore extends session.Store {
  /**
   * @param {import('knex').Knex} db
   * @param {{ ttlMs: number, logger: import('pino').Logger }} options
   */
  constructor(db, { ttlMs, logger }) {
    super()
    this.db = db
    this.ttlMs = ttlMs
    this.logger = logger
  }

  get(sid, callback) {
    this.db('sessions')
      .where({ sid })
      .andWhere('expires_at', '>', new Date())
      .first('data')
      .then((row) => callback(null, row ? JSON.parse(row.data) : null))
      .catch(callback)
  }

  set(sid, sess, callback) {
    const row = { data: JSON.stringify(sess), expires_at: this.expiresAt(sess) }
    this.upsert(sid, row)
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  touch(sid, sess, callback) {
    this.db('sessions')
      .where({ sid })
      .update({ expires_at: this.expiresAt(sess) })
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  destroy(sid, callback) {
    this.db('sessions')
      .where({ sid })
      .del()
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  /** Elimina sesiones vencidas. Lo llama el planificador periódicamente. */
  async clearExpired() {
    return this.db('sessions').where('expires_at', '<=', new Date()).del()
  }

  async upsert(sid, row) {
    const updated = await this.db('sessions').where({ sid }).update(row)
    if (updated > 0) return
    try {
      await this.db('sessions').insert({ sid, ...row })
    } catch (err) {
      // 2627 = clave duplicada: otra petición simultánea la insertó primero
      if (err.number === 2627) await this.db('sessions').where({ sid }).update(row)
      else throw err
    }
  }

  expiresAt(sess) {
    const expires = sess?.cookie?.expires
    return expires ? new Date(expires) : new Date(Date.now() + this.ttlMs)
  }
}
