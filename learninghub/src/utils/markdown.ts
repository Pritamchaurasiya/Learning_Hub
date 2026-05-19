import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import DOMPurify from 'dompurify'

// Register only common languages to reduce bundle size (~100KB vs ~800KB)
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('plaintext', plaintext)

interface CodeToken {
  text: string
  lang?: string
}

const renderer = new marked.Renderer()

// Custom code block renderer with highlight.js and copy button
// Uses data attributes + CSS class for delegated event handling (see main.tsx)
renderer.code = function (codeOrToken: string | CodeToken, lang?: string) {
  // Handle both marked API signatures
  let code: string
  let language: string

  if (typeof codeOrToken === 'object' && codeOrToken !== null) {
    code = codeOrToken.text ?? ''
    language = codeOrToken.lang ?? 'plaintext'
  } else {
    code = String(codeOrToken ?? '')
    language = lang ?? 'plaintext'
  }

  let highlighted: string

  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value
    } else {
      highlighted = hljs.highlightAuto(code).value
    }
  } catch {
    highlighted = code
  }

  const escapedCode = encodeURIComponent(code)

  // CRITICAL: Use data-code attribute + .copy-code-button class
  // The delegated event listener in main.tsx handles the click
  // No onclick handler needed (DOMPurify would strip it anyway)
  return `
    <div class="relative group my-8">
      <div class="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          class="copy-code-button flex items-center gap-2 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 shadow-xl backdrop-blur-sm transition-all active:scale-95"
          data-code="${escapedCode}"
          title="Copy code"
          type="button"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span class="text-xs font-medium mr-1">Copy</span>
        </button>
      </div>
      <div class="absolute left-5 top-0 -translate-y-1/2 px-2.5 py-1 rounded-md bg-primary-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg z-10">
        ${language}
      </div>
      <pre class="!mt-0 !mb-0 overflow-hidden rounded-xl border border-gray-700/50 bg-[#0d1117] shadow-2xl"><code class="hljs language-${language} block p-6 overflow-x-auto font-mono text-sm leading-relaxed">${highlighted}</code></pre>
    </div>
  `
}

marked.setOptions({ renderer })

// Configure DOMPurify to allow data attributes and classes needed for copy buttons
const purifyConfig = {
  ADD_ATTR: ['data-code', 'class', 'title', 'type', 'target', 'rel'],
  ADD_TAGS: ['button'],
}

// Ensure all links open securely in a new tab
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export const renderMarkdown = (content: string): string => {
  const rawHtml = marked.parse(content) as string
  return DOMPurify.sanitize(rawHtml, purifyConfig as Parameters<typeof DOMPurify.sanitize>[1])
}
