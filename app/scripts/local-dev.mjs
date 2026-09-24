#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { setTimeout } from 'node:timers'

const root = resolve(import.meta.dirname, '..')
const envPath = resolve(root, '.env.local')
const outputPath = resolve(root, '..', 'output')
const localSiteUrl = 'http://127.0.0.1:3000'
const backendArgs = [
  'convex',
  'dev',
  '--local-cloud-port',
  '3220',
  '--local-site-port',
  '3221',
  '--typecheck',
  'disable',
]
const environment = {
  ...process.env,
  CONVEX_AGENT_MODE: 'anonymous',
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_LOG_PATH: resolve(outputPath, 'wrangler'),
}

// This runner must never inherit a credential that selects a remote deployment.
for (const key of ['CONVEX_DEPLOY_KEY', 'CONVEX_SELF_HOSTED_URL', 'CONVEX_SELF_HOSTED_ADMIN_KEY'])
  delete environment[key]

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split('\n')
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

function setLocalEnv(name, value) {
  const source = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
  const values = parseEnv(source)
  if (values[name]) return values[name]
  const prefix = source && !source.endsWith('\n') ? '\n' : ''
  writeFileSync(envPath, `${source}${prefix}${name}=${value}\n`, { mode: 0o600 })
  return value
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: environment,
    input: options.input,
    stdio: options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function listenerPids(port) {
  const result = spawnSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim().split('\n').filter(Boolean).map(Number) : []
}

async function releaseInitializerBackend() {
  for (const pid of listenerPids(3220)) process.kill(pid, 'SIGTERM')
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (listenerPids(3220).length === 0) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('The anonymous Convex initializer did not release local port 3220.')
}

mkdirSync(dirname(environment.WRANGLER_LOG_PATH), { recursive: true })
const localConfig = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {}
if (localConfig.VITE_CONVEX_URL && localConfig.VITE_CONVEX_URL !== 'http://127.0.0.1:3220')
  throw new Error('This local runner refuses a remote or unexpected Convex URL.')
if (
  localConfig.VITE_CONVEX_SITE_URL &&
  localConfig.VITE_CONVEX_SITE_URL !== 'http://127.0.0.1:3221'
)
  throw new Error('This local runner refuses a remote or unexpected Convex site URL.')
if (!localConfig.VITE_CONVEX_URL || !localConfig.VITE_CONVEX_SITE_URL) {
  if (listenerPids(3220).length || listenerPids(3221).length)
    throw new Error('Local Convex ports are already in use; no existing process was stopped.')
  run('npx', [...backendArgs, '--once', '--skip-push'])
  // Convex leaves this first-run backend detached. It belongs to this initializer,
  // so stop it before the managed watcher takes ownership of the configured ports.
  await releaseInitializerBackend()
}

const secret = setLocalEnv('BETTER_AUTH_SECRET', randomBytes(32).toString('base64url'))
setLocalEnv('SITE_URL', localSiteUrl)
run('npx', ['convex', 'env', 'set', 'SITE_URL', localSiteUrl])
run('npx', ['convex', 'env', 'set', 'BETTER_AUTH_SECRET'], { input: secret })
run('npx', ['convex', 'env', 'set', 'LOCAL_SELLER_MODE', 'true'])

const backend = spawn('npx', backendArgs, { cwd: root, env: environment, stdio: 'inherit' })
const web = spawn('npm', ['run', 'dev:web'], { cwd: root, env: environment, stdio: 'inherit' })

function stop(signal) {
  backend.kill(signal)
  web.kill(signal)
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal))
backend.on('exit', (code) => {
  stop('SIGTERM')
  process.exitCode = code ?? 1
})
web.on('exit', (code) => {
  stop('SIGTERM')
  process.exitCode = code ?? 1
})
