/**
 * Monitoring and performance utilities for iframe integration
 * Provides health monitoring, performance tracking, and error handling
 */

export class MonitoringUtils {
  static instances = new Map();
  static globalMetrics = {
    totalFrames: 0,
    activeFrames: 0,
    failedConnections: 0,
    averageResponseTime: 0,
    totalRequests: 0
  };

  /**
   * Create a frame health monitor
   */
  static createHealthMonitor(iframe, options = {}) {
    const {
      checkInterval = 5000,
      timeout = 10000,
      onHealthChange = null,
      onError = null,
      maxRetries = 3
    } = options;

    const monitor = {
      iframe,
      isHealthy: false,
      lastCheck: null,
      consecutiveFailures: 0,
      retryCount: 0,
      metrics: {
        uptime: 0,
        downtime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        averageResponseTime: 0,
        responseTimeHistory: []
      },
      intervalId: null,
      startTime: Date.now()
    };

    const performHealthCheck = async () => {
      const checkStart = Date.now();
      monitor.metrics.totalChecks++;

      try {
        // Try to communicate with the frame
        const isResponsive = await this.isFrameResponsive(iframe, timeout);
        const responseTime = Date.now() - checkStart;
        
        // Update metrics
        monitor.metrics.responseTimeHistory.push(responseTime);
        if (monitor.metrics.responseTimeHistory.length > 100) {
          monitor.metrics.responseTimeHistory.shift();
        }
        
        monitor.metrics.averageResponseTime = 
          monitor.metrics.responseTimeHistory.reduce((a, b) => a + b, 0) / 
          monitor.metrics.responseTimeHistory.length;

        if (isResponsive) {
          monitor.metrics.successfulChecks++;
          monitor.consecutiveFailures = 0;
          monitor.retryCount = 0;

          if (!monitor.isHealthy) {
            monitor.isHealthy = true;
            if (onHealthChange) onHealthChange(true, monitor);
          }
        } else {
          throw new Error('Frame not responsive');
        }

      } catch (error) {
        monitor.consecutiveFailures++;
        
        if (monitor.isHealthy) {
          monitor.isHealthy = false;
          if (onHealthChange) onHealthChange(false, monitor);
        }

        if (onError) onError(error, monitor);

        // Retry logic
        if (monitor.retryCount < maxRetries) {
          monitor.retryCount++;
          setTimeout(performHealthCheck, 1000 * monitor.retryCount);
        }
      }

      monitor.lastCheck = Date.now();
      
      // Update uptime/downtime
      const totalTime = monitor.lastCheck - monitor.startTime;
      if (monitor.isHealthy) {
        monitor.metrics.uptime = totalTime;
        monitor.metrics.downtime = totalTime - monitor.metrics.uptime;
      } else {
        monitor.metrics.downtime = totalTime - monitor.metrics.uptime;
      }
    };

    // Start monitoring
    monitor.intervalId = setInterval(performHealthCheck, checkInterval);
    
    // Perform initial check
    performHealthCheck();

    // Store monitor instance
    this.instances.set(iframe, monitor);
    this.globalMetrics.totalFrames++;
    this.globalMetrics.activeFrames++;

    return monitor;
  }

  /**
   * Check if frame is responsive
   */
  static async isFrameResponsive(iframe, timeout = 5000) {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), timeout);

      try {
        // Try different methods to check responsiveness
        
        // Method 1: Try same-origin access
        try {
          const doc = iframe.contentDocument;
          if (doc) {
            clearTimeout(timeoutId);
            resolve(true);
            return;
          }
        } catch (e) {
          // Expected for cross-origin frames
        }

        // Method 2: PostMessage ping
        const messageHandler = (event) => {
          if (event.source === iframe.contentWindow && event.data.type === 'pong') {
            window.removeEventListener('message', messageHandler);
            clearTimeout(timeoutId);
            resolve(true);
          }
        };

        window.addEventListener('message', messageHandler);
        
        iframe.contentWindow.postMessage({ type: 'ping' }, '*');

        // Fallback: assume responsive if no errors
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          clearTimeout(timeoutId);
          resolve(true);
        }, timeout / 2);

      } catch (error) {
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
  }

  /**
   * Stop monitoring a frame
   */
  static stopMonitoring(iframe) {
    const monitor = this.instances.get(iframe);
    if (monitor) {
      if (monitor.intervalId) {
        clearInterval(monitor.intervalId);
      }
      this.instances.delete(iframe);
      this.globalMetrics.activeFrames--;
    }
  }

  /**
   * Get monitoring statistics
   */
  static getStats(iframe = null) {
    if (iframe) {
      return this.instances.get(iframe)?.metrics || null;
    }

    // Return global stats
    const allMetrics = Array.from(this.instances.values()).map(m => m.metrics);
    
    return {
      global: this.globalMetrics,
      frames: allMetrics.length,
      averageUptime: allMetrics.reduce((sum, m) => sum + (m.uptime / (m.uptime + m.downtime)), 0) / allMetrics.length || 0,
      totalChecks: allMetrics.reduce((sum, m) => sum + m.totalChecks, 0),
      successRate: allMetrics.reduce((sum, m) => sum + (m.successfulChecks / m.totalChecks), 0) / allMetrics.length || 0
    };
  }

  /**
   * Performance timing utilities
   */
  static createPerformanceTracker() {
    const metrics = new Map();

    return {
      start: (operation) => {
        metrics.set(operation, { start: performance.now() });
      },

      end: (operation) => {
        const metric = metrics.get(operation);
        if (metric) {
          metric.end = performance.now();
          metric.duration = metric.end - metric.start;
          return metric.duration;
        }
        return null;
      },

      measure: (operation, fn) => {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        metrics.set(operation, { start, end: start + duration, duration });
        
        return { result, duration };
      },

      measureAsync: async (operation, fn) => {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        
        metrics.set(operation, { start, end: start + duration, duration });
        
        return { result, duration };
      },

      getMetrics: () => Object.fromEntries(metrics),

      clear: () => metrics.clear()
    };
  }

  /**
   * Error tracking and reporting
   */
  static createErrorTracker(options = {}) {
    const {
      maxErrors = 100,
      onError = null,
      categorizeErrors = true
    } = options;

    const errors = [];
    const categories = new Map();

    const trackError = (error, context = {}) => {
      const errorData = {
        timestamp: Date.now(),
        message: error.message,
        stack: error.stack,
        context,
        id: this.generateId()
      };

      // Categorize errors
      if (categorizeErrors) {
        let category = 'unknown';
        
        if (error.message.includes('timeout')) category = 'timeout';
        else if (error.message.includes('network')) category = 'network';
        else if (error.message.includes('permission')) category = 'permission';
        else if (error.message.includes('origin')) category = 'cors';
        else if (error.name === 'TypeError') category = 'type';
        else if (error.name === 'ReferenceError') category = 'reference';

        errorData.category = category;
        
        const categoryCount = categories.get(category) || 0;
        categories.set(category, categoryCount + 1);
      }

      errors.push(errorData);
      
      // Limit error history
      if (errors.length > maxErrors) {
        errors.shift();
      }

      if (onError) {
        onError(errorData);
      }

      return errorData;
    };

    return {
      track: trackError,
      getErrors: () => [...errors],
      getCategories: () => Object.fromEntries(categories),
      clear: () => {
        errors.length = 0;
        categories.clear();
      },
      getStats: () => ({
        total: errors.length,
        categories: Object.fromEntries(categories),
        recent: errors.slice(-10)
      })
    };
  }

  /**
   * Retry mechanism with exponential backoff
   */
  static createRetryHandler(options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      shouldRetry = () => true
    } = options;

    return async (operation, context = {}) => {
      let lastError;
      let delay = initialDelay;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;

          if (attempt === maxRetries || !shouldRetry(error, attempt)) {
            throw error;
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Increase delay for next retry (exponential backoff)
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }

      throw lastError;
    };
  }

  /**
   * Generate unique ID for tracking
   */
  static generateId() {
    return Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
  }

  /**
   * Clean up all monitoring
   */
  static cleanup() {
    this.instances.forEach((monitor, iframe) => {
      this.stopMonitoring(iframe);
    });
    
    this.globalMetrics = {
      totalFrames: 0,
      activeFrames: 0,
      failedConnections: 0,
      averageResponseTime: 0,
      totalRequests: 0
    };
  }
}