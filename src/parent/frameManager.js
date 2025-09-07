/**
 * FrameManager - Main parent-side API for managing iframe interactions
 * Automatically detects same-origin vs cross-origin scenarios and provides appropriate APIs
 */

import { RPC } from './rpc.js';

export class FrameManager {
  constructor() {
    this.rpcInstances = new WeakMap();
  }

  /**
   * Check if an iframe is same-origin
   */
  isSameOrigin(iframe) {
    try {
      // Try to access the iframe's document
      return iframe.contentDocument !== null;
    } catch (e) {
      // Cross-origin access blocked
      return false;
    }
  }

  /**
   * Extract data from a same-origin iframe
   */
  extractFromFrame(iframe) {
    if (!this.isSameOrigin(iframe)) {
      throw new Error('Cannot extract from cross-origin iframe. Use setupRPC() instead.');
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error('Iframe document not accessible');
    }

    return {
      title: doc.title,
      url: doc.URL,
      html: doc.documentElement.outerHTML,
      text: doc.body ? doc.body.textContent : '',
      links: Array.from(doc.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent.trim()
      })),
      images: Array.from(doc.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt
      })),
      forms: Array.from(doc.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
          name: field.name,
          type: field.type,
          value: field.value
        }))
      })),
      meta: Array.from(doc.querySelectorAll('meta')).map(meta => ({
        name: meta.name,
        content: meta.content,
        property: meta.getAttribute('property')
      })).filter(meta => meta.name || meta.property)
    };
  }

  /**
   * Set up RPC communication with a cross-origin iframe
   */
  async setupRPC(iframe, timeout = 5000) {
    if (this.isSameOrigin(iframe)) {
      console.warn('Frame is same-origin. Consider using extractFromFrame() for direct access.');
    }

    // Check if we already have an RPC instance for this iframe
    if (this.rpcInstances.has(iframe)) {
      return this.rpcInstances.get(iframe);
    }

    return new Promise((resolve, reject) => {
      const rpc = new RPC(iframe.contentWindow);
      this.rpcInstances.set(iframe, rpc);

      // Test connection by calling a ping method
      const timeoutId = setTimeout(() => {
        reject(new Error('RPC setup timeout - child frame may not be cooperative'));
      }, timeout);

      // Expose a ping method for child to test connection
      rpc.expose('ping', () => 'pong');

      // Try to establish connection
      rpc.call('ping')
        .then(() => {
          clearTimeout(timeoutId);
          resolve(rpc);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          // If ping fails, still resolve with RPC instance - child may expose methods later
          resolve(rpc);
        });
    });
  }

  /**
   * Get existing RPC instance for an iframe
   */
  getRPC(iframe) {
    return this.rpcInstances.get(iframe);
  }

  /**
   * Auto-detect iframe type and provide appropriate interface
   */
  async connect(iframe) {
    if (this.isSameOrigin(iframe)) {
      return {
        type: 'same-origin',
        extract: () => this.extractFromFrame(iframe),
        getDocument: () => iframe.contentDocument
      };
    } else {
      const rpc = await this.setupRPC(iframe);
      return {
        type: 'cross-origin',
        rpc,
        call: (method, ...args) => rpc.call(method, ...args),
        expose: (method, handler) => rpc.expose(method, handler)
      };
    }
  }

  /**
   * Wait for iframe to load
   */
  waitForLoad(iframe) {
    return new Promise((resolve) => {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        resolve();
        return;
      }

      const onLoad = () => {
        iframe.removeEventListener('load', onLoad);
        resolve();
      };

      iframe.addEventListener('load', onLoad);
    });
  }

  /**
   * Create and configure an iframe element
   */
  createFrame(src, options = {}) {
    const iframe = document.createElement('iframe');
    
    // Set basic attributes
    iframe.src = src;
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '400px';
    iframe.style.border = options.border || 'none';
    
    // Set sandbox if specified
    if (options.sandbox) {
      iframe.sandbox = Array.isArray(options.sandbox) ? options.sandbox.join(' ') : options.sandbox;
    }

    // Set other attributes
    if (options.allow) iframe.allow = options.allow;
    if (options.loading) iframe.loading = options.loading;
    if (options.referrerPolicy) iframe.referrerPolicy = options.referrerPolicy;

    return iframe;
  }

  /**
   * Clean up RPC instance for an iframe
   */
  cleanup(iframe) {
    const rpc = this.rpcInstances.get(iframe);
    if (rpc) {
      rpc.destroy();
      this.rpcInstances.delete(iframe);
    }
  }
}