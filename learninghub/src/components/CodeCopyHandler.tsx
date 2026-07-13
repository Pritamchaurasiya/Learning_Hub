import { useEffect } from 'react'

export function CodeCopyHandler() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const btn = target.closest('.copy-code-button') as HTMLButtonElement | null

      if (btn) {
        const encodedCode = btn.getAttribute('data-code')
        if (encodedCode) {
          const code = decodeURIComponent(encodedCode)
          void navigator.clipboard.writeText(code).then(() => {
            const originalChildren = Array.from(btn.childNodes)

            btn.textContent = ''

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            svg.setAttribute('class', 'w-4 h-4 text-green-500')
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
            svg.setAttribute('width', '24')
            svg.setAttribute('height', '24')
            svg.setAttribute('viewBox', '0 0 24 24')
            svg.setAttribute('fill', 'none')
            svg.setAttribute('stroke', 'currentColor')
            svg.setAttribute('stroke-width', '2')
            svg.setAttribute('stroke-linecap', 'round')
            svg.setAttribute('stroke-linejoin', 'round')

            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
            polyline.setAttribute('points', '20 6 9 17 4 12')
            svg.appendChild(polyline)

            const span = document.createElement('span')
            span.className = 'text-xs font-medium mr-1 text-green-500'
            span.textContent = 'Copied!'

            btn.appendChild(svg)
            btn.appendChild(span)

            setTimeout(() => {
              btn.textContent = ''
              originalChildren.forEach(child => btn.appendChild(child))
            }, 2000)
          })
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
