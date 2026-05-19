import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { fetchApi } from '../utils/api'

interface ApiQueryOptions<_T> {
  queryKey: QueryKey
  endpoint: string
  staleTime?: number
  gcTime?: number
  enabled?: boolean
}

interface ApiMutationOptions<TData, TVariables> {
  endpoint: string | ((variables: TVariables) => string)
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  invalidateQueries?: QueryKey[]
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}

// Optimized query hook with caching
export function useApiQuery<T>({
  queryKey,
  endpoint,
  staleTime = 5 * 60 * 1000, // 5 minutes default
  gcTime = 10 * 60 * 1000, // 10 minutes default
  enabled = true,
}: ApiQueryOptions<T>) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetchApi(endpoint)
      return response as T
    },
    staleTime,
    gcTime,
    enabled,
  })
}

// Optimized mutation hook with automatic cache invalidation
export function useApiMutation<TData = unknown, TVariables = unknown>({
  endpoint,
  method = 'POST',
  invalidateQueries = [],
  onSuccess,
  onError,
}: ApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint
      const response = await fetchApi(url, {
        method,
        body: JSON.stringify(variables),
      })
      return response as TData
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateQueries.forEach(queryKey => {
        void queryClient.invalidateQueries({ queryKey })
      })
      onSuccess?.(data, variables)
    },
    onError: (error: Error, variables) => {
      onError?.(error, variables)
    },
  })
}

// Prefetch hook for route preloading
export function usePrefetchQuery() {
  const queryClient = useQueryClient()

  return (queryKey: QueryKey, endpoint: string) => {
    void queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const response = await fetchApi(endpoint)
        return response
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Optimistic update hook
export function useOptimisticMutation<TData, TVariables>({
  endpoint,
  method = 'PUT',
  queryKey,
  updateFn,
}: {
  endpoint: string
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  queryKey: QueryKey
  updateFn: (oldData: TData, variables: TVariables) => TData
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await fetchApi(endpoint, {
        method,
        body: JSON.stringify(variables),
      })
      return response as TData
    },
    onMutate: async variables => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<TData>(queryKey, old => (old ? updateFn(old, variables) : old))
      }

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}
