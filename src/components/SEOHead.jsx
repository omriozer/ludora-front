import { Helmet } from 'react-helmet-async';

/**
 * SEOHead component for managing document head tags
 * Supports both Hebrew and English content with proper direction handling
 *
 * @param {Object} props
 * @param {string} props.title - Page title (will append " | Ludora")
 * @param {string} props.description - Meta description for the page
 * @param {string} props.keywords - Meta keywords (comma-separated)
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.url - Canonical URL for the page
 * @param {string} props.type - Open Graph type (default: "website")
 * @param {string} props.locale - Page locale (default: "he_IL")
 * @param {string} props.author - Page author
 * @param {Object} props.structuredData - JSON-LD structured data
 * @param {boolean} props.noIndex - Prevent search engine indexing
 * @param {boolean} props.noFollow - Prevent following links
 * @param {string} props.themeColor - Browser theme color
 * @param {Array} props.alternateLanguages - Array of {href, hreflang} objects
 * @param {string} props.siteName - Site name override (default: "Ludora")
 */
const SEOHead = ({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  locale = "he_IL",
  author = "Ludora",
  structuredData,
  noIndex = false,
  noFollow = false,
  themeColor = "#3B82F6",
  alternateLanguages = [],
  siteName = "Ludora"
}) => {
  // Generate full title with site name
  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  // Default description if not provided
  const defaultDescription = locale === 'he_IL'
    ? "פלטפורמת לימוד דיגיטלית מתקדמת למורים ותלמידים. יצירה ושיתוף של תכנים חינוכיים, משחקים אינטראקטיביים ותוכניות לימוד מותאמות אישית."
    : "Advanced digital learning platform for teachers and students. Create and share educational content, interactive games, and personalized curricula.";

  const metaDescription = description || defaultDescription;

  // Default keywords if not provided
  const defaultKeywords = locale === 'he_IL'
    ? "חינוך, לימוד דיגיטלי, משחקים חינוכיים, פלטפורמת לימוד, מורים, תלמידים, תכנים חינוכיים, למידה אינטראקטיבית"
    : "education, digital learning, educational games, learning platform, teachers, students, educational content, interactive learning";

  const metaKeywords = keywords || defaultKeywords;

  // Default image if not provided
  const ogImage = image || `${url ? new URL(url).origin : 'https://ludora.app'}/images/og-default.jpg`;

  // Canonical URL handling
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://ludora.app');

  // Robots directive
  const robotsContent = `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <meta name="theme-color" content={themeColor} />

      {/* Language and Direction */}
      <html lang={locale === 'he_IL' ? 'he' : 'en'} dir={locale === 'he_IL' ? 'rtl' : 'ltr'} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Alternate Language Links */}
      {alternateLanguages.map((alt) => (
        <link key={alt.hreflang} rel="alternate" hrefLang={alt.hreflang} href={alt.href} />
      ))}

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@ludora" />
      <meta name="twitter:creator" content="@ludora" />

      {/* Additional Meta Tags */}
      <meta property="article:author" content={author} />
      <meta name="format-detection" content="telephone=no" />
      <meta name="msapplication-TileColor" content={themeColor} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

      {/* Preconnect to External Resources */}
      <link rel="preconnect" href="https://api.ludora.app" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* DNS Prefetch for Performance */}
      <link rel="dns-prefetch" href="//api.ludora.app" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//cdn.ludora.app" />
    </Helmet>
  );
};

export default SEOHead;