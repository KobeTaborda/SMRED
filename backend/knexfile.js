// Configuración para la CLI de Knex (npm run db:migrate, npm run db:make -- nombre)
import { loadConfig } from './src/config/env.js'
import { knexConfig } from './src/db/knex.js'

export default knexConfig(loadConfig().db)
