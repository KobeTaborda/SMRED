import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Carga el .env de la raíz del repo (el mismo que usa docker compose).
 * process.loadEnvFile es nativo de Node 22: no hace falta la librería dotenv.
 * Las variables ya definidas en el sistema tienen prioridad sobre el archivo.
 */
function loadEnvFile() {
  for (const candidate of [resolve(backendDir, '.env'), resolve(backendDir, '../.env')]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate)
      return candidate
    }
  }
  return null
}

const booleanString = z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_INSTANCE: z.string().optional(),
  DB_NAME: z.string().default('smred'),
  DB_APP_USER: z.string().default('smred_app'),
  DB_APP_PASSWORD: z.string({ error: 'Falta DB_APP_PASSWORD' }).min(1, 'Falta DB_APP_PASSWORD'),
  DB_MIGRATE_ON_START: booleanString,

  SESSION_SECRET: z
    .string({ error: 'Falta SESSION_SECRET' })
    .min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  SMRED_ADMIN_USERNAME: z.string().optional(),
  SMRED_ADMIN_PASSWORD: z.string().optional(),
  SMRED_ADMIN_FULLNAME: z.string().default('Administrador'),

  PING_INTERVAL_SECONDS: z.coerce.number().int().min(5).default(30),
  PING_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  PING_TIMEOUT_MS: z.coerce.number().int().min(100).default(2000),
  PING_DEGRADED_MS: z.coerce.number().positive().default(200),
  PING_MAX_CONCURRENCY: z.coerce.number().int().min(1).default(20),
  PING_RETENTION_DAYS: z.coerce.number().int().min(1).default(7),

  // HTTPS: si existen estos dos archivos, el servidor usa HTTPS (ver scripts/generar-certificado.ps1)
  SSL_CERT_FILE: z.string().optional(),
  SSL_KEY_FILE: z.string().optional(),
})

/** Certificado en certs/ (raíz del repo) por defecto. HTTPS se activa solo si ambos archivos existen. */
function httpsConfig(env) {
  const certFile = resolve(backendDir, env.SSL_CERT_FILE ?? '../certs/smred.pem')
  const keyFile = resolve(backendDir, env.SSL_KEY_FILE ?? '../certs/smred-key.pem')
  return { enabled: existsSync(certFile) && existsSync(keyFile), certFile, keyFile }
}

/** Lee y valida la configuración. Si falta algo, falla al arrancar con un mensaje claro. */
export function loadConfig() {
  const envFile = loadEnvFile()
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    const hint = envFile ? `Revisa el archivo ${envFile}` : 'No se encontró el archivo .env: copia .env.example como .env en la raíz del repo'
    throw new Error(`Configuración inválida:\n${problems.join('\n')}\n${hint}`)
  }

  const env = result.data
  if (env.NODE_ENV === 'production' && env.SESSION_SECRET.startsWith('cambia-esto')) {
    throw new Error('SESSION_SECRET sigue con el valor de ejemplo. Genera uno nuevo antes de desplegar.')
  }
  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    db: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      instanceName: env.DB_INSTANCE || undefined,
      database: env.DB_NAME,
      user: env.DB_APP_USER,
      password: env.DB_APP_PASSWORD,
      migrateOnStart: env.DB_MIGRATE_ON_START,
    },
    session: {
      secret: env.SESSION_SECRET,
      isExampleSecret: env.SESSION_SECRET.startsWith('cambia-esto'),
      ttlMs: env.SESSION_TTL_MINUTES * 60_000,
    },
    security: {
      bcryptRounds: 12,
      maxLoginAttempts: 5,
      lockMs: 15 * 60_000,
    },
    seedAdmin: {
      username: env.SMRED_ADMIN_USERNAME?.trim() || undefined,
      password: env.SMRED_ADMIN_PASSWORD || undefined,
      fullName: env.SMRED_ADMIN_FULLNAME,
    },
    monitoring: {
      intervalMs: env.PING_INTERVAL_SECONDS * 1000,
      initialDelayMs: 5000,
      attempts: env.PING_ATTEMPTS,
      timeoutMs: env.PING_TIMEOUT_MS,
      degradedLatencyMs: env.PING_DEGRADED_MS,
      maxConcurrency: env.PING_MAX_CONCURRENCY,
      retentionDays: env.PING_RETENTION_DAYS,
      cleanupCron: '0 3 * * *',
    },
    https: httpsConfig(env),
    frontendDist: resolve(backendDir, '../frontend/dist'),
  }
}
