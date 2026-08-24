import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STOP_LIST } from '../src/stops-config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []

async function exists(relativePath) {
  try {
    await stat(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

if (STOP_LIST.length !== 6) {
  errors.push(`Expected 6 stops, found ${STOP_LIST.length}.`)
}

const ids = new Set()
for (const stop of STOP_LIST) {
  if (ids.has(stop.id)) errors.push(`Duplicate stop id: ${stop.id}`)
  ids.add(stop.id)

  if (!['world', 'image'].includes(stop.tracking)) {
    errors.push(`${stop.id}: tracking must be “world” or “image”.`)
  }

  if (stop.tracking === 'image') {
    if (!stop.targetName) {
      errors.push(`${stop.id}: image tracking needs a targetName.`)
    }
    if (stop.targetData) {
      const relativeTarget = `public${stop.targetData}`
      if (!(await exists(relativeTarget))) {
        warnings.push(`${stop.id}: generate ${relativeTarget}.`)
      }
    }
  }

  if (stop.modelSrc) {
    const relativeModel = `public${stop.modelSrc}`
    if (!(await exists(relativeModel))) {
      errors.push(`${stop.id}: modelSrc points to missing ${relativeModel}.`)
    }
  }
}

for (const required of [
  'public/external/xr/xr.js',
  'public/external/xr/xr-slam.js',
  'public/external/xr/LICENSE',
  'public/external/scripts/8frame-1.5.0.min.js',
  'public/external/xrextras/xrextras.js',
  'public/external/landing-page/landing-page.js',
]) {
  if (!(await exists(required))) errors.push(`Missing runtime file: ${required}`)
}

const eightFramePath = path.join(
  root,
  'public',
  'external',
  'scripts',
  '8frame-1.5.0.min.js',
)
if (await exists(eightFramePath)) {
  const eightFrame = await stat(eightFramePath)
  if (eightFrame.size < 1_000_000) {
    errors.push('8-Frame is a Git LFS pointer, not the runtime bundle. Run npm run setup:xr.')
  }
}

for (const warning of warnings) console.warn(`Warning: ${warning}`)
for (const error of errors) console.error(`Error: ${error}`)

if (errors.length) {
  process.exitCode = 1
} else {
  console.log(`Configuration is valid: ${STOP_LIST.length} stops and all XR runtime files found.`)
}
