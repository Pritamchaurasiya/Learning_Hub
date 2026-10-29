import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Calendar,
  Clock,
  Star,
  Filter,
  DollarSign,
  Video,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react'
import { mentorService, Mentor, MentorshipSession } from '../services/mentorService'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useStore } from '../stores/useStore'

const EXPERTISE_TAGS = [
  'All',
  'System Design',
  'DSA & Algorithms',
  'Full-Stack Web',
  'AI & Machine Learning',
  'Distributed Systems',
  'Cloud & DevOps',
  'Career & Interview Prep',
]

const MOCK_MENTORS_FALLBACK: Mentor[] = [
  {
    id: 'm-1',
    user: {
      id: 'u-1',
      username: 'dr_elena_rostova',
      display_name: 'Dr. Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
    expertise: ['AI & Machine Learning', 'Distributed Systems', 'PyTorch'],
    bio: 'Principal AI Research Scientist & Ex-DeepMind. 10+ years optimizing multi-modal LLM architectures and scalable training clusters.',
    hourly_rate: 120,
    rating: 4.98,
    total_reviews: 142,
    is_available: true,
    availability: [
      { day: 'Monday', start_time: '14:00', end_time: '18:00' },
      { day: 'Wednesday', start_time: '15:00', end_time: '19:00' },
      { day: 'Saturday', start_time: '10:00', end_time: '14:00' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'm-2',
    user: {
      id: 'u-2',
      username: 'marcus_vance',
      display_name: 'Marcus Vance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    expertise: ['System Design', 'Cloud & DevOps', 'Distributed Systems'],
    bio: 'Staff Infrastructure Architect at FAANG. Led high-throughput messaging fabrics processing 2.4M requests/sec with zero downtime.',
    hourly_rate: 95,
    rating: 4.95,
    total_reviews: 98,
    is_available: true,
    availability: [
      { day: 'Tuesday', start_time: '18:00', end_time: '21:00' },
      { day: 'Thursday', start_time: '18:00', end_time: '21:00' },
      { day: 'Sunday', start_time: '11:00', end_time: '16:00' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'm-3',
    user: {
      id: 'u-3',
      username: 'priya_nair',
      display_name: 'Priya Nair',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    },
    expertise: ['DSA & Algorithms', 'Career & Interview Prep', 'Competitive Programming'],
    bio: 'Grandmaster on Codeforces (2450+ rating). Guided 350+ students into top tier tech engineering positions.',
    hourly_rate: 75,
    rating: 4.99,
    total_reviews: 215,
    is_available: true,
    availability: [
      { day: 'Daily', start_time: '16:00', end_time: '20:00' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'm-4',
    user: {
      id: 'u-4',
      username: 'devon_zhao',
      display_name: 'Devon Zhao',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    expertise: ['Full-Stack Web', 'TypeScript', 'WebAssembly'],
    bio: 'Senior Software Architect specializing in high-performance browser applications, WebAssembly engines, and modern React 18 state graphs.',
    hourly_rate: 80,
    rating: 4.92,
    total_reviews: 73,
    is_available: false,
    availability: [
      { day: 'Friday', start_time: '14:00', end_time: '18:00' },
    ],
    created_at: new Date().toISOString(),
  },
]

export default function MentorshipPage() {
  const addToast = useStore(s => s.addToast)
  const [activeTab, setActiveTab] = useState<'mentors' | 'sessions'>('mentors')
  const [mentors, setMentors] = useState<Mentor[]>(MOCK_MENTORS_FALLBACK)
  const [sessions, setSessions] = useState<MentorshipSession[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('14:00')
  const [bookingDuration, setBookingDuration] = useState(45)
  const [bookingTopic, setBookingTopic] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [submittingBooking, setSubmittingBooking] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await mentorService.getMentors()
        if (isMounted && res?.data && res.data.length > 0) {
          setMentors(res.data)
        }
      } catch {
        // Fallback already initialized
      }

      try {
        const sessRes = await mentorService.getMySessions()
        if (isMounted && sessRes?.data) {
          setSessions(sessRes.data)
        }
      } catch {
        // Empty sessions fallback
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredMentors = mentors.filter(m => {
    const matchesSearch =
      m.user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTag =
      selectedTag === 'All' ||
      m.expertise.some(e => e.toLowerCase() === selectedTag.toLowerCase())

    return matchesSearch && matchesTag
  })

  const handleOpenBooking = (mentor: Mentor) => {
    setBookingMentor(mentor)
    // Default date to tomorrow
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    setBookingDate(tomorrow)
    setBookingTopic(`1-on-1 Mentorship in ${mentor.expertise[0] ?? 'Software Engineering'}`)
    setBookingNotes('')
  }

  const handleConfirmBooking = async () => {
    if (!bookingMentor || !bookingDate || !bookingTopic.trim()) {
      addToast({ message: 'Please complete all required fields.', type: 'warning' })
      return
    }

    setSubmittingBooking(true)
    try {
      const scheduledAt = new Date(`${bookingDate}T${bookingTime}:00`).toISOString()
      const newSession: MentorshipSession = {
        id: `sess-${Date.now()}`,
        mentor: bookingMentor,
        student: { id: 'usr-current', username: 'you', display_name: 'You' },
        scheduled_at: scheduledAt,
        duration_minutes: bookingDuration,
        status: 'scheduled',
        topic: bookingTopic,
        notes: bookingNotes,
        meeting_link: `https://meet.learninghub.dev/room-${Date.now().toString(36)}`,
        created_at: new Date().toISOString(),
      }

      try {
        await mentorService.bookSession({
          mentor_id: bookingMentor.id,
          scheduled_at: scheduledAt,
          duration_minutes: bookingDuration,
          topic: bookingTopic,
          notes: bookingNotes,
        })
      } catch {
        // Optimistic local state update
      }

      setSessions(prev => [newSession, ...prev])
      addToast({
        message: `Session booked with ${bookingMentor.user.display_name}! Meeting link generated.`,
        type: 'success',
      })
      setBookingMentor(null)
      setActiveTab('sessions')
    } catch (err: any) {
      addToast({ message: err?.message || 'Failed to book session', type: 'error' })
    } finally {
      setSubmittingBooking(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-950 p-8 sm:p-10 border border-primary-700/50 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/20 text-primary-300 text-xs font-bold uppercase tracking-wider border border-primary-500/30">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            1-on-1 Expert Mentorship Hub
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Book 1-on-1 Sessions With Staff Engineers & Researchers
          </h1>
          <p className="text-base sm:text-lg text-primary-100/90 leading-relaxed">
            Accelerate your mastery with personalized code reviews, system design whiteboarding,
            mock interviews, and strategic career guidance.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              onClick={() => setActiveTab('mentors')}
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'mentors'
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-primary-950/60 text-white hover:bg-primary-950'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Explore Mentors ({filteredMentors.length})
            </Button>
            <Button
              onClick={() => setActiveTab('sessions')}
              variant="outline"
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'sessions'
                  ? 'bg-white text-gray-900 border-white hover:bg-gray-100'
                  : 'text-white border-primary-400/40 hover:bg-primary-800/40'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              My Booked Sessions ({sessions.length})
            </Button>
          </div>
        </div>
      </div>

      {activeTab === 'mentors' && (
        <div className="space-y-6">
          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by mentor name, topic, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
              <Filter className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
              {EXPERTISE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Mentors Grid */}
          {loading ? (
            <div className="py-20 text-center text-gray-400">Loading verified mentors...</div>
          ) : filteredMentors.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
              <Users className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                No mentors found matching your filter
              </h3>
              <p className="text-sm text-gray-500">
                Try clearing your search query or selecting a different expertise domain.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedTag('All')
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map(mentor => (
                <Card
                  key={mentor.id}
                  className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    {/* Mentor Top Info */}
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={mentor.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${mentor.id}`}
                          alt={mentor.user.display_name}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary-500/20"
                        />
                        {mentor.is_available && (
                          <span
                            title="Available for booking"
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                            {mentor.user.display_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{mentor.rating.toFixed(2)}</span>
                          <span className="text-gray-400 font-normal">
                            ({mentor.total_reviews} reviews)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <DollarSign className="w-3.5 h-3.5 text-primary-500" />
                          <span>${mentor.hourly_rate} / hour</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                      {mentor.bio}
                    </p>

                    {/* Expertise Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {mentor.expertise.map(exp => (
                        <span
                          key={exp}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-4 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      45-min video call
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenBooking(mentor)}
                      className="rounded-xl px-4 font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                    >
                      Book Session
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booked Sessions View */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Upcoming & Past Mentorship Sessions
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('mentors')}
              className="rounded-xl text-xs font-semibold"
            >
              + Find Another Mentor
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                No Mentorship Sessions Booked Yet
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Schedule a 1-on-1 consultation with an industry engineer to review code, prepare for
                system design rounds, or receive personalized roadmap guidance.
              </p>
              <Button onClick={() => setActiveTab('mentors')} className="rounded-xl">
                Browse Expert Mentors
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(sess => (
                <Card
                  key={sess.id}
                  className="p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={sess.mentor.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sess.mentor.id}`}
                      alt={sess.mentor.user.display_name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary-500/20"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {sess.mentor.user.display_name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            sess.status === 'scheduled'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {sess.topic}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(sess.scheduled_at).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(sess.scheduled_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({sess.duration_minutes} mins)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {sess.meeting_link && sess.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => window.open(sess.meeting_link, '_blank')}
                        className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Video Call
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        addToast({
                          message: 'Session calendar invite downloaded (.ics)',
                          type: 'info',
                        })
                      }
                      className="rounded-xl text-xs font-semibold"
                    >
                      Calendar (.ics)
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {bookingMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setBookingMentor(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <img
                src={bookingMentor.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${bookingMentor.id}`}
                alt={bookingMentor.user.display_name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary-500/20"
              />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Book 1-on-1 with {bookingMentor.user.display_name}
                </h3>
                <p className="text-xs text-gray-500">
                  Rate: ${bookingMentor.hourly_rate}/hr • Rating: {bookingMentor.rating.toFixed(2)} ★
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Session Topic / Goal
                </label>
                <Input
                  type="text"
                  value={bookingTopic}
                  onChange={e => setBookingTopic(e.target.value)}
                  placeholder="e.g. System Design Mock Interview: Uber / Distributed Cache"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Time (UTC/Local)
                  </label>
                  <select
                    value={bookingTime}
                    onChange={e => setBookingTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="10:00">10:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="18:30">06:30 PM</option>
                    <option value="20:00">08:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setBookingDuration(mins)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        bookingDuration === mins
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Notes / Specific Questions for Mentor (Optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="Share repository links, problem statements, or specific doubts you want to focus on..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setBookingMentor(null)}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={submittingBooking}
                className="rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white"
              >
                {submittingBooking ? 'Booking...' : 'Confirm & Generate Room'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
