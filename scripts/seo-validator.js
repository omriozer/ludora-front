#!/usr/bin/env node

/**
 * SEO Validation Script for Ludora
 * Tests and validates all SEO implementations
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  baseUrl: process.env.LUDORA_BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.LUDORA_API_URL || 'http://localhost:3003',
  testPages: [
    '/',
    '/games',
    '/files',
    '/lesson-plans',
    '/workshops',
    '/courses'
  ],
  seoEndpoints: [
    '/api/seo/sitemap.xml',
    '/api/seo/robots.txt',
    '/api/seo/sitemap.json'
  ]
};

class SEOValidator {
  constructor() {
    this.results = {
      pages: [],
      endpoints: [],
      errors: [],
      warnings: [],
      summary: {}
    };
  }

  /**
   * Run all SEO validations
   */
  async validate() {
    console.log('🚀 Starting Ludora SEO Validation...\n');

    try {
      // Test SEO endpoints
      await this.validateSEOEndpoints();

      // Test meta tags on pages
      await this.validatePageSEO();

      // Test robots.txt
      await this.validateRobotsTxt();

      // Test sitemap
      await this.validateSitemap();

      // Generate report
      this.generateReport();

    } catch (error) {
      this.results.errors.push(`Validation failed: ${error.message}`);
    }

    this.printResults();
    return this.results;
  }

  /**
   * Test SEO endpoints availability
   */
  async validateSEOEndpoints() {
    console.log('📍 Testing SEO endpoints...');

    for (const endpoint of CONFIG.seoEndpoints) {
      try {
        const url = `${CONFIG.apiUrl}${endpoint}`;
        const response = await fetch(url);

        const result = {
          endpoint,
          url,
          status: response.status,
          contentType: response.headers.get('content-type'),
          available: response.ok
        };

        if (response.ok) {
          console.log(`  ✅ ${endpoint} - ${response.status}`);
        } else {
          console.log(`  ❌ ${endpoint} - ${response.status}`);
          this.results.errors.push(`Endpoint ${endpoint} returned ${response.status}`);
        }

        this.results.endpoints.push(result);
      } catch (error) {
        console.log(`  ❌ ${endpoint} - Connection failed`);
        this.results.errors.push(`Failed to connect to ${endpoint}: ${error.message}`);
      }
    }
  }

  /**
   * Test meta tags on key pages
   */
  async validatePageSEO() {
    console.log('\n🔍 Testing page SEO meta tags...');

    for (const page of CONFIG.testPages) {
      try {
        const url = `${CONFIG.baseUrl}${page}`;
        const response = await fetch(url);

        if (!response.ok) {
          this.results.errors.push(`Page ${page} returned ${response.status}`);
          continue;
        }

        const html = await response.text();
        const pageResults = this.analyzePage(page, html);
        this.results.pages.push(pageResults);

        const score = this.calculatePageSEOScore(pageResults);
        console.log(`  ${this.getScoreEmoji(score)} ${page} - SEO Score: ${score}%`);

      } catch (error) {
        console.log(`  ❌ ${page} - Failed to analyze`);
        this.results.errors.push(`Failed to analyze ${page}: ${error.message}`);
      }
    }
  }

  /**
   * Analyze HTML page for SEO elements
   */
  analyzePage(page, html) {
    const results = {
      page,
      title: this.extractTag(html, 'title'),
      description: this.extractMeta(html, 'description'),
      keywords: this.extractMeta(html, 'keywords'),
      ogTitle: this.extractMeta(html, 'og:title'),
      ogDescription: this.extractMeta(html, 'og:description'),
      ogImage: this.extractMeta(html, 'og:image'),
      twitterCard: this.extractMeta(html, 'twitter:card'),
      structuredData: this.extractStructuredData(html),
      canonical: this.extractCanonical(html),
      hreflang: this.extractHreflang(html),
      charset: html.includes('charset="UTF-8"'),
      viewport: html.includes('name="viewport"'),
      lang: html.includes('lang="he"'),
      dir: html.includes('dir="rtl"')
    };

    return results;
  }

  /**
   * Extract meta tag content
   */
  extractMeta(html, name) {
    const patterns = [
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`, 'i')
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Extract title tag content
   */
  extractTag(html, tag) {
    const match = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
    return match ? match[1] : null;
  }

  /**
   * Extract structured data
   */
  extractStructuredData(html) {
    const ldJsonMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    if (!ldJsonMatches) return [];

    const structuredData = [];
    for (const match of ldJsonMatches) {
      try {
        const jsonText = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonText);
        structuredData.push(data['@type'] || 'Unknown');
      } catch (error) {
        // Invalid JSON
      }
    }
    return structuredData;
  }

  /**
   * Extract canonical URL
   */
  extractCanonical(html) {
    const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
    return match ? match[1] : null;
  }

  /**
   * Extract hreflang links
   */
  extractHreflang(html) {
    const matches = html.match(/<link[^>]*hreflang=["']([^"']*)["'][^>]*href=["']([^"']*)["']/gi);
    return matches ? matches.length : 0;
  }

  /**
   * Calculate SEO score for a page
   */
  calculatePageSEOScore(page) {
    let score = 0;
    let maxScore = 0;

    // Basic meta tags (40 points)
    maxScore += 40;
    if (page.title && page.title.length > 10) score += 10;
    if (page.description && page.description.length > 50) score += 15;
    if (page.keywords) score += 5;
    if (page.charset) score += 5;
    if (page.viewport) score += 5;

    // Open Graph (25 points)
    maxScore += 25;
    if (page.ogTitle) score += 8;
    if (page.ogDescription) score += 8;
    if (page.ogImage) score += 9;

    // Twitter Cards (10 points)
    maxScore += 10;
    if (page.twitterCard) score += 10;

    // Structured Data (15 points)
    maxScore += 15;
    if (page.structuredData.length > 0) score += 15;

    // Technical SEO (10 points)
    maxScore += 10;
    if (page.canonical) score += 5;
    if (page.lang && page.dir) score += 5;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Validate robots.txt
   */
  async validateRobotsTxt() {
    console.log('\n🤖 Validating robots.txt...');

    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/seo/robots.txt`);

      if (!response.ok) {
        this.results.errors.push(`robots.txt returned ${response.status}`);
        return;
      }

      const robotsText = await response.text();

      // Check for essential directives
      const hasUserAgent = robotsText.includes('User-agent:');
      const hasSitemap = robotsText.includes('Sitemap:');
      const hasDisallow = robotsText.includes('Disallow:');

      if (hasUserAgent && hasSitemap && hasDisallow) {
        console.log('  ✅ robots.txt is properly configured');
      } else {
        console.log('  ⚠️  robots.txt may be missing essential directives');
        this.results.warnings.push('robots.txt missing some standard directives');
      }

    } catch (error) {
      this.results.errors.push(`Failed to validate robots.txt: ${error.message}`);
    }
  }

  /**
   * Validate sitemap
   */
  async validateSitemap() {
    console.log('\n🗺️  Validating sitemap...');

    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/seo/sitemap.xml`);

      if (!response.ok) {
        this.results.errors.push(`Sitemap returned ${response.status}`);
        return;
      }

      const sitemapXml = await response.text();

      // Basic XML validation
      const hasXmlDeclaration = sitemapXml.includes('<?xml');
      const hasUrlset = sitemapXml.includes('<urlset');
      const urlCount = (sitemapXml.match(/<url>/g) || []).length;

      if (hasXmlDeclaration && hasUrlset && urlCount > 0) {
        console.log(`  ✅ Sitemap is valid with ${urlCount} URLs`);
      } else {
        console.log('  ❌ Sitemap appears to be malformed');
        this.results.errors.push('Sitemap XML structure is invalid');
      }

    } catch (error) {
      this.results.errors.push(`Failed to validate sitemap: ${error.message}`);
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    const totalPages = this.results.pages.length;
    const avgScore = totalPages > 0 ?
      Math.round(this.results.pages.reduce((sum, page) =>
        sum + this.calculatePageSEOScore(page), 0) / totalPages) : 0;

    this.results.summary = {
      totalPages,
      averageSEOScore: avgScore,
      workingEndpoints: this.results.endpoints.filter(e => e.available).length,
      totalEndpoints: this.results.endpoints.length,
      errorCount: this.results.errors.length,
      warningCount: this.results.warnings.length,
      grade: this.getOverallGrade(avgScore, this.results.errors.length)
    };
  }

  /**
   * Get emoji for score
   */
  getScoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 80) return '🟡';
    if (score >= 70) return '🟠';
    return '🔴';
  }

  /**
   * Get overall grade
   */
  getOverallGrade(avgScore, errorCount) {
    if (errorCount > 0) return 'F';
    if (avgScore >= 95) return 'A+';
    if (avgScore >= 90) return 'A';
    if (avgScore >= 85) return 'B+';
    if (avgScore >= 80) return 'B';
    if (avgScore >= 75) return 'C+';
    if (avgScore >= 70) return 'C';
    return 'D';
  }

  /**
   * Print final results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LUDORA SEO VALIDATION REPORT');
    console.log('='.repeat(60));

    const { summary } = this.results;

    console.log(`\n🎯 OVERALL GRADE: ${summary.grade}`);
    console.log(`📈 Average SEO Score: ${summary.averageSEOScore}%`);
    console.log(`📄 Pages Tested: ${summary.totalPages}`);
    console.log(`🔗 Working Endpoints: ${summary.workingEndpoints}/${summary.totalEndpoints}`);

    if (summary.errorCount > 0) {
      console.log(`\n❌ ERRORS (${summary.errorCount}):`);
      this.results.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (summary.warningCount > 0) {
      console.log(`\n⚠️  WARNINGS (${summary.warningCount}):`);
      this.results.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    console.log('\n🚀 RECOMMENDATIONS:');
    if (summary.averageSEOScore < 90) {
      console.log('  • Improve meta descriptions and titles');
      console.log('  • Add more structured data to pages');
    }
    if (summary.workingEndpoints < summary.totalEndpoints) {
      console.log('  • Fix non-working SEO endpoints');
    }
    console.log('  • Submit sitemap to Google Search Console');
    console.log('  • Test social media previews with Facebook Debugger');

    console.log('\n✅ SEO validation complete!');
  }

  /**
   * Save results to file
   */
  async saveResults(filename = 'seo-validation-results.json') {
    try {
      const filePath = path.join(process.cwd(), filename);
      await fs.promises.writeFile(filePath, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Results saved to: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save results: ${error.message}`);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SEOValidator();
  validator.validate()
    .then(() => validator.saveResults())
    .catch(console.error);
}

export default SEOValidator;