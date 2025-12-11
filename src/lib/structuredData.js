/**
 * Structured Data Library for Ludora Educational Platform
 * Generates schema.org JSON-LD markup for educational content
 *
 * @see https://schema.org/
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

/**
 * Base organization schema for Ludora
 */
export const getLudoraOrganization = () => ({
  "@type": "EducationalOrganization",
  "@id": "https://ludora.app/#organization",
  "name": "Ludora",
  "url": "https://ludora.app",
  "logo": "https://ludora.app/images/logo.png",
  "description": "פלטפורמת לימוד דיגיטלית מתקדמת למורים ותלמידים. יצירה ושיתוף של תכנים חינוכיים, משחקים אינטראקטיביים ותוכניות לימוד מותאמות אישית.",
  "foundingDate": "2020",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "IL",
    "addressLocality": "Israel"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "url": "https://ludora.app/contact",
    "availableLanguage": ["Hebrew", "English"]
  },
  "sameAs": [
    "https://www.linkedin.com/company/ludora",
    "https://www.facebook.com/ludora",
    "https://twitter.com/ludora"
  ]
});

/**
 * Website schema for Ludora
 */
export const getLudoraWebsite = () => ({
  "@type": "WebSite",
  "@id": "https://ludora.app/#website",
  "name": "Ludora",
  "url": "https://ludora.app",
  "description": "פלטפורמת לימוד דיגיטלית מתקדמת למורים ותלמידים",
  "publisher": {
    "@id": "https://ludora.app/#organization"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://ludora.app/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  },
  "inLanguage": ["he", "en"]
});

/**
 * Generate structured data for educational games
 * @param {Object} game - Game object
 * @param {string} gameUrl - Full URL to the game page
 */
export const generateGameStructuredData = (game, gameUrl) => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": "Game",
    "@id": gameUrl,
    "name": game.title,
    "description": stripHtml(game.description || ''),
    "url": gameUrl,
    "gameLocation": "Online",
    "applicationCategory": "EducationalGame",
    "operatingSystem": "Web Browser",
    "inLanguage": "he",
    "isAccessibleForFree": game.price ? false : true,
    "author": {
      "@type": "Person",
      "name": game.creator?.display_name || "Ludora Teacher"
    },
    "publisher": getLudoraOrganization(),
    "dateCreated": game.created_at,
    "dateModified": game.updated_at
  };

  // Add game-specific properties
  if (game.difficulty) {
    baseData.contentRating = mapDifficultyToRating(game.difficulty);
  }

  if (game.max_players) {
    baseData.numberOfPlayers = {
      "@type": "QuantitativeValue",
      "minValue": 1,
      "maxValue": game.max_players
    };
  }

  // Add educational alignment if available
  if (game.educational_level || game.subject) {
    baseData.educationalAlignment = generateEducationalAlignment(game);
  }

  // Add pricing information
  if (game.price && game.price > 0) {
    baseData.offers = {
      "@type": "Offer",
      "price": game.price,
      "priceCurrency": "ILS",
      "availability": game.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": game.created_at
    };
  }

  return baseData;
};

/**
 * Generate structured data for educational files/resources
 * @param {Object} file - File object
 * @param {string} fileUrl - Full URL to the file page
 */
export const generateFileStructuredData = (file, fileUrl) => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": fileUrl,
    "name": file.title,
    "description": stripHtml(file.description || ''),
    "url": fileUrl,
    "learningResourceType": mapFileTypeToLearningType(file.file_type),
    "educationalUse": "instruction",
    "isAccessibleForFree": file.price ? false : true,
    "inLanguage": "he",
    "author": {
      "@type": "Person",
      "name": file.creator?.display_name || "Ludora Teacher"
    },
    "publisher": getLudoraOrganization(),
    "dateCreated": file.created_at,
    "dateModified": file.updated_at
  };

  // Add file format information
  if (file.file_type) {
    baseData.encodingFormat = file.file_type;
  }

  // Add educational alignment
  if (file.educational_level || file.subject) {
    baseData.educationalAlignment = generateEducationalAlignment(file);
  }

  // Add pricing information
  if (file.price && file.price > 0) {
    baseData.offers = {
      "@type": "Offer",
      "price": file.price,
      "priceCurrency": "ILS",
      "availability": file.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": file.created_at
    };
  }

  return baseData;
};

/**
 * Generate structured data for lesson plans
 * @param {Object} lessonPlan - Lesson plan object
 * @param {string} lessonPlanUrl - Full URL to the lesson plan page
 */
export const generateLessonPlanStructuredData = (lessonPlan, lessonPlanUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "LessonPlan",
    "@id": lessonPlanUrl,
    "name": lessonPlan.title,
    "description": stripHtml(lessonPlan.description || ''),
    "url": lessonPlanUrl,
    "learningResourceType": "LessonPlan",
    "educationalUse": "instruction",
    "isAccessibleForFree": lessonPlan.price ? false : true,
    "inLanguage": "he",
    "author": {
      "@type": "Person",
      "name": lessonPlan.creator?.display_name || "Ludora Teacher"
    },
    "publisher": getLudoraOrganization(),
    "dateCreated": lessonPlan.created_at,
    "dateModified": lessonPlan.updated_at,
    "educationalAlignment": generateEducationalAlignment(lessonPlan),
    "timeRequired": lessonPlan.duration ? `PT${lessonPlan.duration}M` : "PT45M", // Default 45 minutes
    "offers": lessonPlan.price && lessonPlan.price > 0 ? {
      "@type": "Offer",
      "price": lessonPlan.price,
      "priceCurrency": "ILS",
      "availability": lessonPlan.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": lessonPlan.created_at
    } : undefined
  };
};

/**
 * Generate structured data for workshops
 * @param {Object} workshop - Workshop object
 * @param {string} workshopUrl - Full URL to the workshop page
 */
export const generateWorkshopStructuredData = (workshop, workshopUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": workshopUrl,
    "name": workshop.title,
    "description": stripHtml(workshop.description || ''),
    "url": workshopUrl,
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "startDate": workshop.start_date || new Date().toISOString(),
    "duration": workshop.duration ? `PT${workshop.duration}M` : "PT120M", // Default 2 hours
    "inLanguage": "he",
    "organizer": getLudoraOrganization(),
    "performer": {
      "@type": "Person",
      "name": workshop.creator?.display_name || "Ludora Instructor"
    },
    "location": {
      "@type": "VirtualLocation",
      "url": workshopUrl
    },
    "isAccessibleForFree": workshop.price ? false : true,
    "educationalCredentialAwarded": "Certificate of Completion",
    "audience": {
      "@type": "EducationalAudience",
      "educationalRole": "teacher"
    },
    "offers": workshop.price && workshop.price > 0 ? {
      "@type": "Offer",
      "price": workshop.price,
      "priceCurrency": "ILS",
      "availability": workshop.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": workshop.created_at
    } : undefined
  };
};

/**
 * Generate structured data for courses
 * @param {Object} course - Course object
 * @param {string} courseUrl - Full URL to the course page
 */
export const generateCourseStructuredData = (course, courseUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": courseUrl,
    "name": course.title,
    "description": stripHtml(course.description || ''),
    "url": courseUrl,
    "provider": getLudoraOrganization(),
    "instructor": {
      "@type": "Person",
      "name": course.creator?.display_name || "Ludora Instructor"
    },
    "inLanguage": "he",
    "courseMode": "online",
    "educationalCredentialAwarded": "Course Completion Certificate",
    "audience": {
      "@type": "EducationalAudience",
      "educationalRole": "student"
    },
    "numberOfCredits": course.credits || 1,
    "timeRequired": course.duration ? `PT${course.duration}H` : "PT10H", // Default 10 hours
    "isAccessibleForFree": course.price ? false : true,
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "startDate": course.start_date || new Date().toISOString(),
      "endDate": course.end_date
    },
    "offers": course.price && course.price > 0 ? {
      "@type": "Offer",
      "price": course.price,
      "priceCurrency": "ILS",
      "availability": course.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": course.created_at
    } : undefined
  };
};

/**
 * Generate structured data for tools
 * @param {Object} tool - Tool object
 * @param {string} toolUrl - Full URL to the tool page
 */
export const generateToolStructuredData = (tool, toolUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": toolUrl,
    "name": tool.title,
    "description": stripHtml(tool.description || ''),
    "url": toolUrl,
    "applicationCategory": "EducationalApplication",
    "applicationSubCategory": "TeachingTool",
    "operatingSystem": "Web Browser",
    "isAccessibleForFree": tool.price ? false : true,
    "inLanguage": "he",
    "author": {
      "@type": "Person",
      "name": tool.creator?.display_name || "Ludora Developer"
    },
    "publisher": getLudoraOrganization(),
    "dateCreated": tool.created_at,
    "dateModified": tool.updated_at,
    "featureList": tool.features ? tool.features.split(',').map(f => f.trim()) : undefined,
    "offers": tool.price && tool.price > 0 ? {
      "@type": "Offer",
      "price": tool.price,
      "priceCurrency": "ILS",
      "availability": tool.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": tool.created_at
    } : undefined
  };
};

/**
 * Generate structured data for bundle products
 * @param {Object} bundle - Bundle object
 * @param {string} bundleUrl - Full URL to the bundle page
 */
export const generateBundleStructuredData = (bundle, bundleUrl) => {
  const bundleItems = bundle.type_attributes?.bundle_items || [];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": bundleUrl,
    "name": bundle.title,
    "description": stripHtml(bundle.description || ''),
    "url": bundleUrl,
    "category": "Educational Bundle",
    "brand": getLudoraOrganization(),
    "isBundle": true,
    "includesObject": bundleItems.map((item, index) => ({
      "@type": "Product",
      "name": `Bundle Item ${index + 1}`,
      "category": item.product_type
    })),
    "aggregateRating": bundle.average_rating ? {
      "@type": "AggregateRating",
      "ratingValue": bundle.average_rating,
      "reviewCount": bundle.review_count || 1
    } : undefined,
    "offers": {
      "@type": "Offer",
      "price": bundle.price,
      "priceCurrency": "ILS",
      "availability": bundle.is_published ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "validFrom": bundle.created_at,
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": bundle.price,
        "priceCurrency": "ILS"
      }
    },
    "author": {
      "@type": "Person",
      "name": bundle.creator?.display_name || "Ludora Teacher"
    },
    "publisher": getLudoraOrganization(),
    "dateCreated": bundle.created_at,
    "dateModified": bundle.updated_at
  };
};

/**
 * Generate structured data for user profiles
 * @param {Object} user - User object
 * @param {string} userUrl - Full URL to the user profile page
 */
export const generateUserProfileStructuredData = (user, userUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": userUrl,
    "name": user.display_name,
    "url": userUrl,
    "jobTitle": user.role === 'teacher' ? 'Teacher' : 'Student',
    "worksFor": getLudoraOrganization(),
    "memberOf": {
      "@type": "Organization",
      "name": "Ludora Community"
    },
    "alumniOf": user.school ? {
      "@type": "EducationalOrganization",
      "name": user.school
    } : undefined,
    "knowsAbout": user.subjects ? user.subjects.split(',').map(s => s.trim()) : undefined
  };
};

/**
 * Generate breadcrumb structured data
 * @param {Array} breadcrumbs - Array of breadcrumb items {name, url}
 */
export const generateBreadcrumbStructuredData = (breadcrumbs) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
};

/**
 * Generate FAQ structured data
 * @param {Array} faqs - Array of FAQ items {question, answer}
 */
export const generateFAQStructuredData = (faqs) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

/**
 * Generate search results structured data
 * @param {Array} results - Array of search result items
 * @param {string} query - Search query
 */
export const generateSearchResultsStructuredData = (results, query) => {
  return {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": results.length,
      "itemListElement": results.map((result, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": result.url,
        "name": result.title,
        "description": result.description
      }))
    },
    "potentialAction": {
      "@type": "SearchAction",
      "query": query,
      "object": {
        "@type": "WebPage",
        "url": `https://ludora.app/search?q=${encodeURIComponent(query)}`
      }
    }
  };
};

/**
 * Generate item list structured data for catalog pages
 * @param {Array} items - Array of items with position, name, url, image, description
 * @param {string} listName - Name of the list
 */
export const generateItemListStructuredData = (items, listName) => {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": listName,
    "numberOfItems": items.length,
    "itemListElement": items.map((item) => ({
      "@type": "ListItem",
      "position": item.position,
      "item": {
        "@type": "Product",
        "name": item.name,
        "url": item.url,
        "image": item.image,
        "description": stripHtml(item.description || ''),
        "publisher": getLudoraOrganization()
      }
    }))
  };
};

/**
 * Helper function to strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtml(html) {
  if (!html) return '';
  if (typeof document === 'undefined') {
    // Server-side fallback - basic HTML removal
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

/**
 * Map game difficulty to content rating
 * @param {string} difficulty - Game difficulty
 * @returns {string} Content rating
 */
function mapDifficultyToRating(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'EVERYONE';
    case 'medium':
      return 'EVERYONE_10_PLUS';
    case 'hard':
      return 'TEEN';
    default:
      return 'EVERYONE';
  }
}

/**
 * Map file type to learning resource type
 * @param {string} fileType - File MIME type
 * @returns {string} Learning resource type
 */
function mapFileTypeToLearningType(fileType) {
  if (!fileType) return 'text';

  const typeMappings = {
    'application/pdf': 'text',
    'image/': 'image',
    'video/': 'video',
    'audio/': 'audio',
    'application/vnd.ms-powerpoint': 'presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
    'application/vnd.ms-excel': 'dataset',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'dataset',
    'text/': 'text'
  };

  for (const [type, resourceType] of Object.entries(typeMappings)) {
    if (fileType.startsWith(type)) {
      return resourceType;
    }
  }

  return 'text';
}

/**
 * Generate educational alignment object
 * @param {Object} item - Content item with educational properties
 * @returns {Object} Educational alignment schema
 */
function generateEducationalAlignment(item) {
  const alignment = {
    "@type": "AlignmentObject",
    "alignmentType": "educationalLevel",
    "educationalFramework": "Israeli Education System"
  };

  if (item.educational_level) {
    alignment.targetName = item.educational_level;
    alignment.targetDescription = `Content suitable for ${item.educational_level}`;
  }

  if (item.subject) {
    alignment.targetSubject = item.subject;
  }

  if (item.learning_objectives) {
    alignment.targetDescription = item.learning_objectives;
  }

  return alignment;
}

/**
 * Generate complete page structured data with multiple schemas
 * @param {Object} options - Configuration object
 * @returns {Array} Array of structured data objects
 */
export const generatePageStructuredData = (options) => {
  const {
    pageType,
    content,
    url,
    breadcrumbs,
    faqs,
    searchResults,
    searchQuery
  } = options;

  const schemas = [];

  // Always include organization and website
  schemas.push(getLudoraOrganization());
  schemas.push(getLudoraWebsite());

  // Add content-specific schema
  if (content) {
    switch (pageType) {
      case 'game':
        schemas.push(generateGameStructuredData(content, url));
        break;
      case 'file':
        schemas.push(generateFileStructuredData(content, url));
        break;
      case 'lesson_plan':
        schemas.push(generateLessonPlanStructuredData(content, url));
        break;
      case 'workshop':
        schemas.push(generateWorkshopStructuredData(content, url));
        break;
      case 'course':
        schemas.push(generateCourseStructuredData(content, url));
        break;
      case 'tool':
        schemas.push(generateToolStructuredData(content, url));
        break;
      case 'bundle':
        schemas.push(generateBundleStructuredData(content, url));
        break;
      case 'user':
        schemas.push(generateUserProfileStructuredData(content, url));
        break;
    }
  }

  // Add breadcrumbs if provided
  if (breadcrumbs && breadcrumbs.length > 1) {
    schemas.push(generateBreadcrumbStructuredData(breadcrumbs));
  }

  // Add FAQ if provided
  if (faqs && faqs.length > 0) {
    schemas.push(generateFAQStructuredData(faqs));
  }

  // Add search results if provided
  if (searchResults && searchResults.length > 0 && searchQuery) {
    schemas.push(generateSearchResultsStructuredData(searchResults, searchQuery));
  }

  return schemas;
};

export default {
  generateGameStructuredData,
  generateFileStructuredData,
  generateLessonPlanStructuredData,
  generateWorkshopStructuredData,
  generateCourseStructuredData,
  generateToolStructuredData,
  generateBundleStructuredData,
  generateUserProfileStructuredData,
  generateBreadcrumbStructuredData,
  generateFAQStructuredData,
  generateSearchResultsStructuredData,
  generateItemListStructuredData,
  generatePageStructuredData,
  getLudoraOrganization,
  getLudoraWebsite
};