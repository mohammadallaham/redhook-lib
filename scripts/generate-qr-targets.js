import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile, copyFile, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { STOP_LIST } from '../src/stops-config.js'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const targetsRoot = path.join(root, 'public', 'image-targets')
const qrStops = STOP_LIST.filter((stop) => stop.tracking === 'image')
const LUMINANCE_WIDTH = 480
const LUMINANCE_HEIGHT = 640
const CREAM = { r: 0xf8, g: 0xf0, b: 0xd8, a: 255 }

function runImageTargetCli({ imagePath, outputFolder, name }) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', '@8thwall/image-target-cli@latest'], {
      cwd: root,
      env: { ...process.env, OVERWRITE_FILES: 'true' },
      shell: true,
    })

    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
    })

    child.stdin.write(`${[imagePath, '1', 'Y', outputFolder, name].join('\n')}\n`)
    child.stdin.end()

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output)
        return
      }
      reject(new Error(`Image target CLI failed for ${name}.\n${output}`))
    })
  })
}

function readPng(filePath) {
  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function parsed() {
        resolve(this)
      })
      .on('error', reject)
  })
}

function writePng(png, filePath) {
  return new Promise((resolve, reject) => {
    png.pack().pipe(createWriteStream(filePath)).on('finish', resolve).on('error', reject)
  })
}

function letterboxQrToLuminance(source) {
  const size = LUMINANCE_WIDTH
  const offsetY = Math.round((LUMINANCE_HEIGHT - size) / 2)
  const output = new PNG({ width: LUMINANCE_WIDTH, height: LUMINANCE_HEIGHT })

  for (let y = 0; y < LUMINANCE_HEIGHT; y += 1) {
    for (let x = 0; x < LUMINANCE_WIDTH; x += 1) {
      const dest = (LUMINANCE_WIDTH * y + x) << 2
      output.data[dest] = CREAM.r
      output.data[dest + 1] = CREAM.g
      output.data[dest + 2] = CREAM.b
      output.data[dest + 3] = CREAM.a
    }
  }

  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y / size) * source.height))
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / size) * source.width))
      const sourceIndex = (source.width * sourceY + sourceX) << 2
      const destIndex = (LUMINANCE_WIDTH * (y + offsetY) + x) << 2
      const gray = Math.round(
        source.data[sourceIndex] * 0.299 +
          source.data[sourceIndex + 1] * 0.587 +
          source.data[sourceIndex + 2] * 0.114,
      )
      output.data[destIndex] = gray
      output.data[destIndex + 1] = gray
      output.data[destIndex + 2] = gray
      output.data[destIndex + 3] = source.data[sourceIndex + 3]
    }
  }

  return output
}

async function flattenTarget(name, qrPath) {
  const nested = path.join(targetsRoot, name)
  const jsonPath = path.join(nested, `${name}.json`)
  const data = JSON.parse(await readFile(jsonPath, 'utf8'))

  for (const file of Object.values(data.resources ?? {})) {
    await copyFile(path.join(nested, file), path.join(targetsRoot, file))
  }

  const qrPng = await readPng(qrPath)
  const luminanceName = data.resources.luminanceImage
  await writePng(letterboxQrToLuminance(qrPng), path.join(targetsRoot, luminanceName))

  data.imagePath = `image-targets/${luminanceName}`
  data.properties = {
    top: 0,
    left: 0,
    width: LUMINANCE_WIDTH,
    height: LUMINANCE_HEIGHT,
    isRotated: false,
    originalWidth: LUMINANCE_WIDTH,
    originalHeight: LUMINANCE_HEIGHT,
  }
  await writeFile(path.join(targetsRoot, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
  await rm(nested, { recursive: true, force: true })
}

if (!qrStops.length) {
  console.error('No image-tracked stops found in src/stops-config.js.')
  process.exitCode = 1
} else {
  await mkdir(targetsRoot, { recursive: true })

  for (const stop of qrStops) {
    const number = String(stop.number).padStart(2, '0')
    const qrPath = path.join(root, 'public', 'qr', `point-${number}-${stop.id}.png`)
    const nestedFolder = path.join(targetsRoot, stop.targetName)

    await mkdir(nestedFolder, { recursive: true })
    console.log(`Generating ${stop.targetName} from ${path.relative(root, qrPath)}`)
    await runImageTargetCli({
      imagePath: qrPath,
      outputFolder: nestedFolder,
      name: stop.targetName,
    })
    await flattenTarget(stop.targetName, qrPath)
    console.log(`  → public/image-targets/${stop.targetName}.json`)
  }

  const leftover = await readdir(targetsRoot, { withFileTypes: true })
  for (const entry of leftover) {
    if (entry.isDirectory()) {
      await rm(path.join(targetsRoot, entry.name), { recursive: true, force: true })
    }
  }

  console.log(`Generated ${qrStops.length} QR image targets (full code, no side crop).`)
}
