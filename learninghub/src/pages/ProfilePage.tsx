import { useState, useId } from 'react'
import {
  Mail,
  Calendar,
  Trophy,
  Flame,
  Target,
  Edit2,
  Camera,
  Save,
  X,
  Award,
  BookOpen,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Globe,
  Github,
  Linkedin,
  Share2,
  Check,
  ShieldCheck,
  Zap,
  ChevronRight,
  TrendingUp,
  Search,
  ExternalLink,
  Settings,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { StatCard } from '../components/ui/StatCard'
import { Skeleton } from '../components/ui/Skeleton'
import {
  userService,
  type UserProfile,
  type UpdateProfileData,
  type Achievement,
} from '../services/userService'
import { StudentCredentialsPortfolio } from '../components/credentials/StudentCredentialsPortfolio'
import { motion, AnimatePresence } from 'framer-motion'

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 25 } },
}

export const getSafeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed || /^(javascript|data|vbscript):/i.test(trimmed)) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

type ProfileTab = 'overview' | 'activity' | 'achievements' | 'credentials' | 'security'

export default function ProfilePage() {
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)
  const progress = useStore(state => state.progress)
  const auth = useStore(state => state.auth)
  const queryClient = useQueryClient()

  // Tab State
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})
  const [copiedShare, setCopiedShare] = useState(false)

  // Unique accessible IDs for form fields
  const usernameId = useId()
  const displayNameId = useId()
  const emailId = useId()
  const bioId = useId()
  const locationId = useId()
  const websiteId = useId()
  const githubId = useId()
  const linkedinId = useId()

  // Achievement Filter State
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [achievementSearch, setAchievementSearch] = useState('')

  // Profile Query
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => userService.getProfile().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  // Stats Query
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => userService.getStats().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  // Achievements Query
  const { data: achievementsData, isLoading: isAchievementsLoading } = useQuery({
    queryKey: ['user', 'achievements'],
    queryFn: () => userService.getAchievements().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => userService.updateProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      setIsEditing(false)
      addToast({ message: 'Profile updated successfully!', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to update profile', type: 'error' })
    },
  })

  // Upload Avatar Mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
    onSuccess: res => {
      if (profileData) {
        queryClient.setQueryData(['user', 'profile'], {
          ...profileData,
          avatar: res.data.avatar_url,
        })
      }
      addToast({ message: 'Avatar updated!', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to upload avatar', type: 'error' })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadAvatarMutation.mutate(file)
  }

  const handleSave = () => {
    updateProfileMutation.mutate({
      display_name: editForm.display_name ?? undefined,
      bio: editForm.bio ?? undefined,
      location: editForm.location ?? undefined,
      website: editForm.website ?? undefined,
      github_username: editForm.github_username ?? undefined,
      linkedin_url: editForm.linkedin_url ?? undefined,
      ...(editForm.username ? { username: editForm.username } : {}),
    })
  }

  const handleCancel = () => {
    if (profileData) {
      setEditForm(profileData)
    }
    setIsEditing(false)
  }

  const handleEditStart = () => {
    if (profileData) {
      setEditForm(profileData)
    }
    setIsEditing(true)
  }

  const handleShareProfile = () => {
    const url = window.location.href
    void navigator.clipboard.writeText(url)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
    addToast({ message: 'Public profile link copied to clipboard!', type: 'info' })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isProfileLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12 px-2 sm:px-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Card className="p-6 sm:p-8 border-none shadow-lg rounded-3xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton className="w-28 h-28 sm:w-32 sm:h-32 rounded-full shrink-0" />
            <div className="flex-1 w-full space-y-4">
              <Skeleton className="h-8 w-48 sm:w-64 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <div className="flex flex-wrap gap-3 mt-4">
                <Skeleton className="h-7 w-32 rounded-lg" />
                <Skeleton className="h-7 w-40 rounded-lg" />
              </div>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isProfileError || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle className="w-10 h-10 text-rose-500 drop-shadow" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">
          Failed to load user profile
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          We encountered an issue retrieving your account records. Please check your network and
          retry.
        </p>
        <Button
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => refetchProfile()}
          className="bg-primary-600 hover:bg-primary-700 rounded-xl px-8 shadow-lg shadow-primary-500/20 font-bold"
        >
          Retry Connection
        </Button>
      </div>
    )
  }

  const achievements = achievementsData ?? []

  // Filtered achievements
  const filteredAchievements = achievements.filter((ach: Achievement) => {
    const matchesFilter =
      achievementFilter === 'all'
        ? true
        : achievementFilter === 'unlocked'
          ? Boolean(ach.unlocked_at || ach.unlocked)
          : !ach.unlocked_at && !ach.unlocked
    const matchesSearch =
      ach.name.toLowerCase().includes(achievementSearch.toLowerCase()) ||
      ach.description.toLowerCase().includes(achievementSearch.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const unlockedCount = achievements.filter(a => a.unlocked_at || a.unlocked).length

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-1 pb-16 px-2 sm:px-4">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase flex items-center gap-2">
            Student Profile
          </h1>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-0.5">
            Academic Portfolio & Learning Identity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleShareProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors text-gray-700 dark:text-gray-300 min-h-[44px]"
            title="Share Profile Link"
          >
            {copiedShare ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>

          {!isEditing ? (
            <Button
              variant="outline"
              leftIcon={<Edit2 className="w-4 h-4" />}
              onClick={handleEditStart}
              className="rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 min-h-[44px] text-xs font-bold"
            >
              Edit Profile
            </Button>
          ) : (
            <Button
              variant="outline"
              leftIcon={<X className="w-4 h-4" />}
              onClick={handleCancel}
              className="rounded-xl min-h-[44px] text-xs font-bold"
            >
              Cancel Edit
            </Button>
          )}

          <Button
            variant="ghost"
            leftIcon={<Settings className="w-4 h-4" />}
            onClick={() => navigate('/settings')}
            className="rounded-xl min-h-[44px] text-xs font-bold text-gray-600 dark:text-gray-300"
          >
            Settings
          </Button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Hero Card */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 sm:p-8 border border-white/20 dark:border-gray-800/50 shadow-xl backdrop-blur-xl rounded-[2rem] bg-white/80 dark:bg-gray-900/80 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-28 sm:h-36 bg-gradient-to-r from-primary-600/25 via-purple-600/20 to-amber-500/15" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10 pt-4 sm:pt-6">
              {/* Avatar Section */}
              <div className="relative group shrink-0">
                {profileData.avatar ? (
                  <img
                    src={profileData.avatar}
                    alt={profileData.username}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-2xl"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-white text-4xl sm:text-5xl font-black border-4 border-white dark:border-gray-900 shadow-2xl">
                    {profileData.username ? profileData.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <label
                  className="absolute bottom-1 right-1 p-2.5 sm:p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all cursor-pointer ring-4 ring-white dark:ring-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Change profile avatar"
                  title="Upload profile picture"
                >
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadAvatarMutation.isPending}
                  />
                  {uploadAvatarMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
              </div>

              {/* Identity & Bio */}
              <div className="flex-1 w-full min-w-0 text-center sm:text-left space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">
                        {profileData.username}
                      </h2>
                      {profileData.is_verified && (
                        <span
                          className="p-1 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400"
                          title="Verified Student"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        {profileData.role || 'Learner'}
                      </span>
                    </div>
                    {profileData.display_name &&
                      profileData.display_name !== profileData.username && (
                        <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                          {profileData.display_name}
                        </p>
                      )}
                  </div>
                </div>

                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                  {profileData.bio ||
                    'Continuous learner mastering computer science, software engineering, and competitive exams.'}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl max-w-full truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{profileData.email}</span>
                  </div>

                  {profileData.location && (
                    <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{profileData.location}</span>
                    </div>
                  )}

                  {getSafeUrl(profileData.website) && (
                    <a
                      href={getSafeUrl(profileData.website)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate max-w-[150px]">
                        {profileData.website!.replace(/^https?:\/\//, '')}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}

                  {profileData.github_username && (
                    <a
                      href={`https://github.com/${encodeURIComponent(profileData.github_username)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Github className="w-3.5 h-3.5 shrink-0" />
                      <span>{profileData.github_username}</span>
                    </a>
                  )}

                  {getSafeUrl(profileData.linkedin_url) && (
                    <a
                      href={getSafeUrl(profileData.linkedin_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>LinkedIn</span>
                    </a>
                  )}

                  <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Joined {formatDate(profileData.date_joined)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Edit Profile Drawer / Modal */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-6 sm:p-8 rounded-3xl border border-primary-500/30 bg-primary-50/20 dark:bg-primary-950/20 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      Edit Identity & Social Records
                    </h3>
                    <p className="text-xs text-gray-500">
                      Update your display credentials and social links visible across the learning
                      platform.
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    aria-label="Close edit"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={displayNameId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      Display Name
                    </label>
                    <Input
                      id={displayNameId}
                      value={editForm.display_name ?? ''}
                      onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
                      placeholder="e.g. Alan Turing"
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={usernameId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      Username
                    </label>
                    <Input
                      id={usernameId}
                      value={editForm.username ?? ''}
                      onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                      placeholder="username"
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={emailId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      Email Address
                    </label>
                    <Input
                      id={emailId}
                      type="email"
                      value={editForm.email ?? ''}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={locationId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      Location
                    </label>
                    <Input
                      id={locationId}
                      value={editForm.location ?? ''}
                      onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="e.g. Cambridge, UK"
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={websiteId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      Portfolio / Website
                    </label>
                    <Input
                      id={websiteId}
                      value={editForm.website ?? ''}
                      onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                      placeholder="https://yourportfolio.dev"
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={githubId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      GitHub Handle
                    </label>
                    <Input
                      id={githubId}
                      value={editForm.github_username ?? ''}
                      onChange={e => setEditForm({ ...editForm, github_username: e.target.value })}
                      placeholder="e.g. octocat"
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={linkedinId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      LinkedIn URL
                    </label>
                    <Input
                      id={linkedinId}
                      value={editForm.linkedin_url ?? ''}
                      onChange={e => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor={bioId}
                      className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5"
                    >
                      Bio & Academic Objectives
                    </label>
                    <Input
                      id={bioId}
                      value={editForm.bio ?? ''}
                      onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Share your background, research interests, or learning goals..."
                      className="bg-white dark:bg-gray-900 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="rounded-xl px-6 min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    leftIcon={
                      updateProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )
                    }
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="rounded-xl px-8 min-h-[44px] shadow-lg shadow-primary-500/20 font-bold"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'activity', label: 'Activity & Progress', icon: TrendingUp },
            { id: 'achievements', label: `Achievements (${achievements.length})`, icon: Trophy },
            { id: 'credentials', label: 'Verifiable Credentials', icon: ShieldCheck },
            { id: 'security', label: 'Security & Access', icon: Zap },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* 4 Stat Cards */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              {isStatsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`stat-skel-${i}`} className="h-28 rounded-2xl" />
                ))
              ) : statsData ? (
                <>
                  <StatCard
                    icon={Trophy}
                    label="Completed"
                    value={statsData.completed_courses}
                    color="#f59e0b"
                    delay={0}
                    animated
                  />
                  <StatCard
                    icon={Award}
                    label="Level"
                    value={statsData.level}
                    color="#8b5cf6"
                    delay={100}
                    animated
                  />
                  <StatCard
                    icon={Flame}
                    label="Day Streak"
                    value={statsData.current_streak}
                    color="#ef4444"
                    delay={200}
                    animated
                  />
                  <StatCard
                    icon={Target}
                    label="Total XP"
                    value={statsData.xp_points}
                    color="#10b981"
                    delay={300}
                    animated
                  />
                </>
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`stat-empty-${i}`}
                    className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center text-gray-400 font-bold"
                  >
                    N/A
                  </div>
                ))
              )}
            </motion.div>

            {/* Level Progression & Learning Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Level Progress */}
              <motion.div variants={itemVariants}>
                <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100 mb-4">
                      <Target className="w-5 h-5 text-primary-500" />
                      Level Progression Tier
                    </h3>
                    {isStatsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full rounded-full" />
                      </div>
                    ) : statsData ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                          <span className="text-gray-500 uppercase tracking-wider">
                            XP to Level {statsData.level + 1}
                          </span>
                          <span className="text-primary-600 dark:text-primary-400 font-mono">
                            {statsData.xp_points} / {statsData.next_level_xp} XP
                          </span>
                        </div>
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner relative">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${statsData.next_level_xp > 0 ? Math.min((statsData.xp_points / statsData.next_level_xp) * 100, 100) : 0}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Earn {Math.max(0, statsData.next_level_xp - statsData.xp_points)} more XP
                          by completing problem challenges and adaptive practice sets to advance.
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-400 font-bold text-sm">
                        No level progression record.
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Learning Stats */}
              <motion.div variants={itemVariants}>
                <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100 mb-4">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      Learning Stats
                    </h3>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                        <Clock className="w-5 h-5 text-primary-500 mb-1 group-hover:scale-110 transition-transform" />
                        <p className="text-xl sm:text-2xl font-black tabular-nums">
                          {progress.completedCourses.length}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 truncate max-w-full">
                          Completed
                        </p>
                      </div>

                      <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <BookOpen className="w-5 h-5 text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
                        <p className="text-xl sm:text-2xl font-black tabular-nums">
                          {progress.bookmarks.length}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 truncate max-w-full">
                          Bookmarks
                        </p>
                      </div>

                      <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        <Trophy className="w-5 h-5 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                        <p className="text-xl sm:text-2xl font-black tabular-nums">
                          {unlockedCount}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 truncate max-w-full">
                          Trophies
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 mt-4">
                    <span>Study target: {auth.user?.examPreference?.dailyGoal ?? 15} mins/day</span>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
                    >
                      Configure Target <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Quick Achievements Preview */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <Award className="w-5 h-5 text-amber-500" />
                    Achievements Overview
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                      {unlockedCount} / {achievements.length} Unlocked
                    </span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('achievements')}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {achievements.slice(0, 4).map(ach => (
                    <div
                      key={ach.id}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center"
                    >
                      <div className="text-3xl mb-2">{ach.icon}</div>
                      <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate w-full">
                        {ach.name}
                      </p>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest mt-2 px-2 py-0.5 rounded-md ${
                          ach.unlocked_at || ach.unlocked
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                        }`}
                      >
                        {ach.unlocked_at || ach.unlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* TAB 2: ACTIVITY & PROGRESS */}
        {activeTab === 'activity' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70">
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Completed Curriculum & Modules
              </h3>

              {progress.completedCourses.length > 0 ? (
                <div className="space-y-3">
                  {progress.completedCourses.map((courseId, idx) => (
                    <div
                      key={courseId}
                      className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                            {courseId.replace(/[-_]/g, ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">Curriculum Module Mastered</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase">
                        100% Completed
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">No completed modules yet.</p>
                  <Button
                    onClick={() => navigate('/library')}
                    className="mt-4 rounded-xl text-xs font-bold"
                  >
                    Explore Library
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70">
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-rose-500" />
                Streak & Momentum Analytics
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {statsData?.current_streak ?? 0} Days Active Streak
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your longest streak reached {statsData?.longest_streak ?? 0} consecutive days.
                    Consistency fuels exponential retention!
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/tests-a')}
                  className="rounded-xl px-6 font-bold text-xs bg-rose-600 hover:bg-rose-700 min-h-[44px]"
                >
                  Continue Daily Challenge
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* TAB 3: ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-500" />
                    Achievements Catalog
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 px-3 py-0.5 rounded-lg text-xs font-bold">
                      {unlockedCount} / {achievements.length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Badges unlocked through assessment benchmarks, streaks, and problem-solving
                    milestones.
                  </p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search badges..."
                      value={achievementSearch}
                      onChange={e => setAchievementSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-0.5">
                    {(['all', 'unlocked', 'locked'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setAchievementFilter(tab)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors capitalize ${
                          achievementFilter === tab
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isAchievementsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Skeleton key={i} className="h-36 rounded-2xl" />
                  ))}
                </div>
              ) : filteredAchievements.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredAchievements.map((ach: Achievement) => {
                    const isUnlocked = Boolean(ach.unlocked_at || ach.unlocked)
                    return (
                      <div
                        key={ach.id}
                        className={`p-5 rounded-2xl transition-all duration-200 flex flex-col items-center text-center border ${
                          isUnlocked
                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 shadow-sm hover:shadow-md'
                            : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-200/60 dark:border-gray-800 opacity-60'
                        }`}
                      >
                        <div className="text-4xl mb-3 drop-shadow-sm">{ach.icon}</div>
                        <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 leading-tight">
                          {ach.name}
                        </h4>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 mb-4 flex-1">
                          {ach.description}
                        </p>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-full ${
                            isUnlocked
                              ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-500/20'
                              : 'text-gray-400 bg-gray-100 dark:bg-gray-800'
                          }`}
                        >
                          {isUnlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 font-bold">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No achievements match your search filter.
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* TAB 4: VERIFIABLE CREDENTIALS */}
        {activeTab === 'credentials' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <StudentCredentialsPortfolio />
          </motion.div>
        )}

        {/* TAB 5: SECURITY & ACCOUNT ACCESS */}
        {activeTab === 'security' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <Card className="p-6 sm:p-8 rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-lg bg-white/70 dark:bg-gray-900/70">
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary-500" />
                Account Security & Protection Status
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Overview of authentication methods, credentials, and security health for your
                account.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      Two-Factor Authentication
                    </p>
                    <p className="text-xs text-gray-500">
                      {auth.user?.mfaEnabled ? 'Protected with TOTP code' : 'Not configured'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                      auth.user?.mfaEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}
                  >
                    {auth.user?.mfaEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      Password Protection
                    </p>
                    <p className="text-xs text-gray-500">Encrypted SHA-256 + Argon2</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/settings')}
                    className="text-xs font-bold rounded-xl"
                  >
                    Manage
                  </Button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <Button
                  onClick={() => navigate('/settings')}
                  className="rounded-xl text-xs font-bold px-6 min-h-[44px]"
                >
                  Open Full Security Settings <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
