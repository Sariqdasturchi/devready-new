import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Python (Pyodide) fayllarini saytning o'zidan /pyodide/ manzilida berish —
 * tashqi CDN'ga bog'liq bo'lmaslik uchun. Dev'da node_modules'dan, build'da dist/pyodide/ ga nusxalanadi.
 */
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']
const PYODIDE_DIR = path.resolve(__dirname, 'node_modules/pyodide')
const TYPES: Record<string, string> = { '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.zip': 'application/zip', '.json': 'application/json' }

function pyodideAssets(): Plugin {
  let outDir = 'dist'
  return {
    name: 'devready-pyodide',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/pyodide', (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '')
        if (!PYODIDE_FILES.includes(name)) return next()
        res.setHeader('Content-Type', TYPES[path.extname(name)] || 'application/octet-stream')
        fs.createReadStream(path.join(PYODIDE_DIR, name)).pipe(res)
      })
    },
    closeBundle() {
      const dest = path.join(outDir, 'pyodide')
      fs.mkdirSync(dest, { recursive: true })
      for (const f of PYODIDE_FILES) fs.copyFileSync(path.join(PYODIDE_DIR, f), path.join(dest, f))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pyodideAssets()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
})
