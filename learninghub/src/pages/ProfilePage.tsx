import { useState } from 'react'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { StatCard } from '../components/ui/StatCard'
import { Skeleton } from '../components/ui/Skeleton'
import { userService, type UserProfile, type UpdateProfileData } from '../services/userService'
import { motion } from 'framer-motion'

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
}

export default function ProfilePage() {
  const addToast = useStore(state => state.addToast)
  const progress = useStore(state => state.progress)
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})

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
      // Pass other fields if the backend accepts them, e.g., username
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
      <div className="max-w-4xl mx-auto space-y-6 pt-4">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Card className="p-8 border-none shadow-lg rounded-2xl">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <div className="flex gap-4 mt-6">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-6 w-40 rounded-lg" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (isProfileError || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-6 drop-shadow-lg" />
        <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-6">
          Failed to load user profile
        </p>
        <Button
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => refetchProfile()}
          className="bg-primary-600 hover:bg-primary-700 rounded-xl px-8"
        >
          Retry
        </Button>
      </div>
    )
  }

  const achievements = achievementsData ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Profile
        </h1>
        {!isEditing && (
          <Button
            variant="outline"
            leftIcon={<Edit2 className="w-4 h-4" />}
            onClick={handleEditStart}
            className="rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Edit Profile
          </Button>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-8 border border-white/20 dark:border-gray-800/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl rounded-3xl bg-white/70 dark:bg-gray-900/70 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary-600/20 to-purple-600/20" />
            <div className="flex flex-col md:flex-row gap-8 relative z-10 pt-4">
              <div className="flex flex-col items-center shrink-0">
                <div className="relative group">
                  {profileData.avatar ? (
                    <img
                      src={profileData.avatar}
                      alt={profileData.username}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-xl"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-5xl font-black border-4 border-white dark:border-gray-900 shadow-xl">
                      {profileData.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isEditing && (
                    <label
                      className="absolute bottom-0 right-0 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:scale-110 transition-all cursor-pointer ring-4 ring-white dark:ring-gray-900"
                      aria-label="Change avatar"
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
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <div className="space-y-5 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl">
                    <div>
                      <label
                        htmlFor="username"
                        className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2"
                      >
                        Username
                      </label>
                      <Input
                        id="username"
                        value={editForm.username ?? ''}
                        onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                        className="bg-white dark:bg-gray-900 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email ?? ''}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="bg-white dark:bg-gray-900 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="bio"
                        className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2"
                      >
                        Bio
                      </label>
                      <Input
                        id="bio"
                        value={editForm.bio ?? ''}
                        onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                        className="bg-white dark:bg-gray-900 rounded-xl"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        leftIcon={<Save className="w-4 h-4" />}
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        className="rounded-xl px-6"
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={<X className="w-4 h-4" />}
                        onClick={handleCancel}
                        className="rounded-xl px-6 bg-white dark:bg-gray-900"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 pt-2">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        {profileData.username}
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 text-xs font-black rounded-lg uppercase tracking-widest">
                          {'Learner'}
                        </span>
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                        {profileData.bio ?? 'Passionate about learning and growing.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm font-bold text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl max-w-full">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{profileData.email}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Joined {formatDate(profileData.date_joined)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isStatsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} className="h-32 rounded-2xl" />
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
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center text-gray-400 font-bold"
              >
                N/A
              </div>
            ))
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="p-8 border border-white/20 dark:border-gray-800/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl rounded-3xl bg-white/70 dark:bg-gray-900/70">
              <h2 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Target className="w-5 h-5 text-primary-500" />
                Level Progress
              </h2>
              {isStatsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full rounded-full" />
                </div>
              ) : statsData ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-500">XP to Next Level</span>
                    <span className="text-primary-600">
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
                </div>
              ) : (
                <div className="text-gray-400 font-bold">No progress data.</div>
              )}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-8 border border-white/20 dark:border-gray-800/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl rounded-3xl bg-white/70 dark:bg-gray-900/70">
              <h2 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Learning Stats
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                  <Clock className="w-6 h-6 text-primary-500 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-black tabular-nums">
                    {progress.completedCourses.length}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Completed
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <BookOpen className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-black tabular-nums">{progress.bookmarks.length}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Bookmarks
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  <Trophy className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-black tabular-nums">
                    {achievements.filter(a => a.unlocked_at).length}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Trophies
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <Card className="p-8 border border-white/20 dark:border-gray-800/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl rounded-3xl bg-white/70 dark:bg-gray-900/70">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Award className="w-5 h-5 text-amber-500" />
              Achievements{' '}
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 px-2 py-0.5 rounded-md text-sm">
                {achievements.length}
              </span>
            </h2>
            {isAchievementsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : achievements.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className="p-5 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center text-center"
                  >
                    <div className="text-4xl mb-3 drop-shadow-sm">{achievement.icon}</div>
                    <h3 className="font-black text-sm text-gray-800 dark:text-gray-200">
                      {achievement.name}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 mb-3 flex-1">
                      {achievement.description}
                    </p>
                    {achievement.unlocked_at ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md w-full">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md w-full">
                        Locked
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 font-bold">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
                No achievements unlocked yet. Keep learning!
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
