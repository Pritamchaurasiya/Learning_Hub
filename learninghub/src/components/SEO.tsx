import React from 'react'
import { Helmet } from 'react-helmet-async'

export interface SEOProps {
  title: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  canonical?: string
  type?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
  googleVerification?: string
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Master software engineering, Data Structures & Algorithms, and competitive exams with LearningHub. Practice 100,000+ chapter-wise PYQs with detailed AI solutions.',
  keywords = 'software engineering, learning platform, DSA practice, coding interview, JEE Main, NEET, algorithms, system design, mock tests',
  image = '/og-image.png',
  url,
  canonical,
  type = 'website',
  noindex = false,
  jsonLd,
  googleVerification,
}) => {
  const siteTitle = title.includes('LearningHub') ? title : `${title} | LearningHub`

  // Compute canonical URL: clean origin + pathname without query string contamination
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://learninghub.app'

  const currentPath =
    typeof window !== 'undefined' && window.location.pathname
      ? window.location.pathname
      : '/'

  const canonicalUrl = canonical || `${currentOrigin}${currentPath}`
  const pageUrl = url || canonicalUrl

  // Absolute image URL for social media scrapers
  const absoluteImage = image.startsWith('http')
    ? image
    : `${currentOrigin}${image.startsWith('/') ? '' : '/'}${image}`

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Canonical Tag - Solves split ranking & duplicate URLs */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Search Engine Crawl Directives */}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Google Search Console Verification */}
      {googleVerification && (
        <meta name="google-site-verification" content={googleVerification} />
      )}

      {/* Open Graph / Facebook / LinkedIn / WhatsApp */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="LearningHub" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content="LearningHub - Engineering & Practice Platform" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@learninghub_app" />
      <meta name="twitter:creator" content="@learninghub_app" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      <meta name="twitter:image:alt" content="LearningHub - Engineering & Practice Platform" />

      {/* Schema.org JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
