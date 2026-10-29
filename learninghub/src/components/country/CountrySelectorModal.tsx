import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Check, Globe, Sparkles } from 'lucide-react'
import { useCountry } from '../../hooks/useCountry'
import type { ActiveCountryInfo } from '../../types/learningContext'

export const CountrySelectorModal: React.FC = () => {
  const {
    isCountrySelectorOpen,
    closeCountrySelector,
    availableCountries,
    activeCountry,
    setCountry,
  } = useCountry()

  const [search, setSearch] = useState('')

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableCountries
    return availableCountries.filter(
      c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    )
  }, [availableCountries, search])

  if (!isCountrySelectorOpen) return null

  const handleSelect = async (country: ActiveCountryInfo) => {
    await setCountry(country, 'manual')
    closeCountrySelector()
  }

  const handleSelectAll = async () => {
    await setCountry({
      id: 'all',
      name: 'Global / All Countries',
      code: 'GLOBAL',
      flagEmoji: '🌐',
    }, 'manual')
    closeCountrySelector()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-selector-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 id="country-selector-title" className="text-lg font-bold">
                  Select Your Country
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Filters exams, tests, and study plans to your country's syllabus
                </p>
              </div>
            </div>
            <button
              onClick={closeCountrySelector}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search countries by name or code..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
                autoFocus
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800/40">
            {/* Global option */}
            <button
              onClick={() => void handleSelectAll()}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                activeCountry?.code === 'GLOBAL'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label="Global">
                  🌐
                </span>
                <div className="text-left">
                  <div className="font-semibold text-sm">Global / All Exams</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Show all competitive and international entrance tracks
                  </div>
                </div>
              </div>
              {activeCountry?.code === 'GLOBAL' && (
                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </button>

            {filteredCountries.map(country => {
              const isSelected = activeCountry?.id === country.id || activeCountry?.code === country.code
              return (
                <button
                  key={country.id}
                  onClick={() => void handleSelect(country)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all pt-3 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" role="img" aria-label={country.name}>
                      {country.flagEmoji || '🏳️'}
                    </span>
                    <div className="text-left">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span>{country.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {country.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {country.code === 'IN' && 'JEE, NEET, UPSC, GATE, CAT'}
                        {country.code === 'US' && 'SAT, ACT, AP, GRE, GMAT, MCAT'}
                        {country.code === 'UK' && 'GCSE, A-Levels, BMAT, UCAT'}
                        {country.code === 'AU' && 'ATAR, UCAT ANZ, VCE, HSC'}
                        {country.code === 'CA' && 'OSSD, provincial diploma exams'}
                        {!['IN', 'US', 'UK', 'AU', 'CA'].includes(country.code) && 'Standardized national exams'}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              )
            })}

            {filteredCountries.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                No countries match "{search}".
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Changing your country instantly updates test and exam catalogs</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
