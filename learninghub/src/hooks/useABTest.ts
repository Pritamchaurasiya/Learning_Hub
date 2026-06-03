import { useState, useEffect } from 'react'
import { fetchApi } from '../utils/api'
import { useStore } from '../stores/useStore'

interface ExperimentAssignment {
  experimentId: string
  variant: string
}

export function useABTest(experimentId: string) {
  const { auth } = useStore()
  const user = auth.user
  const [variant, setVariant] = useState<string>('control')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setVariant('control')
      setLoading(false)
      return
    }

    const fetchVariant = async () => {
      try {
        const response = await fetchApi('/ab-testing/my-experiments')
        const assignments: ExperimentAssignment[] = Array.isArray(response.data) ? response.data : (response.data?.data || [])
        const assignment = assignments.find(a => a.experimentId === experimentId)
        if (assignment) {
          setVariant(assignment.variant)
        }
      } catch (error) {
        console.error('Error fetching AB test variant', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVariant()
  }, [user, experimentId])

  const trackConversion = async (eventName: string, value: number = 0) => {
    if (!user) return
    try {
      await fetchApi('/ab-testing/track', {
        method: 'POST',
        body: JSON.stringify({ experimentId, eventName, value })
      })
    } catch (error) {
      console.error('Error tracking AB test conversion', error)
    }
  }

  return { variant, loading, trackConversion }
}
