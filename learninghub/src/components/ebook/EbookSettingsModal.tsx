import { X, Type, Sun, Moon, Eye, Sparkles } from 'lucide-react'
import type { EbookSettings, EbookTheme, EbookFontFamily } from '../../types/ebook'

interface Props {
  isOpen: boolean
  onClose: () => void
  settings: EbookSettings
  onUpdateSetting: <K extends keyof EbookSettings>(key: K, value: EbookSettings[K]) => void
}

const THEMES: Array<{ id: EbookTheme; label: string; bg: string; text: string; icon: typeof Sun }> =
  [
    {
      id: 'light',
      label: 'Light',
      bg: 'bg-white',
      text: 'text-gray-900 border-gray-300',
      icon: Sun,
    },
    {
      id: 'sepia',
      label: 'Sepia',
      bg: 'bg-[#fbf0d9]',
      text: 'text-[#433422] border-[#e8d7b8]',
      icon: Eye,
    },
    {
      id: 'dark',
      label: 'Dark',
      bg: 'bg-slate-900',
      text: 'text-slate-100 border-slate-700',
      icon: Moon,
    },
    {
      id: 'oled',
      label: 'OLED',
      bg: 'bg-black',
      text: 'text-white border-neutral-800',
      icon: Moon,
    },
  ]

const FONTS: Array<{ id: EbookFontFamily; label: string; styleClass: string }> = [
  { id: 'inter', label: 'Modern Sans', styleClass: 'font-sans' },
  { id: 'merriweather', label: 'Classic Serif', styleClass: 'font-serif' },
  { id: 'jetbrains-mono', label: 'Code Mono', styleClass: 'font-mono' },
  { id: 'opendyslexic', label: 'Dyslexic Friendly', styleClass: 'font-sans' },
]

export function EbookSettingsModal({ isOpen, onClose, settings, onUpdateSetting }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-lg">Reading & Display Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Themes */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-gray-400">
            Study Theme
          </label>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => onUpdateSetting('theme', theme.id)}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${theme.bg} ${theme.text} ${
                  settings.theme === theme.id
                    ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105 shadow-md'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                <theme.icon className="w-4 h-4" />
                <span className="text-xs font-bold">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-gray-400">
            Typography
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map(f => (
              <button
                key={f.id}
                onClick={() => onUpdateSetting('fontFamily', f.id)}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${f.styleClass} ${
                  settings.fontFamily === f.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size & Line Height */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Font Size ({settings.fontSize}px)</span>
              <span className="text-[10px] uppercase font-mono">14px - 28px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold">A</span>
              <input
                type="range"
                min="14"
                max="28"
                step="1"
                value={settings.fontSize}
                onChange={e => onUpdateSetting('fontSize', Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-lg font-black">A</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Line Height ({settings.lineHeight})</span>
              <span className="text-[10px] uppercase font-mono">1.4 - 2.2</span>
            </div>
            <input
              type="range"
              min="1.4"
              max="2.2"
              step="0.1"
              value={settings.lineHeight}
              onChange={e => onUpdateSetting('lineHeight', Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>

        {/* Bionic Reading Toggle */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Bionic Reading Mode</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Highlights word beginnings for faster reading speed
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.bionicReading}
            onChange={e => onUpdateSetting('bionicReading', e.target.checked)}
            className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
          />
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all"
        >
          Save & Apply
        </button>
      </div>
    </div>
  )
}
