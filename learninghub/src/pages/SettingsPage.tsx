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
  Wallet,
  Lock,
  QrCode,
  CheckCircle2,
  Volume2,
  VolumeX,
  Smartphone,
  Sliders,
  KeyRound,
  Laptop,
  User,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { fetchApi } from '../utils/api'
import { triggerHaptic, isHapticSupported } from '../utils/haptics'
import { playRewardChime } from '../utils/soundEffects'
import { userService, type UserSession } from '../services/userService'

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

type SettingsTab =
  'all' | 'appearance' | 'account' | 'study' | 'notifications' | 'security' | 'privacy'

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

  // Active Tab Filter (defaults to 'all' so all sections and tests load immediately)
  const [activeTab, setActiveTab] = useState<SettingsTab>('all')

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

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  // Active Sessions State
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  // Web3 Wallet State
  const [walletAddress, setWalletAddress] = useState('')
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [savingWallet, setSavingWallet] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  // 2FA / TOTP Security State
  const isMfaEnabled = Boolean(auth.user?.mfaEnabled)
  const [mfaSetupMode, setMfaSetupMode] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaData, setMfaData] = useState<{ secret?: string; qrCodeUrl?: string } | null>(null)
  const [mfaToken, setMfaToken] = useState('')
  const [mfaVerifying, setMfaVerifying] = useState(false)
  const [mfaDisableMode, setMfaDisableMode] = useState(false)
  const [mfaDisableToken, setMfaDisableToken] = useState('')
  const [mfaDisabling, setMfaDisabling] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)

  // Delete Account Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmationPhrase, setDeleteConfirmationPhrase] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // Load Web3 Profile
  useEffect(() => {
    const loadWeb3Profile = async () => {
      try {
        setLoadingWallet(true)
        const res = await fetchApi('/web3/profile')
        const data = res?.data ?? res
        if (data?.wallet_address) {
          setWalletAddress(data.wallet_address)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load Web3 profile:', err)
      } finally {
        setLoadingWallet(false)
      }
    }
    void loadWeb3Profile()
  }, [])

  // Load Sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoadingSessions(true)
        const res = await userService.getSessions()
        if (res?.data) {
          setSessions(res.data)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load user sessions:', err)
      } finally {
        setLoadingSessions(false)
      }
    }
    if (auth.isAuthenticated) {
      void loadSessions()
    }
  }, [auth.isAuthenticated])

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId)
      await userService.revokeSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      addToast({ message: 'Session revoked successfully.', type: 'info' })
    } catch {
      addToast({ message: 'Failed to revoke session.', type: 'error' })
    } finally {
      setRevokingSessionId(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (!currentPassword) {
      setPasswordError('Current password is required.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    try {
      setChangingPassword(true)
      await userService.changePassword(currentPassword, newPassword)
      addToast({
        message: 'Password updated successfully! Please keep it secure.',
        type: 'success',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.'
      setPasswordError(msg)
      addToast({ message: msg, type: 'error' })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSaveWallet = async () => {
    const trimmed = walletAddress.trim()
    const ethRegex = /^0x[a-fA-F0-9]{40}$/
    if (!ethRegex.test(trimmed)) {
      setWalletError(
        'Please enter a valid 40-character hexadecimal Ethereum/Polygon address (0x...).'
      )
      return
    }
    try {
      setSavingWallet(true)
      setWalletError(null)
      await fetchApi('/web3/profile', {
        method: 'POST',
        body: JSON.stringify({ wallet_address: trimmed }),
      })
      addToast({ message: 'Web3 Polygon wallet updated successfully.', type: 'success' })
    } catch {
      setWalletError('Failed to bind Web3 wallet. Please try again.')
      addToast({ message: 'Failed to update Web3 wallet.', type: 'error' })
    } finally {
      setSavingWallet(false)
    }
  }

  const handleStartMfaSetup = async () => {
    try {
      setMfaSetupMode(true)
      setMfaLoading(true)
      setMfaError(null)
      const res = await fetchApi('/auth/mfa/setup', { method: 'POST' })
      const data = res?.data ?? res
      setMfaData(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize MFA setup'
      setMfaError(msg)
      addToast({ message: msg, type: 'error' })
    } finally {
      setMfaLoading(false)
    }
  }

  // FIX: Route mapped to /auth/mfa/verify-enable in backend
  const handleVerifyMfa = async () => {
    if (mfaToken.length !== 6) return
    try {
      setMfaVerifying(true)
      setMfaError(null)
      await fetchApi('/auth/mfa/verify-enable', {
        method: 'POST',
        body: JSON.stringify({ token: mfaToken }),
      })
      addToast({ message: 'Two-Factor Authentication enabled successfully!', type: 'success' })
      setMfaSetupMode(false)
      setMfaToken('')
      setMfaData(null)
      await fetchMe()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code'
      setMfaError(msg)
      addToast({ message: msg, type: 'error' })
    } finally {
      setMfaVerifying(false)
    }
  }

  const handleDisableMfa = async () => {
    if (mfaDisableToken.length !== 6) return
    try {
      setMfaDisabling(true)
      setMfaError(null)
      await fetchApi('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: mfaDisableToken }),
      })
      addToast({ message: 'Two-Factor Authentication disabled', type: 'info' })
      setMfaDisableMode(false)
      setMfaDisableToken('')
      await fetchMe()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disable MFA'
      setMfaError(msg)
      addToast({ message: msg, type: 'error' })
    } finally {
      setMfaDisabling(false)
    }
  }

  // Load Exam Content Options
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setPrefsError(null)
        setLoadingCountries(true)
        const res = await fetchApi('/exam-content/countries')
        const data = res?.data ?? res
        setCountries(Array.isArray(data) ? data : [])
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
          const data = res?.data ?? res
          setExams(Array.isArray(data) ? data : [])
        } catch (err) {
          setPrefsError('Could not load exams for the selected country.')
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
          const res = await fetchApi(`/subjects?examId=${prefExam}`)
          const data = res?.data ?? res
          setSubjects(Array.isArray(data) ? data : [])
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

  const isSoundEnabled = globalSettings?.soundEffects ?? true
  const isHapticEnabled = globalSettings?.hapticFeedback ?? true
  const isCompactMode = globalSettings?.compactMode ?? false

  const handleSoundToggle = () => {
    const next = !isSoundEnabled
    updateSettings({ soundEffects: next })
    if (next) playRewardChime('xp-gain')
    addToast({
      message: next ? 'Synthesized audio cues enabled.' : 'Audio cues muted.',
      type: 'info',
    })
  }

  const handleHapticToggle = () => {
    const next = !isHapticEnabled
    updateSettings({ hapticFeedback: next })
    if (next) triggerHaptic('success')
    addToast({
      message: next ? 'Tactile haptic feedback enabled.' : 'Haptic feedback disabled.',
      type: 'info',
    })
  }

  const handleCompactToggle = () => {
    const next = !isCompactMode
    updateSettings({ compactMode: next })
    addToast({
      message: next ? 'High-density compact mode enabled.' : 'Standard layout mode enabled.',
      type: 'info',
    })
  }

  // Initialize local state from global store
  const [settings, setSettings] = useState<SettingsState>(() => ({
    theme: theme.mode,
    notifications: {
      dailyReminder: globalSettings?.dailyReminder ?? true,
      progressUpdates: globalSettings?.progressUpdates ?? true,
      achievements: globalSettings?.achievements ?? true,
      weeklyDigest: globalSettings?.weeklyDigest ?? false,
    },
    privacy: {
      showProfile: globalSettings?.showProfile ?? true,
      showProgress: globalSettings?.showProgress ?? true,
      showStreak: globalSettings?.showStreak ?? true,
    },
  }))

  const [hasChanges, setHasChanges] = useState(false)

  // Sync local state with global store when it changes
  useEffect(() => {
    if (globalSettings) {
      setSettings(prev => ({
        ...prev,
        notifications: {
          dailyReminder: globalSettings.dailyReminder ?? true,
          progressUpdates: globalSettings.progressUpdates ?? true,
          achievements: globalSettings.achievements ?? true,
          weeklyDigest: globalSettings.weeklyDigest ?? false,
        },
        privacy: {
          showProfile: globalSettings.showProfile ?? true,
          showProgress: globalSettings.showProgress ?? true,
          showStreak: globalSettings.showStreak ?? true,
        },
      }))
    }
  }, [globalSettings])

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

  // FIX: Do NOT hardcode compactMode and soundEffects to false/true!
  const handleSave = () => {
    updateSettings({
      ...settings.notifications,
      ...settings.privacy,
      lowPerformanceMode: isLowPerformance,
      compactMode: isCompactMode,
      soundEffects: isSoundEnabled,
      autoplay: false,
    })
    addToast({ message: 'Configuration synchronized successfully.', type: 'success' })
    setHasChanges(false)
  }

  const handleExportData = async () => {
    try {
      addToast({ message: 'Requesting secure data export from server...', type: 'info' })
      const response = await fetchApi('/auth/export-data', { responseType: 'blob' })
      const blob = response as Blob
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

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationPhrase !== 'DELETE') return
    try {
      setIsDeletingAccount(true)
      await userService.deleteAccount()
      addToast({ message: 'Account permanently deleted.', type: 'info' })
      void logout()
      navigate('/auth')
    } catch {
      addToast({ message: 'Failed to delete account. Please try again.', type: 'error' })
    } finally {
      setIsDeletingAccount(false)
      setDeleteModalOpen(false)
    }
  }

  const handleLogout = () => {
    void logout()
    navigate('/auth')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Switch = ({ checked, onChange, label, description, icon: Icon }: any) => (
    <div
      onClick={onChange}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange()
        }
      }}
      className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group focus:outline-none focus:ring-2 focus:ring-primary-500/40 min-h-[52px]"
      aria-label={`${label}: ${checked ? 'enabled' : 'disabled'}`}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            checked
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-xs sm:text-sm text-gray-900 dark:text-white uppercase tracking-tight truncate">
            {label}
          </p>
          <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>
      <div
        className={`w-12 sm:w-14 h-7 sm:h-8 rounded-full transition-colors relative shadow-inner shrink-0 ${
          checked ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
        aria-hidden="true"
      >
        <div
          className={`w-5 sm:w-6 h-5 sm:h-6 bg-white rounded-full shadow-md absolute top-1 transition-all ${
            checked ? 'left-6 sm:left-7' : 'left-1'
          }`}
        />
      </div>
    </div>
  )

  const showAppearance = activeTab === 'all' || activeTab === 'appearance'
  const showAccount = activeTab === 'all' || activeTab === 'account'
  const showStudy = activeTab === 'all' || activeTab === 'study'
  const showNotifications = activeTab === 'all' || activeTab === 'notifications'
  const showSecurity = activeTab === 'all' || activeTab === 'security'
  const showPrivacy = activeTab === 'all' || activeTab === 'privacy'

  return (
    <AnimatedPage className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-16 pt-2 px-2 sm:px-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-900 dark:bg-white flex items-center justify-center shadow-xl shrink-0">
            <SettingsIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white dark:text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              System Parameters, Security & Learning Profile
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              onClick={handleSave}
              className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6 py-3.5 shadow-lg shadow-primary-500/20 min-h-[44px]"
            >
              <Check className="w-4 h-4 mr-1.5" /> Sync Changes
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            leftIcon={<User className="w-4 h-4" />}
            className="rounded-xl text-xs font-bold min-h-[44px]"
          >
            My Profile
          </Button>
        </div>
      </div>

      {/* Responsive Filter Tab Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'all', label: 'All Settings', icon: Sliders },
          { id: 'appearance', label: 'Display & Sensory', icon: Sun },
          { id: 'account', label: 'Account & Password', icon: KeyRound },
          { id: 'study', label: 'Study Targets', icon: BookOpen },
          { id: 'notifications', label: 'Alerts & Signals', icon: Bell },
          { id: 'security', label: '2FA & Web3', icon: Lock },
          { id: 'privacy', label: 'Privacy & Data', icon: Shield },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 min-h-[44px] ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* LEFT COLUMN */}
        <div className="space-y-6 sm:space-y-8">
          {/* Appearance & Display */}
          {showAppearance && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-500" />
                </div>
                Display Interface
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { id: 'light', icon: Sun, label: 'Light' },
                    { id: 'dark', icon: Moon, label: 'Dark' },
                    { id: 'system', icon: Monitor, label: 'System' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id as 'light' | 'dark' | 'system')}
                      className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 sm:gap-3 min-h-[80px] justify-center ${
                        settings.theme === t.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 shadow-md shadow-primary-500/10'
                          : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <t.icon className="w-5 h-5 sm:w-6 sm:h-6" />
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
          )}

          {/* Adaptive Sensory & Accessibility */}
          {showAppearance && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-violet-500" />
                </div>
                Sensory & Accessibility
              </h2>
              <div className="space-y-2">
                <Switch
                  checked={isSoundEnabled}
                  onChange={handleSoundToggle}
                  label="Audio Cues"
                  description="Synthesized feedback for test & arena events"
                  icon={isSoundEnabled ? Volume2 : VolumeX}
                />
                <Switch
                  checked={isHapticEnabled}
                  onChange={handleHapticToggle}
                  label="Haptic Vibrations"
                  description="Tactile pulses on test submissions & alerts"
                  icon={Smartphone}
                />
                {isHapticSupported() && (
                  <div className="px-4 py-2.5 flex items-center justify-between text-xs rounded-xl bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      Tactile Engine: Active
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerHaptic('success')}
                      className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-semibold text-xs hover:bg-violet-100 transition-colors min-h-[36px]"
                    >
                      Test Tactile Tap
                    </button>
                  </div>
                )}
                <Switch
                  checked={isLowPerformance}
                  onChange={handleLowPerformanceToggle}
                  label="Reduced Motion Mode"
                  description="Optimize framerates & disable complex blur shaders"
                  icon={Monitor}
                />
                <Switch
                  checked={isCompactMode}
                  onChange={handleCompactToggle}
                  label="High-Density Compact View"
                  description="Tighten spacing & data grids for power users"
                  icon={BookOpen}
                />
              </div>
            </Card>
          )}

          {/* Change Password & Security Form */}
          {showAccount && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-blue-500" />
                </div>
                Change Password
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-sm font-bold focus:outline-none focus:border-primary-500 dark:text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  disabled={changingPassword || !currentPassword || !newPassword}
                  isLoading={changingPassword}
                  className="rounded-xl font-black uppercase tracking-widest text-[10px] py-3.5 shadow-lg shadow-primary-500/20 min-h-[44px]"
                >
                  Update Account Password
                </Button>
              </form>
            </Card>
          )}

          {/* Active Sessions & Device Management */}
          {showAccount && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-emerald-500" />
                </div>
                Active Devices & Sessions
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Manage browsers and workstations authenticated with your student credentials.
              </p>

              {loadingSessions ? (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 animate-pulse">
                  Loading active sessions...
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {s.browser || s.userAgent || 'Web Client'}
                          </p>
                          {s.current && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          IP: {s.ipAddress || 'Remote IP'} • {s.os || 'Desktop OS'}
                        </p>
                      </div>

                      {!s.current && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(s.id)}
                          disabled={revokingSessionId === s.id}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          {revokingSessionId === s.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 flex items-center justify-between">
                  <span>Current browser session active.</span>
                  <span className="text-emerald-600 font-bold">Secure</span>
                </div>
              )}
            </Card>
          )}

          {/* Privacy & Visibility */}
          {showPrivacy && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
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
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6 sm:space-y-8">
          {/* Exam & Practice Preferences */}
          {showStudy && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
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
                                prev.includes(s.id)
                                  ? prev.filter(id => id !== s.id)
                                  : [...prev, s.id]
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
                  className="rounded-2xl font-black uppercase tracking-widest text-[10px] py-4 shadow-lg shadow-primary-500/20 min-h-[44px]"
                >
                  {savingPrefs ? 'Syncing...' : 'Save Study Target'}
                </Button>
              </div>
            </Card>
          )}

          {/* Notifications */}
          {showNotifications && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
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
          )}

          {/* Web3 Identity & Wallet */}
          {showSecurity && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-500" />
                </div>
                Web3 On-Chain Identity
              </h2>
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Connect your Polygon wallet address to receive soulbound course completion NFT
                  credentials and verify achievements on-chain.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Polygon / EVM Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x71C63729Ed55c7e230CDE7920D9bAfEC529289A2"
                    value={walletAddress}
                    onChange={e => {
                      setWalletAddress(e.target.value)
                      if (walletError) setWalletError(null)
                    }}
                    className="w-full p-3.5 sm:p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 dark:text-white break-all"
                  />
                  {walletError && (
                    <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 inline" /> {walletError}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  disabled={savingWallet || loadingWallet || !walletAddress}
                  onClick={handleSaveWallet}
                  className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] py-3.5 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 min-h-[44px]"
                >
                  {savingWallet ? 'Binding Address...' : 'Sync Web3 Wallet'}
                </Button>
              </div>
            </Card>
          )}

          {/* Two-Factor Authentication (2FA) */}
          {showSecurity && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-500" />
                </div>
                Two-Factor Auth (2FA)
              </h2>

              <div className="space-y-5">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Protect your student account with Google Authenticator, 1Password, or Authy.
                </p>

                {isMfaEnabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                          2FA Active & Protected
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Authenticator code verification is required at every login.
                        </p>
                      </div>
                    </div>

                    {!mfaDisableMode ? (
                      <Button
                        variant="outline"
                        fullWidth
                        onClick={() => setMfaDisableMode(true)}
                        className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] py-3.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-900/20 min-h-[44px]"
                      >
                        Disable 2FA Protection
                      </Button>
                    ) : (
                      <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 space-y-3">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Enter your 6-digit authenticator code to confirm disabling 2FA:
                        </p>
                        <input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          value={mfaDisableToken}
                          onChange={e => setMfaDisableToken(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-[0.4em] focus:border-rose-500 focus:outline-none dark:text-white"
                        />
                        {mfaError && (
                          <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {mfaError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            disabled={mfaDisableToken.length !== 6 || mfaDisabling}
                            isLoading={mfaDisabling}
                            onClick={handleDisableMfa}
                            className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] py-3 min-h-[44px]"
                          >
                            Confirm Disable
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setMfaDisableMode(false)
                              setMfaDisableToken('')
                              setMfaError(null)
                            }}
                            className="rounded-xl font-black uppercase tracking-widest text-[10px] py-3 min-h-[44px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : !mfaSetupMode ? (
                  <Button
                    onClick={handleStartMfaSetup}
                    isLoading={mfaLoading}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-lg shadow-rose-500/20 min-h-[44px]"
                    leftIcon={<Shield className="w-4 h-4 mr-1" />}
                  >
                    Enable 2FA Protection
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    {mfaLoading ? (
                      <div className="flex items-center justify-center gap-3 py-6 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <QrCode className="w-5 h-5 animate-pulse text-rose-500" /> Generating Secure
                        TOTP Credentials...
                      </div>
                    ) : mfaData?.qrCodeUrl ? (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 shrink-0">
                            <img
                              src={mfaData.qrCodeUrl}
                              alt="2FA QR Code"
                              className="w-32 h-32 sm:w-36 sm:h-36"
                            />
                          </div>
                          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                            <p className="font-bold text-gray-900 dark:text-white">
                              1. Scan QR Code
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Scan with Google Authenticator, Authy, or 1Password.
                            </p>
                            <p className="font-bold text-gray-900 dark:text-white pt-1">
                              2. Enter 6-Digit Code
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Input the temporary code generated by your app.
                            </p>
                          </div>
                        </div>

                        {mfaData.secret && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-left">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                              Manual Setup Key
                            </span>
                            <code className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 select-all break-all">
                              {mfaData.secret}
                            </code>
                          </div>
                        )}

                        <div className="space-y-3 pt-1">
                          <input
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            data-testid="mfa-token-input"
                            value={mfaToken}
                            onChange={e => setMfaToken(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-black tracking-[0.4em] focus:border-rose-500 focus:outline-none dark:text-white transition-colors"
                          />
                          {mfaError && (
                            <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {mfaError}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              disabled={mfaToken.length !== 6 || mfaVerifying}
                              isLoading={mfaVerifying}
                              data-testid="mfa-verify-btn"
                              onClick={handleVerifyMfa}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-[10px] py-3.5 min-h-[44px]"
                            >
                              Verify & Activate
                            </Button>
                            <Button
                              variant="outline"
                              data-testid="mfa-cancel-btn"
                              onClick={() => {
                                setMfaSetupMode(false)
                                setMfaToken('')
                                setMfaData(null)
                                setMfaError(null)
                              }}
                              className="rounded-xl font-black uppercase tracking-widest text-[10px] py-3.5 min-h-[44px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Failed to load 2FA setup credentials.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* System Control & Danger Zone */}
          {(showAccount || showPrivacy) && (
            <Card className="p-6 sm:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight text-gray-900 dark:text-white">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                System & Data Control
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Button
                    variant="outline"
                    className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] py-4 min-h-[44px]"
                    onClick={handleExportData}
                  >
                    <Download className="w-4 h-4 mr-2" /> Export Data
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-2 font-black uppercase tracking-widest text-[10px] py-4 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-900/20 min-h-[44px]"
                    onClick={handleClearData}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Purge Cache
                  </Button>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <Button
                    variant="outline"
                    fullWidth
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] py-3.5 text-gray-700 dark:text-gray-300 min-h-[44px]"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Disconnect Session
                  </Button>

                  <Button
                    variant="danger"
                    fullWidth
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] py-3.5 shadow-lg shadow-rose-500/20 min-h-[44px]"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Account Permanently
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-rose-200 dark:border-rose-900/40 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Permanently Delete Account
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              This action cannot be undone. All enrolled courses, certificates, assessment history,
              and notes will be permanently erased.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">
                Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmationPhrase}
                onChange={e => setDeleteConfirmationPhrase(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-sm uppercase focus:outline-none focus:border-rose-500 dark:text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="danger"
                disabled={deleteConfirmationPhrase !== 'DELETE' || isDeletingAccount}
                isLoading={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] py-3.5 min-h-[44px]"
              >
                Confirm Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDeleteConfirmationPhrase('')
                }}
                className="rounded-xl font-black uppercase tracking-widest text-[10px] py-3.5 min-h-[44px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AnimatedPage>
  )
}
