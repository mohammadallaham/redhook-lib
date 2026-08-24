import { getStopFromLocation } from './stops-config.js'
import { bootQrTracker } from './qr-tracker.js'
import { registerSceneComponents, renderEffect } from './scene-effects.js'

const stop = getStopFromLocation()
const scene = document.querySelector('#ar-scene')
const root = document.querySelector('#effect-root')

function waitForEvent(target, eventName, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      target.removeEventListener(eventName, onEvent)
      reject(new Error(`Timed out waiting for ${eventName}.`))
    }, timeout)

    const onEvent = (event) => {
      window.clearTimeout(timer)
      resolve(event)
    }

    target.addEventListener(eventName, onEvent, { once: true })
  })
}

async function waitForScene() {
  if (scene.hasLoaded) return
  await waitForEvent(scene, 'loaded', 30000)
}

async function waitForXR() {
  if (window.XR8) return window.XR8
  await waitForEvent(window, 'xrloaded', 25000)
  if (!window.XR8) throw new Error('XR8 loaded without an engine object.')
  return window.XR8
}

function waitForReality() {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    scene.addEventListener('realityready', finish, { once: true })
    window.addEventListener('realityready', finish, { once: true })
    window.setTimeout(finish, 5000)
  })
}

function startPlacedEffects() {
  root.querySelectorAll('[data-start-on-place]').forEach((element) => {
    element.emit('effect-start')
  })
}

function isFloorStop() {
  return stop.surface === 'floor' || stop.placementMode === 'shelf-to-ground'
}

function placeInFrontOfCamera() {
  const THREE = window.AFRAME.THREE
  const camera = document.querySelector('#ar-camera')?.getObject3D('camera')
  const floor = isFloorStop()
  const distance = Math.max(Number(stop.placementDistance) || 0, floor ? 1.4 : 1.2)

  if (camera) {
    const offset = new THREE.Vector3(0, floor ? 0 : 0, -distance)
    camera.localToWorld(offset)
    if (floor) offset.y = stop.floorLift ?? 0.03
    root.object3D.position.copy(offset)
    const yaw = new THREE.Euler().setFromQuaternion(
      camera.getWorldQuaternion(new THREE.Quaternion()),
      'YXZ',
    )
    root.object3D.rotation.set(0, yaw.y, 0)
    root.object3D.scale.set(1, 1, 1)
  } else {
    root.setAttribute('position', `0 ${floor ? 0.03 : 0} -${distance}`)
  }

  root.object3D.visible = true
  startPlacedEffects()
}

function snapToPrintedQr({ detail }) {
  const name = detail?.name || detail?.image?.name
  if (name !== stop.targetName || !detail?.position) return

  if (stop.placementMode === 'shelf-to-ground') {
    const three = window.AFRAME.THREE
    const rotation = new three.Quaternion(
      detail.rotation.x,
      detail.rotation.y,
      detail.rotation.z,
      detail.rotation.w,
    )
    const forward = new three.Vector3(0, 0, 1).applyQuaternion(rotation)
    forward.y = 0
    if (forward.lengthSq() < 0.0001) forward.set(0, 0, 1)
    else forward.normalize()
    root.object3D.position.set(
      detail.position.x + forward.x * (stop.trailForward ?? 0.4),
      detail.position.y - (stop.groundOffsetY ?? 0.9) + (stop.floorLift ?? 0.02),
      detail.position.z + forward.z * (stop.trailForward ?? 0.4),
    )
    root.object3D.quaternion.setFromUnitVectors(new three.Vector3(0, 0, -1), forward)
    return
  }

  root.object3D.position.copy(detail.position)
  root.object3D.quaternion.copy(detail.rotation)
  root.object3D.scale.setScalar(detail.scale || 1)
}

function preloadModel() {
  if (!stop?.modelSrc) return Promise.resolve()

  const assets = document.querySelector('#ar-assets')
  const assetId = `${stop.id}-model`
  stop.modelAssetId = assetId

  let item = document.querySelector(`#${assetId}`)
  if (!item) {
    item = document.createElement('a-asset-item')
    item.id = assetId
    item.setAttribute('src', stop.modelSrc)
    item.setAttribute('response-type', 'arraybuffer')
    assets.append(item)
  }

  if (item.hasLoaded) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Timed out loading ${stop.modelSrc}.`))
    }, 30000)
    item.addEventListener(
      'loaded',
      () => {
        window.clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
    item.addEventListener(
      'error',
      () => {
        window.clearTimeout(timer)
        reject(new Error(`Could not load ${stop.modelSrc}.`))
      },
      { once: true },
    )
  })
}

async function start() {
  if (!stop) {
    console.error('This QR code does not match a discovery point.')
    return
  }

  document.title = `${stop.title} — Red Hook Library`

  try {
    if (!window.AFRAME) {
      throw new Error('A-Frame did not load.')
    }

    registerSceneComponents()

    const qrTracker = stop.tracking === 'image' ? bootQrTracker({ stop, scene }) : null
    const xrReady = waitForXR()
    const modelReady = stop.modelSrc ? preloadModel() : Promise.resolve()

    await waitForScene()
    scene.setAttribute('vr-mode-ui', 'enabled: false')
    document.querySelectorAll('.a-enter-vr, .a-enter-ar').forEach((button) => button.remove())

    if (stop.modelSrc) {
      try {
        await modelReady
      } catch (error) {
        console.warn(error)
        stop.modelAssetId = null
      }
    }

    renderEffect(root, stop)
    await xrReady
    await waitForReality()

    qrTracker?.enable()

    if (stop.id === 'bus') {
      const onBusQr = (event) => {
        const name = event.detail?.name || event.detail?.image?.name
        if (name !== stop.targetName) return
        snapToPrintedQr(event)
        if (root.object3D.visible) return
        root.object3D.visible = true
        startPlacedEffects()
      }
      scene.addEventListener('xrimagefound', onBusQr)
      scene.addEventListener('xrimageupdated', onBusQr)
      window.addEventListener('xrimagefound', onBusQr)
      window.addEventListener('xrimageupdated', onBusQr)
    } else {
      placeInFrontOfCamera()
      if (qrTracker) {
        scene.addEventListener('xrimagefound', snapToPrintedQr)
        window.addEventListener('xrimagefound', snapToPrintedQr)
      }
    }
  } catch (error) {
    console.error(error)
  }
}

start()
