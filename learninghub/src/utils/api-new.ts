// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://learninghub-api.your-subdomain.workers.dev';

// Request timeout
const TIMEOUT = 10000;

// Types
export interface ApiError {
  message: string;
  status?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Fetch with timeout and auth
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 - clear token and redirect to login
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
      }

      return {
        error: {
          message: data.error || data.message || `HTTP ${response.status}`,
          status: response.status
        }
      };
    }

    return { data };

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { error: { message: 'Request timed out' } };
      }
      return { error: { message: error.message } };
    }
    
    return { error: { message: 'Unknown error occurred' } };
  }
}

// ==================== AUTH API ====================

export const authApi = {
  // Register new user
  register: async (email: string, password: string, username: string) => {
    const response = await fetchWithAuth<{
      token: string;
      user: any;
      message: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username })
    });

    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  },

  // Login user
  login: async (email: string, password: string) => {
    const response = await fetchWithAuth<{
      token: string;
      user: any;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  },

  // Get current user
  me: async () => {
    return fetchWithAuth<{ user: any }>('/auth/me');
  },

  // Refresh token
  refresh: async () => {
    const token = localStorage.getItem('token');
    if (!token) return { error: { message: 'No token' } };

    const response = await fetchWithAuth<{ token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token })
    });

    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
};

// ==================== COURSES API ====================

export const coursesApi = {
  // List all courses
  list: async (filters?: { difficulty?: string; category?: string; phase?: string }) => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.phase) params.append('phase', filters.phase);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<{ courses: any[] }>(`/courses${query}`);
  },

  // Get course details
  get: async (courseId: string) => {
    return fetchWithAuth<{ course: any }>(`/courses/${courseId}`);
  },

  // Enroll in course
  enroll: async (courseId: string) => {
    return fetchWithAuth<{ enrollment: any; message: string }>('/courses/enroll', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    });
  },

  // Get user's enrolled courses
  myCourses: async () => {
    return fetchWithAuth<{ courses: any[] }>('/courses/my-courses');
  },

  // Update progress
  updateProgress: async (courseId: string, progress: number) => {
    return fetchWithAuth<{ enrollment: any; message: string }>(
      `/courses/${courseId}/progress`,
      {
        method: 'POST',
        body: JSON.stringify({ progress })
      }
    );
  }
};

// ==================== TESTS/QUIZ API ====================

export const testsApi = {
  // List all tests
  list: async (courseId?: string) => {
    const params = courseId ? `?courseId=${courseId}` : '';
    return fetchWithAuth<{ tests: any[] }>(`/tests${params}`);
  },

  // Get test with questions
  get: async (testId: string) => {
    return fetchWithAuth<{ test: any }>(`/tests/${testId}`);
  },

  // Submit test
  submit: async (testId: string, answers: Record<string, string>) => {
    return fetchWithAuth<{
      score: number;
      totalPossible: number;
      percentage: number;
      xpEarned: number;
      answers: any[];
      message: string;
    }>(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
  },

  // Get test results
  getResults: async (testId: string) => {
    return fetchWithAuth<{ result: any }>(`/tests/${testId}/results`);
  }
};

// ==================== AI API ====================

export const aiApi = {
  // Analyze quiz performance
  analyzeQuiz: async (params: {
    quizTitle?: string;
    score: number;
    totalPossible: number;
    incorrectAnswers?: string[];
    topics?: string[];
  }) => {
    return fetchWithAuth<{
      analysis: string;
      score: number;
      totalPossible: number;
      percentage: number;
      fallback?: boolean;
    }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // Get course recommendations
  recommend: async (params: {
    completedCourses?: string[];
    interests?: string[];
    skillLevel?: string;
  }) => {
    return fetchWithAuth<{
      recommendations: string;
      basedOn: any;
      fallback?: boolean;
    }>('/ai/recommend', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // Summarize content
  summarize: async (content: string, maxLength?: number) => {
    return fetchWithAuth<{
      summary: string;
      originalLength: number;
    }>('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ content, maxLength })
    });
  }
};

// Export all APIs
export const api = {
  auth: authApi,
  courses: coursesApi,
  tests: testsApi,
  ai: aiApi
};

export default api;
