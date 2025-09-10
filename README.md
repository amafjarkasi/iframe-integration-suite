# 🎯 iframe-integration-suite

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/amafjarkasi/iframe-integration-suite)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Playwright Tests](https://img.shields.io/badge/tests-Playwright-green.svg)](https://playwright.dev/)

> 🚀 **A comprehensive suite of tools and utilities for seamless iframe integration and management**

This toolkit provides secure communication bridges, responsive handlers, and cross-origin solutions for embedding external content within web applications. Whether you're dealing with same-origin scenarios, cooperative cross-origin communication, or non-cooperative third-party content, this suite has you covered.

## 📋 Features

✨ **Smart Integration Detection**
- 🔍 **Same-origin extraction helper** - Direct DOM access for same-origin iframes with comprehensive data extraction
- 🤝 **Cooperative child-side API** - PostMessage-based RPC for seamless cross-origin cooperation
- 🧠 **Parent-side manager** - Intelligent auto-detection of same vs cross-origin with fallback mechanisms

🛠️ **Advanced Tooling**
- 🔄 **Proxy rehosting server** - Express-based proxy for non-cooperative third-party pages with content processing
- 📚 **Example implementations** - Ready-to-use parent and child page examples with interactive demos
- 🧪 **Test scaffolding** - Comprehensive Playwright-based testing framework

🔒 **Security & Performance**
- ⚡ **Lightweight** - Minimal dependencies (Express, JSDOM, Playwright for testing)
- 🛡️ **Secure** - Built-in security considerations for cross-frame communication
- 📱 **Responsive** - Works across different devices and screen sizes

## 📦 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Examples](#-examples)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn** package manager

### Install Dependencies

```bash
# Clone the repository
git clone https://github.com/amafjarkasi/iframe-integration-suite.git
cd iframe-integration-suite

# Install dependencies
npm install

# Install Playwright browsers for testing (optional)
npm run test:install
```

### Verify Installation

```bash
# Start the proxy server to verify everything works
npm start

# In another terminal, run tests
npm test
```

## 🎯 Quick Start

### 🔍 Same-Origin Scenarios

Perfect for extracting content from iframes on the same domain:

```javascript
import { FrameManager } from './src/parent/frameManager.js';

const manager = new FrameManager();

// Wait for iframe to load
const iframe = document.getElementById('myIframe');
await manager.waitForLoad(iframe);

// Extract comprehensive data
const frameData = await manager.extractFromFrame(iframe);
console.log('Extracted data:', frameData);

// frameData contains:
// - title, text, links, images
// - forms data, metadata
// - document structure
```

### 🤝 Cross-Origin Cooperative Scenarios

For iframes that can cooperate using postMessage:

**Parent side (your main page):**

```javascript
import { FrameManager } from './src/parent/frameManager.js';

const manager = new FrameManager();
const iframe = document.getElementById('cooperativeIframe');

// Set up RPC communication
const rpc = await manager.setupRPC(iframe);

// Call methods exposed by the child
const data = await rpc.call('getData');
const formData = await rpc.call('getFormData');

// Expose methods for the child to call
rpc.expose('resizeFrame', (width, height) => {
  iframe.style.width = width + 'px';
  iframe.style.height = height + 'px';
});
```

**Child side (iframe content):**

```javascript
import { EmbedApi } from './src/child/embedApi.js';

// Auto-initializes when in iframe
const api = new EmbedApi();

// Expose methods to parent
api.expose('getData', () => ({
  message: 'Hello from iframe!',
  timestamp: Date.now(),
  customData: { /* your data */ }
}));

api.expose('getFormData', () => {
  // Extract form data from current page
  const forms = document.querySelectorAll('input, select, textarea');
  const data = {};
  forms.forEach(field => {
    if (field.name) data[field.name] = field.value;
  });
  return data;
});

// Call parent methods
await api.requestResize(800, 600);
api.sendEvent('custom-event', { data: 'value' });
```

### 🔄 Non-Cooperative Third-Party Pages

For external content that doesn't support cooperation:

```bash
# Start the proxy server
npm start
# Server runs on http://localhost:3000
```

```javascript
// Use proxy to access third-party content
const targetUrl = 'https://example.com';
const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(targetUrl)}`;

// Create iframe with proxied content
const iframe = manager.createFrame(proxyUrl, {
  width: '100%',
  height: '600px',
  sandbox: 'allow-scripts allow-same-origin'
});

document.body.appendChild(iframe);

// Now you can extract data as if it were same-origin
const data = await manager.extractFromFrame(iframe);
```

## 📁 Project Structure

```
iframe-integration-suite/
├── 📂 src/                          # Source code
│   ├── 📂 parent/                   # Parent-side components
│   │   ├── frameManager.js          # 🎯 Main parent-side API
│   │   └── rpc.js                   # 📡 PostMessage RPC implementation
│   ├── 📂 child/                    # Child-side components
│   │   └── embedApi.js              # 🤝 Child-side cooperative API
│   ├── 📂 proxy/                    # Proxy server
│   │   └── proxyServer.js           # 🔄 Express proxy server
│   └── 📂 examples/                 # Example implementations
│       ├── parent-demo.html         # 🖥️ Interactive parent demo
│       ├── child-embed.html         # 📱 Child embed example
│       └── working-demo.html        # ✅ Validation demo
├── 📂 tests/                        # Test suite
│   └── 📂 playwright/               # Playwright tests
│       └── example.spec.js          # 🧪 Comprehensive test cases
├── 📄 package.json                  # Project configuration
├── 📄 playwright.config.js          # Test configuration
├── 📄 LICENSE                       # MIT License
└── 📄 README.md                     # This file
```

## 📚 API Reference

### 🎯 FrameManager (Parent-side)

The main class for managing iframe interactions from the parent page. Provides intelligent detection and unified API for different iframe scenarios.

#### Constructor

```javascript
const manager = new FrameManager();
```

#### Methods

##### `isSameOrigin(iframe)` → `boolean`

Check if an iframe is same-origin accessible.

```javascript
const iframe = document.getElementById('myFrame');
const isSameOrigin = manager.isSameOrigin(iframe);
```

##### `extractFromFrame(iframe)` → `Object`

Extract comprehensive data from same-origin iframes.

```javascript
const data = await manager.extractFromFrame(iframe);
// Returns: { title, text, links, images, forms, metadata }
```

**Extracted Data Structure:**
- `title` - Page title
- `text` - All text content
- `links` - Array of link objects `{href, text, target}`
- `images` - Array of image objects `{src, alt, width, height}`
- `forms` - Array of form data objects
- `metadata` - Meta tags and document info

##### `setupRPC(iframe, timeout?)` → `Promise<RPC>`

Set up RPC communication with cooperative child frames.

```javascript
const rpc = await manager.setupRPC(iframe, 5000); // 5 second timeout
await rpc.call('methodName', arg1, arg2);
```

##### `connect(iframe)` → `Promise<Connection>`

Auto-detect iframe type and provide appropriate interface.

```javascript
const connection = await manager.connect(iframe);

if (connection.type === 'same-origin') {
  const data = connection.extract();
} else {
  const result = await connection.call('getData');
}
```

##### `createFrame(src, options?)` → `HTMLIFrameElement`

Create and configure an iframe element with advanced options.

```javascript
const iframe = manager.createFrame('https://example.com', {
  width: '100%',
  height: '400px',
  sandbox: ['allow-scripts', 'allow-same-origin'],
  loading: 'lazy',
  referrerPolicy: 'no-referrer'
});
```

##### `waitForLoad(iframe)` → `Promise<void>`

Wait for iframe to fully load.

```javascript
await manager.waitForLoad(iframe);
// iframe is now ready for interaction
```

### 🤝 EmbedApi (Child-side)

API for child pages to cooperate with parent pages. Auto-initializes when running in an iframe.

#### Constructor

```javascript
const api = new EmbedApi(targetOrigin = '*');
```

#### Methods

##### `expose(method, handler)`

Expose a method to be called by the parent.

```javascript
api.expose('getData', () => ({
  message: 'Hello from iframe!',
  timestamp: Date.now()
}));

api.expose('processData', async (data) => {
  // Process data and return result
  return { processed: true, result: data.toUpperCase() };
});
```

##### `call(method, ...args)` → `Promise<any>`

Call a method on the parent window.

```javascript
const result = await api.call('parentMethod', arg1, arg2);
```

##### `sendEvent(eventName, data)`

Send custom events to the parent.

```javascript
api.sendEvent('user-action', {
  action: 'click',
  element: 'button',
  timestamp: Date.now()
});
```

##### `requestResize(width, height)` → `Promise<void>`

Request the parent to resize the iframe.

```javascript
await api.requestResize(800, 600);
```

##### `getPageInfo()` → `Object`

Get information about the current page.

```javascript
const info = api.getPageInfo();
// Returns: { url, title, referrer, userAgent }
```

### 🔄 ProxyServer

Express-based proxy server for non-cooperative third-party content.

#### Starting the Server

```javascript
import { ProxyServer } from './src/proxy/proxyServer.js';

const server = new ProxyServer(3000);
await server.start();
```

#### Endpoints

- `GET /` - Server information and usage
- `GET /health` - Health check endpoint
- `GET /proxy?url=<target_url>` - Proxy endpoint with options
- `GET /examples/` - Static example files

#### Proxy Options

```javascript
// Basic proxy usage
const proxyUrl = 'http://localhost:3000/proxy?url=' + encodeURIComponent(targetUrl);

// With options
const proxyUrl = 'http://localhost:3000/proxy?' + new URLSearchParams({
  url: targetUrl,
  inject: 'true',        // Inject cooperation scripts
  baseHref: 'true',      // Fix relative URLs
  timeout: '10000'       // Request timeout in ms
});
```

## 💡 Examples

### 🖥️ Interactive Demo

Start the demo server and explore all features:

```bash
npm start
# Open http://localhost:3000/examples/parent-demo.html
```

The demo includes:
- **Same-origin extraction** - Extract content from local iframes
- **Cross-origin RPC** - Communicate with cooperative child frames
- **Proxy integration** - Access non-cooperative third-party content
- **Real-time testing** - Interactive buttons to test all features

### 📱 Child Embed Example

See `src/examples/child-embed.html` for a complete child page that:
- Auto-initializes EmbedApi when in iframe
- Exposes multiple methods to parent
- Demonstrates event sending and resizing
- Shows form data extraction
- Includes dynamic content updates

### 🔧 Custom Integration Example

```javascript
// Complete integration example
import { FrameManager } from './src/parent/frameManager.js';

class MyIframeManager {
  constructor() {
    this.manager = new FrameManager();
    this.frames = new Map();
  }

  async addFrame(url, container, options = {}) {
    // Create iframe with custom options
    const iframe = this.manager.createFrame(url, {
      width: options.width || '100%',
      height: options.height || '400px',
      sandbox: 'allow-scripts allow-same-origin',
      ...options
    });

    container.appendChild(iframe);
    await this.manager.waitForLoad(iframe);

    // Auto-detect and set up communication
    const connection = await this.manager.connect(iframe);
    this.frames.set(iframe, connection);

    // Set up event handlers
    if (connection.type === 'cross-origin') {
      connection.rpc.expose('notify', (message) => {
        console.log('Child notification:', message);
      });
    }

    return { iframe, connection };
  }

  async extractAllData() {
    const results = [];
    for (const [iframe, connection] of this.frames) {
      try {
        let data;
        if (connection.type === 'same-origin') {
          data = connection.extract();
        } else {
          data = await connection.call('getData');
        }
        results.push({ iframe, data });
      } catch (error) {
        console.error('Failed to extract data:', error);
      }
    }
    return results;
  }
}
```

## ⚙️ Configuration

### 🔧 Environment Variables

```bash
# Proxy server configuration
PORT=3000                    # Server port (default: 3000)
PROXY_TIMEOUT=10000         # Request timeout in ms
PROXY_MAX_REDIRECTS=5       # Maximum redirects to follow

# Security settings
ALLOWED_ORIGINS=*           # Allowed origins for CORS
INJECT_SCRIPTS=true         # Auto-inject cooperation scripts
```

### 📋 Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/proxy/proxyServer.js",
    "dev": "node src/proxy/proxyServer.js",
    "test": "playwright test",
    "test:install": "playwright install"
  }
}
```

### 🛡️ Security Considerations

```javascript
// Recommended iframe sandbox settings
const secureOptions = {
  sandbox: [
    'allow-scripts',           // Allow JavaScript execution
    'allow-same-origin',       // Allow same-origin access
    'allow-forms',             // Allow form submission
    'allow-popups'             // Allow popups (if needed)
  ],
  referrerPolicy: 'no-referrer',
  allow: 'camera; microphone; geolocation'  // Specific permissions
};

// Content Security Policy for parent page
const csp = "frame-src 'self' https: data:; script-src 'self' 'unsafe-inline'";
```

## 🧪 Testing

### 📦 Test Setup

```bash
# Install Playwright browsers
npm run test:install

# Run all tests
npm test

# Run tests with UI (if Playwright UI is available)
npx playwright test --ui

# Debug specific test
npx playwright test --debug --grep "FrameManager"
```

### 🎯 Test Coverage

The test suite covers:
- ✅ **Same-origin extraction** - DOM access and data extraction
- ✅ **Cross-origin RPC** - PostMessage communication
- ✅ **Proxy functionality** - Third-party content proxying
- ✅ **Auto-detection** - Intelligent iframe type detection
- ✅ **API endpoints** - Server health and proxy endpoints
- ✅ **Error handling** - Timeout and failure scenarios

### 🔍 Running Specific Tests

```bash
# Test only same-origin functionality
npx playwright test --grep "same-origin"

# Test RPC communication
npx playwright test --grep "RPC"

# Test proxy server
npx playwright test --grep "proxy"
```

## 🔧 Troubleshooting

### Common Issues

#### 🚫 "RPC setup timeout" Error

**Problem:** Cross-origin RPC setup fails with timeout.

**Solutions:**
```javascript
// Increase timeout for slow-loading iframes
const rpc = await manager.setupRPC(iframe, 10000); // 10 seconds

// Ensure child page includes EmbedApi
// Check browser console for script loading errors
// Verify iframe src is accessible
```

#### 🔒 "Cannot access iframe content" Error

**Problem:** Same-origin detection fails unexpectedly.

**Solutions:**
```javascript
// Check if iframe is actually same-origin
console.log('Same origin:', manager.isSameOrigin(iframe));

// Wait for iframe to fully load
await manager.waitForLoad(iframe);

// Check for iframe sandbox restrictions
iframe.removeAttribute('sandbox'); // If safe to do so
```

#### 🌐 Proxy Server Issues

**Problem:** Proxy server fails to start or proxy content.

**Solutions:**
```bash
# Check if port is already in use
lsof -i :3000  # On macOS/Linux
netstat -ano | findstr :3000  # On Windows

# Start server on different port
PORT=3001 npm start

# Check proxy server logs for errors
DEBUG=proxy:* npm start
```

#### 📱 Mobile/Responsive Issues

**Problem:** iframes don't work properly on mobile devices.

**Solutions:**
```javascript
// Use responsive iframe options
const iframe = manager.createFrame(url, {
  width: '100%',
  height: 'auto',
  style: 'min-height: 400px; max-width: 100%;'
});

// Add viewport meta tag to child pages
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### 🐛 Debugging Tips

#### Enable Debug Logging

```javascript
// Add debug logging to FrameManager
const manager = new FrameManager();
manager.debug = true; // If available

// Check browser console for postMessage events
window.addEventListener('message', (e) => {
  console.log('PostMessage received:', e.data);
});
```

#### Test iframe Communication

```javascript
// Test basic postMessage communication
iframe.contentWindow.postMessage({ test: true }, '*');

// Listen for responses
window.addEventListener('message', (e) => {
  if (e.data.test) console.log('Communication working');
});
```

### 📞 Getting Help

- 📖 **Documentation**: Check this README and code comments
- 🐛 **Issues**: [GitHub Issues](https://github.com/amafjarkasi/iframe-integration-suite/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/amafjarkasi/iframe-integration-suite/discussions)
- 📧 **Contact**: Create an issue for questions or bug reports

## 🤝 Contributing

We welcome contributions! This project follows minimal dependency principles to keep it lightweight and secure.

### 🛠️ Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/iframe-integration-suite.git
cd iframe-integration-suite

# Install dependencies
npm install

# Install Playwright browsers
npm run test:install

# Start development server
npm run dev
```

### 📋 Contribution Guidelines

#### Core Principles

- **Minimal Dependencies**: Core functionality uses only essential packages
- **Security First**: All cross-frame communication must be secure
- **Browser Compatibility**: Support modern browsers (ES2020+)
- **Performance**: Keep bundle size small and execution fast

#### Current Dependencies

**Production:**
- `express` (^4.18.2) - Proxy server
- `jsdom` (^22.1.0) - HTML processing in proxy

**Development:**
- `@playwright/test` (^1.40.0) - Testing framework

#### Adding New Features

1. **Create an Issue**: Discuss the feature before implementing
2. **Write Tests**: All new features must include tests
3. **Update Documentation**: Update README and code comments
4. **Keep It Simple**: Prefer simple solutions over complex ones

#### Code Style

```javascript
// Use modern JavaScript features
const manager = new FrameManager();
const data = await manager.extractFromFrame(iframe);

// Prefer async/await over Promises
async function setupIframe(url) {
  const iframe = manager.createFrame(url);
  await manager.waitForLoad(iframe);
  return iframe;
}

// Use descriptive variable names
const isCooperativeFrame = await testRPCConnection(iframe);
```

#### Testing Requirements

```bash
# All tests must pass
npm test

# Add tests for new features
# tests/playwright/your-feature.spec.js

# Test across browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 🎯 Areas for Contribution

- 🔒 **Security enhancements** - CSP, sanitization, validation
- 📱 **Mobile optimization** - Touch events, responsive design
- 🌐 **Browser compatibility** - Polyfills, fallbacks
- 📊 **Performance improvements** - Lazy loading, caching
- 🧪 **Additional test cases** - Edge cases, error scenarios
- 📚 **Documentation** - Examples, tutorials, API docs

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

```
Copyright (c) 2024 iframe-integration-suite

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🚀 What's Next?

### Roadmap

- 🔄 **v1.1**: Enhanced security features and CSP support
- 📱 **v1.2**: Mobile-first responsive improvements
- 🎨 **v1.3**: UI components for common iframe patterns
- 🔌 **v2.0**: Plugin system for extensibility

### Related Projects

- [PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) - Browser standard for cross-frame communication
- [Penpal](https://github.com/Aaronius/penpal) - Alternative RPC library
- [iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) - Automatic iframe resizing

---

<div align="center">

**Made with ❤️ for the web development community**

[⭐ Star this repo](https://github.com/amafjarkasi/iframe-integration-suite) | [🐛 Report Bug](https://github.com/amafjarkasi/iframe-integration-suite/issues) | [💡 Request Feature](https://github.com/amafjarkasi/iframe-integration-suite/issues)

</div>
