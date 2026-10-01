import { useState, useEffect, useCallback } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  BookOpen,
  Clock,
  Star,
  ChevronRight,
  AlertCircle,
  Book,
  FileText,
  Video,
  Sparkles,
  Layers,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { libraryService, type Course } from '../services/libraryService'
import { ebookService } from '../services/ebookService'
import type { EbookMetadata } from '../types/ebook'

const categories = [
  'All',
  'Web Development',
  'Data Science',
  'Computer Science',
  'Cloud Computing',
  'Mobile Development',
]

const REVISION_KITS = [
  {
    id: 'kit-dsa-matrix',
    title: 'DSA & Big-O Complexity Master Reference',
    category: 'Computer Science',
    fileSize: '4.2 MB',
    pages: 32,
    description: 'Time & Space complexities for 25+ sorting, tree, graph, and DP patterns.',
  },
  {
    id: 'kit-math-formulas',
    title: 'Calculus, Vectors & Algebra Formula Handbook',
    category: 'Data Science',
    fileSize: '6.8 MB',
    pages: 48,
    description: 'High-yield calculus derivatives, integrals, and linear algebra transformations.',
  },
  {
    id: 'kit-system-design',
    title: 'System Design & Scalability Architecture Primer',
    category: 'Cloud Computing',
    fileSize: '8.5 MB',
    pages: 64,
    description: 'Caching hierarchies, message brokers, load balancing, and consensus protocols.',
  },
]

export default function LibraryPage() {
  useDocumentTitle('Knowledge & Ebook Library')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as 'courses' | 'ebooks' | 'revision-kits' | null
  const [activeTab, setActiveTab] = useState<'courses' | 'ebooks' | 'revision-kits'>(() => {
    if (tabParam && ['courses', 'ebooks', 'revision-kits'].includes(tabParam)) {
      return tabParam
    }
    return 'courses'
  })
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [courses, setCourses] = useState<Course[]>([])
  const [ebooks, setEbooks] = useState<EbookMetadata[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tab = searchParams.get('tab') as 'courses' | 'ebooks' | 'revision-kits' | null
    if (tab && ['courses', 'ebooks', 'revision-kits'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab)
    }
    const search = searchParams.get('search')
    if (search !== null && search !== searchQuery) {
      setSearchQuery(search)
    }
  }, [searchParams])

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setError(null)

        if (activeTab === 'courses') {
          const response = await libraryService.getCourses({
            category: selectedCategory === 'All' ? undefined : selectedCategory,
            search: searchQuery || undefined,
          })
          if (!signal?.aborted) setCourses(response.data)
        } else if (activeTab === 'ebooks') {
          const books = await ebookService.getEbooks({
            category: selectedCategory === 'All' ? undefined : selectedCategory,
            search: searchQuery || undefined,
          })
          if (!signal?.aborted) setEbooks(books)
        }
      } catch (err) {
        if (signal?.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load content')
      }
    },
    [activeTab, selectedCategory, searchQuery]
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  return (
    <AnimatedPage className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        title="Knowledge Library & Interactive Ebooks - LearningHub"
        description="Explore video masterclasses, interactive textbooks, and revision sheets."
      />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            Knowledge & Study Library
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Access curated video courses, interactive digital textbooks with AI tutors, and
            high-yield revision kits.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'courses'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Video Courses</span>
          </button>

          <button
            onClick={() => setActiveTab('ebooks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'ebooks'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Book className="w-4 h-4" />
            <span>Interactive Ebooks</span>
          </button>

          <button
            onClick={() => setActiveTab('revision-kits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'revision-kits'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Revision Kits</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={`Search ${activeTab === 'courses' ? 'courses' : activeTab === 'ebooks' ? 'interactive textbooks' : 'revision kits'}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              fullWidth
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <Card className="p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            Retry
          </Button>
        </Card>
      )}

      {/* TAB 1: COURSES */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card
              key={course.id}
              hover
              className="overflow-hidden cursor-pointer flex flex-col justify-between"
              onClick={() => navigate(`/course/${course.id}`)}
            >
              <div>
                <div className="aspect-video bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-white/80" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {course.category?.name || 'Computer Science'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500">
                      {course.level}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {course.description}
                  </p>
                </div>
              </div>
              <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 mt-2">
                <span className="text-xs font-bold text-gray-400">{course.duration}</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  View Course <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: INTERACTIVE EBOOKS */}
      {activeTab === 'ebooks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ebooks.map(ebook => (
            <Card
              key={ebook.id}
              hover
              className="overflow-hidden flex flex-col justify-between border-indigo-500/20 hover:border-indigo-500/50 transition-all shadow-md group"
            >
              <div>
                <div className="h-48 relative overflow-hidden bg-slate-900">
                  <img
                    src={ebook.coverUrl}
                    alt={ebook.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-indigo-600/90 backdrop-blur text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Interactive
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                      {ebook.category} · {ebook.difficulty}
                    </span>
                    <h3 className="font-black text-sm leading-snug truncate">{ebook.title}</h3>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {ebook.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{ebook.totalChapters} Chapters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{ebook.estimatedReadingTimeMins} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{ebook.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => navigate(`/ebook/${ebook.id}`)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Interactive Reader</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: REVISION KITS */}
      {activeTab === 'revision-kits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVISION_KITS.map(kit => (
            <Card key={kit.id} hover className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  {kit.category}
                </span>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{kit.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {kit.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold pt-1">
                  <span>{kit.pages} Pages</span>
                  <span>·</span>
                  <span>{kit.fileSize}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/downloads')}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Save for Offline Study</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </AnimatedPage>
  )
}
