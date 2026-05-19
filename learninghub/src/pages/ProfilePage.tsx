import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { StatCard } from '../components/ui/StatCard'
import {
  userService,
  type UserProfile,
  type UserStats,
  type Achievement,
  type UpdateProfileData,
} from '../services/userService'

export default function ProfilePage() {
  const { addToast, progress } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const res = await userService.uploadAvatar(file)
      if (profile) {
        setProfile({ ...profile, avatar: res.data.avatar_url })
      }
      addToast({ message: 'Avatar updated!', type: 'success' })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      addToast({ message: 'Failed to upload avatar', type: 'error' })
    } finally {
      setIsUploading(false)
    }
  }

  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [profileRes, statsRes, achievementsRes] = await Promise.all([
        userService.getProfile(),
        userService.getStats(),
        userService.getAchievements(),
      ])
      setProfile(profileRes.data)
      setStats(statsRes.data)
      setAchievements(achievementsRes.data)
      setEditForm(profileRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      if (import.meta.env.DEV) {
        console.error('[ProfilePage] Failed to fetch profile:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchProfileData().then(() => {
      if (controller.signal.aborted) return
    })
    return () => controller.abort()
  }, [fetchProfileData])

  const handleSave = async () => {
    if (!profile) return
    try {
      setIsSaving(true)
      const updateData: UpdateProfileData = {
        display_name: editForm.display_name ?? undefined,
        bio: editForm.bio ?? undefined,
        location: editForm.location ?? undefined,
        website: editForm.website ?? undefined,
      }
      const res = await userService.updateProfile(updateData)
      setProfile(res.data)
      setIsEditing(false)
      addToast({ message: 'Profile updated successfully!', type: 'success' })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      addToast({ message: 'Failed to update profile', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm(profile ?? {})
    setIsEditing(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex flex-wrap gap-4">
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3"
            >
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !profile || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
          {error ?? 'Profile not found'}
        </p>
        <button
          onClick={fetchProfileData}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit2 className="w-4 h-4" />}
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary-500/20"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-4xl md:text-5xl font-bold">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
              {isEditing && (
                <label
                  className="absolute bottom-0 right-0 p-2 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors cursor-pointer"
                  aria-label="Change avatar"
                >
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-1">
                    Username
                  </label>
                  <Input
                    id="username"
                    value={editForm.username}
                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium mb-1">
                    Bio
                  </label>
                  <Input
                    id="bio"
                    value={editForm.bio ?? ''}
                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    leftIcon={<Save className="w-4 h-4" />}
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<X className="w-4 h-4" />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{profile.username}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{profile.bio}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined {formatDate(profile.date_joined)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Trophy}
          label="Completed"
          value={stats.completed_courses}
          color="#f59e0b"
          delay={0}
          animated
        />
        <StatCard
          icon={Award}
          label="Level"
          value={stats.level}
          color="#8b5cf6"
          delay={100}
          animated
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={stats.current_streak}
          color="#ef4444"
          delay={200}
          animated
        />
        <StatCard
          icon={Target}
          label="Total XP"
          value={stats.xp_points}
          color="#10b981"
          delay={300}
          animated
        />
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Level Progress
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>XP to Next Level</span>
            <span>
              {stats.xp_points} / {stats.next_level_xp} XP
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
              style={{
                width: `${stats.next_level_xp > 0 ? (stats.xp_points / stats.next_level_xp) * 100 : 0}%`,
              }}
              role="progressbar"
              aria-valuenow={stats.xp_points}
              aria-valuemin={0}
              aria-valuemax={stats.next_level_xp}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" />
          Achievements ({achievements.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className="p-4 rounded-xl border-2 transition-all bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            >
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <h3 className="font-semibold text-sm">{achievement.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{achievement.description}</p>
              {achievement.unlocked_at && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Unlocked {formatDate(achievement.unlocked_at)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Learning Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Clock className="w-5 h-5 text-primary-500 mb-2" />
            <p className="text-lg font-bold">{progress.completedCourses.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <BookOpen className="w-5 h-5 text-purple-500 mb-2" />
            <p className="text-lg font-bold">{progress.bookmarks.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Bookmarks</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Trophy className="w-5 h-5 text-amber-500 mb-2" />
            <p className="text-lg font-bold">{achievements.filter(a => a.unlocked_at).length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Achievements</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
