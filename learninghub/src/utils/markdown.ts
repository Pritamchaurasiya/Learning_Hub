import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

const renderer = new marked.Renderer();

// Custom code block renderer with highlight.js and copy button
// Uses data attributes + CSS class for delegated event handling (see main.tsx)
renderer.code = function (codeOrToken: any, lang?: string) {
  // Handle both marked API signatures
  let code: string;
  let language: string;

  if (typeof codeOrToken === 'object' && codeOrToken !== null) {
    code = codeOrToken.text || '';
    language = codeOrToken.lang || 'plaintext';
  } else {
    code = String(codeOrToken || '');
    language = lang || 'plaintext';
  }

  let highlighted: string;

  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch {
    highlighted = code;
  }

  const escapedCode = encodeURIComponent(code);

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
  `;
};

marked.setOptions({ renderer });

// Configure DOMPurify to allow data attributes and classes needed for copy buttons
const purifyConfig = {
  ADD_ATTR: ['data-code', 'class', 'title', 'type'],
  ADD_TAGS: ['button'],
};

export const renderMarkdown = (content: string): string => {
  const rawHtml = marked.parse(content) as string;
  return DOMPurify.sanitize(rawHtml, purifyConfig as Parameters<typeof DOMPurify.sanitize>[1]);
};
