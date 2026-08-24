import { getStopFromLocation } from './stops-config.js'
import { bootQrTracker } from './qr-tracker.js'
import { registerSceneComponents, renderEffect } from './scene-effects.js'

const stop = getStopFromLocation()
const scene = document.querySelector('#ar-scene')
const root = document.querySelector('#effect-root')
const loader = document.querySelector('#ar-loader')
const guide = document.querySelector('#ar-guide')
const guideTitle = document.querySelector('#guide-title')
const guideCopy = document.querySelector('#guide-copy')
const previewButton = document.querySelector('#preview-button')
const status = document.querySelector('#ar-status')
const stopCount = document.querySelector('#ar-stop-count')
const stopTitle = document.querySelector('#ar-stop-title')

function setStatus(message, tone = 'neutral') {
  status.textContent = message
  status.dataset.tone = tone
}

function hideLoader() {
  loader.hidden = true
}

function failStartup(title, copy, error) {
  console.error(error)
  hideLoader()
  guide.hidden = false
  guideTitle.textContent = title
  guideCopy.textContent = copy
  setStatus(error?.message || copy, 'error')
}

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

function placeInWorld(message = 'Point placed. Move around it slowly.') {
  root.removeAttribute('image-target-anchor')
  root.removeAttribute('shelf-ground-anchor')
  root.setAttribute('position', `0 ${stop.placementHeight} -${stop.placementDistance}`)
  root.setAttribute('rotation', '0 0 0')
  root.setAttribute('scale', '1 1 1')
  root.object3D.visible = true
  startPlacedEffects()
  guide.hidden = true
  setStatus(message, 'success')
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

function usesImageTarget(currentStop) {
  return currentStop?.tracking === 'image'
}

let qrTracker = null

function startQrTracking() {
  if (!usesImageTarget(stop)) return

  qrTracker = bootQrTracker({
    stop,
    scene,
    onStatus: (message) => setStatus(message),
    onWrongCode: (otherId) => {
      setStatus(
        otherId
          ? `That's the ${otherId} QR. Point at the ${stop.title} code.`
          : "Point at this point's printed QR code.",
      )
    },
  })
}

function imageGuideCopy(currentStop) {
  if (currentStop.placementMode === 'shelf-to-ground') {
    return 'Point at the printed QR. The trail appears on the floor below.'
  }
  if (currentStop.id === 'bus') {
    return 'Point at the printed QR. The bus appears on it, then flies across and fades away.'
  }
  if (currentStop.id === 'painting') {
    return 'Point at the QR on the wall to the left of the painting. Ivy grows from behind the frame, not over the picture.'
  }
  return 'Keep the whole printed QR in the camera and hold about an arm\'s length away.'
}

function startImagePoint() {
  guideTitle.textContent = 'Find the printed QR code'
  guideCopy.textContent = imageGuideCopy(stop)
  guide.hidden = false
  root.setAttribute('image-target-anchor', {
    name: stop.targetName,
    lockOnce: true,
  })

  root.addEventListener(
    'target-visible',
    () => {
      guide.hidden = true
      startPlacedEffects()
      setStatus(
        stop.id === 'bus'
          ? 'Bus locked. Watch it fade in and fly across.'
          : 'QR locked. You can look around it.',
        'success',
      )
    },
    { once: true },
  )

  setStatus('Point the camera at this printed QR until it fills the screen.')
  qrTracker?.enable()
}

function startShelfGroundPoint() {
  guideTitle.textContent = 'Find the printed QR code'
  guideCopy.textContent = 'Point at the printed QR. The trail appears on the floor below.'
  guide.hidden = false
  root.setAttribute('shelf-ground-anchor', {
    name: stop.targetName,
    groundOffsetY: stop.groundOffsetY,
    floorLift: stop.floorLift,
    trailForward: stop.trailForward,
  })

  root.addEventListener(
    'ground-placed',
    () => {
      guide.hidden = true
      startPlacedEffects()
      setStatus('Trail locked to the floor. Look down to follow it.', 'success')
    },
    { once: true },
  )
  setStatus('Hold the QR steady until the trail locks.')
  qrTracker?.enable()
}

function startWorldPoint() {
  const readyMessage =
    stop.surface === 'floor'
      ? 'Aim at the floor and move slowly.'
      : 'Move your phone slowly.'
  setStatus(readyMessage)
  window.setTimeout(() => {
    placeInWorld()
  }, 1300)
}

async function start() {
  if (!stop) {
    stopTitle.textContent = 'Point not found'
    failStartup(
      'Choose a valid point',
      'Return to the discovery list and open one of the six numbered links.',
      new Error('This QR code does not match a discovery point.'),
    )
    previewButton.hidden = true
    return
  }

  stopCount.textContent = `Point ${String(stop.number).padStart(2, '0')} of 06`
  stopTitle.textContent = stop.title
  document.title = `${stop.title} — Red Hook Library`

  previewButton.addEventListener('click', () => {
    placeInWorld('Preview placed. This is not locked to the real target.')
  })

  window.addEventListener('xrerror', (event) => {
    failStartup(
      'Camera could not start',
      'Check camera permission, reload the page, and use Safari on iPhone or Chrome on Android.',
      event.detail || event,
    )
  })

  const xrReady = waitForXR()
  startQrTracking()

  try {
    if (!window.AFRAME) {
      throw new Error('A-Frame did not load. Check /external/scripts/8frame-1.5.0.min.js')
    }

    registerSceneComponents()

    const modelReady = stop.modelSrc ? preloadModel() : Promise.resolve()
    if (stop.modelSrc) setStatus('Loading the 3D model…')

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
    hideLoader()

    if (stop.placementMode === 'shelf-to-ground') {
      startShelfGroundPoint()
    } else if (stop.tracking === 'image') {
      startImagePoint()
    } else {
      startWorldPoint()
    }
  } catch (error) {
    failStartup(
      'AR could not start',
      error.message || 'Reload the page over HTTPS and allow the camera.',
      error,
    )
  }
}

start()
