import { useEffect } from 'react';

/**
 * SitemapProxy Component
 *
 * This component fetches the sitemap from the API and serves it
 * to Google Search Console at the expected frontend URL
 */
const SitemapProxy = () => {
  useEffect(() => {
    const fetchAndServeSitemap = async () => {
      try {
        // Fetch the sitemap from the API
        const response = await fetch('/api/seo/sitemap.xml');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get the XML content
        const xmlContent = await response.text();

        // Create a new response with proper XML content type
        const blob = new Blob([xmlContent], { type: 'application/xml' });

        // Replace the current page with the XML content
        document.open();
        document.write(xmlContent);
        document.close();

        // Set the correct content type
        if (document.contentType) {
          document.contentType = 'application/xml';
        }

      } catch (error) {
        console.error('Failed to fetch sitemap:', error);

        // Show comprehensive fallback sitemap in XML format
        const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Fallback sitemap - API unavailable: ${error.message} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ludora.app/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ludora.app/games</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ludora.app/files</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ludora.app/lesson-plans</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ludora.app/workshops</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ludora.app/courses</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://ludora.app/registration</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://ludora.app/privacy</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://ludora.app/terms</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://ludora.app/accessibility</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://ludora.app/contact</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

        document.open();
        document.write(errorXml);
        document.close();
      }
    };

    fetchAndServeSitemap();
  }, []);

  // Return loading state while fetching
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'monospace'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div>Loading sitemap...</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Fetching XML from /api/seo/sitemap.xml
        </div>
      </div>
    </div>
  );
};

export default SitemapProxy;