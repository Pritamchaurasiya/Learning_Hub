import { useState, useMemo } from 'react'
import {
  Users,
  Calendar,
  Star,
  MessageSquare,
  Video,
  Search,
  BookOpen,
  CheckCircle,
  XCircle,
  Briefcase,
  Zap,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { mentorService } from '../services/mentorService'
import { useStore } from '../stores/useStore'
import { useDebounce } from '../hooks/useDebounce'

const expertiseAreas = [
  'All',
  'Web Development',
  'Mobile Development',
  'Data Science',
  'DevOps',
  'System Design',
]

export default function MentorshipPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [selectedExpertise, setSelectedExpertise] = useState('All')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all')
  const addToast = useStore(state => state.addToast)

  const {
    data: mentors = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['mentors', { availabilityFilter, selectedExpertise }],
    queryFn: async () => {
      const res = await mentorService.getMentors({
        available: availabilityFilter === 'available' ? true : undefined,
        expertise: selectedExpertise !== 'All' ? selectedExpertise : undefined,
      })
      return res.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const filteredMentors = useMemo(() => {
    return mentors.filter(mentor => {
      const matchesSearch =
        debouncedSearch === '' ||
        mentor.user.display_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        mentor.user.username.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        mentor.expertise.some(e => e.toLowerCase().includes(debouncedSearch.toLowerCase()))
      return matchesSearch
    })
  }, [mentors, debouncedSearch])

  const bookSessionMutation = useMutation({
    mutationFn: async (mentorId: string) => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      return mentorService.bookSession({
        mentor_id: mentorId,
        scheduled_at: tomorrow.toISOString(),
        duration_minutes: 60,
        topic: 'General Mentorship & Career Guidance',
      })
    },
    onSuccess: () => {
      addToast({ message: 'Session successfully provisioned!', type: 'success' })
    },
    onError: err => {
      addToast({ message: 'Failed to provision session', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[MentorshipPage] Booking error:', err)
      }
    },
  })

  return (
    <AnimatedPage className="pb-12 pt-4">
      <SEO
        title="Mentorship - LearningHub"
        description="Connect with expert mentors for 1-on-1 guidance"
        keywords="mentorship, coaching, expert guidance"
      />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 text-white p-8 md:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Briefcase className="w-64 h-64 rotate-12 text-primary-500" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest border border-primary-500/30">
              <Zap className="w-4 h-4" /> Career Accelerator
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
              Expert Network
            </h1>
            <p className="text-gray-400 max-w-xl font-medium text-lg leading-relaxed">
              Sync with elite industry veterans for 1-on-1 architecture reviews, career scaling, and
              specialized guidance.
            </p>
          </div>
        </section>

        {/* Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20 -mt-6">
          {[
            {
              icon: Video,
              title: '1-on-1 Sessions',
              desc: 'Secure high-definition video syncs',
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
              border: 'border-blue-100 dark:border-blue-900/50',
            },
            {
              icon: BookOpen,
              title: 'Expert Guidance',
              desc: 'Direct access to senior engineers',
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-900/20',
              border: 'border-emerald-100 dark:border-emerald-900/50',
            },
            {
              icon: Calendar,
              title: 'Dynamic Scheduling',
              desc: 'Automated calendar integration',
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
              border: 'border-purple-100 dark:border-purple-900/50',
            },
          ].map((benefit, i) => (
            <Card
              key={i}
              className="p-6 md:p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900 hover:-translate-y-2 transition-transform duration-300"
            >
              <div
                className={`w-14 h-14 rounded-[1.25rem] ${benefit.bg} ${benefit.border} border flex items-center justify-center mb-6`}
              >
                <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                {benefit.title}
              </h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {benefit.desc}
              </p>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <Card className="p-4 md:p-6 rounded-[2rem] shadow-xl border-none bg-white dark:bg-gray-900">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Query expert database..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium placeholder:text-gray-400 outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
                {expertiseAreas.map(area => (
                  <button
                    key={area}
                    onClick={() => setSelectedExpertise(area)}
                    className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      selectedExpertise === area
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-gray-800/50 px-5 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={availabilityFilter === 'available'}
                  onChange={e => setAvailabilityFilter(e.target.checked ? 'available' : 'all')}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 bg-white border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                  Available Node
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card
                key={i}
                className="p-8 rounded-[2.5rem] border-none shadow-md bg-white dark:bg-gray-900"
              >
                <div className="flex gap-4 mb-6">
                  <Skeleton className="w-16 h-16 rounded-[1.5rem]" />
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex gap-2 pt-4">
                    <Skeleton className="h-12 flex-1 rounded-xl" />
                    <Skeleton className="h-12 flex-1 rounded-xl" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="text-center py-20 bg-gray-50 dark:bg-gray-900 border-none shadow-inner rounded-[2.5rem]">
            <p className="text-rose-500 font-bold">Failed to load expert network.</p>
          </Card>
        )}

        {/* Mentors Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map(mentor => (
              <motion.div
                key={mentor.id}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Card className="p-8 h-full flex flex-col overflow-hidden rounded-[2.5rem] border-none shadow-lg hover:shadow-2xl transition-all duration-500 bg-white dark:bg-gray-900 group">
                  {/* Header */}
                  <div className="flex items-start gap-5 mb-6">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 via-primary-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black flex-shrink-0 shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform duration-500">
                      {(mentor.user.display_name || mentor.user.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white truncate tracking-tight group-hover:text-primary-600 transition-colors">
                        {mentor.user.display_name}
                      </h3>
                      <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mt-1 truncate">
                        {mentor.expertise[0] || 'Senior Engineer'}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${
                            mentor.is_available
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                              : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                          }`}
                        >
                          {mentor.is_available ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {mentor.is_available ? 'Available' : 'Busy'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                      {mentor.expertise.slice(0, 3).map(exp => (
                        <span
                          key={exp}
                          className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 line-clamp-3 mb-6 leading-relaxed flex-1">
                    {mentor.bio}
                  </p>

                  <div className="mt-auto space-y-6">
                    {/* Stats & Price */}
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[1.25rem]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div>
                          <span className="font-black text-sm text-gray-900 dark:text-white tabular-nums">
                            {mentor.rating}
                          </span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            ({mentor.total_reviews})
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                          ${mentor.hourly_rate}
                        </span>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          /HR
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] py-4 shadow-lg shadow-primary-500/20"
                        disabled={
                          !mentor.is_available ||
                          (bookSessionMutation.isPending &&
                            bookSessionMutation.variables === mentor.id)
                        }
                        onClick={() => bookSessionMutation.mutate(mentor.id)}
                      >
                        {bookSessionMutation.isPending &&
                        bookSessionMutation.variables === mentor.id
                          ? 'Provisioning...'
                          : 'Provision Sync'}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl px-4 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredMentors.length === 0 && (
          <Card className="text-center py-20 bg-gray-50 dark:bg-gray-900 border-none shadow-inner rounded-[2.5rem]">
            <div className="w-24 h-24 rounded-[1.5rem] bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
              No Experts Found
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Adjust search parameters to find available nodes.
            </p>
          </Card>
        )}
      </div>
    </AnimatedPage>
  )
}
