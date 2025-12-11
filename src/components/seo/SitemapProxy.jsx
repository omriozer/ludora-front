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

        // Show error in XML format
        const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Error fetching sitemap: ${error.message} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ludora.app/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
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