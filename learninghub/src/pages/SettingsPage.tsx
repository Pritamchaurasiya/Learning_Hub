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
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

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
  const { theme, setTheme, logout, addToast, settings: globalSettings, updateSettings } = useStore()

  const isLowPerformance = globalSettings?.lowPerformanceMode || false

  const handleLowPerformanceToggle = () => {
    updateSettings({ lowPerformanceMode: !isLowPerformance })
    addToast({
      message: !isLowPerformance ? 'Low performance mode enabled' : 'Low performance mode disabled',
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
    addToast({ message: 'Settings saved successfully', type: 'success' })
    setHasChanges(false)
  }

  const handleExportData = () => {
    const data = {
      theme: settings.theme,
      notifications: settings.notifications,
      privacy: settings.privacy,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'learninghub-settings.json'
    a.click()
    URL.revokeObjectURL(url)
    addToast({ message: 'Settings exported', type: 'success' })
  }

  const handleClearData = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear()
      addToast({ message: 'Local data cleared', type: 'info' })
      window.location.reload()
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        {hasChanges && (
          <Button onClick={handleSave} leftIcon={<Check className="w-4 h-4" />}>
            Save Changes
          </Button>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5" />
          Appearance
        </h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred theme</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                settings.theme === 'light'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              aria-pressed={settings.theme === 'light'}
            >
              <Sun className="w-6 h-6" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                settings.theme === 'dark'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              aria-pressed={settings.theme === 'dark'}
            >
              <Moon className="w-6 h-6" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                settings.theme === 'system'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              aria-pressed={settings.theme === 'system'}
            >
              <Monitor className="w-6 h-6" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>

          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium">Low Performance Mode</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Disables background animations and heavy graphics to save battery
                  </p>
                </div>
              </div>
              <button
                onClick={handleLowPerformanceToggle}
                className={`w-12 h-6 rounded-full transition-colors ${
                  isLowPerformance ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={isLowPerformance}
                aria-label="Toggle low performance mode"
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    isLowPerformance ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Daily Reminder</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get reminded to maintain your streak
                </p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationChange('dailyReminder')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications.dailyReminder
                  ? 'bg-primary-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.notifications.dailyReminder}
              aria-label="Toggle daily reminder notifications"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.notifications.dailyReminder ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Progress Updates</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notifications when you make progress
                </p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationChange('progressUpdates')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications.progressUpdates
                  ? 'bg-primary-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.notifications.progressUpdates}
              aria-label="Toggle progress update notifications"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.notifications.progressUpdates ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Achievements</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get notified when you unlock achievements
                </p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationChange('achievements')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications.achievements
                  ? 'bg-primary-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.notifications.achievements}
              aria-label="Toggle achievement notifications"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.notifications.achievements ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive a weekly summary email
                </p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationChange('weeklyDigest')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications.weeklyDigest
                  ? 'bg-primary-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.notifications.weeklyDigest}
              aria-label="Toggle weekly digest email"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.notifications.weeklyDigest ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Privacy
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Control what others can see</p>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Show Profile</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Allow others to view your profile
                </p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showProfile')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.privacy.showProfile ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.privacy.showProfile}
              aria-label="Toggle profile visibility"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.privacy.showProfile ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Show Progress</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Display your learning progress
                </p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showProgress')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.privacy.showProgress ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.privacy.showProgress}
              aria-label="Toggle progress visibility"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.privacy.showProgress ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Show Streak</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Make your streak visible</p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyChange('showStreak')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.privacy.showStreak ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={settings.privacy.showStreak}
              aria-label="Toggle streak visibility"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.privacy.showStreak ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Data & Privacy
        </h2>
        <div className="space-y-3">
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportData}
          >
            Export Settings
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleClearData}
            className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Clear Local Data
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          Account
        </h2>
        <div className="space-y-3">
          <Button
            variant="danger"
            fullWidth
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>LearningHub v1.0.0</p>
          <p>A full-stack learning platform for mastering DSA and web development.</p>
        </div>
      </Card>
    </div>
  )
}
