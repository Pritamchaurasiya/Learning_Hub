import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { fetchApi } from '../utils/api'
import { FlaskConical, RefreshCw } from 'lucide-react'

interface ExperimentResult {
  variant: string
  users: string
  events: string
  total_value: number
  avg_value: number
}

export default function AdminABTestingPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ExperimentResult[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState('homepage-cta')

  const experimentsList = [
    { id: 'homepage-cta', name: 'Homepage CTA Color' },
    { id: 'course-card-layout', name: 'Course Card Layout' },
  ]

  const fetchResults = async () => {
    setLoading(true)
    try {
      const response = await fetchApi(`/admin/ab-testing/results/${selectedExperiment}`)
      if (response.data?.success) {
        setResults(response.data.data ?? [])
      } else if (Array.isArray(response.data)) {
        setResults(response.data)
      } else if (response.success) {
        setResults(response.data ?? [])
      } else if (Array.isArray(response)) {
        setResults(response)
      }
    } catch (error) {
      console.error('Failed to fetch A/B testing results', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchResults()
  }, [selectedExperiment])

  const chartData = results.map(r => ({
    name: r.variant.toUpperCase(),
    Users: parseInt(r.users, 10) || 0,
    Events: parseInt(r.events, 10) || 0,
    Value: r.total_value || 0,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-indigo-500" />
            A/B Testing Experiments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analyze active experiments and variant performance
          </p>
        </div>
        <button
          onClick={fetchResults}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        {experimentsList.map(exp => (
          <button
            key={exp.id}
            onClick={() => setSelectedExperiment(exp.id)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              selectedExperiment === exp.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {exp.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Conversion Events</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="Events" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Users" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Variant Statistics</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="pb-3 font-medium">Variant</th>
                  <th className="pb-3 font-medium text-right">Users Hit</th>
                  <th className="pb-3 font-medium text-right">Conversions</th>
                  <th className="pb-3 font-medium text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No data available for this experiment yet.
                    </td>
                  </tr>
                ) : (
                  results.map((r, i) => {
                    const users = parseInt(r.users, 10) || 0
                    const events = parseInt(r.events, 10) || 0
                    const rate = users > 0 ? ((events / users) * 100).toFixed(1) : '0.0'

                    return (
                      <tr key={i} className="text-gray-800 dark:text-gray-200">
                        <td className="py-4 font-medium capitalize">{r.variant}</td>
                        <td className="py-4 text-right">{users}</td>
                        <td className="py-4 text-right text-indigo-500 font-medium">{events}</td>
                        <td className="py-4 text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${parseFloat(rate) > 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
                          >
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
