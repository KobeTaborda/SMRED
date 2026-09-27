import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// HTTPS: si existe el certificado en certs/ (lo crea scripts/generar-certificado.ps1),
// el frontend y la API usan HTTPS. Si no, todo funciona igual por HTTP.
const certFile = fileURLToPath(new URL('../certs/smred.pem', import.meta.url))
const keyFile = fileURLToPath(new URL('../certs/smred-key.pem', import.meta.url))
const https = existsSync(certFile) && existsSync(keyFile) ? { cert: readFileSync(certFile), key: readFileSync(keyFile) } : undefined

// En desarrollo, Vite (puerto 5173) reenvía /api a la API (puerto 3000).
// Para el navegador todo es el mismo origen: las cookies de sesión y CSRF funcionan sin configurar CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    https,
    proxy: {
      '/api': {
        target: https ? 'https://localhost:3000' : 'http://localhost:3000',
        // La API usa el mismo certificado local; entre procesos del mismo equipo no hace falta validarlo
        secure: false,
        // Envía la IP real del navegador a la API (la usa el bloqueo por intentos fallidos)
        xfwd: true,
      },
    },
  },
})
