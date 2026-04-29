import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'course';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  canonical?: string;
  children?: ReactNode;
}

const defaultSEO = {
  title: 'LearningHub - Master Programming & DSA',
  description: 'Learn programming, data structures, algorithms, and more with interactive courses, quizzes, and practice problems. AI-powered personalized learning experience.',
  keywords: 'programming, DSA, data structures, algorithms, coding, learn to code, online courses, Python, JavaScript, Java',
  image: 'https://learninghub.com/og-image.jpg',
  url: 'https://learninghub.com',
  type: 'website' as const,
  author: 'LearningHub Team',
};

export function SEO({
  title = defaultSEO.title,
  description = defaultSEO.description,
  keywords = defaultSEO.keywords,
  image = defaultSEO.image,
  url = defaultSEO.url,
  type = defaultSEO.type,
  author = defaultSEO.author,
  publishedTime,
  modifiedTime,
  noindex = false,
  canonical,
  children,
}: SEOProps) {
  const fullTitle = title === defaultSEO.title ? title : `${title} | LearningHub`;

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta name="googlebot" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="LearningHub" />
      <meta property="og:locale" content="en_US" />

      {/* Article Specific */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@learninghub" />

      {/* Mobile & PWA */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="theme-color" content="#7C3AED" />
      <meta name="msapplication-TileColor" content="#7C3AED" />

      {/* Structured Data - Website */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'LearningHub',
          url: 'https://learninghub.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://learninghub.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        })}
      </script>

      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'LearningHub',
          url: 'https://learninghub.com',
          logo: 'https://learninghub.com/logo.png',
          sameAs: [
            'https://twitter.com/learninghub',
            'https://github.com/learninghub',
            'https://linkedin.com/company/learninghub',
          ],
        })}
      </script>
      {children}
    </Helmet>
  );
}

// Course-specific SEO component
export function CourseSEO({
  title,
  description,
  image,
  url,
  author,
  difficulty,
  duration,
  rating,
  reviewCount,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  author: string;
  difficulty: string;
  duration: string;
  rating?: number;
  reviewCount?: number;
}) {
  return (
    <>
      <SEO
        title={title}
        description={description}
        image={image}
        url={url}
        type="article"
        author={author}
      />
      <Helmet>
        {/* Course Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: title,
            description: description,
            provider: {
              '@type': 'Organization',
              name: 'LearningHub',
              sameAs: 'https://learninghub.com',
            },
            author: {
              '@type': 'Person',
              name: author,
            },
            educationalLevel: difficulty,
            timeRequired: duration,
            ...(rating && reviewCount && {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: rating.toString(),
                reviewCount: reviewCount.toString(),
              },
            }),
          })}
        </script>
      </Helmet>
    </>
  );
}
