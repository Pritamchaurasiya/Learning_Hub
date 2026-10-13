import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const katexCache = new Map<string, string>()

function getCachedKatex(content: string, displayMode: boolean): string {
  const cacheKey = `${displayMode ? 'B:' : 'I:'}${content}`
  const cached = katexCache.get(cacheKey)
  if (cached) return cached

  const rendered = katex.renderToString(content, {
    displayMode,
    throwOnError: false,
    trust: false,
  })
  if (katexCache.size > 2000) {
    const firstKey = katexCache.keys().next().value
    if (firstKey) katexCache.delete(firstKey)
  }
  katexCache.set(cacheKey, rendered)
  return rendered
}

interface MathRendererProps {
  text: string
  className?: string
  inline?: boolean
}

interface Segment {
  type: 'text' | 'inline-math' | 'block-math'
  content: string
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  className = '',
  inline = false,
}) => {
  const segments = useMemo<Segment[]>(() => {
    if (!text) return []

    const result: Segment[] = []
    // Match block math $$...$$ first, then inline math $...$
    const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = mathRegex.exec(text)) !== null) {
      // Push preceding text segment if any
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        })
      }

      if (match[1] !== undefined) {
        // Block math $$...$$
        result.push({
          type: 'block-math',
          content: match[1].trim(),
        })
      } else if (match[2] !== undefined) {
        // Inline math $...$
        result.push({
          type: 'inline-math',
          content: match[2].trim(),
        })
      }

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex),
      })
    }

    return result
  }, [text])

  const Component = inline ? 'span' : 'div'

  return (
    <Component className={`math-rendered-content ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <span key={idx}>{seg.content}</span>
        }

        const isBlock = seg.type === 'block-math'
        try {
          const html = getCachedKatex(seg.content, isBlock)
          return (
            <span
              key={idx}
              className={
                isBlock
                  ? 'block my-2 overflow-x-auto text-center max-w-full'
                  : 'inline-block max-w-full overflow-x-auto align-middle px-1'
              }
              aria-label={`Formula: ${seg.content}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } catch {
          return (
            <span key={idx} className="font-mono text-xs text-red-500">
              {isBlock ? `$$${seg.content}$$` : `$${seg.content}$`}
            </span>
          )
        }
      })}
    </Component>
  )
}

export default MathRenderer
