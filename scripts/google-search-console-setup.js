#!/usr/bin/env node

/**
 * Google Search Console API Setup Script for Ludora
 * Automates property addition and sitemap submission
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Add your properties here
  properties: [
    'https://ludora.app',
    'https://my.ludora.app'
  ],

  sitemaps: [
    'api/seo/sitemap.xml'
  ],

  // Path to your Google API credentials JSON file
  credentialsPath: process.env.GOOGLE_CREDENTIALS || './google-credentials.json',

  // Required scopes for Search Console API
  scopes: ['https://www.googleapis.com/auth/webmasters']
};

class GoogleSearchConsoleManager {
  constructor() {
    this.searchconsole = null;
    this.auth = null;
  }

  /**
   * Initialize Google API authentication
   */
  async initialize() {
    try {
      // Check if credentials file exists
      if (!fs.existsSync(CONFIG.credentialsPath)) {
        console.error('❌ Google credentials file not found!');
        console.log('📋 Setup Instructions:');
        console.log('1. Go to https://console.cloud.google.com/');
        console.log('2. Create a new project or select existing');
        console.log('3. Enable Google Search Console API');
        console.log('4. Create Service Account credentials');
        console.log('5. Download JSON and save as google-credentials.json');
        console.log('6. Add service account email as owner in Search Console');
        return false;
      }

      // Load credentials
      const credentials = JSON.parse(fs.readFileSync(CONFIG.credentialsPath));

      // Create JWT auth
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        CONFIG.scopes
      );

      // Initialize Search Console API
      this.searchconsole = google.searchconsole({
        version: 'v1',
        auth: this.auth
      });

      console.log('✅ Google Search Console API initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize API:', error.message);
      return false;
    }
  }

  /**
   * List current properties
   */
  async listProperties() {
    try {
      const response = await this.searchconsole.sites.list();
      const sites = response.data.siteEntry || [];

      console.log('\n📋 Current Properties:');
      sites.forEach(site => {
        console.log(`  • ${site.siteUrl} (${site.permissionLevel})`);
      });

      return sites;
    } catch (error) {
      console.error('❌ Failed to list properties:', error.message);
      return [];
    }
  }

  /**
   * Add a new property
   */
  async addProperty(siteUrl) {
    try {
      console.log(`🔄 Adding property: ${siteUrl}`);

      const response = await this.searchconsole.sites.add({
        siteUrl: siteUrl
      });

      console.log(`✅ Property added: ${siteUrl}`);
      return true;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️  Property already exists: ${siteUrl}`);
        return true;
      } else {
        console.error(`❌ Failed to add property ${siteUrl}:`, error.message);
        return false;
      }
    }
  }

  /**
   * Submit sitemap
   */
  async submitSitemap(siteUrl, sitemapUrl) {
    try {
      const fullSitemapUrl = `${siteUrl}/${sitemapUrl}`;
      console.log(`🔄 Submitting sitemap: ${fullSitemapUrl}`);

      await this.searchconsole.sitemaps.submit({
        siteUrl: siteUrl,
        feedpath: fullSitemapUrl
      });

      console.log(`✅ Sitemap submitted: ${fullSitemapUrl}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to submit sitemap:`, error.message);
      return false;
    }
  }

  /**
   * Get sitemap status
   */
  async getSitemapStatus(siteUrl) {
    try {
      const response = await this.searchconsole.sitemaps.list({
        siteUrl: siteUrl
      });

      const sitemaps = response.data.sitemap || [];

      console.log(`\n📊 Sitemaps for ${siteUrl}:`);
      sitemaps.forEach(sitemap => {
        console.log(`  • ${sitemap.feedpath}`);
        console.log(`    Status: ${sitemap.type || 'Unknown'}`);
        console.log(`    Last submitted: ${sitemap.lastSubmitted || 'Never'}`);
        console.log(`    URLs submitted: ${sitemap.contents?.[0]?.submitted || 0}`);
        console.log(`    URLs indexed: ${sitemap.contents?.[0]?.indexed || 0}`);
      });

      return sitemaps;
    } catch (error) {
      console.error(`❌ Failed to get sitemap status:`, error.message);
      return [];
    }
  }

  /**
   * Run complete setup
   */
  async runSetup() {
    console.log('🚀 Starting Google Search Console setup...\n');

    // Initialize API
    if (!(await this.initialize())) {
      return false;
    }

    // List current properties
    await this.listProperties();

    // Add new properties
    console.log('\n🔧 Adding properties...');
    for (const property of CONFIG.properties) {
      await this.addProperty(property);
    }

    // Submit sitemaps
    console.log('\n🗺️  Submitting sitemaps...');
    for (const property of CONFIG.properties) {
      for (const sitemap of CONFIG.sitemaps) {
        await this.submitSitemap(property, sitemap);
      }
    }

    // Check sitemap status
    console.log('\n📊 Checking sitemap status...');
    for (const property of CONFIG.properties) {
      await this.getSitemapStatus(property);
    }

    console.log('\n✅ Google Search Console setup complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Verify domain ownership in Search Console web interface');
    console.log('2. Set up email alerts for coverage issues');
    console.log('3. Monitor indexing status over the next 24-48 hours');

    return true;
  }

  /**
   * Verify domain ownership status
   */
  async checkVerification() {
    console.log('\n🔍 Checking domain verification status...');

    for (const property of CONFIG.properties) {
      try {
        const response = await this.searchconsole.sites.get({
          siteUrl: property
        });

        console.log(`✅ ${property}: Verified`);
      } catch (error) {
        if (error.code === 403) {
          console.log(`⚠️  ${property}: Not verified or no permission`);
          console.log('   Manual verification required in web interface');
        } else {
          console.log(`❌ ${property}: Error checking verification`);
        }
      }
    }
  }
}

// CLI Usage
const action = process.argv[2];
const gsc = new GoogleSearchConsoleManager();

switch (action) {
  case 'setup':
    gsc.runSetup();
    break;
  case 'list':
    gsc.initialize().then(() => gsc.listProperties());
    break;
  case 'verify':
    gsc.initialize().then(() => gsc.checkVerification());
    break;
  case 'sitemaps':
    gsc.initialize().then(() => {
      CONFIG.properties.forEach(prop => gsc.getSitemapStatus(prop));
    });
    break;
  default:
    console.log('🔧 Google Search Console CLI Tool');
    console.log('\nUsage:');
    console.log('  node google-search-console-setup.js setup    # Full setup');
    console.log('  node google-search-console-setup.js list     # List properties');
    console.log('  node google-search-console-setup.js verify   # Check verification');
    console.log('  node google-search-console-setup.js sitemaps # Check sitemaps');
    console.log('\nEnvironment Variables:');
    console.log('  GOOGLE_CREDENTIALS - Path to Google API credentials JSON');
}

export default GoogleSearchConsoleManager;