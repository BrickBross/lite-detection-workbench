import fs from 'node:fs'
import path from 'node:path'

function exists(p){ return fs.existsSync(p) }
function read(p){ return fs.readFileSync(p,'utf8') }

const root = process.cwd()
const exportsDir = path.join(root, 'exported')
if (!exists(exportsDir)) {
  console.log('[validate-exports] No exported/ directory found. Skipping.')
  process.exit(0)
}

let issues = 0
function issue(msg){ issues++; console.error('✗', msg) }

function walk(dir){
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(fp))
    else out.push(fp)
  }
  return out
}

const files = walk(exportsDir)
if (files.length === 0) issue('exported/ is empty. Did you export from the app?')

for (const f of files) {
  if (f.endsWith('.json')) {
    try { JSON.parse(read(f)) } catch { issue(`Invalid JSON: ${path.relative(root,f)}`) }
  }
  if (f.endsWith('.yml') || f.endsWith('.yaml')) {
    // Cheap sanity check: ensure it has at least one ":" and not empty
    const c = read(f).trim()
    if (!c) issue(`Empty YAML: ${path.relative(root,f)}`)
    if (!c.includes(':')) issue(`Suspicious YAML (no key/value): ${path.relative(root,f)}`)
  }
}

if (issues > 0) {
  console.error(`\n[validate-exports] Found ${issues} issue(s).`)
  process.exit(1)
}
console.log('[validate-exports] OK')
