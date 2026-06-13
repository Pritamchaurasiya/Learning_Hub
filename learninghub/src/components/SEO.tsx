import React from 'react'
import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: string
  noindex?: boolean
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Your personal learning journey platform.',
  keywords = 'learning, education, courses, dsa, coding, tests',
  image = '/logo.png', // Ensure this points to a valid public asset
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  noindex = false,
}) => {
  const siteTitle = title.includes('LearningHub') ? title : `${title} | LearningHub`

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Indexing */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  )
}
