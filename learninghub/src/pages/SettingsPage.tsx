import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  Shield,
  Eye,
  Trash2,
  Download,
  LogOut,
  Check,
  HelpCircle,
  Info,
  BookOpen,
  Settings as SettingsIcon,
  AlertCircle,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { fetchApi } from '../utils/api'

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    dailyReminder: boolean
    progressUpdates: boolean
    achievements: boolean
    weeklyDigest: boolean
  }
  privacy: {
    showProfile: boolean
    showProgress: boolean
    showStreak: boolean
  }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const theme = useStore(state => state.theme)
  const setTheme = useStore(state => state.setTheme)
  const logout = useStore(state => state.logout)
  const addToast = useStore(state => state.addToast)
  const globalSettings = useStore(state => state.settings)
  const updateSettings = useStore(state => state.updateSettings)
  const auth = useStore(state => state.auth)
  const fetchMe = useStore(state => state.fetchMe)

  // Preferences Data State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [countries, setCountries] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [exams, setExams] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subjects, setSubjects] = useState<any[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [loadingExams, setLoadingExams] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  // User Preferences Selections
  const [prefCountry, setPrefCountry] = useState(auth.user?.examPreference?.countryId ?? '')
  const [prefExam, setPrefExam] = useState(auth.user?.examPreference?.examId ?? '')
  const [prefSubjects, setPrefSubjects] = useState<string[]>(
    auth.user?.examPreference?.subjectIds ?? []
  )
  const [prefDifficulty, setPrefDifficulty] = useState(
    auth.user?.examPreference?.difficulty ?? 'MEDIUM'
  )
  const [prefGoal, setPrefGoal] = useState(auth.user?.examPreference?.dailyGoal ?? 15)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    const loadCountries = async () => {
      try {
        setPrefsError(null)
        setLoadingCountries(true)
        const res = await fetchApi('/exam-content/countries')
        setCountries(res?.data ?? res ?? [])
      } catch (err) {
        setPrefsError('Could not load countries. Check your connection.')
        if (import.meta.env.DEV) console.error('Error fetching countries:', err)
      } finally {
        setLoadingCountries(false)
      }
    }
    void loadCountries()
  }, [])

  useEffect(() => {
    if (prefCountry) {
      const loadExams = async () => {
        try {
          setPrefsError(null)
          setLoadingExams(true)
          const res = await fetchApi(`/exam-content/exams?countryId=${prefCountry}`)
          setExams(res?.data ?? res ?? [])
        } catch (err) {
          setPrefsError('Could not load exams for selected country.')
          if (import.meta.env.DEV) console.error('Error fetching exams:', err)
        } finally {
          setLoadingExams(false)
        }
      }
      void loadExams()
    } else {
      setExams([])
    }
  }, [prefCountry])

  useEffect(() => {
    if (prefExam) {
      const loadSubjects = async () => {
        try {
          setPrefsError(null)
          setLoadingSubjects(true)
          const res = await fetchApi(`/exam-content/exams/${prefExam}/subjects`)
          setSubjects(res?.data ?? res ?? [])
        } catch (err) {
          setPrefsError('Could not load subjects for selected exam.')
          if (import.meta.env.DEV) console.error('Error fetching subjects:', err)
        } finally {
          setLoadingSubjects(false)
        }
      }
      void loadSubjects()
    } else {
      setSubjects([])
    }
  }, [prefExam])

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true)
      await fetchApi('/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          countryId: prefCountry || null,
          examId: prefExam || null,
          subjectIds: prefSubjects,
          difficulty: prefDifficulty,
          dailyGoal: prefGoal,
        }),
      })
      addToast({ message: 'Study preferences synchronized successfully.', type: 'success' })
      await fetchMe()
    } catch (err) {
      console.error('Failed to save preferences', err)
      addToast({ message: 'Failed to update study preferences.', type: 'error' })
    } finally {
      setSavingPrefs(false)
    }
  }

  const isLowPerformance = globalSettings?.lowPerformanceMode ?? false

  const handleLowPerformanceToggle = () => {
    updateSettings({ lowPerformanceMode: !isLowPerformance })
    addToast({
      message: !isLowPerformance
        ? 'Low performance mode engaged.'
        : 'Low performance mode disabled.',
      type: 'info',
    })
  }

  const [settings, setSettings] = useState<SettingsState>({
    theme: theme.mode,
    notifications: {
      dailyReminder: true,
      progressUpdates: true,
      achievements: true,
      weeklyDigest: false,
    },
    privacy: {
      showProfile: true,
      showProgress: true,
      showStreak: true,
    },
  })

  const [hasChanges, setHasChanges] = useState(false)

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setSettings({ ...settings, theme: newTheme })
    setTheme({ mode: newTheme })
    setHasChanges(true)
  }

  const handleNotificationChange = (key: keyof SettingsState['notifications']) => {
    setSettings({
      ...settings,
      // eslint-disable-next-line security/detect-object-injection
      notifications: { ...settings.notifications, [key]: !settings.notifications[key] },
    })
    setHasChanges(true)
  }

  const handlePrivacyChange = (key: keyof SettingsState['privacy']) => {
    setSettings({
      ...settings,
      // eslint-disable-next-line security/detect-object-injection
      privacy: { ...settings.privacy, [key]: !settings.privacy[key] },
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    updateSettings({
      notifications:
        settings.notifications.dailyReminder ||
        settings.notifications.progressUpdates ||
        settings.notifications.achievements,
      dailyReminder: settings.notifications.dailyReminder,
      progressUpdates: settings.notifications.progressUpdates,
      achievements: settings.notifications.achievements,
      weeklyDigest: settings.notifications.weeklyDigest,
      lowPerformanceMode: isLowPerformance,
      compactMode: false,
      soundEffects: true,
      autoplay: false,
      showProfile: settings.privacy.showProfile,
      showProgress: settings.privacy.showProgress,
      showStreak: settings.privacy.showStreak,
    })
    addToast({ message: 'Configuration synchronized successfully.', type: 'success' })
    setHasChanges(false)
  }

  const handleExportData = async () => {
    try {
      addToast({ message: 'Requesting secure data export from server...', type: 'info' })
      const blob = (await fetchApi('/auth/export-data', { responseType: 'blob' })) as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'learninghub-gdpr-export.json'
      a.click()
      URL.revokeObjectURL(url)
      addToast({ message: 'GDPR Data export complete.', type: 'success' })
    } catch {
      addToast({ message: 'Error exporting data.', type: 'error' })
    }
  }

  const handleClearData = () => {
    if (
      // eslint-disable-next-line no-alert
      window.confirm(
        'WARNING: Are you sure you want to purge all local configuration? This action is irreversible.'
      )
    ) {
      Object.keys(localStorage)
        .filter(key => key.startsWith('learninghub'))
        .forEach(key => localStorage.removeItem(key))
      addToast({ message: 'Local cache purged.', type: 'info' })
      window.location.reload()
    }
  }

  const handleLogout = () => {
    void logout()
    navigate('/auth')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Switch = ({ checked, onChange, label, description, icon: Icon }: any) => (
    <label className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight">
            {label}
          </p>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={e => {
          e.preventDefault()
          onChange()
        }}
        className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${
          checked ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <div
          className={`w-6 h-6 bg-white rounded-full shadow-md absolute top-1 transition-all ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </label>
  )

  return (
    <AnimatedPage className="max-w-4xl mx-auto space-y-10 pb-12 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.25rem] bg-gray-900 dark:bg-white flex items-center justify-center shadow-xl">
            <SettingsIcon className="w-8 h-8 text-white dark:text-gray-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Configuration
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              System Parameters & Preferences
            </p>
          </div>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            className="rounded-xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg shadow-primary-500/20"
          >
            <Check className="w-4 h-4 mr-2" /> Sync Changes
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Appearance */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              Display Interface
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'System' },
                ].map(t => (
                  <button
                    key={t.id}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => handleThemeChange(t.id as any)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                      settings.theme === t.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 shadow-md shadow-primary-500/10'
                        : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <t.icon className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
                <Switch
                  checked={isLowPerformance}
                  onChange={handleLowPerformanceToggle}
                  label="Efficiency Mode"
                  description="Disable animations to conserve resources"
                  icon={Monitor}
                />
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-500" />
              </div>
              Security & Privacy
            </h2>
            <div className="space-y-2">
              <Switch
                checked={settings.privacy.showProfile}
                onChange={() => handlePrivacyChange('showProfile')}
                label="Public Profile"
                description="Allow network access to profile"
                icon={Eye}
              />
              <Switch
                checked={settings.privacy.showProgress}
                onChange={() => handlePrivacyChange('showProgress')}
                label="Telemetry Sync"
                description="Broadcast progress metrics"
                icon={Eye}
              />
              <Switch
                checked={settings.privacy.showStreak}
                onChange={() => handlePrivacyChange('showStreak')}
                label="Streak Visibility"
                description="Display consecutive logins"
                icon={Eye}
              />
            </div>
          </Card>

          {/* Exam & Practice Preferences */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              Exam & Study Target
            </h2>
            {prefsError && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {prefsError}
              </div>
            )}
            <div className="space-y-6">
              {/* Country Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                  Target Region
                </label>
                {loadingCountries ? (
                  <div className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm text-gray-400 animate-pulse">
                    Loading regions...
                  </div>
                ) : (
                  <select
                    value={prefCountry}
                    onChange={e => {
                      setPrefCountry(e.target.value)
                      setPrefExam('')
                      setPrefSubjects([])
                    }}
                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500 dark:text-white"
                  >
                    <option value="">Select Region...</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.flagEmoji ? `${c.flagEmoji} ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Exam Selection */}
              {prefCountry && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Target Exam
                  </label>
                  {loadingExams ? (
                    <div className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm text-gray-400 animate-pulse">
                      Loading exams...
                    </div>
                  ) : (
                    <select
                      value={prefExam}
                      onChange={e => {
                        setPrefExam(e.target.value)
                        setPrefSubjects([])
                      }}
                      className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500 dark:text-white"
                    >
                      <option value="">Select Exam...</option>
                      {exams.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Subjects Checklist */}
              {prefExam && loadingSubjects && (
                <div className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm text-gray-400 animate-pulse">
                  Loading subjects...
                </div>
              )}
              {prefExam && !loadingSubjects && subjects.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Practice Subjects
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-100 dark:border-gray-800 rounded-2xl">
                    {subjects.map(s => {
                      const isSelected = prefSubjects.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setPrefSubjects(prev =>
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            )
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Difficulty & Goal */}
              {prefExam && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Practice Difficulty
                    </label>
                    <select
                      value={prefDifficulty}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onChange={e => setPrefDifficulty(e.target.value as any)}
                      className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500 dark:text-white"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                      <option value="MIXED">Mixed</option>
                      <option value="ADAPTIVE">Adaptive</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                        Daily Study Goal
                      </label>
                      <span className="text-xs font-black text-primary-500">
                        {prefGoal} Mins / Day
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={prefGoal}
                      onChange={e => setPrefGoal(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                </>
              )}

              <Button
                fullWidth
                onClick={handleSavePreferences}
                disabled={savingPrefs || !prefExam || prefSubjects.length === 0}
                className="rounded-2xl font-black uppercase tracking-widest text-[10px] py-4 shadow-lg shadow-primary-500/20"
              >
                {savingPrefs ? 'Syncing...' : 'Save Study Target'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Notifications */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-500" />
              </div>
              Alerts & Signals
            </h2>
            <div className="space-y-2">
              <Switch
                checked={settings.notifications.dailyReminder}
                onChange={() => handleNotificationChange('dailyReminder')}
                label="Daily Ping"
                description="Routine network engagement signal"
                icon={Bell}
              />
              <Switch
                checked={settings.notifications.progressUpdates}
                onChange={() => handleNotificationChange('progressUpdates')}
                label="Milestone Alerts"
                description="Notifications for module completion"
                icon={Info}
              />
              <Switch
                checked={settings.notifications.achievements}
                onChange={() => handleNotificationChange('achievements')}
                label="Trophy Signals"
                description="Alerts for acquired credentials"
                icon={HelpCircle}
              />
              <Switch
                checked={settings.notifications.weeklyDigest}
                onChange={() => handleNotificationChange('weeklyDigest')}
                label="Batch Summary"
                description="Weekly telemetry compilation"
                icon={BellOff}
              />
            </div>
          </Card>

          {/* System Control */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              System Control
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] py-4"
                  onClick={handleExportData}
                >
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] py-4 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-900/20"
                  onClick={handleClearData}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Purge
                </Button>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="danger"
                  fullWidth
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] py-4 shadow-lg shadow-rose-500/20"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Disconnect Session
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  )
}
