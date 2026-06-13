import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService, Course } from '../services/adminService'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit2,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useStore } from '../stores/useStore'

export default function AdminCoursesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const queryClient = useQueryClient()
  const addToast = useStore(state => state.addToast)
  const limit = 10

  const { data, isLoading } = useQuery<{
    status: string
    data: Course[]
    pagination?: { page: number; limit: number; total: number; totalPages: number }
  }>({
    queryKey: ['admin', 'courses', page, debouncedSearch, status],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) }
      if (debouncedSearch) params.search = debouncedSearch
      if (status) params.status = status
      return adminService.getCourses(params)
    },
  })

  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, updates }: { courseId: string; updates: Partial<Course> }) =>
      adminService.updateCourse(courseId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      addToast({ message: 'Course updated', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to update course', type: 'error' })
    },
  })

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => adminService.deleteCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      addToast({ message: 'Course deleted successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to delete course', type: 'error' })
    },
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setTimeout(() => {
      setDebouncedSearch(e.target.value)
      setPage(1)
    }, 500)
  }

  const courses: Course[] = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                <span className="p-2 bg-green-100 text-green-600 rounded-xl dark:bg-green-900/30 dark:text-green-400">
                  <BookOpen className="w-8 h-8" />
                </span>
                Course Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                Create, update, and manage all courses in the catalog
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <select
                value={status}
                onChange={e => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-shadow shadow-sm"
                />
              </div>
              <button className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl font-bold transition-colors w-full sm:w-auto shadow-sm">
                <Plus className="w-5 h-5" />
                New Course
              </button>
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-bold">Course</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Enrollments</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                        Loading courses...
                      </td>
                    </tr>
                  ) : courses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No courses found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    courses.map(course => (
                      <tr
                        key={course.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {course.thumbnail ? (
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-16 h-10 object-cover rounded-lg bg-gray-100"
                              />
                            ) : (
                              <div className="w-16 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white line-clamp-1 max-w-[200px] sm:max-w-sm">
                                {course.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {course.level} • {course.price ? `$${course.price}` : 'Free'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{course.category}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1 w-max ${
                              course.status === 'published'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : course.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {course.status === 'published' ? (
                              <Globe className="w-3 h-3" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                            {course.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {course.enrolledCount?.toLocaleString() ?? 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const newStatus =
                                  course.status === 'published' ? 'draft' : 'published'
                                updateCourseMutation.mutate({
                                  courseId: course.id,
                                  // In adminService, we pass isPublished for boolean toggle
                                  updates: { isPublished: newStatus === 'published' } as any,
                                })
                              }}
                              title={course.status === 'published' ? 'Unpublish' : 'Publish'}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            >
                              <Globe className="w-5 h-5" />
                            </button>
                            <button
                              title="Edit Course"
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  // eslint-disable-next-line no-alert
                                  window.confirm(
                                    'Are you sure you want to delete this course? This action cannot be undone.'
                                  )
                                ) {
                                  deleteCourseMutation.mutate(course.id)
                                }
                              }}
                              title="Delete Course"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing page{' '}
                <span className="font-bold text-gray-900 dark:text-white">{pagination.page}</span>{' '}
                of{' '}
                <span className="font-bold text-gray-900 dark:text-white">
                  {pagination.totalPages}
                </span>{' '}
                ({pagination.total} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  )
}
