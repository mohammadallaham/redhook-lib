const labels = document.querySelector('#labels')
const printButton = document.querySelector('#print-labels')

printButton.addEventListener('click', () => window.print())

try {
  const response = await fetch('/qr/manifest.json')
  if (!response.ok) throw new Error('QR manifest is missing.')
  const points = await response.json()

  labels.replaceChildren(
    ...points.map((point) => {
      const article = document.createElement('article')
      article.className = 'label'

      const copy = document.createElement('div')
      copy.className = 'label__copy'

      const number = document.createElement('span')
      number.className = 'label__number'
      number.textContent = String(point.number).padStart(2, '0')

      const title = document.createElement('h2')
      title.textContent = point.title

      const instruction = document.createElement('p')
      instruction.textContent = 'Scan with your phone camera. No app download.'

      const image = document.createElement('img')
      image.src = point.file
      image.alt = `QR code for ${point.title}`
      image.width = 1200
      image.height = 1200

      copy.append(number, title, instruction)
      article.append(copy, image)
      return article
    }),
  )
} catch (error) {
  labels.innerHTML = `
    <p class="labels-error">
      QR labels are not generated yet. Run <code>npm run qr</code>, then reload this page.
    </p>
  `
  console.error(error)
}
