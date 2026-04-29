export interface LearningPath {
  id: string
  title: string
  description: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  duration: string
  courses: number
  enrolled: boolean
  progress: number
  completed_courses: number
  image?: string
  skills: string[]
  created_at: string
  updated_at: string
}

export interface LearningPathResponse {
  status: string
  data: LearningPath[]
  count: number
}

export interface SingleLearningPathResponse {
  status: string
  data: LearningPath
}

const mockLearningPaths: LearningPath[] = [
  {
    id: 'path-1',
    title: 'Full Stack React Developer',
    description: 'Master React, Node.js, and modern full-stack development from scratch.',
    level: 'Beginner',
    duration: '12 weeks',
    courses: 4,
    enrolled: true,
    progress: 25,
    completed_courses: 1,
    skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'path-2',
    title: 'Data Science & Machine Learning',
    description: 'Learn Python, pandas, scikit-learn, and neural networks.',
    level: 'Intermediate',
    duration: '16 weeks',
    courses: 6,
    enrolled: false,
    progress: 0,
    completed_courses: 0,
    skills: ['Python', 'Machine Learning', 'Data Analysis', 'Deep Learning'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const learningPathService = {
  getLearningPaths: async (): Promise<LearningPathResponse> => {
    return Promise.resolve({ status: 'success', data: mockLearningPaths, count: mockLearningPaths.length })
  },

  getLearningPath: async (id: string): Promise<SingleLearningPathResponse> => {
    const path = mockLearningPaths.find(p => p.id === id) || mockLearningPaths[0]
    return Promise.resolve({ status: 'success', data: path })
  },

  enrollInPath: async (id: string): Promise<SingleLearningPathResponse> => {
    const path = mockLearningPaths.find(p => p.id === id)
    if (path) path.enrolled = true;
    return Promise.resolve({ status: 'success', data: path || mockLearningPaths[0] })
  },

  getMyProgress: async (): Promise<LearningPathResponse> => {
    const enrolled = mockLearningPaths.filter(p => p.enrolled)
    return Promise.resolve({ status: 'success', data: enrolled, count: enrolled.length })
  },
}
