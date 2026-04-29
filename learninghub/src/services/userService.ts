import { fetchApi } from '../utils/api';

export interface UserProfile {
  id: string
  username: string
  email: string
  display_name: string
  avatar: string | null
  bio: string | null
  location: string | null
  website: string | null
  date_joined: string
  is_verified: boolean
}

export interface UserStats {
  enrolled_courses: number
  completed_courses: number
  certificates_earned: number
  hours_spent: number
  current_streak: number
  longest_streak: number
  xp_points: number
  level: number
  next_level_xp: number
  rank: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  unlocked_at?: string
}

export interface UpdateProfileData {
  display_name?: string
  bio?: string
  location?: string
  website?: string
  avatar?: string
}

// Transformers
function mapToUserProfile(user: any): UserProfile {
  return {
    id: user.id,
    username: user.username || '',
    email: user.email,
    display_name: user.username || 'User',
    avatar: null,
    bio: null,
    location: null,
    website: null,
    date_joined: user.created_at || new Date().toISOString(),
    is_verified: false
  };
}

function mapToUserStats(user: any, progress: any[] = []): UserStats {
  const enrolled = progress.length;
  const completed = progress.filter((p: any) => p.status === 'completed' || p.completed).length;
  return {
    enrolled_courses: enrolled,
    completed_courses: completed,
    certificates_earned: completed, // assume each completed course gives certificate
    hours_spent: 0, // not tracked
    current_streak: user.streak || 0,
    longest_streak: user.streak || 0,
    xp_points: user.xp || 0,
    level: user.level || 1,
    next_level_xp: (user.level || 1) * 100,
    rank: 0 // will be set if provided separately
  };
}

function mapToAchievement(ach: any): Achievement {
  return {
    id: ach.id || ach.achievementId,
    name: ach.name || ach.title,
    description: ach.description || '',
    icon: ach.icon || '🏆',
    rarity: 'common',
    unlocked: true,
    unlocked_at: ach.unlockedAt || ach.unlocked_at
  };
}

export const userService = {
  getProfile: async (): Promise<{ status: string; data: UserProfile }> => {
    const res = await fetchApi('/auth/me');
    const user = res.data?.user || res.user || {};
    return { status: 'success', data: mapToUserProfile(user) };
  },

  updateProfile: async (data: UpdateProfileData) => {
    return fetchApi('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File): Promise<{ status: string; data: { avatar_url: string } }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Using fetch directly because fetchApi might not handle FormData automatically with JSON stringify
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }
    
    return response.json();
  },

  getStats: async (): Promise<{ status: string; data: UserStats }> => {
    const res = await fetchApi('/auth/me');
    const user = res.data?.user || res.user || {};
    const progress = res.data?.progress || [];
    return { status: 'success', data: mapToUserStats(user, progress) };
  },

  getAchievements: async (): Promise<{ status: string; data: Achievement[] }> => {
    try {
      const res = await fetchApi('/achievements');
      const raw = res.data || [];
      const mapped = Array.isArray(raw) ? raw.map(mapToAchievement) : [];
      return { status: 'success', data: mapped };
    } catch (err) {
      // If endpoint not available, return empty
      return { status: 'success', data: [] };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return fetchApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  deleteAccount: async () => {
    return fetchApi('/auth/delete-account', {
      method: 'DELETE',
    });
  },

  // Bookmark methods
  getBookmarks: async (options?: { signal?: AbortSignal }): Promise<{ status: string; count: number; data: any[] }> => {
    return fetchApi('/users/bookmarks', { signal: options?.signal });
  },

  addBookmark: async (courseId: string, notes?: string): Promise<{ status: string; data: { bookmark_id: string } }> => {
    return fetchApi('/users/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, notes }),
    });
  },

  removeBookmark: async (courseId: string): Promise<{ status: string; message: string }> => {
    return fetchApi(`/users/bookmarks/${courseId}`, {
      method: 'DELETE',
    });
  },
};
