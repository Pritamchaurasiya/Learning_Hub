import { useState } from 'react'
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
  Settings as SettingsIcon,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'

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
      notifications: { ...settings.notifications, [key]: !settings.notifications[key] },
    })
    setHasChanges(true)
  }

  const handlePrivacyChange = (key: keyof SettingsState['privacy']) => {
    setSettings({
      ...settings,
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
      const token = localStorage.getItem('token')
      const response = await fetch('/api/v1/auth/export-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to export data')

      const blob = await response.blob()
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
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
