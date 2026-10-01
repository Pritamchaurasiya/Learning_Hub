export interface DownloadItem {
  id: string
  title: string
  type: 'video' | 'course' | 'document'
  file_size: number
  file_url: string
  progress_percent: number
  status: 'downloading' | 'completed' | 'paused' | 'failed' | 'pending'
  is_expired: boolean
  expires_at: string
  created_at: string
  completed_at?: string
  course?: {
    id: string
    title: string
    thumbnail_url?: string
  }
}

const mockDownloads: Map<string, DownloadItem[]> = new Map()

export class DownloadService {
  async getUserDownloads(userId: string): Promise<DownloadItem[]> {
    if (!mockDownloads.has(userId)) {
      mockDownloads.set(userId, [
        {
          id: `dl-1`,
          title: 'Complete Dynamic Programming Cheat Sheet & Formula Guide (PDF)',
          type: 'document',
          file_size: 14200000,
          file_url: 'https://downloads.learninghub.app/materials/dp-formula-guide.pdf',
          progress_percent: 100,
          status: 'completed',
          is_expired: false,
          expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          completed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          course: {
            id: 'crs-dsa-101',
            title: 'Data Structures & Algorithms Bootcamp',
            thumbnail_url:
              'https://images.unsplash.com/photo-1516116211227-bbc13c639649?w=300&h=200&fit=crop',
          },
        },
        {
          id: `dl-2`,
          title: 'JEE Advanced Physics 10-Year Chapterwise Solved Papers (2015-2025)',
          type: 'document',
          file_size: 48500000,
          file_url: 'https://downloads.learninghub.app/materials/jee-adv-physics-pyq.pdf',
          progress_percent: 100,
          status: 'completed',
          is_expired: false,
          expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          completed_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
      ])
    }
    return mockDownloads.get(userId)!
  }

  async getStats(userId: string) {
    const items = await this.getUserDownloads(userId)
    const total_downloads = items.length
    const total_size_bytes = items.reduce((sum, i) => sum + i.file_size, 0)
    return {
      total_downloads,
      total_size_bytes,
      total_size_mb: Math.round((total_size_bytes / (1024 * 1024)) * 10) / 10,
    }
  }

  async createDownload(
    userId: string,
    item: { course_id?: string; lesson_id?: string; type: 'video' | 'course' | 'document' }
  ) {
    const list = await this.getUserDownloads(userId)
    const newItem: DownloadItem = {
      id: `dl-${Date.now()}`,
      title: 'Full Offline Revision Package & Video Lectures',
      type: item.type || 'document',
      file_size: 32000000,
      file_url: 'https://downloads.learninghub.app/offline/pack.zip',
      progress_percent: 100,
      status: 'completed',
      is_expired: false,
      expires_at: new Date(Date.now() + 86400000 * 60).toISOString(),
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }
    list.unshift(newItem)
    return newItem
  }

  async updateStatus(userId: string, id: string, status: DownloadItem['status']) {
    const list = await this.getUserDownloads(userId)
    const item = list.find(i => i.id === id)
    if (item) {
      item.status = status
      return item
    }
    return null
  }

  async deleteDownload(userId: string, id: string) {
    const list = await this.getUserDownloads(userId)
    const idx = list.findIndex(i => i.id === id)
    if (idx !== -1) {
      list.splice(idx, 1)
      return true
    }
    return false
  }
}

export const downloadService = new DownloadService()
