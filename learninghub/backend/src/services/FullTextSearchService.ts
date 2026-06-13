import { prisma } from '../config'

interface SearchResult {
  id: string
  title: string
  description: string
  type: 'course' | 'problem' | 'lesson'
  relevance: number
}

export class FullTextSearchService {
  /**
   * Search across courses, problems, and lessons
   */
  async search(
    query: string,
    filters?: {
      type?: 'course' | 'problem' | 'lesson'
      limit?: number
    }
  ): Promise<SearchResult[]> {
    const limit = filters?.limit ?? 20
    const searchQuery = query.trim().replace(/\s+/g, ' & ')

    if (filters?.type === 'course') {
      return this.searchCourses(searchQuery, limit)
    }
    if (filters?.type === 'problem') {
      return this.searchProblems(searchQuery, limit)
    }
    if (filters?.type === 'lesson') {
      return this.searchLessons(searchQuery, limit)
    }

    // Search all types
    const [courses, problems, lessons] = await Promise.all([
      this.searchCourses(searchQuery, 10),
      this.searchProblems(searchQuery, 5),
      this.searchLessons(searchQuery, 5),
    ])

    return [...courses, ...problems, ...lessons]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
  }

  private async searchCourses(query: string, limit: number): Promise<SearchResult[]> {
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        title,
        description,
        ts_rank(search_vector, to_tsquery('english', ${query})) as relevance
      FROM "Course"
      WHERE search_vector @@ to_tsquery('english', ${query})
        AND "isPublished" = true
      ORDER BY relevance DESC
      LIMIT ${limit}
    `

    return results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: 'course' as const,
      relevance: Number(r.relevance),
    }))
  }

  private async searchProblems(query: string, limit: number): Promise<SearchResult[]> {
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        title,
        description,
        ts_rank(search_vector, to_tsquery('english', ${query})) as relevance
      FROM "Problem"
      WHERE search_vector @@ to_tsquery('english', ${query})
      ORDER BY relevance DESC
      LIMIT ${limit}
    `

    return results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: 'problem' as const,
      relevance: Number(r.relevance),
    }))
  }

  private async searchLessons(query: string, limit: number): Promise<SearchResult[]> {
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        l.id,
        l.title,
        l.content as description,
        ts_rank(l.search_vector, to_tsquery('english', ${query})) as relevance
      FROM "Lesson" l
      WHERE l.search_vector @@ to_tsquery('english', ${query})
      ORDER BY relevance DESC
      LIMIT ${limit}
    `

    return results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description?.substring(0, 200),
      type: 'lesson' as const,
      relevance: Number(r.relevance),
    }))
  }
}

export const fullTextSearchService = new FullTextSearchService()
