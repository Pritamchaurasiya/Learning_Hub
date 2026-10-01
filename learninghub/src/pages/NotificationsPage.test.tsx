import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import NotificationsPage from './NotificationsPage'
import { notificationService, type Notification } from '../services/notificationService'

vi.mock('../services/notificationService', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    clearAll: vi.fn(),
  },
}))

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    isConnecting: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
    emit: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    socket: null,
  }),
}))

describe('NotificationsPage Component', () => {
  const mockNotifications: Notification[] = [
    {
      id: 'notif-1',
      title: 'Course Update Available',
      message: 'New modules added to Master React 18',
      type: 'course_update',
      isRead: false,
      createdAt: new Date().toISOString(),
      metadata: { courseId: 'crs-1', userId: 'usr-1' },
    },
    {
      id: 'notif-2',
      title: 'Achievement Unlocked',
      message: 'You earned the 7-Day Streak Master badge!',
      type: 'achievement',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      metadata: { userId: 'usr-1' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      data: mockNotifications,
      status: 'success',
      unread_count: 1,
      total_count: 2,
    })
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      status: 'success',
    })
    vi.mocked(notificationService.deleteNotification).mockResolvedValue({
      data: { success: true },
      status: 'success',
    } as any)
  })

  it('renders notifications list, unread counters, and category pills', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Course Update Available')).toBeInTheDocument()
      expect(screen.getByText('Achievement Unlocked')).toBeInTheDocument()
    })

    expect(screen.getByText('1 unread notification')).toBeInTheDocument()
    expect(screen.getByText('All (2)')).toBeInTheDocument()
    expect(screen.getByText('Unread (1)')).toBeInTheDocument()
  })

  it('filters notifications when clicking tabs', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Course Update Available')).toBeInTheDocument()
    })

    const unreadTab = screen.getByText('Unread (1)')
    fireEvent.click(unreadTab)

    expect(screen.getByText('Course Update Available')).toBeInTheDocument()
    expect(screen.queryByText('Achievement Unlocked')).not.toBeInTheDocument()
  })

  it('marks notification as read when check button is clicked', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Course Update Available')).toBeInTheDocument()
    })

    const markReadBtn = screen.getByLabelText('Mark as read')
    fireEvent.click(markReadBtn)

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1')
    })
  })

  it('deletes notification when trash button is clicked', async () => {
    render(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('Course Update Available')).toBeInTheDocument()
    })

    const deleteBtns = screen.getAllByLabelText('Delete notification')
    fireEvent.click(deleteBtns[0])

    await waitFor(() => {
      expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-1')
    })
  })
})
