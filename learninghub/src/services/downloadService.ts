import { fetchApi } from '../utils/api'

export interface Download {
  id: string
  title: string
  type: 'video' | 'course' | 'document'
  file_size: number // in bytes
  file_url?: string
  progress_percent: number
  status: 'downloading' | 'completed' | 'paused' | 'failed' | 'pending'
  is_expired: boolean
  expires_at?: string
  created_at: string
  completed_at?: string
  course?: {
    id: string
    title: string
    thumbnail_url?: string
  }
  lesson?: {
    id: string
    title: string
  }
}

export interface DownloadStats {
  total_downloads: number
  total_size_bytes: number
  total_size_mb: number
}

export interface DownloadProgress {
  download_id: string
  progress_percent: number
  downloaded_bytes: number
  speed_bytes_per_second?: number
  estimated_time_seconds?: number
}

export const downloadService = {
  // Get all downloads for current user
  async getDownloads(options?: {
    signal?: AbortSignal
  }): Promise<{ status: string; data: Download[] }> {
    return fetchApi('/downloads/items/', { signal: options?.signal })
  },

  // Get download statistics
  async getStats(options?: {
    signal?: AbortSignal
  }): Promise<{ status: string; data: DownloadStats }> {
    return fetchApi('/downloads/items/stats/', { signal: options?.signal })
  },

  // Create a new download (initiate download for course/lesson)
  async createDownload(item: {
    course_id?: string
    lesson_id?: string
    type: 'video' | 'course' | 'document'
  }): Promise<{ status: string; data: Download }> {
    return fetchApi('/downloads/items/', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  },

  // Get download progress (for polling)
  async getProgress(downloadId: string): Promise<{ status: string; data: DownloadProgress }> {
    return fetchApi(`/downloads/items/${downloadId}/progress/`)
  },

  // Generate secure download link
  async getSecureLink(
    downloadId: string
  ): Promise<{ status: string; secure_url: string; expires_in_seconds: number }> {
    return fetchApi(`/downloads/items/${downloadId}/secure_link/`)
  },

  // Mark download as expired
  async markExpired(downloadId: string): Promise<{ status: string; message: string }> {
    return fetchApi(`/downloads/items/${downloadId}/mark_expired/`, {
      method: 'POST',
    })
  },

  // Delete a download
  async deleteDownload(downloadId: string): Promise<void> {
    return fetchApi(`/downloads/items/${downloadId}/`, {
      method: 'DELETE',
    })
  },

  // Pause download (if supported by backend)
  async pauseDownload(downloadId: string): Promise<{ status: string; message: string }> {
    return fetchApi(`/downloads/items/${downloadId}/pause/`, {
      method: 'POST',
    })
  },

  // Resume download
  async resumeDownload(downloadId: string): Promise<{ status: string; message: string }> {
    return fetchApi(`/downloads/items/${downloadId}/resume/`, {
      method: 'POST',
    })
  },
}
