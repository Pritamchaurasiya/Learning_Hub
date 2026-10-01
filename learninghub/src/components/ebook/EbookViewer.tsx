import { useRef, useMemo } from 'react'
import type { EbookSettings, EbookHighlight } from '../../types/ebook'

interface Props {
  contentMarkdown: string
  settings: EbookSettings
  highlights: EbookHighlight[]
  currentTTSSentence?: number
  onTextSelected: (selection: { text: string; x: number; y: number } | null) => void
}

// Bionic reading helper: bold first 40-50% of each word
function applyBionicReading(text: string) {
  return text.split(' ').map((word, wIdx) => {
    if (word.length <= 3) {
      return (
        <span key={wIdx}>
          <strong>{word.slice(0, 1)}</strong>
          {word.slice(1)}{' '}
        </span>
      )
    }
    const mid = Math.ceil(word.length * 0.45)
    return (
      <span key={wIdx}>
        <strong className="font-black">{word.slice(0, mid)}</strong>
        {word.slice(mid)}{' '}
      </span>
    )
  })
}

// Inline markdown parser: bold, italic, code, and inline math ($...$)
function renderFormattedInline(
  text: string,
  isBionic: boolean,
  keyPrefix = 'inl'
): React.ReactNode {
  if (!text) return null

  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\$[^$]+\$)/g
  const parts = text.split(tokenRegex)

  return parts.map((part, pIdx) => {
    const k = `${keyPrefix}-${pIdx}`
    if (!part) return null

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2)
      return (
        <strong key={k} className="font-extrabold text-current">
          {renderFormattedInline(inner, isBionic, `${k}-b`)}
        </strong>
      )
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const inner = part.slice(1, -1)
      return (
        <em key={k} className="italic">
          {renderFormattedInline(inner, isBionic, `${k}-i`)}
        </em>
      )
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1)
      return (
        <code
          key={k}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-mono text-[0.85em] font-semibold border border-indigo-500/20"
        >
          {inner}
        </code>
      )
    }

    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const inner = part.slice(1, -1)
      return (
        <span
          key={k}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[0.9em] font-semibold border border-indigo-500/20 inline-block align-baseline"
        >
          {inner}
        </span>
      )
    }

    return isBionic ? (
      <span key={k}>{applyBionicReading(part)}</span>
    ) : (
      <span key={k}>{part}</span>
    )
  })
}

export function EbookViewer({
  contentMarkdown,
  settings,
  highlights = [],
  onTextSelected,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const themeClasses = useMemo(() => {
    switch (settings.theme) {
      case 'light':
        return 'bg-white text-gray-900 border-gray-200'
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#433422] border-[#e8d7b8]'
      case 'dark':
        return 'bg-slate-900 text-slate-100 border-slate-800'
      case 'oled':
        return 'bg-black text-white border-neutral-800'
      default:
        return 'bg-white text-gray-900'
    }
  }, [settings.theme])

  const fontClass = useMemo(() => {
    switch (settings.fontFamily) {
      case 'inter':
        return 'font-sans'
      case 'merriweather':
        return 'font-serif'
      case 'jetbrains-mono':
        return 'font-mono'
      case 'opendyslexic':
        return 'font-sans tracking-wide'
      default:
        return 'font-serif'
    }
  }, [settings.fontFamily])

  const handleSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      onTextSelected(null)
      return
    }

    const text = sel.toString().trim()
    if (text.length < 2) {
      onTextSelected(null)
      return
    }

    try {
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      onTextSelected({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    } catch {
      onTextSelected(null)
    }
  }

  const renderContentWithHighlights = (text: string) => {
    if (!highlights || highlights.length === 0) {
      return renderFormattedInline(text, !!settings.bionicReading, 'hl-none')
    }

    const matches: { start: number; end: number; color: string }[] = []
    for (const h of highlights) {
      if (!h.text) continue
      let searchPos = 0
      while (searchPos < text.length) {
        const found = text.indexOf(h.text, searchPos)
        if (found === -1) break
        matches.push({
          start: found,
          end: found + h.text.length,
          color: h.color || 'yellow',
        })
        searchPos = found + h.text.length
      }
    }

    if (matches.length === 0) {
      return renderFormattedInline(text, !!settings.bionicReading, 'hl-empty')
    }

    // Sort by start index
    matches.sort((a, b) => a.start - b.start)

    const elements: React.ReactNode[] = []
    let lastIdx = 0

    matches.forEach((m, i) => {
      if (m.start > lastIdx) {
        const seg = text.slice(lastIdx, m.start)
        elements.push(renderFormattedInline(seg, !!settings.bionicReading, `seg-${lastIdx}`))
      }
      const colorMap: Record<string, string> = {
        yellow: 'bg-amber-300/50 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100',
        green: 'bg-emerald-300/50 dark:bg-emerald-400/30 text-emerald-950 dark:text-emerald-100',
        blue: 'bg-sky-300/50 dark:bg-sky-400/30 text-sky-950 dark:text-sky-100',
        purple: 'bg-purple-300/50 dark:bg-purple-400/30 text-purple-950 dark:text-purple-100',
      }
      const highlightClass = colorMap[m.color] || colorMap.yellow
      const highlightedText = text.slice(m.start, m.end)

      elements.push(
        <mark
          key={`hl-${i}`}
          className={`${highlightClass} font-semibold rounded px-1 py-0.5 transition-colors`}
        >
          {renderFormattedInline(highlightedText, !!settings.bionicReading, `hlm-${i}`)}
        </mark>
      )
      lastIdx = m.end
    })

    if (lastIdx < text.length) {
      const seg = text.slice(lastIdx)
      elements.push(renderFormattedInline(seg, !!settings.bionicReading, `seg-end-${lastIdx}`))
    }

    return <>{elements}</>
  }

  // Split markdown into formatted blocks, ensuring headings and lists are cleanly partitioned
  const paragraphs = useMemo(() => {
    // 1. Ensure headings have blank lines around them
    let normalized = contentMarkdown.replace(/^(#{1,6}\s+[^\n]+)\n(?!\n)/gm, '$1\n\n')
    // 2. Ensure list blocks separated from preceding non-list lines
    normalized = normalized.replace(/([^\n])\n([-*]\s+|\d+\.\s+)/g, '$1\n\n$2')
    // 3. Ensure list blocks separated from following non-list lines
    normalized = normalized.replace(/((?:^[-*]\s+.*$\n?)+)\n(?=[^\n-*])/gm, '$1\n\n')

    return normalized
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean)
  }, [contentMarkdown])

  return (
    <div
      ref={containerRef}
      onMouseUp={handleSelection}
      onTouchEnd={handleSelection}
      className={`min-h-[80vh] p-8 md:p-14 rounded-3xl transition-colors duration-300 shadow-xl border ${themeClasses} ${fontClass}`}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {paragraphs.map((p, idx) => {
          if (p.startsWith('# ')) {
            return (
              <h1
                key={idx}
                className="text-3xl font-black tracking-tight pt-4 pb-2 border-b border-current/10"
              >
                {renderContentWithHighlights(p.replace('# ', ''))}
              </h1>
            )
          }
          if (p.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-2xl font-black tracking-tight pt-3 pb-1">
                {renderContentWithHighlights(p.replace('## ', ''))}
              </h2>
            )
          }
          if (p.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xl font-black pt-2">
                {renderContentWithHighlights(p.replace('### ', ''))}
              </h3>
            )
          }
          if (p.startsWith('> ')) {
            const quoteContent = p
              .split('\n')
              .map(l => l.replace(/^>\s?/, ''))
              .join(' ')
            return (
              <blockquote
                key={idx}
                className="p-5 rounded-2xl bg-current/5 border-l-4 border-indigo-500 italic my-4 space-y-1"
              >
                {renderContentWithHighlights(quoteContent)}
              </blockquote>
            )
          }
          if (p.startsWith('$$') && p.endsWith('$$')) {
            const math = p.slice(2, -2).trim()
            return (
              <div
                key={idx}
                className="my-6 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center font-mono text-base md:text-lg text-indigo-600 dark:text-indigo-300 overflow-x-auto shadow-sm"
              >
                <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 mb-1">
                  EQUATION
                </div>
                <div className="font-semibold tracking-wide">{math}</div>
              </div>
            )
          }
          if (p === '---') {
            return <hr key={idx} className="my-8 border-current/10" />
          }
          if (p.startsWith('```')) {
            const lines = p.split('\n')
            const lang = lines[0].replace('```', '').trim()
            const code = lines.slice(1, -1).join('\n')
            return (
              <div
                key={idx}
                className="my-5 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl"
              >
                {lang && (
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400">
                    <span>{lang}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Code
                    </span>
                  </div>
                )}
                <pre className="p-5 text-slate-100 font-mono text-sm overflow-x-auto leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          // Unordered list detection
          const lines = p
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
          const isUnorderedList =
            lines.length > 0 && lines.every(l => l.startsWith('- ') || l.startsWith('* '))
          if (isUnorderedList) {
            return (
              <ul key={idx} className="my-4 space-y-2.5 pl-6 list-disc marker:text-indigo-500">
                {lines.map((line, lIdx) => {
                  const itemText = line.replace(/^[-*]\s+/, '')
                  return (
                    <li key={lIdx} className="leading-relaxed">
                      {renderContentWithHighlights(itemText)}
                    </li>
                  )
                })}
              </ul>
            )
          }

          // Ordered list detection
          const isOrderedList = lines.length > 0 && lines.every(l => /^\d+\.\s/.test(l))
          if (isOrderedList) {
            return (
              <ol
                key={idx}
                className="my-4 space-y-2.5 pl-6 list-decimal marker:font-semibold marker:text-indigo-500"
              >
                {lines.map((line, lIdx) => {
                  const itemText = line.replace(/^\d+\.\s+/, '')
                  return (
                    <li key={lIdx} className="leading-relaxed">
                      {renderContentWithHighlights(itemText)}
                    </li>
                  )
                })}
              </ol>
            )
          }

          return (
            <p key={idx} className="leading-relaxed">
              {renderContentWithHighlights(p)}
            </p>
          )
        })}
      </div>
    </div>
  )
}
