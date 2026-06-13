import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService, User } from '../services/adminService'
import { fetchApi } from '../utils/api'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { Users, Search, Shield, ShieldAlert, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../stores/useStore'

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const queryClient = useQueryClient()
  const addToast = useStore(state => state.addToast)
  const limit = 10
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading } = useQuery<{
    users: User[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: async () => {
      const json = await fetchApi(
        `/admin/users?page=${page}&limit=${limit}&search=${debouncedSearch}`
      )
      return {
        ...json.data,
        users: json.data.users.map((raw: any) => ({
          id: raw.id,
          email: raw.email ?? '',
          username: raw.username ?? raw.email ?? 'Learner',
          role: raw.role ?? 'STUDENT',
          xp: raw.xp ?? 0,
          level: raw.level ?? 1,
          streak: raw.streak ?? 0,
          created_at: raw.createdAt ?? new Date(0).toISOString(),
          is_active: !raw.deletedAt,
        })),
      }
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.updateUser(userId, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      addToast({ message: 'User role updated', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to update user role', type: 'error' })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      addToast({ message: 'User deleted successfully', type: 'success' })
    },
    onError: () => {
      addToast({ message: 'Failed to delete user', type: 'error' })
    },
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(e.target.value)
      setPage(1)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const users: User[] = data?.users ?? []
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                <span className="p-2 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
                  <Users className="w-8 h-8" />
                </span>
                User Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                Manage all registered users on the platform
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 w-full md:w-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-shadow shadow-sm"
              />
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Joined</th>
                    <th className="px-6 py-4 font-bold">XP / Level</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                              alt={user.username}
                              className="w-10 h-10 rounded-full bg-gray-200"
                            />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {user.username}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase ${
                              user.role === 'ADMIN' || user.role === 'SUPERADMIN'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : user.role === 'INSTRUCTOR'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            Lvl {user.level}
                          </div>
                          <div className="text-xs text-gray-500">{user.xp} XP</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.role !== 'SUPERADMIN' && (
                              <>
                                <button
                                  onClick={() =>
                                    updateRoleMutation.mutate({
                                      userId: user.id,
                                      role: user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN',
                                    })
                                  }
                                  title={
                                    user.role === 'ADMIN' ? 'Demote to Student' : 'Promote to Admin'
                                  }
                                  className={`p-2 rounded-lg transition-colors ${
                                    user.role === 'ADMIN'
                                      ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                  }`}
                                >
                                  {user.role === 'ADMIN' ? (
                                    <ShieldAlert className="w-5 h-5" />
                                  ) : (
                                    <Shield className="w-5 h-5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      // eslint-disable-next-line no-alert
                                      window.confirm('Are you sure you want to delete this user?')
                                    ) {
                                      deleteUserMutation.mutate(user.id)
                                    }
                                  }}
                                  title="Delete User"
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
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
