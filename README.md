# iframe-integration-suite

A comprehensive toolkit for iframe integration, extraction, and cross-frame communication. This suite provides tools for both same-origin and cross-origin iframe scenarios, with automatic detection and fallback mechanisms.

## Features

- **Same-origin extraction helper** - Direct DOM access for same-origin iframes
- **Cooperative child-side API** - PostMessage-based RPC for cross-origin cooperation
- **Parent-side manager** - Auto-detection of same vs cross-origin with intelligent fallbacks
- **Proxy rehosting server** - Express-based proxy for non-cooperative third-party pages
- **Example implementations** - Ready-to-use parent and child page examples
- **Test scaffolding** - Playwright-based testing framework

## Installation

```bash
npm install
```

## Quick Start

### For Same-Origin Scenarios

```javascript
import { FrameManager } from './src/parent/frameManager.js';

const manager = new FrameManager();
const frameData = await manager.extractFromFrame(iframeElement);
console.log(frameData);
```

### For Cross-Origin Cooperative Scenarios

**Parent side:**
```javascript
import { FrameManager } from './src/parent/frameManager.js';

const manager = new FrameManager();
manager.setupRPC(iframeElement).then(rpc => {
  rpc.call('getData').then(data => console.log(data));
});
```

**Child side:**
```javascript
import { EmbedApi } from './src/child/embedApi.js';

const api = new EmbedApi();
api.expose('getData', () => {
  return { message: 'Hello from iframe!' };
});
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
│   ├── frameManager.js    # Main parent-side API
│   └── rpc.js            # PostMessage RPC implementation
├── child/
│   └── embedApi.js       # Child-side cooperative API
├── proxy/
│   └── proxyServer.js    # Express proxy server
└── examples/
    ├── parent-demo.html  # Parent page example
    └── child-embed.html  # Child embed example
tests/
└── playwright/
    └── example.spec.js   # Test examples
```

## API Reference

### FrameManager (Parent-side)

Main class for managing iframe interactions from the parent page.

```javascript
const manager = new FrameManager();

// Same-origin extraction
const data = await manager.extractFromFrame(iframeElement);

// Cross-origin RPC setup
const rpc = await manager.setupRPC(iframeElement);
const result = await rpc.call('methodName', arg1, arg2);
```

### EmbedApi (Child-side)

API for child pages to cooperate with parent pages.

```javascript
const api = new EmbedApi();

// Expose methods to parent
api.expose('getData', () => ({ key: 'value' }));

// Call parent methods
const result = await api.call('parentMethod', args);
```

## Examples

See the `src/examples/` directory for complete working examples:

- `parent-demo.html` - Demonstrates parent-side integration
- `child-embed.html` - Shows child-side cooperation

## Testing

Install Playwright browsers:
```bash
npm run test:install
```

Run tests:
```bash
npm test
```

## License

MIT - see LICENSE file for details.

## Node.js Compatibility

Requires Node.js >=18

## Contributing

This project follows minimal dependency principles. Core functionality uses only:
- `express` for the proxy server
- `jsdom` for HTML processing in the proxy
- `@playwright/test` for testing (dev dependency)

Additional features like Penpal integration or DOMPurify sanitization can be added as optional dependencies.
