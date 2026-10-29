import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Plus,
  Radio,
  Filter,
  Globe,
  X,
} from 'lucide-react'
import { studyGroupService, StudyGroup } from '../services/studyGroupService'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useStore } from '../stores/useStore'

const CATEGORIES = [
  'All',
  'DSA',
  'System Design',
  'AI & ML',
  'Competitive Programming',
  'Web3',
  'General',
]

export default function StudyGroupsPage() {
  const addToast = useStore(s => s.addToast)
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState<StudyGroup['category']>('DSA')
  const [newExam, setNewExam] = useState('')
  const [newTopics, setNewTopics] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const data = await studyGroupService.getGroups({
          category: selectedCategory,
          query: searchQuery,
        })
        if (isMounted) setGroups(data)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [selectedCategory, searchQuery])

  const handleToggleJoin = async (group: StudyGroup) => {
    try {
      if (group.isJoined) {
        const updated = await studyGroupService.leaveGroup(group.id)
        setGroups(prev => prev.map(g => (g.id === group.id ? updated : g)))
        addToast({ message: `Left "${group.name}".`, type: 'info' })
      } else {
        const updated = await studyGroupService.joinGroup(group.id)
        setGroups(prev => prev.map(g => (g.id === group.id ? updated : g)))
        addToast({ message: `Joined "${group.name}"! Welcome to the group.`, type: 'success' })
      }
    } catch (err: any) {
      addToast({ message: err?.message || 'Action failed', type: 'error' })
    }
  }

  const handleCreateGroup = async () => {
    if (!newName.trim() || !newDesc.trim()) {
      addToast({ message: 'Please enter a group name and description.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      const created = await studyGroupService.createGroup({
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        examTarget: newExam.trim() || 'General Engineering',
        maxMembers: 150,
        isPrivate: false,
        createdBy: 'You',
        topics: newTopics.split(',').map(t => t.trim()).filter(Boolean),
      })
      setGroups(prev => [created, ...prev])
      addToast({ message: `Study Group "${created.name}" created successfully!`, type: 'success' })
      setIsCreateOpen(false)
      setNewName('')
      setNewDesc('')
      setNewTopics('')
    } catch (err: any) {
      addToast({ message: err?.message || 'Failed to create group', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayedGroups = activeTab === 'my' ? groups.filter(g => g.isJoined) : groups

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-950 p-8 sm:p-10 border border-indigo-800/40 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            Live Collaborative Study Rooms
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Peer Study Groups & Sprint Pods
          </h1>
          <p className="text-base sm:text-lg text-blue-100/90 leading-relaxed">
            Collaborate in focused, topic-based study groups. Share algorithm visualizer states,
            compete on daily problem sets, and prepare together.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              onClick={() => setActiveTab('all')}
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-indigo-950/60 text-white hover:bg-indigo-950'
              }`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Discover Groups ({groups.length})
            </Button>
            <Button
              onClick={() => setActiveTab('my')}
              variant="outline"
              className={`rounded-xl px-5 py-2.5 font-bold ${
                activeTab === 'my'
                  ? 'bg-white text-gray-900 border-white hover:bg-gray-100'
                  : 'text-white border-indigo-400/40 hover:bg-indigo-800/40'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              My Joined Groups ({groups.filter(g => g.isJoined).length})
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl px-5 py-2.5 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Study Group
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search groups by topic, name, or exam..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <Filter className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading study groups...</div>
      ) : displayedGroups.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
          <Users className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            No Study Groups Found
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {activeTab === 'my'
              ? 'You haven’t joined any study groups yet. Switch to "Discover Groups" to explore collaborative rooms.'
              : 'Try relaxing your search terms or create the first study group in this domain!'}
          </p>
          {activeTab === 'my' ? (
            <Button onClick={() => setActiveTab('all')} className="rounded-xl">
              Browse All Groups
            </Button>
          ) : (
            <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl">
              Create New Group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedGroups.map(group => (
            <Card
              key={group.id}
              className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    {group.category}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    {group.memberCount} / {group.maxMembers} members
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {group.name}
                  </h3>
                  {group.examTarget && (
                    <span className="text-[11px] text-blue-500 font-semibold block mt-0.5">
                      Target: {group.examTarget}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {group.description}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {group.topics.map(t => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {group.recentActivity}
                </span>

                <Button
                  size="sm"
                  onClick={() => handleToggleJoin(group)}
                  variant={group.isJoined ? 'outline' : 'primary'}
                  className={`rounded-xl px-4 font-bold text-xs ${
                    group.isJoined
                      ? 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {group.isJoined ? 'Leave Group' : 'Join Room'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                New Study Group
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                Create a Collaborative Study Pod
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Group Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Distributed Consensus & Raft Lab"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Domain Category
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DSA">DSA</option>
                  <option value="System Design">System Design</option>
                  <option value="AI & ML">AI & Machine Learning</option>
                  <option value="Competitive Programming">Competitive Programming</option>
                  <option value="Web3">Web3</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Exam or Goal Target (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. FAANG Staff Interview, GATE CS 2026, JEE Advanced"
                  value={newExam}
                  onChange={e => setNewExam(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Focus Topics (comma separated)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dynamic Programming, Trie, Two Pointers"
                  value={newTopics}
                  onChange={e => setNewTopics(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Describe your study objectives, schedule, and expectations..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={isSubmitting}
                className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Creating...' : 'Launch Group'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
