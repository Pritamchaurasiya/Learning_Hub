import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

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
          const html = katex.renderToString(seg.content, {
            displayMode: isBlock,
            throwOnError: false,
            trust: false,
          })
          return (
            <span
              key={idx}
              className={isBlock ? 'block my-2 overflow-x-auto text-center' : 'inline-block px-1'}
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
