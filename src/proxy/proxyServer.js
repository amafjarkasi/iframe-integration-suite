/**
 * Proxy Server - Express server for rehosting third-party content
 * Allows access to non-cooperative third-party pages through a proxy
 */

import express from 'express';
import { JSDOM } from 'jsdom';
import https from 'https';
import http from 'http';
import url from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProxyServer {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.setupRoutes();
  }

  setupRoutes() {
    // Serve static files from examples directory
    this.app.use('/examples', express.static(path.join(__dirname, '../examples')));
    this.app.use('/src', express.static(path.join(__dirname, '../')));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Main proxy endpoint
    this.app.get('/proxy', async (req, res) => {
      const targetUrl = req.query.url;

      if (!targetUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      try {
        const proxiedContent = await this.proxyUrl(targetUrl, req.query);
        res.send(proxiedContent);
      } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Root route with basic info
    this.app.get('/', (req, res) => {
      res.json({
        name: 'iframe-integration-suite Proxy Server',
        version: '1.0.0',
        endpoints: {
          proxy: '/proxy?url=<target_url>',
          health: '/health',
          examples: '/examples/'
        },
        usage: {
          basic: '/proxy?url=https://example.com',
          withOptions: '/proxy?url=https://example.com&inject=true&baseHref=true'
        }
      });
    });
  }

  /**
   * Fetch and process the target URL
   */
  async proxyUrl(targetUrl, options = {}) {
    const parsedUrl = url.parse(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; iframe-integration-suite/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const processedContent = this.processContent(data, targetUrl, options);
            resolve(processedContent);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Process the HTML content to make it iframe-friendly
   */
  processContent(html, originalUrl, options) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Add base href to resolve relative URLs
    if (options.baseHref !== 'false') {
      const baseUrl = new URL(originalUrl);
      let baseElement = document.querySelector('base');
      if (!baseElement) {
        baseElement = document.createElement('base');
        document.head.insertBefore(baseElement, document.head.firstChild);
      }
      baseElement.href = `${baseUrl.protocol}//${baseUrl.host}`;
    }

    // Inject iframe communication script
    if (options.inject !== 'false') {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import { EmbedApi } from '/src/child/embedApi.js';
        
        const api = new EmbedApi();
        
        // Expose content extraction
        api.expose('getContent', () => {
          return {
            title: document.title,
            url: window.location.href,
            text: document.body ? document.body.textContent : '',
            links: Array.from(document.querySelectorAll('a')).map(a => ({
              href: a.href,
              text: a.textContent.trim()
            })),
            images: Array.from(document.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt
            }))
          };
        });

        // Expose form data extraction
        api.expose('getForms', () => {
          return Array.from(document.querySelectorAll('form')).map(form => ({
            action: form.action,
            method: form.method,
            fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
              name: field.name,
              type: field.type,
              value: field.value
            }))
          }));
        });

        // Auto-expose basic page info
        window.addEventListener('load', () => {
          api.sendEvent('page-loaded', {
            title: document.title,
            url: window.location.href
          });
        });
      `;
      document.head.appendChild(script);
    }

    // Remove scripts that might break in iframe context
    if (options.removeScripts === 'true') {
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        // Keep our injected script
        if (!script.textContent.includes('EmbedApi')) {
          script.remove();
        }
      });
    }

    // Add iframe-specific styles
    if (options.addStyles !== 'false') {
      const style = document.createElement('style');
      style.textContent = `
        body { 
          margin: 0; 
          padding: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .iframe-proxy-notice {
          position: fixed;
          top: 0;
          right: 0;
          background: #007acc;
          color: white;
          padding: 2px 6px;
          font-size: 10px;
          z-index: 10000;
          opacity: 0.8;
        }
      `;
      document.head.appendChild(style);

      // Add proxy notice
      const notice = document.createElement('div');
      notice.className = 'iframe-proxy-notice';
      notice.textContent = 'Proxied';
      document.body.appendChild(notice);
    }

    return dom.serialize();
  }

  /**
   * Start the server
   */
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Proxy server running on http://localhost:${this.port}`);
        console.log(`Usage: http://localhost:${this.port}/proxy?url=<target_url>`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ProxyServer(process.env.PORT || 3000);
  server.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down proxy server...');
    server.stop().then(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('Shutting down proxy server...');
    server.stop().then(() => process.exit(0));
  });
}

export { ProxyServer };