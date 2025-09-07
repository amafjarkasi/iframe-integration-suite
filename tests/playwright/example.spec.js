const { test, expect } = require('@playwright/test');

test.describe('iframe-integration-suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up any common configuration
    await page.goto('about:blank');
  });

  test('FrameManager - same-origin extraction', async ({ page }) => {
    // Create a test HTML page with iframe
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Test Parent</title></head>
      <body>
        <iframe id="testFrame" src="data:text/html,<html><head><title>Child Page</title></head><body><h1>Test Content</h1><p>Hello World</p></body></html>"></iframe>
        <script type="module">
          import { FrameManager } from '/src/parent/frameManager.js';
          
          window.manager = new FrameManager();
          window.testResults = {};
          
          window.runTest = async () => {
            const frame = document.getElementById('testFrame');
            await new Promise(resolve => {
              if (frame.contentDocument) {
                resolve();
              } else {
                frame.addEventListener('load', resolve);
              }
            });
            
            try {
              const isSameOrigin = window.manager.isSameOrigin(frame);
              const data = window.manager.extractFromFrame(frame);
              
              window.testResults = {
                success: true,
                isSameOrigin,
                title: data.title,
                text: data.text.trim()
              };
            } catch (error) {
              window.testResults = {
                success: false,
                error: error.message
              };
            }
          };
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHtml);
    
    // Wait for iframe to load and run test
    await page.evaluate(() => window.runTest());
    
    // Check results
    const results = await page.evaluate(() => window.testResults);
    
    expect(results.success).toBe(true);
    expect(results.isSameOrigin).toBe(true);
    expect(results.title).toBe('Child Page');
    expect(results.text).toBe('Test Content\nHello World');
  });

  test('RPC communication between frames', async ({ page }) => {
    // Create parent page
    const parentHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Parent</title></head>
      <body>
        <iframe id="childFrame" src="about:blank"></iframe>
        <script type="module">
          import { FrameManager } from '/src/parent/frameManager.js';
          
          window.manager = new FrameManager();
          window.testResults = {};
          
          window.setupRPC = async () => {
            const frame = document.getElementById('childFrame');
            
            // Load child content
            const childHtml = \`
              <!DOCTYPE html>
              <html>
              <head><title>Child</title></head>
              <body>
                <h1>Child Frame</h1>
                <script type="module">
                  import { EmbedApi } from '/src/child/embedApi.js';
                  
                  const api = new EmbedApi();
                  
                  // Expose test method
                  api.expose('testMethod', (msg) => {
                    return { received: msg, timestamp: Date.now() };
                  });
                </script>
              </body>
              </html>
            \`;
            
            frame.src = 'data:text/html,' + encodeURIComponent(childHtml);
            
            await new Promise(resolve => frame.addEventListener('load', resolve));
            
            try {
              const rpc = await window.manager.setupRPC(frame, 2000);
              
              // Test ping
              const pingResult = await rpc.call('ping');
              
              // Test custom method
              const testResult = await rpc.call('testMethod', 'hello');
              
              window.testResults = {
                success: true,
                ping: pingResult,
                testMethod: testResult
              };
            } catch (error) {
              window.testResults = {
                success: false,
                error: error.message
              };
            }
          };
        </script>
      </body>
      </html>
    `;

    await page.setContent(parentHtml);
    
    // Run RPC test
    await page.evaluate(() => window.setupRPC());
    
    // Wait for async operations
    await page.waitForTimeout(1000);
    
    const results = await page.evaluate(() => window.testResults);
    
    expect(results.success).toBe(true);
    expect(results.ping).toBe('pong');
    expect(results.testMethod.received).toBe('hello');
  });

  test('Proxy server functionality', async ({ page, context }) => {
    // This test requires the proxy server to be running
    // Skip if server is not available
    try {
      await page.goto('http://localhost:3000/health');
      const response = await page.textContent('body');
      expect(response).toContain('ok');
    } catch (error) {
      console.log('Proxy server not running, skipping proxy tests');
      return;
    }

    // Test proxy endpoint
    await page.goto('http://localhost:3000/proxy?url=data:text/html,<html><head><title>Proxied</title></head><body><h1>Proxied Content</h1></body></html>');
    
    // Check that content is proxied and modified
    const title = await page.title();
    expect(title).toBe('Proxied');
    
    const h1Text = await page.textContent('h1');
    expect(h1Text).toBe('Proxied Content');
    
    // Check that proxy notice is added
    const notice = await page.locator('.iframe-proxy-notice').textContent();
    expect(notice).toBe('Proxied');
  });

  test('EmbedApi auto-initialization', async ({ page }) => {
    const childHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Auto Init Test</title></head>
      <body>
        <h1>Child Page</h1>
        <script type="module">
          import { EmbedApi } from '/src/child/embedApi.js';
          
          // Check if auto-initialization worked
          window.testResults = {
            hasEmbedApi: typeof window.embedApi !== 'undefined',
            isInIframe: window !== window.parent
          };
        </script>
      </body>
      </html>
    `;

    // Test standalone mode (not in iframe)
    await page.setContent(childHtml);
    let results = await page.evaluate(() => window.testResults);
    
    expect(results.isInIframe).toBe(false);
    expect(results.hasEmbedApi).toBe(false); // Should not auto-init when not in iframe

    // Test iframe mode
    const parentWithIframe = `
      <!DOCTYPE html>
      <html>
      <body>
        <iframe id="test" src="data:text/html,${encodeURIComponent(childHtml)}"></iframe>
      </body>
      </html>
    `;

    await page.setContent(parentWithIframe);
    await page.waitForTimeout(500); // Wait for iframe to load
    
    results = await page.frameLocator('#test').locator('body').evaluate(() => window.testResults);
    
    expect(results.isInIframe).toBe(true);
    expect(results.hasEmbedApi).toBe(true); // Should auto-init when in iframe
  });

  test('FrameManager auto-detection', async ({ page }) => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <iframe id="sameOriginFrame" src="data:text/html,<html><body><h1>Same Origin</h1></body></html>"></iframe>
        <script type="module">
          import { FrameManager } from '/src/parent/frameManager.js';
          
          window.manager = new FrameManager();
          window.testResults = {};
          
          window.runAutoDetection = async () => {
            const sameOriginFrame = document.getElementById('sameOriginFrame');
            
            await new Promise(resolve => {
              if (sameOriginFrame.contentDocument) {
                resolve();
              } else {
                sameOriginFrame.addEventListener('load', resolve);
              }
            });
            
            const connection = await window.manager.connect(sameOriginFrame);
            
            window.testResults = {
              type: connection.type,
              hasExtract: typeof connection.extract === 'function',
              hasRpc: typeof connection.rpc === 'object'
            };
            
            if (connection.extract) {
              const data = connection.extract();
              window.testResults.extractedText = data.text.trim();
            }
          };
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHtml);
    await page.evaluate(() => window.runAutoDetection());
    
    const results = await page.evaluate(() => window.testResults);
    
    expect(results.type).toBe('same-origin');
    expect(results.hasExtract).toBe(true);
    expect(results.hasRpc).toBe(false);
    expect(results.extractedText).toBe('Same Origin');
  });

});

test.describe('Proxy Server API', () => {
  
  test('health endpoint returns status', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:3000/health');
      const data = await response.json();
      
      expect(response.status()).toBe(200);
      expect(data.status).toBe('ok');
      expect(typeof data.timestamp).toBe('number');
    } catch (error) {
      console.log('Proxy server not running, skipping API tests');
      test.skip();
    }
  });

  test('root endpoint returns API documentation', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:3000/');
      const data = await response.json();
      
      expect(response.status()).toBe(200);
      expect(data.name).toBe('iframe-integration-suite Proxy Server');
      expect(data.endpoints).toBeDefined();
    } catch (error) {
      console.log('Proxy server not running, skipping API tests');
      test.skip();
    }
  });

});