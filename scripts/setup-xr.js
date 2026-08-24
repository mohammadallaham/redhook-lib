import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const externalDir = path.join(publicDir, 'external')

const packages = [
  {
    source: path.join(root, 'node_modules', '@8thwall', 'engine-binary', 'dist'),
    destination: path.join(externalDir, 'xr'),
  },
  {
    source: path.join(root, 'node_modules', '@8thwall', 'xrextras', 'dist'),
    destination: path.join(externalDir, 'xrextras'),
  },
  {
    source: path.join(root, 'node_modules', '@8thwall', 'landing-page', 'dist'),
    destination: path.join(externalDir, 'landing-page'),
  },
]

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function copyPackages() {
  await mkdir(externalDir, { recursive: true })
  for (const item of packages) {
    if (!(await exists(item.source))) {
      throw new Error(`Missing ${item.source}. Run npm install first.`)
    }
    await cp(item.source, item.destination, { recursive: true, force: true })
  }
}

async function installEightFrame() {
  const destinationDir = path.join(externalDir, 'scripts')
  const destination = path.join(destinationDir, '8frame-1.5.0.min.js')
  await mkdir(destinationDir, { recursive: true })
  if (await exists(destination)) {
    const current = await stat(destination)
    if (current.size > 1_000_000) return
  }

  const source =
    'https://media.githubusercontent.com/media/8thwall/aframe-world-effects-example/main/external/scripts/8frame-1.5.0.min.js'
  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(`8-Frame download failed with HTTP ${response.status}.`)
  }
  const bundle = Buffer.from(await response.arrayBuffer())
  if (bundle.length < 1_000_000 || bundle.toString('utf8', 0, 64).includes('git-lfs')) {
    throw new Error('8-Frame download returned a Git LFS pointer instead of the runtime bundle.')
  }
  await writeFile(destination, bundle)
}

await copyPackages()
await installEightFrame()

console.log('8th Wall engine, XRExtras, Landing Page, and 8-Frame are ready in public/external.')
