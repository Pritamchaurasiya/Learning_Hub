/**
 * Schema.org JSON-LD Structured Data Generators for LearningHub
 * Produces compliant, rich-result-eligible structured data for Google & search crawlers.
 */

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface CourseSchemaInput {
  title: string
  description?: string
  slug?: string
  id?: string
  thumbnail?: string
  instructor?: string
  price?: number | string
  currency?: string
  rating?: number
  reviewCount?: number
  courseMode?: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface PricingTierSchemaInput {
  name: string
  price: number | string
  currency?: string
  description?: string
  features?: string[]
}

const BASE_URL = typeof window !== 'undefined' && window.location.origin
  ? window.location.origin
  : 'https://learninghub.app'

/**
 * EducationalOrganization Knowledge Graph schema for company branding
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${BASE_URL}/#organization`,
    name: 'LearningHub',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description:
      'Premier software engineering learning platform and competitive exam practice OS offering chapter-wise PYQs, interactive DSA problem workspaces, and AI tutoring.',
    sameAs: [
      'https://github.com/learninghub',
      'https://twitter.com/learninghub_app',
      'https://linkedin.com/company/learninghub-app',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@learninghub.app',
      availableLanguage: ['English', 'Hindi'],
    },
  }
}

/**
 * WebSite schema with Sitelinks SearchBox Action
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'LearningHub',
    url: BASE_URL,
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/library?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Course Schema with syllabus, instructor, price, and aggregate rating
 */
export function getCourseSchema(course: CourseSchemaInput) {
  const courseUrl = course.slug ? `${BASE_URL}/course/${course.slug}` : `${BASE_URL}/course/${course.id || ''}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${courseUrl}#course`,
    name: course.title,
    description: course.description || `${course.title} engineering masterclass on LearningHub.`,
    provider: {
      '@id': `${BASE_URL}/#organization`,
    },
    educationalLevel: 'Beginner to Advanced',
    inLanguage: 'en',
    image: course.thumbnail || `${BASE_URL}/og-image.png`,
    instructor: {
      '@type': 'Person',
      name: course.instructor || 'Senior Technical Faculty',
      jobTitle: 'Software Architect & Educator',
    },
    offers: {
      '@type': 'Offer',
      price: course.price !== undefined ? String(course.price) : '0',
      priceCurrency: course.currency || 'USD',
      category: 'OnlineCourse',
      availability: 'https://schema.org/InStock',
      url: courseUrl,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(course.rating || 4.9),
      bestRating: '5.0',
      ratingCount: course.reviewCount || 1250,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: course.courseMode || 'Online',
      courseWorkload: 'PT20H',
      educationalCredentialAwarded: 'Certificate of Engineering Mastery',
    },
  }
}

/**
 * FAQPage Schema for high-converting rich snippets with questions and answers
 */
export function getFAQSchema(faqs?: FAQItem[]) {
  const defaultFaqs: FAQItem[] = [
    {
      question: 'What is LearningHub?',
      answer:
        'LearningHub is a comprehensive engineering and competitive exam practice OS offering 100,000+ chapter-wise previous year questions, interactive DSA problem solving, and an adaptive CAT testing engine.',
    },
    {
      question: 'Which exams and coding subjects are covered?',
      answer:
        'LearningHub covers Data Structures & Algorithms, System Design, Full-Stack Development, plus JEE Main, JEE Advanced, NEET, and BITSAT with step-by-step solutions and AI mentoring.',
    },
    {
      question: 'Can I practice questions and take mock tests for free?',
      answer:
        'Yes, LearningHub provides generous free tier access across foundational courses, DSA challenges, and standard mock assessments. Pro tiers offer unlimited AI tutoring and verified certifications.',
    },
    {
      question: 'Does LearningHub provide verified certificates?',
      answer:
        'Yes, upon completing eligible course paths and adaptive test benchmarks, you receive cryptographically verifiable certificates with W3C-standard digital credentials.',
    },
  ]

  const items = faqs && faqs.length > 0 ? faqs : defaultFaqs

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * BreadcrumbList Schema for displaying clean hierarchical breadcrumbs in Google SERP
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  }
}

/**
 * Product & AggregateOffer Schema for Pricing & Plans
 */
export function getProductSchema(tiers?: PricingTierSchemaInput[]) {
  const offers = (tiers && tiers.length > 0)
    ? tiers.map(t => ({
        '@type': 'Offer',
        name: t.name,
        price: String(t.price),
        priceCurrency: t.currency || 'USD',
        availability: 'https://schema.org/InStock',
        description: t.description || `LearningHub ${t.name} Membership`,
      }))
    : [
        {
          '@type': 'Offer',
          name: 'Free Tier',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Pro Plan',
          price: '19',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Tests A+ Elite',
          price: '49',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
      ]

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'LearningHub Membership & Engineering Curriculum',
    description:
      'Access 70+ engineering masterclasses, unlimited AI chat mentoring, adaptive CAT mock tests, and verifiable credentials.',
    brand: {
      '@type': 'Brand',
      name: 'LearningHub',
    },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '49',
      priceCurrency: 'USD',
      offerCount: offers.length,
      offers,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: 3840,
    },
  }
}

/**
 * SoftwareApplication Schema
 */
export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LearningHub Platform',
    operatingSystem: 'Web, Windows, macOS, Android, iOS',
    applicationCategory: 'EducationalApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: 16800,
    },
    featureList: [
      'Interactive Code Workspace with Multi-Language Compiler',
      '100,000+ Previous Year Questions with In-Depth Solutions',
      'Adaptive Computerized Testing (3PL Item Response Theory)',
      'Socratic Neural AI Tutor and Spaced Repetition Flashcards',
      'Verifiable Skill Badges and Digital Portfolio Credentials',
    ],
  }
}
