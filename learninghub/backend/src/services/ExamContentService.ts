import { ExamType, Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'

export interface CreatePYQDTO {
  examType: ExamType
  year: number
  paper: string
  subject: string
  question: string
  options: string[]
  answer: string
  explanation: string
  difficulty: string
  marks: number
  negativeMarks: number
  tags: string[]
}

export class ExamContentService {
  async getPYQs(filters: {
    examType?: ExamType
    year?: number
    subject?: string
    difficulty?: string
    page?: number
    limit?: number
  }) {
    const { page = 1, limit = 20, subject, ...where } = filters

    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.subjectName = { contains: subject, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      prisma.pYQ.findMany({
        where: prismaWhere as Prisma.PYQWhereInput,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { year: 'desc' },
      }),
      prisma.pYQ.count({ where: prismaWhere as Prisma.PYQWhereInput }),
    ])

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  }

  async createPYQ(data: CreatePYQDTO) {
    return prisma.pYQ.create({
      data: {
        examType: data.examType,
        year: data.year,
        paper: data.paper,
        subjectName: data.subject,
        question: data.question,
        options: data.options,
        answer: data.answer,
        explanation: data.explanation,
        difficulty: data.difficulty,
        marks: data.marks,
        negativeMarks: data.negativeMarks,
        tags: data.tags,
      },
    })
  }

  async getPYQById(id: string) {
    return prisma.pYQ.findUnique({ where: { id } })
  }

  async getFormulas(filters: { examType?: ExamType; subject?: string; topic?: string }) {
    const { subject, ...where } = filters
    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.topic = { contains: subject, mode: 'insensitive' }
    }
    return prisma.formula.findMany({
      where: prismaWhere as Prisma.FormulaWhereInput,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getRevisionNotes(filters: { examType?: ExamType; subject?: string; topic?: string }) {
    const { subject, ...where } = filters
    const prismaWhere: Record<string, unknown> = { ...where }
    if (subject) {
      prismaWhere.topic = { contains: subject, mode: 'insensitive' }
    }
    return prisma.revisionNote.findMany({
      where: prismaWhere as Prisma.RevisionNoteWhereInput,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCountries() {
    try {
      const dbCountries = await prisma.country.findMany({
        where: { isActive: true },
        include: {
          exams: {
            where: { isActive: true },
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { name: 'asc' },
      })
      if (dbCountries && dbCountries.length > 0) {
        return dbCountries
      }
    } catch (err) {
      console.warn('[ExamContentService] Falling back to curated countries:', err instanceof Error ? err.message : String(err))
    }

    // High-resiliency curated fallback
    return [
      {
        id: 'country-in',
        name: 'India',
        code: 'IN',
        flagEmoji: '🇮🇳',
        isActive: true,
        exams: [
          { id: 'exam-jee-main', name: 'JEE Main', slug: 'jee-main' },
          { id: 'exam-jee-adv', name: 'JEE Advanced', slug: 'jee-advanced' },
          { id: 'exam-neet-ug', name: 'NEET-UG', slug: 'neet-ug' },
          { id: 'exam-ssc-cgl', name: 'SSC CGL', slug: 'ssc-cgl' },
          { id: 'exam-upsc-cse', name: 'UPSC Civil Services', slug: 'upsc-civil-services' },
          { id: 'exam-gate-cse', name: 'GATE Computer Science', slug: 'gate-cse' },
          { id: 'exam-cat-mba', name: 'CAT (IIMs / MBA)', slug: 'cat-mba' },
          { id: 'exam-bitsat', name: 'BITSAT', slug: 'bitsat' },
          { id: 'exam-cbse-12', name: 'CBSE Class 12 Boards', slug: 'cbse-class-12' },
        ],
      },
      {
        id: 'country-global',
        name: 'Global / Tech & Software',
        code: 'GLOBAL',
        flagEmoji: '🌐',
        isActive: true,
        exams: [
          { id: 'exam-dsa-swe', name: 'Software Engineering & FAANG DSA', slug: 'dsa-software-engineering' },
          { id: 'exam-fullstack-dev', name: 'Full-Stack Web Development', slug: 'fullstack-web-dev' },
          { id: 'exam-ai-ml-eng', name: 'Machine Learning & AI Engineering', slug: 'machine-learning-ai' },
        ],
      },
      {
        id: 'country-us',
        name: 'United States',
        code: 'US',
        flagEmoji: '🇺🇸',
        isActive: true,
        exams: [
          { id: 'exam-sat', name: 'SAT', slug: 'sat' },
          { id: 'exam-gre-gen', name: 'GRE General Test', slug: 'gre-general' },
          { id: 'exam-mcat-us', name: 'MCAT', slug: 'mcat' },
        ],
      },
      {
        id: 'country-gb',
        name: 'United Kingdom',
        code: 'GB',
        flagEmoji: '🇬🇧',
        isActive: true,
        exams: [
          { id: 'exam-alevel', name: 'A-Level', slug: 'a-level' },
          { id: 'exam-ielts-acad', name: 'IELTS Academic', slug: 'ielts-academic' },
        ],
      },
      {
        id: 'country-ca',
        name: 'Canada',
        code: 'CA',
        flagEmoji: '🇨🇦',
        isActive: true,
        exams: [{ id: 'exam-celpip', name: 'CELPIP General', slug: 'celpip-general' }],
      },
      {
        id: 'country-au',
        name: 'Australia',
        code: 'AU',
        flagEmoji: '🇦🇺',
        isActive: true,
        exams: [{ id: 'exam-pte-acad', name: 'PTE Academic', slug: 'pte-academic' }],
      },
    ]
  }

  async getExams(filters: { countryId?: string; country?: string; search?: string }) {
    try {
      const where: Prisma.ExamWhereInput = { isActive: true, deletedAt: null }
      if (filters.countryId) {
        where.countryId = filters.countryId
      } else if (filters.country?.trim()) {
        where.country = {
          code: { equals: filters.country.trim(), mode: 'insensitive' },
        }
      }
      if (filters.search?.trim()) {
        where.OR = [
          { name: { contains: filters.search.trim(), mode: 'insensitive' } },
          { description: { contains: filters.search.trim(), mode: 'insensitive' } },
        ]
      }
      const dbExams = await prisma.exam.findMany({
        where,
        include: {
          country: {
            select: { id: true, name: true, code: true },
          },
          subjects: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { name: 'asc' },
      })
      if (dbExams && dbExams.length > 0) {
        return dbExams
      }
    } catch (err) {
      console.warn('[ExamContentService] Falling back to curated exams:', err instanceof Error ? err.message : String(err))
    }

    const fallbackExams = [
      {
        id: 'exam-jee-main',
        name: 'JEE Main',
        slug: 'jee-main',
        description: 'National Testing Agency (NTA) CBT for Engineering Admissions (NITs, IIITs, CFTIs)',
        countryId: 'country-in',
        category: 'Engineering & Tech',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-jee-phy', name: 'Physics', slug: 'jee-main-physics' },
          { id: 'sub-jee-chem', name: 'Chemistry', slug: 'jee-main-chemistry' },
          { id: 'sub-jee-math', name: 'Mathematics', slug: 'jee-main-mathematics' },
        ],
      },
      {
        id: 'exam-jee-adv',
        name: 'JEE Advanced',
        slug: 'jee-advanced',
        description: 'Prestigious Entrance Exam for admission into the Indian Institutes of Technology (IITs)',
        countryId: 'country-in',
        category: 'Engineering & Tech',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-adv-phy', name: 'Advanced Physics', slug: 'jee-adv-physics' },
          { id: 'sub-adv-chem', name: 'Advanced Chemistry', slug: 'jee-adv-chemistry' },
          { id: 'sub-adv-math', name: 'Advanced Mathematics', slug: 'jee-adv-mathematics' },
        ],
      },
      {
        id: 'exam-neet-ug',
        name: 'NEET-UG',
        slug: 'neet-ug',
        description: 'National Eligibility cum Entrance Test for MBBS, BDS, and Premier Medical Admissions',
        countryId: 'country-in',
        category: 'Medical & Healthcare',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-neet-bio', name: 'Biology (Botany & Zoology)', slug: 'neet-biology' },
          { id: 'sub-neet-phy', name: 'Physics for NEET', slug: 'neet-physics' },
          { id: 'sub-neet-chem', name: 'Chemistry for NEET', slug: 'neet-chemistry' },
        ],
      },
      {
        id: 'exam-ssc-cgl',
        name: 'SSC CGL',
        slug: 'ssc-cgl',
        description: 'Combined Graduate Level examination for prestigious Group B & C Central Government positions',
        countryId: 'country-in',
        category: 'Government & Civil Services',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-ssc-quant', name: 'Quantitative Aptitude', slug: 'ssc-quantitative-aptitude' },
          { id: 'sub-ssc-reasoning', name: 'General Intelligence & Reasoning', slug: 'ssc-reasoning' },
          { id: 'sub-ssc-english', name: 'English Comprehension', slug: 'ssc-english' },
          { id: 'sub-ssc-ga', name: 'General Awareness', slug: 'ssc-general-awareness' },
        ],
      },
      {
        id: 'exam-upsc-cse',
        name: 'UPSC Civil Services (IAS / IPS)',
        slug: 'upsc-civil-services',
        description: 'Union Public Service Commission Civil Services Examination for IAS, IPS, and Central Group A posts',
        countryId: 'country-in',
        category: 'Government & Civil Services',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-upsc-gs1', name: 'General Studies Paper 1', slug: 'upsc-gs-1' },
          { id: 'sub-upsc-csat', name: 'CSAT (General Studies Paper 2)', slug: 'upsc-csat' },
        ],
      },
      {
        id: 'exam-gate-cse',
        name: 'GATE Computer Science',
        slug: 'gate-cse',
        description: 'Graduate Aptitude Test in Engineering for Master’s admissions in IITs/IISc and PSU Recruitments',
        countryId: 'country-in',
        category: 'Engineering & Tech',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-gate-dsa', name: 'Data Structures & Algorithms', slug: 'gate-dsa' },
          { id: 'sub-gate-os', name: 'Operating Systems', slug: 'gate-os' },
          { id: 'sub-gate-dbms', name: 'Database Management Systems', slug: 'gate-dbms' },
          { id: 'sub-gate-toc', name: 'Theory of Computation & Compilers', slug: 'gate-toc-compilers' },
          { id: 'sub-gate-cn', name: 'Computer Networks', slug: 'gate-computer-networks' },
          { id: 'sub-gate-math', name: 'Engineering Mathematics', slug: 'gate-engineering-mathematics' },
        ],
      },
      {
        id: 'exam-cat-mba',
        name: 'CAT (IIMs / MBA Entrance)',
        slug: 'cat-mba',
        description: 'Common Admission Test for elite Indian Institutes of Management (IIMs) and top business schools',
        countryId: 'country-in',
        category: 'Management & MBA',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-cat-quant', name: 'Quantitative Aptitude (QA)', slug: 'cat-qa' },
          { id: 'sub-cat-dilr', name: 'Data Interpretation & Logical Reasoning (DILR)', slug: 'cat-dilr' },
          { id: 'sub-cat-varc', name: 'Verbal Ability & Reading Comprehension (VARC)', slug: 'cat-varc' },
        ],
      },
      {
        id: 'exam-bitsat',
        name: 'BITSAT',
        slug: 'bitsat',
        description: 'Birla Institute of Technology and Science Admission Test for BITS Pilani, Goa & Hyderabad',
        countryId: 'country-in',
        category: 'Engineering & Tech',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-bits-phy', name: 'Physics', slug: 'bitsat-physics' },
          { id: 'sub-bits-chem', name: 'Chemistry', slug: 'bitsat-chemistry' },
          { id: 'sub-bits-math', name: 'Mathematics', slug: 'bitsat-mathematics' },
          { id: 'sub-bits-eng', name: 'English & Logical Reasoning', slug: 'bitsat-english-lr' },
        ],
      },
      {
        id: 'exam-cbse-12',
        name: 'CBSE Class 12 Boards',
        slug: 'cbse-class-12',
        description: 'Class 12th Board Examinations for Science Stream with NCERT Exemplar & Proof Questions',
        countryId: 'country-in',
        category: 'School Boards (K-12)',
        country: { id: 'country-in', name: 'India', code: 'IN' },
        subjects: [
          { id: 'sub-cbse-phy', name: 'Physics Class 12', slug: 'cbse-12-physics' },
          { id: 'sub-cbse-chem', name: 'Chemistry Class 12', slug: 'cbse-12-chemistry' },
          { id: 'sub-cbse-math', name: 'Mathematics Class 12', slug: 'cbse-12-mathematics' },
        ],
      },
      {
        id: 'exam-dsa-swe',
        name: 'Software Engineering & FAANG DSA',
        slug: 'dsa-software-engineering',
        description: 'High-Impact Data Structures, Algorithms, System Design, and FAANG/MAANG Technical Interviews',
        countryId: 'country-global',
        category: 'Software & Computer Science',
        country: { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL' },
        subjects: [
          { id: 'sub-dsa-core', name: 'Data Structures & Algorithms', slug: 'dsa-core' },
          { id: 'sub-sys-design', name: 'System Design & Architecture', slug: 'system-design' },
          { id: 'sub-cs-fund', name: 'Core Computer Science', slug: 'core-cs-fundamentals' },
          { id: 'sub-lld-design', name: 'Low-Level Object-Oriented Design', slug: 'lld-ood' },
        ],
      },
      {
        id: 'exam-fullstack-dev',
        name: 'Full-Stack Web Development',
        slug: 'fullstack-web-dev',
        description: 'Modern Frontend React/TypeScript, Robust Node.js Backends, REST/GraphQL APIs, Databases and DevOps',
        countryId: 'country-global',
        category: 'Software & Computer Science',
        country: { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL' },
        subjects: [
          { id: 'sub-fs-frontend', name: 'Modern React & TypeScript', slug: 'react-typescript' },
          { id: 'sub-fs-backend', name: 'Backend Architecture & Databases', slug: 'backend-databases' },
          { id: 'sub-fs-cloud', name: 'Cloud, CI/CD & Containers', slug: 'cloud-cicd' },
        ],
      },
      {
        id: 'exam-ai-ml-eng',
        name: 'Machine Learning & AI Engineering',
        slug: 'machine-learning-ai',
        description: 'Foundations of Machine Learning, Deep Neural Networks, Large Language Models (LLMs), and Production AI',
        countryId: 'country-global',
        category: 'Software & Computer Science',
        country: { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL' },
        subjects: [
          { id: 'sub-ml-foundations', name: 'Machine Learning Foundations', slug: 'ml-foundations' },
          { id: 'sub-dl-llm', name: 'Deep Learning & LLM Systems', slug: 'deep-learning-llms' },
        ],
      },
      {
        id: 'exam-sat',
        name: 'SAT',
        slug: 'sat',
        description: 'Digital SAT standardized entrance exam administered by College Board for US Undergraduate admissions',
        countryId: 'country-us',
        category: 'Global & College Entrance',
        country: { id: 'country-us', name: 'United States', code: 'US' },
        subjects: [
          { id: 'sub-sat-rw', name: 'Reading and Writing', slug: 'sat-reading-writing' },
          { id: 'sub-sat-math', name: 'Mathematics', slug: 'sat-math' },
        ],
      },
      {
        id: 'exam-gre-gen',
        name: 'GRE General Test',
        slug: 'gre-general',
        description: 'ETS Graduate Record Examination for master’s and doctoral programmes across international universities',
        countryId: 'country-us',
        category: 'Global & College Entrance',
        country: { id: 'country-us', name: 'United States', code: 'US' },
        subjects: [
          { id: 'sub-gre-verbal', name: 'Verbal Reasoning', slug: 'gre-verbal' },
          { id: 'sub-gre-quant', name: 'Quantitative Reasoning', slug: 'gre-quant' },
          { id: 'sub-gre-awa', name: 'Analytical Writing (AWA)', slug: 'gre-awa' },
        ],
      },
      {
        id: 'exam-mcat-us',
        name: 'MCAT',
        slug: 'mcat',
        description: 'Medical College Admission Test for medical schools in the United States and Canada',
        countryId: 'country-us',
        category: 'Medical & Healthcare',
        country: { id: 'country-us', name: 'United States', code: 'US' },
        subjects: [
          { id: 'sub-mcat-bio', name: 'Biological & Biochemical Foundations', slug: 'mcat-bio' },
          { id: 'sub-mcat-chem', name: 'Chemical & Physical Foundations', slug: 'mcat-chem-phys' },
          { id: 'sub-mcat-cars', name: 'Critical Analysis & Reasoning (CARS)', slug: 'mcat-cars' },
        ],
      },
      {
        id: 'exam-alevel',
        name: 'A-Level (Cambridge / Edexcel)',
        slug: 'a-level',
        description: 'General Certificate of Education Advanced Level recognized worldwide for university matriculation',
        countryId: 'country-gb',
        category: 'School Boards (K-12)',
        country: { id: 'country-gb', name: 'United Kingdom', code: 'GB' },
        subjects: [
          { id: 'sub-al-math', name: 'Mathematics & Mechanics', slug: 'a-level-math' },
          { id: 'sub-al-physics', name: 'Physics', slug: 'a-level-physics' },
          { id: 'sub-al-cs', name: 'Computer Science', slug: 'a-level-cs' },
        ],
      },
      {
        id: 'exam-ielts-acad',
        name: 'IELTS Academic',
        slug: 'ielts-academic',
        description: 'International English Language Testing System for higher education and global migration',
        countryId: 'country-gb',
        category: 'Global & College Entrance',
        country: { id: 'country-gb', name: 'United Kingdom', code: 'GB' },
        subjects: [
          { id: 'sub-ielts-reading', name: 'Reading Academic', slug: 'ielts-reading' },
          { id: 'sub-ielts-writing', name: 'Writing Task 1 & 2', slug: 'ielts-writing' },
          { id: 'sub-ielts-listening', name: 'Listening', slug: 'ielts-listening' },
          { id: 'sub-ielts-speaking', name: 'Speaking', slug: 'ielts-speaking' },
        ],
      },
      {
        id: 'exam-celpip',
        name: 'CELPIP General',
        slug: 'celpip-general',
        description: 'Canadian English Language Proficiency Index Program for Canadian Permanent Residency and citizenship',
        countryId: 'country-ca',
        category: 'Global & College Entrance',
        country: { id: 'country-ca', name: 'Canada', code: 'CA' },
        subjects: [
          { id: 'sub-celpip-read', name: 'Reading', slug: 'celpip-reading' },
          { id: 'sub-celpip-write', name: 'Writing', slug: 'celpip-writing' },
          { id: 'sub-celpip-listen', name: 'Listening & Speaking', slug: 'celpip-listen-speak' },
        ],
      },
      {
        id: 'exam-pte-acad',
        name: 'PTE Academic',
        slug: 'pte-academic',
        description: 'Pearson Test of English Academic for study abroad and immigration in Australia, New Zealand & UK',
        countryId: 'country-au',
        category: 'Global & College Entrance',
        country: { id: 'country-au', name: 'Australia', code: 'AU' },
        subjects: [
          { id: 'sub-pte-sw', name: 'Speaking & Writing', slug: 'pte-speaking-writing' },
          { id: 'sub-pte-reading', name: 'Reading', slug: 'pte-reading' },
          { id: 'sub-pte-listening', name: 'Listening', slug: 'pte-listening' },
        ],
      },
    ]

    let results = fallbackExams
    if (filters.countryId && filters.countryId !== 'all') {
      results = results.filter(e => e.countryId === filters.countryId)
    } else if (filters.country?.trim()) {
      results = results.filter(
        e => e.country.code.toLowerCase() === filters.country?.trim().toLowerCase()
      )
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase()
      results = results.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      )
    }
    return results
  }

  async getExamCurriculum(examId: string) {
    return this.getSubjects(examId)
  }

  async getSubjects(examId: string) {
    try {
      const dbSubjects = await prisma.subject.findMany({
        where: { examId, deletedAt: null },
        include: {
          topics: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { name: 'asc' },
      })
      if (dbSubjects && dbSubjects.length > 0) {
        return dbSubjects
      }
    } catch (err) {
      console.warn('[ExamContentService] Falling back to curated subjects:', err instanceof Error ? err.message : String(err))
    }

    const lowerId = examId.toLowerCase()

    if (lowerId.includes('jee-adv') || lowerId.includes('advanced')) {
      return [
        {
          id: 'sub-adv-phy',
          name: 'Advanced Physics',
          slug: 'jee-adv-physics',
          topics: [
            { id: 'top-ap-1', name: 'Advanced Mechanics & Angular Momentum', slug: 'adv-mechanics' },
            { id: 'top-ap-2', name: 'Electrodynamics & Maxwell Laws', slug: 'electrodynamics' },
            { id: 'top-ap-3', name: 'Wave Optics & Interference', slug: 'wave-optics' },
          ],
        },
        {
          id: 'sub-adv-chem',
          name: 'Advanced Chemistry',
          slug: 'jee-adv-chemistry',
          topics: [
            { id: 'top-ac-1', name: 'Organic Reaction Mechanisms & Stereochemistry', slug: 'organic-mechanisms' },
            { id: 'top-ac-2', name: 'Physical Chemistry & Electrochemistry', slug: 'electrochemistry' },
          ],
        },
        {
          id: 'sub-adv-math',
          name: 'Advanced Mathematics',
          slug: 'jee-adv-mathematics',
          topics: [
            { id: 'top-am-1', name: 'Advanced Real Analysis & Functions', slug: 'real-analysis' },
            { id: 'top-am-2', name: 'Complex Numbers & Polynomials', slug: 'complex-numbers' },
          ],
        },
      ]
    }

    if (lowerId.includes('jee') || lowerId.includes('main')) {
      return [
        {
          id: 'sub-jee-phy',
          name: 'Physics',
          slug: 'jee-main-physics',
          topics: [
            { id: 'top-1', name: 'Mechanics & Newton Laws', slug: 'mechanics-newton-laws' },
            { id: 'top-2', name: 'Work, Energy & Power', slug: 'work-energy-power' },
            { id: 'top-3', name: 'Rotational Dynamics', slug: 'rotational-dynamics' },
            { id: 'top-4', name: 'Electrostatics & Capacitance', slug: 'electrostatics' },
            { id: 'top-5', name: 'Optics (Ray & Wave)', slug: 'optics' },
            { id: 'top-6', name: 'Modern Physics & Semiconductors', slug: 'modern-physics' },
          ],
        },
        {
          id: 'sub-jee-chem',
          name: 'Chemistry',
          slug: 'jee-main-chemistry',
          topics: [
            { id: 'top-7', name: 'Chemical Bonding & Molecular Structure', slug: 'chemical-bonding' },
            { id: 'top-8', name: 'Chemical & Ionic Equilibrium', slug: 'equilibrium' },
            { id: 'top-9', name: 'Organic Chemistry Basics & GOC', slug: 'goc' },
            { id: 'top-10', name: 'Coordination Compounds', slug: 'coordination-compounds' },
          ],
        },
        {
          id: 'sub-jee-math',
          name: 'Mathematics',
          slug: 'jee-main-mathematics',
          topics: [
            { id: 'top-11', name: 'Calculus (Limits & Derivatives)', slug: 'calculus-derivatives' },
            { id: 'top-12', name: 'Integral Calculus', slug: 'integral-calculus' },
            { id: 'top-13', name: 'Coordinate Geometry (Conics)', slug: 'conic-sections' },
            { id: 'top-14', name: 'Vectors & 3D Geometry', slug: 'vectors-3d' },
            { id: 'top-15', name: 'Matrices & Determinants', slug: 'matrices' },
          ],
        },
      ]
    }

    if (lowerId.includes('neet')) {
      return [
        {
          id: 'sub-neet-bio',
          name: 'Biology (Botany & Zoology)',
          slug: 'neet-biology',
          topics: [
            { id: 'top-b1', name: 'Genetics & Molecular Basis of Inheritance', slug: 'genetics' },
            { id: 'top-b2', name: 'Human Physiology', slug: 'human-physiology' },
            { id: 'top-b3', name: 'Plant Physiology & Photosynthesis', slug: 'plant-physiology' },
            { id: 'top-b4', name: 'Ecology & Biodiversity', slug: 'ecology' },
            { id: 'top-b5', name: 'Cell Biology & Cell Cycle', slug: 'cell-biology' },
          ],
        },
        {
          id: 'sub-neet-phy',
          name: 'Physics for NEET',
          slug: 'neet-physics',
          topics: [
            { id: 'top-np1', name: 'Kinematics & Laws of Motion', slug: 'kinematics' },
            { id: 'top-np2', name: 'Current Electricity & Ray Optics', slug: 'current-optics' },
            { id: 'top-np3', name: 'Dual Nature of Radiation & Atoms', slug: 'dual-nature' },
          ],
        },
        {
          id: 'sub-neet-chem',
          name: 'Chemistry for NEET',
          slug: 'neet-chemistry',
          topics: [
            { id: 'top-nc1', name: 'Organic Chemistry & Biomolecules', slug: 'organic-biomolecules' },
            { id: 'top-nc2', name: 'Chemical Kinetics & Solutions', slug: 'kinetics-solutions' },
            { id: 'top-nc3', name: 'p-Block & Coordination Elements', slug: 'inorganic-blocks' },
          ],
        },
      ]
    }

    if (lowerId.includes('ssc')) {
      return [
        {
          id: 'sub-ssc-quant',
          name: 'Quantitative Aptitude',
          slug: 'ssc-quantitative-aptitude',
          topics: [
            { id: 'top-sq-1', name: 'Arithmetic (Percentage, Profit & Loss, SI/CI)', slug: 'arithmetic' },
            { id: 'top-sq-2', name: 'Time, Speed, Distance & Work', slug: 'time-work' },
            { id: 'top-sq-3', name: 'Advance Maths (Algebra, Trigonometry, Geometry)', slug: 'advance-maths' },
          ],
        },
        {
          id: 'sub-ssc-reasoning',
          name: 'General Intelligence & Reasoning',
          slug: 'ssc-reasoning',
          topics: [
            { id: 'top-sr-1', name: 'Analogies, Classification & Series', slug: 'analogies-series' },
            { id: 'top-sr-2', name: 'Blood Relations & Direction Sense', slug: 'relations-directions' },
            { id: 'top-sr-3', name: 'Syllogism, Venn Diagrams & Puzzles', slug: 'syllogism-puzzles' },
          ],
        },
        {
          id: 'sub-ssc-english',
          name: 'English Comprehension',
          slug: 'ssc-english',
          topics: [
            { id: 'top-se-1', name: 'Reading Comprehension & Cloze Test', slug: 'rc-cloze' },
            { id: 'top-se-2', name: 'Grammar (Spotting Errors, Sentence Improvement)', slug: 'grammar-errors' },
            { id: 'top-se-3', name: 'Vocabulary, Idioms & One-Word Substitution', slug: 'vocabulary-idioms' },
          ],
        },
        {
          id: 'sub-ssc-ga',
          name: 'General Awareness',
          slug: 'ssc-general-awareness',
          topics: [
            { id: 'top-sa-1', name: 'Indian Polity & Constitution', slug: 'polity-constitution' },
            { id: 'top-sa-2', name: 'Modern & Ancient Indian History', slug: 'history' },
            { id: 'top-sa-3', name: 'Geography & Economy Basics', slug: 'geography-economy' },
          ],
        },
      ]
    }

    if (lowerId.includes('upsc')) {
      return [
        {
          id: 'sub-upsc-gs1',
          name: 'General Studies Paper 1',
          slug: 'upsc-gs-1',
          topics: [
            { id: 'top-ug-1', name: 'Indian Polity, Governance & Judiciary', slug: 'polity-governance' },
            { id: 'top-ug-2', name: 'Indian History & Art and Culture', slug: 'history-culture' },
            { id: 'top-ug-3', name: 'Physical, Social & Economic Geography', slug: 'geography' },
            { id: 'top-ug-4', name: 'Macroeconomics, Sustainable Development & Budget', slug: 'economics' },
          ],
        },
        {
          id: 'sub-upsc-csat',
          name: 'CSAT (General Studies Paper 2)',
          slug: 'upsc-csat',
          topics: [
            { id: 'top-uc-1', name: 'Reading Comprehension & Critical Reasoning', slug: 'rc-critical' },
            { id: 'top-uc-2', name: 'Basic Numeracy & Data Interpretation', slug: 'numeracy' },
          ],
        },
      ]
    }

    if (lowerId.includes('gate')) {
      return [
        {
          id: 'sub-gate-dsa',
          name: 'Data Structures & Algorithms',
          slug: 'gate-dsa',
          topics: [
            { id: 'top-gd-1', name: 'Asymptotic Analysis & Recurrences', slug: 'asymptotic-analysis' },
            { id: 'top-gd-2', name: 'Trees, BSTs, Heaps & Graphs', slug: 'trees-heaps' },
            { id: 'top-gd-3', name: 'Dynamic Programming & Greedy Algorithms', slug: 'dp-greedy' },
          ],
        },
        {
          id: 'sub-gate-os',
          name: 'Operating Systems',
          slug: 'gate-os',
          topics: [
            { id: 'top-go-1', name: 'Processes, Threads & CPU Scheduling', slug: 'processes-scheduling' },
            { id: 'top-go-2', name: 'Process Synchronization & Semaphores', slug: 'synchronization' },
            { id: 'top-go-3', name: 'Deadlock Handling & Virtual Memory', slug: 'virtual-memory' },
          ],
        },
        {
          id: 'sub-gate-dbms',
          name: 'Database Management Systems',
          slug: 'gate-dbms',
          topics: [
            { id: 'top-gdb-1', name: 'Relational Model, SQL & Algebra', slug: 'sql-algebra' },
            { id: 'top-gdb-2', name: 'Normalization & Transactions', slug: 'normalization' },
          ],
        },
      ]
    }

    if (lowerId.includes('sat')) {
      return [
        {
          id: 'sub-sat-rw',
          name: 'Reading and Writing',
          slug: 'sat-reading-writing',
          topics: [
            { id: 'top-sr-1', name: 'Craft and Structure (Words in Context)', slug: 'craft-structure' },
            { id: 'top-sr-2', name: 'Information and Ideas (Evidence & Arguments)', slug: 'information-ideas' },
            { id: 'top-sr-3', name: 'Standard English Conventions', slug: 'conventions' },
          ],
        },
        {
          id: 'sub-sat-math',
          name: 'Mathematics',
          slug: 'sat-math',
          topics: [
            { id: 'top-sm-1', name: 'Algebra (Linear Equations & Systems)', slug: 'algebra' },
            { id: 'top-sm-2', name: 'Advanced Math (Quadratics & Polynomials)', slug: 'advanced-math' },
            { id: 'top-sm-3', name: 'Problem-Solving & Data Analysis', slug: 'data-analysis' },
          ],
        },
      ]
    }

    if ((lowerId.includes('cat') && !lowerId.includes('mcat')) || lowerId.includes('mba')) {
      return [
        {
          id: 'sub-cat-quant',
          name: 'Quantitative Aptitude (QA)',
          slug: 'cat-qa',
          topics: [
            { id: 'top-cq-1', name: 'Arithmetic (Averages, Ratios, Time-Work)', slug: 'cat-arithmetic' },
            { id: 'top-cq-2', name: 'Algebra & Higher Degree Polynomials', slug: 'cat-algebra' },
            { id: 'top-cq-3', name: 'Geometry & Modern Math', slug: 'cat-geometry' },
          ],
        },
        {
          id: 'sub-cat-dilr',
          name: 'Data Interpretation & Logical Reasoning (DILR)',
          slug: 'cat-dilr',
          topics: [
            { id: 'top-cd-1', name: 'Complex Caselets, Charts & Graphs', slug: 'caselets' },
            { id: 'top-cd-2', name: 'Seating Arrangements & Grid Logic', slug: 'arrangements' },
          ],
        },
        {
          id: 'sub-cat-varc',
          name: 'Verbal Ability & Reading Comprehension (VARC)',
          slug: 'cat-varc',
          topics: [
            { id: 'top-cv-1', name: 'Academic RC Passages', slug: 'rc-passages' },
            { id: 'top-cv-2', name: 'Parajumbles & Summary', slug: 'parajumbles' },
          ],
        },
      ]
    }

    if (lowerId.includes('gre')) {
      return [
        {
          id: 'sub-gre-verbal',
          name: 'Verbal Reasoning',
          slug: 'gre-verbal',
          topics: [
            { id: 'top-gv-1', name: 'Text Completion & Sentence Equivalence', slug: 'text-completion' },
            { id: 'top-gv-2', name: 'Critical Reasoning & Argument Analysis', slug: 'argument-analysis' },
            { id: 'top-gv-3', name: 'Advanced Analytical Reading Passages', slug: 'analytical-reading' },
          ],
        },
        {
          id: 'sub-gre-quant',
          name: 'Quantitative Reasoning',
          slug: 'gre-quant',
          topics: [
            { id: 'top-gq-1', name: 'Arithmetic & Number Theory', slug: 'gre-arithmetic' },
            { id: 'top-gq-2', name: 'Algebraic Equations & Functions', slug: 'gre-algebra' },
            { id: 'top-gq-3', name: 'Geometry & Coordinate Plane', slug: 'gre-geometry' },
            { id: 'top-gq-4', name: 'Data Analysis & Combinatorics', slug: 'gre-data-analysis' },
          ],
        },
        {
          id: 'sub-gre-awa',
          name: 'Analytical Writing (AWA)',
          slug: 'gre-awa',
          topics: [
            { id: 'top-gaw-1', name: 'Analyze an Issue Synthesis & Counterarguments', slug: 'analyze-issue' },
          ],
        },
      ]
    }

    if (lowerId.includes('gmat')) {
      return [
        {
          id: 'sub-gmat-quant',
          name: 'Quantitative Reasoning (Problem Solving)',
          slug: 'gmat-quant',
          topics: [
            { id: 'top-gmq-1', name: 'Advanced Number Properties & Fractions', slug: 'number-properties' },
            { id: 'top-gmq-2', name: 'Exponents, Roots & Inequalities', slug: 'inequalities' },
            { id: 'top-gmq-3', name: 'Word Problems & Rates/Work', slug: 'word-problems' },
          ],
        },
        {
          id: 'sub-gmat-verbal',
          name: 'Verbal Reasoning (Focus Edition)',
          slug: 'gmat-verbal',
          topics: [
            { id: 'top-gmv-1', name: 'Critical Reasoning (Assumptions & Weaken)', slug: 'critical-reasoning' },
            { id: 'top-gmv-2', name: 'Complex Business & Academic Reading Passages', slug: 'business-rc' },
          ],
        },
        {
          id: 'sub-gmat-di',
          name: 'Data Insights (DI)',
          slug: 'gmat-data-insights',
          topics: [
            { id: 'top-gmd-1', name: 'Data Sufficiency Logic', slug: 'data-sufficiency' },
            { id: 'top-gmd-2', name: 'Multi-Source Reasoning & Table Analysis', slug: 'multi-source' },
            { id: 'top-gmd-3', name: 'Two-Part Analysis & Graphics Interpretation', slug: 'two-part' },
          ],
        },
      ]
    }

    if (lowerId.includes('usmle')) {
      return [
        {
          id: 'sub-usmle-foundations',
          name: 'Foundational Biomedical Sciences',
          slug: 'usmle-foundations',
          topics: [
            { id: 'top-uf-1', name: 'Pathology & Cellular Injury', slug: 'general-pathology' },
            { id: 'top-uf-2', name: 'Physiology & Organ System Dynamics', slug: 'organ-physiology' },
            { id: 'top-uf-3', name: 'Pharmacology, Pharmacokinetics & Receptors', slug: 'pharmacology' },
            { id: 'top-uf-4', name: 'Biochemistry, Genetics & Molecular Biology', slug: 'molecular-genetics' },
          ],
        },
        {
          id: 'sub-usmle-organ-systems',
          name: 'Organ Systems & Clinical Pathophysiology',
          slug: 'usmle-organ-systems',
          topics: [
            { id: 'top-uo-1', name: 'Cardiovascular & Respiratory Systems', slug: 'cardio-pulmonary' },
            { id: 'top-uo-2', name: 'Renal, Urinary & Electrolyte Balance', slug: 'renal-electrolytes' },
            { id: 'top-uo-3', name: 'Gastrointestinal & Hepatobiliary', slug: 'gastro-hepatic' },
            { id: 'top-uo-4', name: 'Neurology & Special Senses', slug: 'neurology' },
          ],
        },
        {
          id: 'sub-usmle-micro-immuno',
          name: 'Microbiology, Immunology & Public Health',
          slug: 'usmle-micro-immuno',
          topics: [
            { id: 'top-um-1', name: 'Immunology, Hypersensitivity & Vaccines', slug: 'immunology' },
            { id: 'top-um-2', name: 'Bacteriology, Virology, Mycology & Parasitology', slug: 'medical-micro' },
            { id: 'top-um-3', name: 'Biostatistics, Epidemiology & Medical Ethics', slug: 'epidemiology-ethics' },
          ],
        },
      ]
    }

    if (lowerId.includes('mcat')) {
      return [
        {
          id: 'sub-mcat-cp',
          name: 'Chemical and Physical Foundations of Biological Systems (CPBS)',
          slug: 'mcat-cpbs',
          topics: [
            { id: 'top-mc-1', name: 'General & Organic Chemistry Mechanisms', slug: 'organic-mechanisms' },
            { id: 'top-mc-2', name: 'Thermodynamics, Electrochemistry & Kinetics', slug: 'thermodynamics' },
            { id: 'top-mc-3', name: 'Newtonian Fluids, Optics & Electrostatics', slug: 'fluids-optics' },
          ],
        },
        {
          id: 'sub-mcat-bb',
          name: 'Biological and Biochemical Foundations of Living Systems (BBLS)',
          slug: 'mcat-bbls',
          topics: [
            { id: 'top-mb-1', name: 'Enzyme Kinetics (Michaelis-Menten & Lineweaver-Burk)', slug: 'enzyme-kinetics' },
            { id: 'top-mb-2', name: 'Metabolism: Glycolysis, Krebs & Oxidative Phosphorylation', slug: 'cellular-metabolism' },
            { id: 'top-mb-3', name: 'Molecular Genetics, Transcription & Epigenetics', slug: 'transcription-epigenetics' },
          ],
        },
        {
          id: 'sub-mcat-cars',
          name: 'Critical Analysis and Reasoning Skills (CARS)',
          slug: 'mcat-cars',
          topics: [
            { id: 'top-mr-1', name: 'Humanities & Social Science Analytical Passages', slug: 'humanities-passages' },
            { id: 'top-mr-2', name: 'Author Voice, Tone, Underlying Rhetoric & Inferences', slug: 'rhetoric-inferences' },
          ],
        },
        {
          id: 'sub-mcat-ps',
          name: 'Psychological, Social, and Biological Foundations of Behavior (PSBB)',
          slug: 'mcat-psbb',
          topics: [
            { id: 'top-mp-1', name: 'Cognitive Psychology, Perception & Memory Models', slug: 'cognitive-psych' },
            { id: 'top-mp-2', name: 'Social Stratification, Demographics & Sociology', slug: 'sociology-demographics' },
          ],
        },
      ]
    }

    // Default Software Engineering & DSA fallback
    return [
      {
        id: 'sub-dsa-core',
        name: 'Data Structures & Algorithms',
        slug: 'dsa-core',
        topics: [
          { id: 'top-d1', name: 'Arrays, Two Pointers & Sliding Window', slug: 'arrays-two-pointers' },
          { id: 'top-d2', name: 'Binary Trees & BSTs', slug: 'trees-bst' },
          { id: 'top-d3', name: 'Graph Algorithms (BFS, DFS, Dijkstra)', slug: 'graphs' },
          { id: 'top-d4', name: 'Dynamic Programming (1D, 2D)', slug: 'dp' },
        ],
      },
      {
        id: 'sub-sys-design',
        name: 'System Design & Architecture',
        slug: 'system-design',
        topics: [
          { id: 'top-s1', name: 'Load Balancing & Horizontal Scaling', slug: 'load-balancing' },
          { id: 'top-s2', name: 'Database Sharding, Replication & CAP', slug: 'database-scaling' },
          { id: 'top-s3', name: 'Caching (Redis) & Message Queues', slug: 'caching-queues' },
        ],
      },
      {
        id: 'sub-cs-fund',
        name: 'Core Computer Science',
        slug: 'core-cs-fundamentals',
        topics: [
          { id: 'top-c1', name: 'Operating Systems (Processes, Threads)', slug: 'os-fundamentals' },
          { id: 'top-c2', name: 'DBMS & ACID Transactions', slug: 'dbms' },
          { id: 'top-c3', name: 'Computer Networks (TCP/IP, HTTP/3)', slug: 'networks' },
        ],
      },
    ]
  }
}
