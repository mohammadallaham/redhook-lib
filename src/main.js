import { STOP_LIST, getStopUrl } from './stops-config.js'

const pointList = document.querySelector('#point-list')

for (const stop of STOP_LIST) {
  const item = document.createElement('li')
  item.className = 'point'

  const trackingLabel =
    stop.tracking === 'image' ? 'Tracks the QR code' : `Tracks the ${stop.surface}`

  item.innerHTML = `
    <span class="point__number">${String(stop.number).padStart(2, '0')}</span>
    <div class="point__body">
      <h3>${stop.title}</h3>
      <p>${stop.description}</p>
    </div>
    <div class="point__meta">
      <span class="point__tracking">${trackingLabel}</span>
      <a class="point__link" href="${getStopUrl(stop)}">Open point</a>
    </div>
  `

  pointList.append(item)
}
