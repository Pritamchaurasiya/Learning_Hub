import { fetchApi } from '../utils/api'

export interface PYQ {
  id: string
  examType: string
  year: number
  paper: string
  subject: string
  question: string
  options: string[]
  answer: string
  explanation: string
  difficulty: string
  marks: number
  tags: string[]
}

export interface Formula {
  id: string
  examType: string
  subject: string
  topic: string
  name: string
  formula: string
  description: string
  examples: string[]
  tags: string[]
}

export interface RevisionNote {
  id: string
  examType: string
  subject: string
  topic: string
  content: string
  keyPoints: string[]
  tags: string[]
}

export const examContentService = {
  // PYQs
  getPYQs: async (filters: {
    examType?: string
    year?: number
    subject?: string
    page?: number
    limit?: number
  }) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value))
    })
    return fetchApi(`/exam-content/pyqs?${params}`) as Promise<{
      status: string
      data: PYQ[]
      meta: { total: number; page: number; pages: number }
    }>
  },

  getPYQById: async (id: string) => {
    return fetchApi(`/exam-content/pyqs/${id}`) as Promise<{
      status: string
      data: PYQ
    }>
  },

  // Formulas
  getFormulas: async (filters: { examType?: string; subject?: string; topic?: string }) => {
    const params = new URLSearchParams()
    if (filters.examType) params.append('examType', filters.examType)
    if (filters.subject) params.append('subject', filters.subject)
    if (filters.topic) params.append('topic', filters.topic)
    return fetchApi(`/exam-content/formulas?${params.toString()}`) as Promise<{
      status: string
      data: Formula[]
    }>
  },

  // Revision Notes
  getRevisionNotes: async (filters: { examType?: string; subject?: string; topic?: string }) => {
    const params = new URLSearchParams()
    if (filters.examType) params.append('examType', filters.examType)
    if (filters.subject) params.append('subject', filters.subject)
    if (filters.topic) params.append('topic', filters.topic)
    return fetchApi(`/exam-content/notes?${params.toString()}`) as Promise<{
      status: string
      data: RevisionNote[]
    }>
  },

  // Exam Taxonomy
  getCountries: async () => {
    try {
      const res = await fetchApi<{ status: string; data: any[] }>('/exam-content/countries')
      return res.data || []
    } catch {
      return [
        { id: 'cnt-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
        { id: 'cnt-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
        { id: 'cnt-global', name: 'Global Tech', code: 'GLOBAL', flagEmoji: '🌐' },
      ]
    }
  },

  getExams: async (filters?: { countryId?: string; search?: string }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.countryId) params.append('countryId', filters.countryId)
      if (filters?.search) params.append('search', filters.search)
      const res = await fetchApi<{ status: string; data: any[] }>(
        `/exam-content/exams?${params.toString()}`
      )
      return res.data || []
    } catch {
      const allExams = [
        {
          id: 'exam-gate-cs',
          name: 'GATE Computer Science & IT',
          slug: 'gate-cs',
          description:
            'Graduate Aptitude Test in Engineering for CS/IT postgraduate admissions and PSU jobs.',
          countryId: 'cnt-in',
          category: 'Engineering',
          subjects: [
            { id: 'sub-dsa', name: 'Data Structures & Algorithms', slug: 'dsa' },
            { id: 'sub-os', name: 'Operating Systems', slug: 'os' },
            { id: 'sub-dbms', name: 'Database Management Systems', slug: 'dbms' },
            { id: 'sub-cn', name: 'Computer Networks', slug: 'cn' },
            { id: 'sub-toc', name: 'Theory of Computation & Compiler Design', slug: 'toc' },
          ],
        },
        {
          id: 'exam-jee-adv',
          name: 'JEE Advanced',
          slug: 'jee-advanced',
          description:
            'Joint Entrance Examination for premier Indian Institutes of Technology (IITs).',
          countryId: 'cnt-in',
          category: 'Engineering',
          subjects: [
            { id: 'sub-math', name: 'Mathematics', slug: 'math' },
            { id: 'sub-phys', name: 'Physics', slug: 'physics' },
            { id: 'sub-chem', name: 'Chemistry', slug: 'chemistry' },
          ],
        },
        {
          id: 'exam-sat',
          name: 'SAT Digital',
          slug: 'sat-digital',
          description: 'Standardized test widely used for college admissions in the United States.',
          countryId: 'cnt-us',
          category: 'College Admissions',
          subjects: [
            { id: 'sub-sat-math', name: 'Math (Algebra, Problem Solving)', slug: 'sat-math' },
            { id: 'sub-sat-ebrw', name: 'Reading & Writing', slug: 'sat-reading-writing' },
          ],
        },
        {
          id: 'exam-faang-dsa',
          name: 'FAANG / Tier-1 Software Engineering',
          slug: 'faang-swe',
          description:
            'Coding interviews, high-scale system design, concurrency, and distributed systems.',
          countryId: 'cnt-global',
          category: 'Tech & Career',
          subjects: [
            { id: 'sub-dsa-adv', name: 'Advanced DSA & Problem Solving', slug: 'dsa-adv' },
            { id: 'sub-sys-design', name: 'High-Scale System Design', slug: 'sys-design' },
            { id: 'sub-dist-sys', name: 'Distributed Systems & Databases', slug: 'dist-sys' },
          ],
        },
      ]

      if (filters?.countryId) {
        return allExams.filter(e => e.countryId === filters.countryId)
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase()
        return allExams.filter(
          e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
        )
      }
      return allExams
    }
  },

  getSubjects: async (examId: string) => {
    try {
      const res = await fetchApi<{ status: string; data: any[] }>(
        `/exam-content/exams/${examId}/subjects`
      )
      return res.data || []
    } catch {
      return [
        { id: 'sub-dsa', name: 'Data Structures & Algorithms', slug: 'dsa' },
        { id: 'sub-os', name: 'Operating Systems', slug: 'os' },
        { id: 'sub-dbms', name: 'Database Management Systems', slug: 'dbms' },
      ]
    }
  },
}
