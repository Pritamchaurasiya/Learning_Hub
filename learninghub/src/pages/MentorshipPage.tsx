import { useState, useEffect, useCallback } from 'react'
import { Users, Calendar, Star, MessageSquare, Video, Search, Award, BookOpen } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { mentorService, type Mentor } from '../services/mentorService'
import { useStore } from '../stores/useStore'

const expertiseAreas = ['All', 'Web Development', 'Mobile Development', 'Data Science', 'DevOps', 'System Design']

export default function MentorshipPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpertise, setSelectedExpertise] = useState('All')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all')

  const fetchMentors = useCallback(async () => {
    try {
      const res = await mentorService.getMentors({
        available: availabilityFilter === 'available' ? true : undefined,
        expertise: selectedExpertise !== 'All' ? selectedExpertise : undefined
      })
      setMentors(res.data)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[MentorshipPage] Failed to fetch mentors:', err);
      }
    }
  }, [availabilityFilter, selectedExpertise])

  useEffect(() => {
    const controller = new AbortController()
    fetchMentors().then(() => { 
      if (controller.signal.aborted) return 
    })
    return () => controller.abort()
  }, [fetchMentors])

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = searchQuery === '' ||
      mentor.user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const { addToast } = useStore()
  const [isBooking, setIsBooking] = useState<string | null>(null)

  const bookSession = async (mentorId: string) => {
    if (!mentorId) return
    setIsBooking(mentorId)
    
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      await mentorService.bookSession({
        mentor_id: mentorId,
        scheduled_at: tomorrow.toISOString(),
        duration_minutes: 60,
        topic: 'General Mentorship & Career Guidance'
      })
      
      addToast({ message: 'Session booked successfully!', type: 'success' })
    } catch (err) {
      addToast({ message: 'Failed to book session', type: 'error' })
      if (import.meta.env.DEV) {
        console.error('[MentorshipPage] Booking error:', err);
      }
    } finally {
      setIsBooking(null)
    }
  }

  const getAvailabilityColor = (isAvailable: boolean) => {
    return isAvailable ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  return (
    <>
      <SEO
        title="Mentorship - LearningHub"
        description="Connect with expert mentors for 1-on-1 guidance"
        keywords="mentorship, coaching, expert guidance"
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Find a Mentor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with industry experts for personalized guidance
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search mentors by name or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                fullWidth
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {expertiseAreas.map(area => (
                <button
                  key={area}
                  onClick={() => setSelectedExpertise(area)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedExpertise === area
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availabilityFilter === 'available'}
                onChange={(e) => setAvailabilityFilter(e.target.checked ? 'available' : 'all')}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Available now</span>
            </label>
          </div>
        </Card>

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map(mentor => (
            <Card key={mentor.id} hover className="overflow-hidden">
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {mentor.user.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {mentor.user.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {mentor.expertise[0] || 'Mentor'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getAvailabilityColor(mentor.is_available)}`}>
                        {mentor.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expertise */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expertise
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mentor.expertise.slice(0, 3).map(exp => (
                      <span
                        key={exp}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{mentor.rating}</span>
                    <span>({mentor.total_reviews})</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                  {mentor.bio}
                </p>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${mentor.hourly_rate}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">/hour</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!mentor.is_available}
                    isLoading={isBooking === mentor.id}
                    onClick={() => bookSession(mentor.id)}
                  >
                    Book Session
                  </Button>
                  <Button variant="outline" leftIcon={<MessageSquare className="w-4 h-4" />}>
                    Message
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No Mentors */}
        {filteredMentors.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No mentors found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Benefits Section */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Why get a mentor?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">1-on-1 Sessions</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Personalized video calls</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Expert Guidance</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Learn from industry pros</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Flexible Scheduling</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Book at your convenience</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
