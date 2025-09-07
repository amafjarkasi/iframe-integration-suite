# iframe-integration-suite

A comprehensive, enterprise-ready toolkit for iframe integration, extraction, and cross-frame communication. This suite provides robust tools for both same-origin and cross-origin iframe scenarios, with automatic detection, fallback mechanisms, security features, and performance monitoring.

## ✨ Features

### Core Integration Features
- **Same-origin extraction helper** - Direct DOM access for same-origin iframes with comprehensive data extraction
- **Cooperative child-side API** - PostMessage-based RPC for cross-origin cooperation with auto-initialization
- **Parent-side manager** - Intelligent auto-detection of same vs cross-origin with seamless fallbacks
- **Proxy rehosting server** - Express-based proxy for non-cooperative third-party pages
- **Enhanced RPC system** - Secure, monitored communication with rate limiting and validation

### 🔒 Security Features
- **Origin validation** - Configurable origin allowlists with pattern matching
- **Content sanitization** - HTML/URL sanitization utilities with XSS protection
- **Rate limiting** - Built-in protection against message flooding
- **CSP generation** - Content Security Policy helpers for iframe security
- **Secure ID generation** - Cryptographically secure message IDs
- **Input validation** - Comprehensive postMessage data validation

### 📊 Monitoring & Performance
- **Health monitoring** - Real-time iframe health checks with automatic recovery
- **Performance tracking** - Response time monitoring and success rate tracking
- **Error tracking** - Comprehensive error categorization and reporting
- **Retry mechanisms** - Exponential backoff retry strategies
- **Metrics collection** - Detailed performance and usage analytics

### 🎯 Example Scenarios
- **Authentication flows** - Complete OAuth and form-based authentication examples
- **File upload handling** - Secure file upload with progress tracking and validation
- **Dynamic content loading** - Real-time content updates and communication
- **Cross-origin messaging** - Secure parent-child communication patterns

### 🚀 Developer Experience
- **ES Module support** - Modern JavaScript with tree-shaking support
- **Zero dependencies** - Core functionality with minimal external dependencies
- **TypeScript ready** - Full TypeScript support (definitions included)
- **Comprehensive examples** - Ready-to-use implementations and demos
- **CI/CD integration** - GitHub Actions workflow for automated testing

## Installation

```bash
npm install iframe-integration-suite
```

For development setup:
```bash
git clone https://github.com/amafjarkasi/iframe-integration-suite.git
cd iframe-integration-suite
npm install
```

## Quick Start

### For Same-Origin Scenarios

```javascript
import { FrameManager } from 'iframe-integration-suite';

const manager = new FrameManager();
const frameData = await manager.extractFromFrame(iframeElement);
console.log(frameData);
```

### For Cross-Origin Cooperative Scenarios with Security

**Parent side:**
```javascript
import { FrameManager } from 'iframe-integration-suite';

const manager = new FrameManager({
  allowedOrigins: ['https://trusted-domain.com'],
  enableHealthMonitoring: true,
  enableSecurity: true
});

const rpc = await manager.setupRPC(iframeElement);
const result = await rpc.call('getData');
console.log('RPC metrics:', rpc.getMetrics());
```

**Child side:**
```javascript
import { EmbedApi } from 'iframe-integration-suite/child';

const api = new EmbedApi('https://parent-domain.com');
api.expose('getData', () => {
  return { message: 'Hello from secure iframe!' };
});

// Send secure event to parent
api.sendEvent('data-updated', { timestamp: Date.now() });
```

### Enhanced Security Implementation

```javascript
import { SecurityUtils, FrameManager } from 'iframe-integration-suite';

// Create secure iframe with CSP
const manager = new FrameManager();
const iframe = manager.createSecureFrame('https://example.com', {
  sandbox: ['allow-scripts', 'allow-forms'],
  enableCSP: true,
  allowedSources: ["'self'", 'https://trusted-api.com'],
  referrerPolicy: 'no-referrer'
});

// Sanitize content
const cleanHtml = SecurityUtils.sanitizeHtml(userContent, {
  allowedTags: ['p', 'div', 'span'],
  stripDangerous: true
});
```

### Monitoring and Performance Tracking

```javascript
import { FrameManager, MonitoringUtils } from 'iframe-integration-suite';

const manager = new FrameManager({
  enableHealthMonitoring: true,
  healthCheckInterval: 3000
});

// Listen for health events
window.addEventListener('iframe-health-change', (event) => {
  const { iframe, isHealthy } = event.detail;
  console.log(`Frame ${iframe.src} is ${isHealthy ? 'healthy' : 'unhealthy'}`);
});

// Get comprehensive statistics
const stats = manager.getFrameStats();
console.log('Global stats:', stats);
```

### For Non-Cooperative Third-Party Pages

Start the proxy server:
```bash
npm start
```

Then use the proxy URL to access third-party content:
```javascript
const proxyUrl = 'http://localhost:3000/proxy?url=' + encodeURIComponent(targetUrl);
// Use proxyUrl in your iframe src
```

## Project Structure

```
src/
├── parent/
│   ├── frameManager.js    # Enhanced parent-side API with monitoring
│   └── rpc.js            # Secure RPC implementation with validation
├── child/
│   └── embedApi.js       # Child-side API with security features
├── proxy/
│   └── proxyServer.js    # Express proxy server
├── utils/
│   ├── security.js       # Security utilities and validation
│   └── monitoring.js     # Health monitoring and performance tracking
└── examples/
    ├── parent-demo.html  # Basic parent page example
    ├── child-embed.html  # Basic child embed example
    ├── auth-demo.html    # Authentication flow example
    ├── auth-provider.html # OAuth/form authentication provider
    ├── upload-demo.html  # File upload with progress tracking
    └── upload-form.html  # Upload form implementation
tests/
└── playwright/
    └── example.spec.js   # Comprehensive test suite
.github/
└── workflows/
    └── ci.yml           # CI/CD pipeline configuration
```

## API Reference

### FrameManager (Parent-side)

Enhanced main class for managing iframe interactions from the parent page.

```javascript
const manager = new FrameManager({
  allowedOrigins: ['https://example.com'],  // Security: allowed origins
  enableHealthMonitoring: true,             // Enable health checks
  enableSecurity: true,                     // Enable security features
  healthCheckInterval: 5000                 // Health check frequency (ms)
});

// Same-origin extraction with comprehensive data
const data = await manager.extractFromFrame(iframeElement);

// Secure RPC setup with monitoring
const rpc = await manager.setupRPC(iframeElement);
const result = await rpc.call('methodName', arg1, arg2);

// Health monitoring
manager.setupHealthMonitoring(iframeElement);
const stats = manager.getFrameStats(iframeElement);

// Create secure iframe
const iframe = manager.createSecureFrame(url, {
  sandbox: ['allow-scripts', 'allow-forms'],
  enableCSP: true,
  allowedSources: ["'self'"]
});
```

### EmbedApi (Child-side)

Enhanced API for child pages to cooperate securely with parent pages.

```javascript
const api = new EmbedApi('https://parent-domain.com');

// Expose methods to parent with validation
api.expose('getData', (filter) => {
  // Validate input
  if (typeof filter !== 'object') {
    throw new Error('Invalid filter parameter');
  }
  return { data: 'filtered-data' };
});

// Secure communication with parent
const result = await api.call('parentMethod', args);

// Send events with data
api.sendEvent('user-action', { action: 'click', element: 'button' });

// Request parent actions
await api.requestResize(800, 600);
await api.requestNavigation('/new-page');
```

### SecurityUtils

Comprehensive security utilities for iframe integration.

```javascript
import { SecurityUtils } from 'iframe-integration-suite/utils';

// Origin validation
const isValid = SecurityUtils.validateOrigin(origin, ['*.trusted.com']);

// Content sanitization
const cleanHtml = SecurityUtils.sanitizeHtml(html, {
  allowedTags: ['p', 'div', 'a'],
  allowedAttributes: ['href'],
  stripDangerous: true
});

// URL validation and sanitization
const safeUrl = SecurityUtils.sanitizeUrl(userUrl);

// CSP generation
const csp = SecurityUtils.generateCSP({
  allowedSources: ["'self'", 'https://api.example.com'],
  allowUnsafeInline: false,
  allowedFrameSources: ['https://widgets.example.com']
});

// Rate limiting
const rateLimiter = SecurityUtils.createRateLimiter(100, 60000);
rateLimiter(origin); // throws if rate exceeded

// Secure ID generation
const secureId = SecurityUtils.generateSecureId();
```

### MonitoringUtils

Health monitoring and performance tracking utilities.

```javascript
import { MonitoringUtils } from 'iframe-integration-suite/utils';

// Health monitoring
const monitor = MonitoringUtils.createHealthMonitor(iframe, {
  checkInterval: 5000,
  onHealthChange: (isHealthy, monitor) => {
    console.log(`Health: ${isHealthy}`);
  },
  onError: (error) => {
    console.error('Health error:', error);
  }
});

// Performance tracking
const tracker = MonitoringUtils.createPerformanceTracker();
tracker.start('operation');
// ... perform operation
const duration = tracker.end('operation');

// Error tracking
const errorTracker = MonitoringUtils.createErrorTracker({
  onError: (error) => console.error(error)
});
errorTracker.track(new Error('Something went wrong'));

// Retry mechanism
const retryHandler = MonitoringUtils.createRetryHandler({
  maxRetries: 3,
  initialDelay: 1000
});
const result = await retryHandler(async () => {
  // operation that might fail
});
```

## Examples

The `src/examples/` directory contains comprehensive working examples:

### Basic Integration
- `parent-demo.html` - Basic parent-side integration patterns
- `child-embed.html` - Child-side cooperation examples

### Advanced Scenarios  
- `auth-demo.html` - Complete authentication flow implementation
  - OAuth flow simulation with secure token handling
  - Form-based authentication with validation
  - Session management and persistence
  - Real-time authentication status updates

- `upload-demo.html` - Secure file upload with advanced features
  - Drag & drop file selection with validation
  - Real-time upload progress tracking
  - File type and size validation
  - Comprehensive error handling
  - Security-first file processing

### Running Examples

1. **Start the development servers:**
   ```bash
   # Terminal 1: Start proxy server
   npm start
   
   # Terminal 2: Start example server
   python3 -m http.server 8080
   ```

2. **Access examples:**
   - Basic demo: http://localhost:8080/src/examples/parent-demo.html
   - Authentication: http://localhost:8080/src/examples/auth-demo.html
   - File upload: http://localhost:8080/src/examples/upload-demo.html

3. **Try different scenarios:**
   - Same-origin iframe integration
   - Cross-origin RPC communication
   - Proxy-based third-party content
   - OAuth authentication flows
   - Secure file uploads with progress

## Security Best Practices

### Origin Validation
```javascript
const manager = new FrameManager({
  allowedOrigins: [
    'https://trusted-partner.com',
    'https://*.trusted-domain.com',
    'https://localhost:*'  // Development only
  ]
});
```

### Content Sanitization
```javascript
// Always sanitize user-generated content
const safeContent = SecurityUtils.sanitizeHtml(userHtml, {
  allowedTags: ['p', 'div', 'span', 'a', 'strong', 'em'],
  allowedAttributes: ['href', 'class'],
  stripDangerous: true
});
```

### Secure Frame Creation
```javascript
// Create iframe with restrictive sandbox
const iframe = manager.createSecureFrame(url, {
  sandbox: [
    'allow-scripts',           // Required for functionality
    'allow-same-origin',       // Required for cooperation
    'allow-forms'              // Only if forms needed
    // 'allow-popups',         // Avoid unless necessary
    // 'allow-top-navigation'  // Dangerous - avoid
  ],
  referrerPolicy: 'no-referrer',
  enableCSP: true
});
```

### Rate Limiting
```javascript
// Protect against message flooding
const rpc = new RPC(targetWindow, '*', {
  enableRateLimit: true,
  maxRequests: 100,     // Max requests per minute
  timeWindow: 60000     // Time window in ms
});
```

## Performance Optimization

### Health Monitoring
```javascript
// Monitor iframe health for better UX
const manager = new FrameManager({
  enableHealthMonitoring: true,
  healthCheckInterval: 5000    // Check every 5 seconds
});

// Listen for health changes
window.addEventListener('iframe-health-change', (event) => {
  const { iframe, isHealthy } = event.detail;
  if (!isHealthy) {
    // Show loading indicator or retry logic
    showLoadingIndicator(iframe);
  }
});
```

### Performance Tracking
```javascript
// Track performance metrics
const rpcMetrics = rpc.getMetrics();
console.log('Success rate:', rpcMetrics.successRate);
console.log('Avg response time:', rpcMetrics.averageResponseTime);

const frameStats = manager.getFrameStats();
console.log('Active frames:', frameStats.totalFrames);
```

## Troubleshooting

### Common Issues

**1. CORS/Same-Origin Policy Issues**
```javascript
// Ensure proper origin configuration
const manager = new FrameManager({
  allowedOrigins: ['https://yourdomain.com']  // Be specific
});
```

**2. PostMessage Not Working**
```javascript
// Check if child frame is ready
const rpc = await manager.setupRPC(iframe, 10000);  // Longer timeout
```

**3. Security Blocking**
```javascript
// Check browser console for CSP violations
// Adjust CSP settings or iframe sandbox
const iframe = manager.createSecureFrame(url, {
  sandbox: ['allow-scripts', 'allow-same-origin'],
  enableCSP: false  // Temporarily disable for debugging
});
```

**4. Performance Issues**
```javascript
// Monitor and optimize
const stats = manager.getFrameStats();
if (stats.globalHealth.successRate < 0.8) {
  // Investigate failed requests
  console.log('Error stats:', stats.errorStats);
}
```

### Debug Mode
```javascript
// Enable verbose logging
const manager = new FrameManager({
  debug: true,              // Enable debug logs
  enableHealthMonitoring: true,
  healthCheckInterval: 2000  // More frequent checks
});
```

## Testing

### Automated Testing
```bash
# Install test dependencies
npm run test:install

# Run comprehensive test suite
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx playwright test tests/security.spec.js
```

### Manual Testing
```bash
# Start development servers for manual testing
npm run dev

# Access test pages
open http://localhost:8080/src/examples/parent-demo.html
```

## CI/CD Integration

The project includes a comprehensive GitHub Actions workflow:

- **Multi-version testing** (Node.js 18.x, 20.x)
- **Cross-browser testing** (Chrome, Firefox, Safari)
- **Security auditing** with npm audit
- **Performance benchmarking** 
- **Automated deployment** on successful tests

### Custom CI Setup
```yaml
# .github/workflows/iframe-tests.yml
name: iframe Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:install
      - run: npm test
```

## Migration Guide

### From v0.x to v1.x

**Breaking Changes:**
1. Package is now ES modules only (`type: "module"`)
2. Constructor options have changed for enhanced security

**Migration Steps:**
```javascript
// Old (v0.x)
import { FrameManager } from 'iframe-integration-suite';
const manager = new FrameManager();

// New (v1.x)
import { FrameManager } from 'iframe-integration-suite';
const manager = new FrameManager({
  allowedOrigins: ['*'],  // Explicit configuration required
  enableSecurity: true    // Security enabled by default
});
```

**New Features Available:**
- Security utilities and validation
- Health monitoring and performance tracking
- Enhanced error handling with retry mechanisms
- Comprehensive example scenarios

## Contributing

We welcome contributions! Please see our contributing guidelines:

### Development Setup
```bash
git clone https://github.com/amafjarkasi/iframe-integration-suite.git
cd iframe-integration-suite
npm install
npm run dev
```

### Code Style
- ES modules with modern JavaScript (ES2020+)
- Comprehensive JSDoc documentation
- Security-first development principles
- Performance-conscious implementations

### Testing Requirements
- Unit tests for all new features
- Integration tests for complex scenarios
- Security validation for all user inputs
- Performance benchmarks for critical paths

## Changelog

### v1.0.0 (Latest)
- ✨ **New**: Comprehensive security utilities
- ✨ **New**: Health monitoring and performance tracking
- ✨ **New**: Authentication flow examples
- ✨ **New**: File upload handling with progress
- ✨ **New**: CI/CD workflow with automated testing
- 🔧 **Enhanced**: RPC with rate limiting and validation
- 🔧 **Enhanced**: Frame manager with monitoring integration
- 🔒 **Security**: Origin validation and content sanitization
- 📊 **Performance**: Response time tracking and metrics

### v0.1.0 (Previous)
- Basic iframe integration toolkit
- Simple RPC implementation
- Proxy server for third-party content
- Basic examples and documentation

## License

MIT - see LICENSE file for details.

## Node.js Compatibility

Requires Node.js >=18. Full ES module support required.

## Support

- 📖 [Documentation](https://github.com/amafjarkasi/iframe-integration-suite/wiki)
- 🐛 [Issue Tracker](https://github.com/amafjarkasi/iframe-integration-suite/issues)  
- 💬 [Discussions](https://github.com/amafjarkasi/iframe-integration-suite/discussions)
- 📧 [Security Reports](mailto:security@iframe-integration-suite.dev)

---

<div align="center">
  
**iframe-integration-suite** - Enterprise-ready iframe integration toolkit

[![npm version](https://badge.fury.io/js/iframe-integration-suite.svg)](https://www.npmjs.com/package/iframe-integration-suite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/amafjarkasi/iframe-integration-suite/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/amafjarkasi/iframe-integration-suite/actions)

Made with ❤️ for the web development community

</div>
