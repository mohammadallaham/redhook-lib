import jsQR from 'jsqr'

const PIPELINE_NAME = 'redhook-qr'

function qrState() {
  window.__redhookQr ??= {
    pipeline: false,
    processCpu: null,
    onUpdate: null,
  }
  return window.__redhookQr
}

export function qrMatchesStop(text, stop) {
  if (!text || !stop) return false
  const value = String(text).trim()
  try {
    const url = new URL(value, window.location.origin)
    if (url.searchParams.get('stop')?.toLowerCase() === stop.id) return true
  } catch {
    // Not a URL — still accept an embedded stop id.
  }
  return new RegExp(`[?&]stop=${stop.id}(?:&|#|$)`, 'i').test(value)
}

function ensureRgba(pixels, cols, rows, rowBytes, out) {
  const stride = rowBytes || cols
  const rgba = out && out.length === cols * rows * 4 ? out : new Uint8ClampedArray(cols * rows * 4)

  if (pixels.length >= rows * cols * 4 && stride >= cols * 4) {
    for (let y = 0; y < rows; y += 1) {
      const src = y * stride
      const dest = y * cols * 4
      rgba.set(pixels.subarray(src, src + cols * 4), dest)
    }
    return rgba
  }

  for (let y = 0; y < rows; y += 1) {
    const rowStart = y * stride
    for (let x = 0; x < cols; x += 1) {
      const gray = pixels[rowStart + x]
      const dest = (y * cols + x) * 4
      rgba[dest] = gray
      rgba[dest + 1] = gray
      rgba[dest + 2] = gray
      rgba[dest + 3] = 255
    }
  }
  return rgba
}

function poseFromQr(location, cols, rows, camera, qrSize) {
  const THREE = window.AFRAME.THREE
  const corners = [
    location.topLeftCorner,
    location.topRightCorner,
    location.bottomRightCorner,
    location.bottomLeftCorner,
  ]
  if (corners.some((point) => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) {
    return null
  }

  const widthPx = Math.hypot(
    location.topRightCorner.x - location.topLeftCorner.x,
    location.topRightCorner.y - location.topLeftCorner.y,
  )
  const heightPx = Math.hypot(
    location.bottomLeftCorner.x - location.topLeftCorner.x,
    location.bottomLeftCorner.y - location.topLeftCorner.y,
  )
  const sizePx = (widthPx + heightPx) / 2
  if (sizePx < 24) return null

  const focalPx = (rows / 2) * camera.projectionMatrix.elements[5]
  const distance = Math.max(0.18, Math.min(2.8, (qrSize * focalPx) / sizePx))

  const toNdc = (point) => ({
    x: (point.x / cols) * 2 - 1,
    y: -((point.y / rows) * 2 - 1),
  })

  const cameraPosition = camera.getWorldPosition(new THREE.Vector3())
  const unprojectAtDistance = (point) => {
    const ndc = toNdc(point)
    const world = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera)
    const direction = world.sub(cameraPosition).normalize()
    return cameraPosition.clone().add(direction.multiplyScalar(distance))
  }

  const topLeft = unprojectAtDistance(location.topLeftCorner)
  const topRight = unprojectAtDistance(location.topRightCorner)
  const bottomLeft = unprojectAtDistance(location.bottomLeftCorner)
  const bottomRight = unprojectAtDistance(location.bottomRightCorner)

  const position = new THREE.Vector3()
    .add(topLeft)
    .add(topRight)
    .add(bottomLeft)
    .add(bottomRight)
    .multiplyScalar(0.25)

  const xAxis = topRight.clone().sub(topLeft).normalize()
  const yAxis = topLeft.clone().sub(bottomLeft).normalize()
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis)
  if (zAxis.lengthSq() < 0.0001) return null
  zAxis.normalize()
  yAxis.copy(new THREE.Vector3().crossVectors(zAxis, xAxis).normalize())

  const towardCamera = cameraPosition.clone().sub(position)
  if (towardCamera.dot(zAxis) < 0) {
    zAxis.negate()
    xAxis.negate()
  }

  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis),
  )

  return { position, rotation, scale: 1 }
}

function emitTargetEvent(scene, type, payload) {
  if (scene?.emit) scene.emit(type, payload)
  window.dispatchEvent(new CustomEvent(type, { detail: payload }))
}

export function installQrPipeline(xr, { force = false } = {}) {
  const state = qrState()
  if (!xr) return
  if (state.pipeline && !force) return
  state.pipeline = true

  try {
    if (xr.CameraPixelArray?.pipelineModule) {
      xr.addCameraPipelineModule(
        xr.CameraPixelArray.pipelineModule({
          luminance: true,
          maxDimension: 480,
        }),
      )
    }
  } catch (error) {
    console.warn('Could not add camera pixel pipeline', error)
  }

  try {
    xr.addCameraPipelineModule({
      name: PIPELINE_NAME,
      onProcessCpu: (data) => (state.processCpu ? state.processCpu(data) : {}),
      onUpdate: (data) => {
        state.onUpdate?.(data)
      },
    })
  } catch (error) {
    console.warn('Could not add QR pipeline', error)
  }
}

export function bootQrTracker({ stop, scene }) {
  const state = qrState()
  const cameraEl = document.querySelector('#ar-camera')
  let hits = 0
  let locked = false
  let enabled = false
  let frame = 0
  let pending = null
  let rgbaBuffer = null
  let gotPixels = false
  const qrSize = stop.qrSizeMeters ?? 0.12

  const emitPose = (payload) => {
    emitTargetEvent(scene, locked ? 'xrimageupdated' : 'xrimagefound', payload)
    locked = true
  }

  const processCpu = (event) => {
    frame += 1
    if (locked || frame % 2 === 1) return { found: false }

    const gpu = event.processGpuResult || event.processGpu
    const image = gpu?.camerapixelarray
    if (!image?.pixels || !image.cols || !image.rows) return { found: false }
    gotPixels = true

    try {
      const needed = image.cols * image.rows * 4
      if (!rgbaBuffer || rgbaBuffer.length !== needed) {
        rgbaBuffer = new Uint8ClampedArray(needed)
      }
      const converted = ensureRgba(
        image.pixels,
        image.cols,
        image.rows,
        image.rowBytes,
        rgbaBuffer,
      )
      const code = jsQR(converted, image.cols, image.rows, {
        inversionAttempts: 'attemptBoth',
      })
      if (!code?.data) return { found: false }
      return {
        found: true,
        text: code.data,
        location: code.location,
        cols: image.cols,
        rows: image.rows,
      }
    } catch (error) {
      console.warn('QR scan failed', error)
      return { found: false }
    }
  }

  const fallbackPose = (camera) => {
    const THREE = window.AFRAME.THREE
    const position = new THREE.Vector3(0, 0, -(stop.placementDistance ?? 1.2))
    camera.localToWorld(position)
    return {
      position,
      rotation: camera.getWorldQuaternion(new THREE.Quaternion()),
      scale: 1,
    }
  }

  const onUpdate = (event) => {
    const cpu = event.processCpuResult || event.processCpu
    const result = cpu?.[PIPELINE_NAME]
    const camera = cameraEl?.getObject3D('camera')
    if (!result?.found || !camera) return

    if (!qrMatchesStop(result.text, stop)) return

    const pose = poseFromQr(result.location, result.cols, result.rows, camera, qrSize) ?? fallbackPose(camera)

    hits += 1
    if (hits < 2) return

    const payload = {
      name: stop.targetName,
      position: pose.position,
      rotation: pose.rotation,
      scale: pose.scale,
    }

    if (!enabled) {
      pending = payload
      return
    }

    emitPose(payload)
  }

  state.processCpu = processCpu
  state.onUpdate = onUpdate

  const attach = (xr) => installQrPipeline(xr)
  if (window.XR8) attach(window.XR8)
  window.addEventListener('xrloaded', () => attach(window.XR8), { once: true })
  scene.addEventListener(
    'realityready',
    () => {
      if (!gotPixels && window.XR8) installQrPipeline(window.XR8, { force: true })
    },
    { once: true },
  )

  return {
    enable() {
      enabled = true
      if (pending) {
        emitPose(pending)
        pending = null
      }
    },
  }
}
