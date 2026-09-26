import pino from 'pino'

/** Logs legibles en desarrollo y JSON estructurado en producción. */
export function createLogger({ logLevel, isProduction, env }) {
  return pino({
    level: env === 'test' ? 'silent' : logLevel,
    transport: isProduction || env === 'test' ? undefined : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  })
}
