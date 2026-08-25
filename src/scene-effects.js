// Hex values are centralized here because the Three.js version bundled with 8-Frame
// does not parse CSS Color 4 OKLCH values used by the site UI.
const AR_PALETTE = {
  ink: '#2a2118',
  paper: '#f8f0d8',
  orange: '#f26a2e',
  yellow: '#f4c542',
  sky: '#71c4d6',
  green: '#60a94f',
  greenDark: '#2f6d3e',
  red: '#d74b3f',
  blue: '#326ec9',
  violet: '#7656b6',
}

function entity(tag, attributes = {}) {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }
  return element
}

function append(parent, ...children) {
  parent.append(...children)
  return parent
}

const RAINBOW_STOPS = [
  '#5a1488',
  '#9c27b0',
  '#e91e63',
  '#f44336',
  '#ff6d00',
  '#ffc107',
  '#eeff41',
  '#76ff03',
]

function createRainbowTexture(three) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0)
  RAINBOW_STOPS.forEach((color, index) => {
    gradient.addColorStop(index / (RAINBOW_STOPS.length - 1), color)
  })
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const fade = context.createLinearGradient(0, 0, 0, canvas.height)
  fade.addColorStop(0, 'rgba(0,0,0,1)')
  fade.addColorStop(0.18, 'rgba(0,0,0,0)')
  fade.addColorStop(0.82, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  context.globalCompositeOperation = 'destination-out'
  context.fillStyle = fade
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new three.CanvasTexture(canvas)
  texture.wrapS = three.RepeatWrapping
  texture.wrapT = three.ClampToEdgeWrapping
  texture.repeat.set(1.6, 1)
  texture.needsUpdate = true
  if ('SRGBColorSpace' in three && 'colorSpace' in texture) {
    texture.colorSpace = three.SRGBColorSpace
  } else if ('sRGBEncoding' in three) {
    texture.encoding = three.sRGBEncoding
  }
  return texture
}

function createFlowRibbonGeometry(segments) {
  const three = window.AFRAME.THREE
  const vertexCount = (segments + 1) * 2
  const geometry = new three.BufferGeometry()
  geometry.setAttribute('position', new three.BufferAttribute(new Float32Array(vertexCount * 3), 3))
  geometry.setAttribute('uv', new three.BufferAttribute(new Float32Array(vertexCount * 2), 2))
  const index = []
  for (let i = 0; i < segments; i += 1) {
    const left = i * 2
    const right = left + 1
    index.push(left, left + 2, right, right, left + 2, right + 2)
  }
  geometry.setIndex(index)
  return geometry
}

function updateFlowRibbonGeometry(geometry, segments, length, width, time, phase, curl) {
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  const half = width / 2

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const y = t * length
    const swell = 0.7 + 0.3 * Math.sin(t * Math.PI)
    const curveX = Math.sin(t * Math.PI * 1.2 + phase) * curl * t
    const curveZ = Math.sin(t * Math.PI * 0.85 + phase * 0.5) * curl * 0.35
    const flow = Math.sin(t * 10 - time * 8 + phase) * 0.04 * swell
    const left = i * 2
    const right = left + 1
    // Stream goes up (+Y). Ribbon lies in XY so it reads as a vertical sheet.
    positions.setXYZ(left, curveX - half * swell + flow, y, curveZ)
    positions.setXYZ(right, curveX + half * swell + flow, y, curveZ)
    uvs.setXY(left, 0.04, t)
    uvs.setXY(right, 0.96, t)
  }

  positions.needsUpdate = true
  uvs.needsUpdate = true
}

function createIvyLeafTexture(three, variant = 0) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 256)
  ctx.translate(128, 132)

  const dark = variant === 0 ? '#1c4a28' : variant === 1 ? '#245830' : '#163820'
  const mid = variant === 0 ? '#2f7a40' : variant === 1 ? '#3a8c4a' : '#286838'
  const light = variant === 0 ? '#6bb56a' : variant === 1 ? '#7ec77c' : '#4e9a52'

  ctx.beginPath()
  ctx.moveTo(0, 96)
  ctx.bezierCurveTo(18, 70, 52, 38, 58, 8)
  ctx.bezierCurveTo(62, -18, 38, -48, 12, -58)
  ctx.bezierCurveTo(4, -92, -4, -92, -12, -58)
  ctx.bezierCurveTo(-38, -48, -62, -18, -58, 8)
  ctx.bezierCurveTo(-52, 38, -18, 70, 0, 96)
  ctx.closePath()

  const fill = ctx.createLinearGradient(-40, -70, 40, 80)
  fill.addColorStop(0, light)
  fill.addColorStop(0.45, mid)
  fill.addColorStop(1, dark)
  ctx.fillStyle = fill
  ctx.fill()

  ctx.strokeStyle = 'rgba(12, 40, 20, 0.45)'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, 88)
  ctx.quadraticCurveTo(4, 10, 0, -52)
  ctx.moveTo(0, 20)
  ctx.quadraticCurveTo(28, -8, 46, -6)
  ctx.moveTo(0, 20)
  ctx.quadraticCurveTo(-28, -8, -46, -6)
  ctx.moveTo(0, 50)
  ctx.quadraticCurveTo(22, 28, 36, 36)
  ctx.moveTo(0, 50)
  ctx.quadraticCurveTo(-22, 28, -36, 36)
  ctx.strokeStyle = 'rgba(210, 240, 180, 0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  const texture = new three.CanvasTexture(canvas)
  texture.needsUpdate = true
  if ('SRGBColorSpace' in three && 'colorSpace' in texture) {
    texture.colorSpace = three.SRGBColorSpace
  } else if ('sRGBEncoding' in three) {
    texture.encoding = three.sRGBEncoding
  }
  return texture
}

function ivyPointOnCurve(points, t) {
  const clamped = Math.max(0, Math.min(0.999, t))
  const scaled = clamped * (points.length - 1)
  const index = Math.floor(scaled)
  const mix = scaled - index
  const a = points[index]
  const b = points[index + 1] || a
  return {
    x: a.x + (b.x - a.x) * mix,
    y: a.y + (b.y - a.y) * mix,
    z: a.z + (b.z - a.z) * mix,
  }
}

function ivyRand(seed) {
  let t = seed | 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function keepOutsidePainting(x, y, layout, margin = 0.05) {
  const left = layout.offsetX - layout.width / 2 - margin
  const right = layout.offsetX + layout.width / 2 + margin
  const bottom = layout.offsetY - layout.height / 2 - margin
  const top = layout.offsetY + layout.height / 2 + margin
  if (x <= left || x >= right || y <= bottom || y >= top) return { x, y }
  const dl = x - left
  const dr = right - x
  const db = y - bottom
  const dt = top - y
  const nearest = Math.min(dl, dr, db, dt)
  if (nearest === dl) return { x: left, y }
  if (nearest === dr) return { x: right, y }
  if (nearest === db) return { x, y: bottom }
  return { x, y: top }
}

function ivyEdgeSpawn(side, rng, layout) {
  const left = layout.offsetX - layout.width / 2
  const right = layout.offsetX + layout.width / 2
  const bottom = layout.offsetY - layout.height / 2
  const top = layout.offsetY + layout.height / 2
  const along = 0.06 + rng() * 0.88
  const behind = -0.08
  const jitter = (rng() - 0.5) * 0.85
  if (side === 0) {
    return { x: left, y: bottom + along * (top - bottom), z: behind, heading: Math.PI + jitter }
  }
  if (side === 1) {
    return { x: right, y: bottom + along * (top - bottom), z: behind, heading: jitter }
  }
  if (side === 2) {
    return { x: left + along * (right - left), y: bottom, z: behind, heading: -Math.PI / 2 + jitter }
  }
  return { x: left + along * (right - left), y: top, z: behind, heading: Math.PI / 2 + jitter }
}

function growIvyStem({ layout, rng, start, heading, steps, stepLen }) {
  const points = [{ x: start.x, y: start.y, z: start.z }]
  let x = start.x
  let y = start.y
  let z = start.z
  let angle = heading
  const cx = layout.offsetX
  const cy = layout.offsetY

  for (let i = 0; i < steps; i += 1) {
    const t = i / steps
    angle += (rng() - 0.47) * (0.42 + rng() * 0.55)
    if (rng() < 0.08) angle += (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.9)
    const away = Math.atan2(y - cy, x - cx)
    const cling = t < 0.22 ? 0.38 : 0.12
    angle = angle * (1 - cling) + away * cling
    x += Math.cos(angle) * stepLen
    y += Math.sin(angle) * stepLen
    const kept = keepOutsidePainting(x, y, layout)
    x = kept.x
    y = kept.y
    z = -0.08 * (1 - t) + (0.03 + rng() * 0.05) * t
    points.push({ x, y, z })
  }
  return points
}

function createIvyVines(layout, count) {
  const vines = []
  const mains = Math.max(8, count)
  for (let i = 0; i < mains; i += 1) {
    const rng = ivyRand(1400 + i * 97)
    const spawn = ivyEdgeSpawn(i % 4, rng, layout)
    const longRunner = rng() > 0.35
    vines.push({
      path: growIvyStem({
        layout,
        rng,
        start: spawn,
        heading: spawn.heading,
        steps: longRunner ? 34 + Math.floor(rng() * 14) : 22 + Math.floor(rng() * 10),
        stepLen: 0.042 + rng() * 0.028,
      }),
      delay: rng() * 2200,
      halfWidth: 0.007 + rng() * 0.007,
    })
  }

  const branches = Math.floor(mains * 0.85)
  for (let b = 0; b < branches; b += 1) {
    const rng = ivyRand(8800 + b * 53)
    const parent = vines[b % mains]
    const t = 0.22 + rng() * 0.55
    const origin = ivyPointOnCurve(parent.path, t)
    const ahead = ivyPointOnCurve(parent.path, Math.min(0.99, t + 0.08))
    const base = Math.atan2(ahead.y - origin.y, ahead.x - origin.x)
    const heading = base + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 1.1)
    vines.push({
      path: growIvyStem({
        layout,
        rng,
        start: origin,
        heading,
        steps: 14 + Math.floor(rng() * 12),
        stepLen: 0.036 + rng() * 0.022,
      }),
      delay: parent.delay + 700 + rng() * 1600,
      halfWidth: 0.004 + rng() * 0.005,
    })
  }
  return vines
}

function buildFootprints(root) {
  root.append(
    entity('a-entity', {
      rotation: '0 14 0',
      'data-start-on-place': '',
      'reveal-footprints-out': 'count: 5; fadeDur: 1500',
    }),
  )
}

function buildBus(root) {
  const flight = entity('a-entity', {
    position: '0 0 0',
    'data-start-on-place': '',
      'fly-fade-pass': 'fromX: 0; toX: -2.2; lift: 0.18; dur: 7000; fadeDur: 550',
  })
  const bus = entity('a-entity')
  append(
    bus,
    entity('a-box', {
      color: AR_PALETTE.yellow,
      depth: '0.38',
      height: '0.72',
      width: '1.45',
      material: `color: ${AR_PALETTE.yellow}; transparent: true; opacity: 0`,
    }),
    entity('a-box', {
      color: AR_PALETTE.sky,
      depth: '0.39',
      height: '0.26',
      position: '-0.25 0.12 0',
      width: '0.72',
      material: `color: ${AR_PALETTE.sky}; transparent: true; opacity: 0`,
    }),
    entity('a-box', {
      color: AR_PALETTE.paper,
      depth: '0.4',
      height: '0.12',
      position: '0 -0.1 0',
      width: '1.48',
      material: `color: ${AR_PALETTE.paper}; transparent: true; opacity: 0`,
    }),
  )

  for (const x of [-0.48, 0.48]) {
    bus.append(
      entity('a-cylinder', {
        color: AR_PALETTE.ink,
        height: '0.42',
        position: `${x} -0.38 0`,
        radius: '0.16',
        rotation: '90 0 0',
        material: `color: ${AR_PALETTE.ink}; transparent: true; opacity: 0`,
      }),
    )
  }

  flight.append(bus)
  root.append(flight)
}

function buildPlant(root) {
  root.append(
    entity('a-entity', {
      'data-start-on-place': '',
      'wild-wall-ivy':
        'offsetX: 0.62; offsetY: 0; width: 0.7; height: 0.7; vines: 22; growDur: 11000',
    }),
  )
}

function buildColors(root) {
  root.append(
    entity('a-entity', {
      'data-start-on-place': '',
      'rainbow-burst': 'height: 1.8',
    }),
  )
}

function buildCaterpillar(root) {
  const creature = entity('a-entity', {
    position: '0 0 0',
    rotation: '0 0 -8',
    'animation__climb':
      'property: position; from: 0 0 0.03; to: 0 1.6 0.03; dur: 6800; easing: easeInOutSine; loop: true',
  })

  for (let index = 0; index < 7; index += 1) {
    creature.append(
      entity('a-sphere', {
        color: index === 0 ? AR_PALETTE.orange : AR_PALETTE.green,
        position: `0 ${index * -0.17} 0`,
        radius: index === 0 ? '0.15' : '0.13',
      }),
    )
  }

  append(
    creature,
    entity('a-cylinder', {
      color: AR_PALETTE.ink,
      height: '0.22',
      position: '-0.07 0.2 0',
      radius: '0.012',
      rotation: '0 0 -20',
    }),
    entity('a-cylinder', {
      color: AR_PALETTE.ink,
      height: '0.22',
      position: '0.07 0.2 0',
      radius: '0.012',
      rotation: '0 0 20',
    }),
  )

  root.append(creature)
}

function buildNinja(root) {
  const figure = entity('a-entity', {
    scale: '0.001 0.001 0.001',
    'animation__reveal':
      'property: scale; from: 0.001 0.001 0.001; to: 1 1 1; dur: 680; easing: easeOutBack',
  })

  append(
    figure,
    entity('a-sphere', {
      color: AR_PALETTE.paper,
      position: '0 1.55 0',
      radius: '0.22',
    }),
    entity('a-cylinder', {
      color: AR_PALETTE.orange,
      height: '0.9',
      position: '0 0.9 0',
      radius: '0.24',
    }),
    entity('a-cylinder', {
      color: AR_PALETTE.blue,
      height: '0.72',
      position: '-0.13 0.25 0',
      radius: '0.075',
      rotation: '0 0 -4',
    }),
    entity('a-cylinder', {
      color: AR_PALETTE.blue,
      height: '0.72',
      position: '0.13 0.25 0',
      radius: '0.075',
      rotation: '0 0 4',
    }),
  )

  root.append(figure)
}

function buildModel(root, stop) {
  const modelAttributes = {
    'gltf-model': stop.modelAssetId ? `#${stop.modelAssetId}` : `url(${stop.modelSrc})`,
    'model-normalizer': `size: ${stop.modelSize ?? 1.25}`,
    rotation: stop.modelRotation ?? '0 0 0',
  }
  if (stop.animationClip) {
    modelAttributes['play-gltf-animation'] = `clip: ${stop.animationClip}`
  }

  const model = entity('a-entity', modelAttributes)
  model.addEventListener('model-error', () => {
    console.warn(`Could not load ${stop.modelSrc}. Using the procedural stand-in.`)
    root.replaceChildren()
    BUILDERS[stop.effect]?.(root)
  })
  model.addEventListener(
    'model-loaded',
    () => {
      const motion = model.parentElement
      if (motion?.hasAttribute('data-start-on-place') && root.object3D.visible) {
        motion.emit('effect-start')
      }
    },
    { once: true },
  )

  if (stop.motion === 'fly-horizontal') {
    const flight = entity('a-entity', {
      position: '0 0 0',
      'data-start-on-place': '',
      'fly-fade-pass': 'fromX: 0; toX: -2.4; lift: 0.18; dur: 7000; fadeDur: 550',
    })
    flight.append(model)
    root.append(flight)
    return
  }

  if (stop.motion === 'climb-vertical') {
    const climb = entity('a-entity', {
      position: '0 0 0.03',
      'data-start-on-place': '',
      'animation__climb':
        'property: position; from: 0 0 0.03; to: 0 1.6 0.03; dur: 28200; easing: easeInOutSine; loop: true; autoplay: false; startEvents: effect-start',
    })
    climb.append(model)
    root.append(climb)
    return
  }

  if (stop.motion === 'reveal') {
    const reveal = entity('a-entity', {
      scale: '0.001 0.001 0.001',
      'data-start-on-place': '',
      'animation__reveal':
        'property: scale; from: 0.001 0.001 0.001; to: 1 1 1; dur: 720; easing: easeOutBack; autoplay: false; startEvents: effect-start',
    })
    reveal.append(model)
    root.append(reveal)
    return
  }

  root.append(model)
}

const BUILDERS = {
  footprints: buildFootprints,
  bus: buildBus,
  plant: buildPlant,
  colors: buildColors,
  caterpillar: buildCaterpillar,
  ninja: buildNinja,
}

export function registerSceneComponents() {
  if (!window.AFRAME) return

  if (!window.AFRAME.components['image-target-anchor']) {
    window.AFRAME.registerComponent('image-target-anchor', {
      schema: {
        name: { type: 'string' },
        lockOnce: { type: 'boolean', default: true },
      },
      init() {
        this.el.object3D.visible = false
        this.seen = false
        this.show = ({ detail }) => {
          const name = detail?.name || detail?.image?.name
          if (name !== this.data.name) return
          this.el.object3D.position.copy(detail.position)
          this.el.object3D.quaternion.copy(detail.rotation)
          this.el.object3D.scale.setScalar(detail.scale || 1)
          this.el.object3D.visible = true
          if (!this.seen) {
            this.seen = true
            this.el.emit('target-visible', detail, false)
          }
        }
        this.hide = ({ detail }) => {
          const name = detail?.name || detail?.image?.name
          if (name !== this.data.name || this.data.lockOnce) return
          this.el.object3D.visible = false
          this.el.emit('target-hidden', detail, false)
        }
        this.el.sceneEl.addEventListener('xrimagefound', this.show)
        this.el.sceneEl.addEventListener('xrimageupdated', this.show)
        this.el.sceneEl.addEventListener('xrimagelost', this.hide)
        window.addEventListener('xrimagefound', this.show)
        window.addEventListener('xrimageupdated', this.show)
        window.addEventListener('xrimagelost', this.hide)
      },
      remove() {
        this.el.sceneEl.removeEventListener('xrimagefound', this.show)
        this.el.sceneEl.removeEventListener('xrimageupdated', this.show)
        this.el.sceneEl.removeEventListener('xrimagelost', this.hide)
        window.removeEventListener('xrimagefound', this.show)
        window.removeEventListener('xrimageupdated', this.show)
        window.removeEventListener('xrimagelost', this.hide)
      },
    })
  }

  if (!window.AFRAME.components['shelf-ground-anchor']) {
    window.AFRAME.registerComponent('shelf-ground-anchor', {
      schema: {
        name: { type: 'string' },
        groundOffsetY: { type: 'number' },
        floorLift: { type: 'number', default: 0.02 },
        trailForward: { type: 'number', default: 0.4 },
      },
      init() {
        this.placed = false
        this.el.object3D.visible = false
        this.place = ({ detail }) => {
          const name = detail?.name || detail?.image?.name
          if (this.placed || name !== this.data.name) return

          const three = window.AFRAME.THREE
          const targetRotation = new three.Quaternion(
            detail.rotation.x,
            detail.rotation.y,
            detail.rotation.z,
            detail.rotation.w,
          )
          const forward = new three.Vector3(0, 0, 1).applyQuaternion(targetRotation)
          forward.y = 0
          if (forward.lengthSq() < 0.0001) {
            forward.set(0, 0, 1)
          } else {
            forward.normalize()
          }

          const object = this.el.object3D
          object.position.set(
            detail.position.x + forward.x * this.data.trailForward,
            detail.position.y - this.data.groundOffsetY + this.data.floorLift,
            detail.position.z + forward.z * this.data.trailForward,
          )
          object.quaternion.setFromUnitVectors(new three.Vector3(0, 0, -1), forward)
          object.scale.set(1, 1, 1)
          object.visible = true
          this.placed = true
          this.el.emit('ground-placed', { position: object.position.clone() }, false)
        }
        this.el.sceneEl.addEventListener('xrimagefound', this.place)
        this.el.sceneEl.addEventListener('xrimageupdated', this.place)
        window.addEventListener('xrimagefound', this.place)
        window.addEventListener('xrimageupdated', this.place)
      },
      remove() {
        this.el.sceneEl.removeEventListener('xrimagefound', this.place)
        this.el.sceneEl.removeEventListener('xrimageupdated', this.place)
        window.removeEventListener('xrimagefound', this.place)
        window.removeEventListener('xrimageupdated', this.place)
      },
    })
  }

  if (!window.AFRAME.components['reveal-footprints-out']) {
    window.AFRAME.registerComponent('reveal-footprints-out', {
      schema: {
        count: { type: 'int', default: 5 },
        fadeDur: { type: 'number', default: 1500 },
        src: { type: 'string', default: '/assets/models/Footprints.png' },
      },
      init() {
        const three = window.AFRAME.THREE
        this.started = false
        this.elapsed = 0
        this.steps = []
        this.onStart = () => this.begin()

        const count = Math.max(1, this.data.count)
        const fadeDur = Math.max(1, this.data.fadeDur)
        const texture = new three.TextureLoader().load(this.data.src, (loaded) => {
          if ('SRGBColorSpace' in three) loaded.colorSpace = three.SRGBColorSpace
          loaded.needsUpdate = true
        })

        for (let index = 0; index < count; index += 1) {
          const material = new three.MeshBasicMaterial({
            map: texture,
            color: new three.Color(AR_PALETTE.ink),
            transparent: true,
            opacity: 0,
            side: three.DoubleSide,
            depthWrite: false,
          })
          const geometry = new three.PlaneGeometry(0.55, 0.7)
          const mesh = new three.Mesh(geometry, material)
          mesh.rotation.x = -Math.PI / 2
          mesh.rotation.z = Math.PI
          mesh.position.set(0, 0.025, index * 0.75)
          mesh.scale.set(0.2, 0.2, 0.2)
          mesh.visible = false
          this.el.object3D.add(mesh)
          this.steps.push({
            mesh,
            material,
            delay: index * fadeDur,
            fadeDur,
          })
        }

        this.el.addEventListener('effect-start', this.onStart)
      },
      begin() {
        if (this.started) return
        this.started = true
        this.elapsed = 0
        for (const step of this.steps) {
          step.material.opacity = 0
          step.mesh.scale.set(0.2, 0.2, 0.2)
          step.mesh.visible = false
        }
      },
      easeOutCubic(t) {
        return 1 - (1 - t) ** 3
      },
      tick(_time, delta) {
        if (!this.started && this.el.object3D.parent?.visible) this.begin()
        if (!this.started) return

        this.elapsed += Math.max(0, delta)
        for (const step of this.steps) {
          const t = Math.max(0, Math.min(1, (this.elapsed - step.delay) / step.fadeDur))
          if (t <= 0) {
            step.mesh.visible = false
            step.material.opacity = 0
            continue
          }
          step.mesh.visible = true
          step.material.opacity = this.easeOutCubic(t)
          const scale = 0.2 + 0.8 * this.easeOutCubic(t)
          step.mesh.scale.set(scale, scale, scale)
        }
      },
      remove() {
        this.el.removeEventListener('effect-start', this.onStart)
        for (const step of this.steps) {
          step.mesh.geometry.dispose()
          step.material.dispose()
          this.el.object3D.remove(step.mesh)
        }
      },
    })
  }

  if (!window.AFRAME.components['fly-fade-pass']) {
    window.AFRAME.registerComponent('fly-fade-pass', {
      schema: {
        fromX: { type: 'number', default: 0 },
        toX: { type: 'number', default: 2.4 },
        lift: { type: 'number', default: 0.18 },
        dur: { type: 'number', default: 7000 },
        fadeDur: { type: 'number', default: 550 },
        loop: { type: 'boolean', default: true },
      },
      init() {
        this.playing = false
        this.elapsed = 0
        this.phase = 'idle'
        this.opacity = 0
        this.materials = []
        this.onStart = () => this.beginPass()
        this.el.addEventListener('effect-start', this.onStart)
        this.el.addEventListener('model-loaded', () => this.collectMaterials())
        this.collectMaterials()
        this.applyOpacity(0)
        this.el.object3D.position.set(this.data.fromX, 0, 0)
      },
      collectMaterials() {
        this.materials = []
        this.el.object3D.traverse((node) => {
          if (!node.isMesh || !node.material) return
          const list = Array.isArray(node.material) ? node.material : [node.material]
          for (const material of list) {
            material.transparent = true
            material.depthWrite = false
            this.materials.push(material)
          }
        })
        this.applyOpacity(this.opacity)
      },
      applyOpacity(value) {
        this.opacity = value
        for (const material of this.materials) {
          material.opacity = value
          material.transparent = value < 0.999
          material.depthWrite = value >= 0.95
          material.needsUpdate = true
        }
      },
      easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2
      },
      easeOutCubic(t) {
        return 1 - (1 - t) ** 3
      },
      easeInCubic(t) {
        return t * t * t
      },
      beginPass() {
        this.collectMaterials()
        this.playing = true
        this.elapsed = 0
        this.phase = 'fade-in'
        this.applyOpacity(0)
        this.el.object3D.position.set(this.data.fromX, 0, 0)
      },
      tick(_time, delta) {
        if (!this.playing || this.phase === 'idle') return
        if (!this.materials.length) this.collectMaterials()

        const step = Math.max(0, delta)
        this.elapsed += step
        const fade = Math.max(1, this.data.fadeDur)
        const fly = Math.max(1, this.data.dur)

        if (this.phase === 'fade-in') {
          const t = Math.min(1, this.elapsed / fade)
          this.applyOpacity(this.easeOutCubic(t))
          this.el.object3D.position.set(this.data.fromX, 0, 0)
          if (t >= 1) {
            this.phase = 'fly'
            this.elapsed = 0
          }
          return
        }

        if (this.phase === 'fly') {
          const t = Math.min(1, this.elapsed / fly)
          const eased = this.easeInOutSine(t)
          const x = this.data.fromX + (this.data.toX - this.data.fromX) * eased
          const y = this.data.lift * Math.sin(Math.PI * eased)
          this.el.object3D.position.set(x, y, 0)
          this.applyOpacity(1)
          if (t >= 1) {
            this.phase = 'fade-out'
            this.elapsed = 0
          }
          return
        }

        if (this.phase === 'fade-out') {
          const t = Math.min(1, this.elapsed / fade)
          this.applyOpacity(1 - this.easeInCubic(t))
          this.el.object3D.position.set(this.data.toX, 0, 0)
          if (t >= 1) {
            if (this.data.loop) {
              this.beginPass()
            } else {
              this.phase = 'idle'
              this.playing = false
              this.applyOpacity(0)
            }
          }
        }
      },
      remove() {
        this.el.removeEventListener('effect-start', this.onStart)
      },
    })
  }

  if (!window.AFRAME.components['wild-wall-ivy']) {
    window.AFRAME.registerComponent('wild-wall-ivy', {
      schema: {
        vines: { type: 'int', default: 22 },
        growDur: { type: 'number', default: 11000 },
        offsetX: { type: 'number', default: 0.62 },
        offsetY: { type: 'number', default: 0 },
        width: { type: 'number', default: 0.7 },
        height: { type: 'number', default: 0.7 },
      },
      init() {
        const three = window.AFRAME.THREE
        this.started = false
        this.elapsed = 0
        this.vines = []
        this.leafTextures = [0, 1, 2].map((variant) => createIvyLeafTexture(three, variant))
        this.stemMaterial = new three.MeshBasicMaterial({
          color: '#2a4a28',
        })
        this.onStart = () => this.begin()
        this.paintCx = this.data.offsetX
        this.paintCy = this.data.offsetY

        const layout = {
          offsetX: this.data.offsetX,
          offsetY: this.data.offsetY,
          width: this.data.width,
          height: this.data.height,
        }
        const generated = createIvyVines(layout, Math.max(8, this.data.vines))
        const stemColors = ['#1d361c', '#243f22', '#30562c', '#1a2e18', '#3a5e32']

        generated.forEach((spec, v) => {
          const path = spec.path
          const stemGeo = new three.BufferGeometry()
          const stemVerts = path.length * 2
          stemGeo.setAttribute('position', new three.BufferAttribute(new Float32Array(stemVerts * 3), 3))
          const index = []
          for (let i = 0; i < path.length - 1; i += 1) {
            const a = i * 2
            index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
          }
          stemGeo.setIndex(index)
          const stemMat = this.stemMaterial.clone()
          stemMat.color.set(stemColors[v % stemColors.length])
          const stem = new three.Mesh(stemGeo, stemMat)
          stem.frustumCulled = false
          this.el.object3D.add(stem)

          const rng = ivyRand(22000 + v * 41)
          const leaves = []
          const leafCount = 14 + Math.floor(rng() * 12)
          for (let l = 0; l < leafCount; l += 1) {
            const cluster = rng() < 0.28 ? rng() * 0.04 : 0
            const t = 0.08 + (l / leafCount) * 0.86 + cluster
            const size = 0.11 + rng() * 0.16
            const geometry = new three.PlaneGeometry(size, size * (1.15 + rng() * 0.35))
            const material = new three.MeshBasicMaterial({
              map: this.leafTextures[Math.floor(rng() * this.leafTextures.length)],
              transparent: true,
              opacity: 0,
              side: three.DoubleSide,
              depthWrite: false,
              alphaTest: 0.12,
            })
            const leaf = new three.Mesh(geometry, material)
            leaf.visible = false
            leaf.frustumCulled = false
            this.el.object3D.add(leaf)
            leaves.push({
              mesh: leaf,
              material,
              t: Math.min(0.97, t),
              side: rng() < 0.5 ? 1 : -1,
              tilt: rng() * 6,
              offset: 0.02 + rng() * 0.05,
              spin: (rng() - 0.5) * 1.2,
            })
          }

          this.vines.push({
            path,
            stem,
            stemGeo,
            leaves,
            delay: spec.delay,
            halfWidth: spec.halfWidth,
            grown: false,
          })
        })

        this.el.addEventListener('effect-start', this.onStart)
      },
      begin() {
        if (this.started) return
        this.started = true
        this.elapsed = 0
      },
      easeOutCubic(t) {
        return 1 - (1 - t) ** 3
      },
      updateStem(vine, growth) {
        const positions = vine.stemGeo.getAttribute('position')
        const count = vine.path.length
        const visible = Math.max(2, Math.ceil(growth * (count - 1)) + 1)
        for (let i = 0; i < count; i += 1) {
          const point = vine.path[i]
          const show = i < visible
          const next = vine.path[Math.min(count - 1, i + 1)]
          const dx = next.x - point.x
          const dy = next.y - point.y
          const len = Math.hypot(dx, dy) || 1
          const taper = 1 - (i / (count - 1)) * 0.55
          const px = (-dy / len) * vine.halfWidth * taper
          const py = (dx / len) * vine.halfWidth * taper
          const x = show ? point.x : vine.path[0].x
          const y = show ? point.y : vine.path[0].y
          const z = show ? point.z : vine.path[0].z
          positions.setXYZ(i * 2, x - px, y - py, z)
          positions.setXYZ(i * 2 + 1, x + px, y + py, z + 0.004)
        }
        positions.needsUpdate = true
      },
      tick(_time, delta) {
        if (!this.started && this.el.object3D.parent?.visible) this.begin()
        if (!this.started) return

        this.elapsed += Math.max(0, delta)
        const time = this.elapsed / 1000

        for (const vine of this.vines) {
          const raw = (this.elapsed - vine.delay) / this.data.growDur
          const growth = this.easeOutCubic(Math.max(0, Math.min(1, raw)))
          if (!vine.grown) {
            this.updateStem(vine, growth)
            if (growth >= 1) vine.grown = true
          }

          for (const leaf of vine.leaves) {
            if (growth < leaf.t) {
              leaf.mesh.visible = false
              leaf.material.opacity = 0
              continue
            }
            const local = Math.min(1, (growth - leaf.t) / 0.18)
            const point = ivyPointOnCurve(vine.path, Math.min(growth, leaf.t))
            const ahead = ivyPointOnCurve(vine.path, Math.min(0.99, leaf.t + 0.05))
            const tx = ahead.x - point.x
            const ty = ahead.y - point.y
            const tlen = Math.hypot(tx, ty) || 1
            const nx = -ty / tlen
            const ny = tx / tlen
            const awayX = point.x - this.paintCx
            const awayY = point.y - this.paintCy
            const alen = Math.hypot(awayX, awayY) || 1
            leaf.mesh.visible = true
            leaf.mesh.position.set(
              point.x + nx * leaf.side * leaf.offset + (awayX / alen) * 0.03,
              point.y + ny * leaf.side * leaf.offset + (awayY / alen) * 0.03,
              point.z + 0.01,
            )
            leaf.mesh.lookAt(ahead.x, ahead.y, ahead.z + 0.18)
            leaf.mesh.rotateZ(leaf.side * 0.55 + leaf.spin)
            leaf.mesh.rotateY(leaf.side * 0.28)
            const sway = Math.sin(time * 1.15 + leaf.tilt) * 0.06
            leaf.mesh.rotateZ(sway)
            const scale = 0.12 + 0.88 * this.easeOutCubic(local)
            leaf.mesh.scale.set(scale, scale, scale)
            leaf.material.opacity = this.easeOutCubic(local)
          }
        }
      },
      remove() {
        this.el.removeEventListener('effect-start', this.onStart)
        for (const vine of this.vines) {
          vine.stemGeo.dispose()
          vine.stem.material.dispose()
          this.el.object3D.remove(vine.stem)
          for (const leaf of vine.leaves) {
            leaf.mesh.geometry.dispose()
            leaf.material.dispose()
            this.el.object3D.remove(leaf.mesh)
          }
        }
        for (const texture of this.leafTextures) texture.dispose()
        this.stemMaterial.dispose()
      },
    })
  }

  if (!window.AFRAME.components['rainbow-burst']) {
    window.AFRAME.registerComponent('rainbow-burst', {
      schema: {
        height: { type: 'number', default: 1.8 },
      },
      init() {
        const three = window.AFRAME.THREE
        this.clock = 0
        this.unfurl = 0
        this.playing = false
        this.origin = new three.Vector3()
        this.camPos = new three.Vector3()
        this.parentQuat = new three.Quaternion()
        this.segments = 48
        this.texture = createRainbowTexture(three)
        this.layers = []

        const layouts = [
          { width: 0.55, opacity: 0.95, phase: 0.15, curl: 0.16, additive: false },
          { width: 0.42, opacity: 0.55, phase: 1.1, curl: 0.12, additive: true },
          { width: 0.3, opacity: 0.4, phase: 2.2, curl: 0.1, additive: true },
        ]

        for (const layout of layouts) {
          const geometry = createFlowRibbonGeometry(this.segments)
          const material = new three.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: layout.opacity,
            side: three.DoubleSide,
            depthWrite: false,
            blending: layout.additive ? three.AdditiveBlending : three.NormalBlending,
          })
          const mesh = new three.Mesh(geometry, material)
          mesh.frustumCulled = false
          this.el.object3D.add(mesh)
          this.layers.push({ mesh, geometry, ...layout })
        }

        this.onStart = () => {
          this.playing = true
          this.unfurl = 0
        }
        this.el.addEventListener('effect-start', this.onStart)
      },
      tick(_time, delta) {
        const camera = this.el.sceneEl?.camera
        if (!camera || !this.el.object3D.visible) return

        if (this.el.object3D.parent?.visible && !this.playing) this.playing = true

        const step = Math.max(0, delta)
        this.clock += step
        if (this.playing) this.unfurl = Math.min(1, this.unfurl + step / 650)

        this.el.object3D.parent?.updateMatrixWorld(true)
        const parent = this.el.object3D.parent
        if (parent) {
          parent.getWorldQuaternion(this.parentQuat).invert()
          this.el.object3D.quaternion.copy(this.parentQuat)
        }

        const origin = this.el.object3D.getWorldPosition(this.origin)
        camera.getWorldPosition(this.camPos)
        this.el.object3D.rotateY(Math.atan2(this.camPos.x - origin.x, this.camPos.z - origin.z))

        const length = this.data.height * (1 - (1 - this.unfurl) ** 3)
        if (length < 0.03) return

        this.texture.offset.x = (this.texture.offset.x - step * 0.0011) % 1

        const time = this.clock / 1000
        for (const layer of this.layers) {
          updateFlowRibbonGeometry(
            layer.geometry,
            this.segments,
            length,
            layer.width,
            time,
            layer.phase,
            layer.curl,
          )
        }
      },
      remove() {
        this.el.removeEventListener('effect-start', this.onStart)
        for (const layer of this.layers) {
          layer.geometry.dispose()
          layer.mesh.material.dispose()
          this.el.object3D.remove(layer.mesh)
        }
        this.texture?.dispose()
      },
    })
  }

  if (!window.AFRAME.components['play-gltf-animation']) {
    window.AFRAME.registerComponent('play-gltf-animation', {
      schema: {
        clip: { default: '*' },
      },
      init() {
        this.el.addEventListener('model-loaded', ({ detail }) => {
          const model = detail.model
          const clips = model.animations ?? []
          if (!clips.length) return
          this.mixer = new window.AFRAME.THREE.AnimationMixer(model)
          const requested = this.data.clip
          const selected =
            requested === '*'
              ? clips[0]
              : (clips.find((clip) => clip.name === requested) ??
                clips.find((clip) => clip.name.includes(requested)) ??
                clips[0])
          this.mixer.clipAction(selected).play()
        })
      },
      tick(_time, delta) {
        this.mixer?.update(delta / 1000)
      },
      remove() {
        this.mixer?.stopAllAction()
      },
    })
  }

  if (!window.AFRAME.components['model-normalizer']) {
    window.AFRAME.registerComponent('model-normalizer', {
      schema: {
        size: { type: 'number', default: 1.25 },
      },
      init() {
        this.el.addEventListener(
          'model-loaded',
          ({ detail }) => {
            const three = window.AFRAME.THREE
            const model = detail.model
            this.el.object3D.updateMatrixWorld(true)

            const bounds = new three.Box3().setFromObject(model)
            const dimensions = bounds.getSize(new three.Vector3())
            const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z)
            if (!Number.isFinite(largestDimension) || largestDimension <= 0) return

            const center = bounds.getCenter(new three.Vector3())
            this.el.object3D.worldToLocal(center)
            const scale = this.data.size / largestDimension
            model.scale.multiplyScalar(scale)
            model.position.addScaledVector(center, -scale)
          },
          { once: true },
        )
      },
    })
  }
}

export function renderEffect(root, stop) {
  root.replaceChildren()
  if (stop.modelSrc) {
    buildModel(root, stop)
  } else {
    BUILDERS[stop.effect]?.(root)
  }
}
