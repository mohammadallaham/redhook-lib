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

function startPlacedEffects() {
  root.querySelectorAll('[data-start-on-place]').forEach((element) => {
    element.emit('effect-start')
  })
}

function placeInWorld() {
  root.removeAttribute('image-target-anchor')
  root.removeAttribute('shelf-ground-anchor')
  root.setAttribute('position', `0 ${stop.placementHeight} -${stop.placementDistance}`)
  root.setAttribute('rotation', '0 0 0')
  root.setAttribute('scale', '1 1 1')
  root.object3D.visible = true
  startPlacedEffects()
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

let qrTracker = null

function startQrTracking() {
  if (stop?.tracking !== 'image') return
  qrTracker = bootQrTracker({ stop, scene })
}

function startImagePoint() {
  root.setAttribute('image-target-anchor', {
    name: stop.targetName,
    lockOnce: true,
  })
  root.addEventListener('target-visible', startPlacedEffects, { once: true })
  qrTracker?.enable()
}

function startShelfGroundPoint() {
  root.setAttribute('shelf-ground-anchor', {
    name: stop.targetName,
    groundOffsetY: stop.groundOffsetY,
    floorLift: stop.floorLift,
    trailForward: stop.trailForward,
  })
  root.addEventListener('ground-placed', startPlacedEffects, { once: true })
  qrTracker?.enable()
}

function startWorldPoint() {
  window.setTimeout(placeInWorld, 1300)
}

async function start() {
  if (!stop) {
    console.error('This QR code does not match a discovery point.')
    return
  }

  document.title = `${stop.title} — Red Hook Library`
  startQrTracking()

  try {
    if (!window.AFRAME) {
      throw new Error('A-Frame did not load.')
    }

    registerSceneComponents()

    const xrReady = waitForXR()
    const modelReady = stop.modelSrc ? preloadModel() : Promise.resolve()

    await waitForScene()

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

    if (stop.placementMode === 'shelf-to-ground') {
      startShelfGroundPoint()
    } else if (stop.tracking === 'image') {
      startImagePoint()
    } else {
      startWorldPoint()
    }
  } catch (error) {
    console.error(error)
  }
}

start()
