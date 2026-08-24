import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { STOP_LIST } from '../src/stops-config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'public', 'qr')
const baseUrl = process.env.BASE_URL ?? 'https://redhook-lib.netlify.app'

await mkdir(outputDir, { recursive: true })

const manifest = []

for (const stop of STOP_LIST) {
  const url = new URL('/ar.html', baseUrl)
  url.searchParams.set('stop', stop.id)
  const filename = `point-${String(stop.number).padStart(2, '0')}-${stop.id}.png`
  await QRCode.toFile(path.join(outputDir, filename), url.toString(), {
    width: 1200,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#2a2118',
      light: '#f8f0d8',
    },
  })
  manifest.push({
    id: stop.id,
    number: stop.number,
    title: stop.title,
    area: stop.area,
    url: url.toString(),
    file: `/qr/${filename}`,
  })
}

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${manifest.length} QR codes for ${baseUrl} in public/qr.`)
