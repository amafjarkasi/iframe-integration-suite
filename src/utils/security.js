/**
 * Security utilities for iframe integration
 * Provides content sanitization, origin validation, and CSP helpers
 */

export class SecurityUtils {
  static ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:'];
  static DANGEROUS_TAGS = ['script', 'object', 'embed', 'iframe', 'form', 'meta'];
  static DANGEROUS_ATTRIBUTES = ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'onblur'];

  /**
   * Validate origin against allowed patterns
   */
  static validateOrigin(origin, allowedOrigins = ['*']) {
    if (allowedOrigins.includes('*')) {
      return true;
    }

    return allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return false;
    });
  }

  /**
   * Sanitize HTML content by removing dangerous elements and attributes
   */
  static sanitizeHtml(html, options = {}) {
    const {
      allowedTags = [],
      allowedAttributes = [],
      stripDangerous = true
    } = options;

    if (typeof window === 'undefined' || !window.DOMParser) {
      // Fallback for server-side or environments without DOMParser
      return this.sanitizeHtmlBasic(html, options);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (stripDangerous) {
      // Remove dangerous tags
      this.DANGEROUS_TAGS.forEach(tag => {
        if (!allowedTags.includes(tag)) {
          const elements = doc.querySelectorAll(tag);
          elements.forEach(el => el.remove());
        }
      });

      // Remove dangerous attributes from all elements
      const allElements = doc.querySelectorAll('*');
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (this.DANGEROUS_ATTRIBUTES.includes(attr.name.toLowerCase()) && 
              !allowedAttributes.includes(attr.name.toLowerCase())) {
            el.removeAttribute(attr.name);
          }
        });
      });
    }

    return doc.body ? doc.body.innerHTML : '';
  }

  /**
   * Basic HTML sanitization for environments without DOMParser
   */
  static sanitizeHtmlBasic(html, options = {}) {
    const { stripDangerous = true } = options;
    
    if (!stripDangerous) return html;

    let sanitized = html;

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove dangerous event attributes
    this.DANGEROUS_ATTRIBUTES.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');

    return sanitized;
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      
      if (!this.ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        throw new Error(`Protocol ${parsed.protocol} not allowed`);
      }

      return parsed.href;
    } catch (error) {
      throw new Error(`Invalid URL: ${error.message}`);
    }
  }

  /**
   * Generate Content Security Policy for iframe integration
   */
  static generateCSP(options = {}) {
    const {
      allowedSources = ["'self'"],
      allowUnsafeInline = false,
      allowUnsafeEval = false,
      allowedFrameSources = ["'self'"]
    } = options;

    const directives = [];

    // Default source
    directives.push(`default-src ${allowedSources.join(' ')}`);

    // Frame sources
    directives.push(`frame-src ${allowedFrameSources.join(' ')}`);

    // Script source
    const scriptSources = [...allowedSources];
    if (allowUnsafeInline) scriptSources.push("'unsafe-inline'");
    if (allowUnsafeEval) scriptSources.push("'unsafe-eval'");
    directives.push(`script-src ${scriptSources.join(' ')}`);

    // Style source
    const styleSources = [...allowedSources];
    if (allowUnsafeInline) styleSources.push("'unsafe-inline'");
    directives.push(`style-src ${styleSources.join(' ')}`);

    return directives.join('; ');
  }

  /**
   * Validate postMessage data
   */
  static validatePostMessageData(data, expectedStructure = {}) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('PostMessage data must be an object');
    }

    // Check required fields
    Object.entries(expectedStructure).forEach(([key, validator]) => {
      if (typeof validator === 'function') {
        if (!validator(data[key])) {
          throw new Error(`Invalid value for field: ${key}`);
        }
      } else if (typeof validator === 'string') {
        if (typeof data[key] !== validator) {
          throw new Error(`Field ${key} must be of type ${validator}`);
        }
      }
    });

    return true;
  }

  /**
   * Rate limiting for postMessage communications
   */
  static createRateLimiter(maxRequests = 100, timeWindow = 60000) {
    const requests = new Map();

    return (origin) => {
      const now = Date.now();
      const windowStart = now - timeWindow;

      // Clean old entries
      for (const [key, timestamps] of requests.entries()) {
        requests.set(key, timestamps.filter(time => time > windowStart));
        if (requests.get(key).length === 0) {
          requests.delete(key);
        }
      }

      // Check current origin
      const originRequests = requests.get(origin) || [];
      
      if (originRequests.length >= maxRequests) {
        throw new Error(`Rate limit exceeded for origin: ${origin}`);
      }

      // Add current request
      originRequests.push(now);
      requests.set(origin, originRequests);

      return true;
    };
  }

  /**
   * Generate secure random ID for RPC messages
   */
  static generateSecureId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for environments without crypto.randomUUID
    return 'id_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
  }
}