// Performance monitoring and metrics collection utilities
import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
  tags?: Record<string, string>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.initializeObservers();
    this.trackPageLoad();
  }

  // Initialize performance observers
  private initializeObservers() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      // Long Task Observer
      if (
        'PerformanceObserver' in window &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')
      ) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long_task',
              value: entry.duration,
              timestamp: Date.now(),
              type: 'timing',
              tags: {
                startTime: entry.startTime.toString(),
              },
            });

            // Log warning for long tasks
            if (entry.duration > 50) {
              console.warn(`Long task detected: ${entry.duration}ms`);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      }

      // Layout Shift Observer
      if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              this.recordMetric({
                name: 'layout_shift',
                value: entry.value,
                timestamp: Date.now(),
                type: 'gauge',
              });
            }
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      }

      // Largest Contentful Paint Observer
      if (
        PerformanceObserver.supportedEntryTypes.includes(
          'largest-contentful-paint'
        )
      ) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric({
            name: 'largest_contentful_paint',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            type: 'timing',
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      }

      // First Input Delay Observer
      if (PerformanceObserver.supportedEntryTypes.includes('first-input')) {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            this.recordMetric({
              name: 'first_input_delay',
              value: entry.processingStart - entry.startTime,
              timestamp: Date.now(),
              type: 'timing',
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      }
    } catch (error) {
      console.error('Failed to initialize performance observers:', error);
    }
  }

  // Track page load metrics
  private trackPageLoad() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      // Use setTimeout to ensure all resources are loaded
      setTimeout(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;

        if (navigation) {
          // DNS lookup time
          this.recordMetric({
            name: 'dns_lookup_time',
            value: navigation.domainLookupEnd - navigation.domainLookupStart,
            timestamp: Date.now(),
            type: 'timing',
          });

          // TCP connection time
          this.recordMetric({
            name: 'tcp_connection_time',
            value: navigation.connectEnd - navigation.connectStart,
            timestamp: Date.now(),
            type: 'timing',
          });

          // Time to First Byte
          this.recordMetric({
            name: 'time_to_first_byte',
            value: navigation.responseStart - navigation.requestStart,
            timestamp: Date.now(),
            type: 'timing',
          });

          // DOM Content Loaded
          this.recordMetric({
            name: 'dom_content_loaded',
            value:
              navigation.domContentLoadedEventEnd - navigation.navigationStart,
            timestamp: Date.now(),
            type: 'timing',
          });

          // Page Load Complete
          this.recordMetric({
            name: 'page_load_complete',
            value: navigation.loadEventEnd - navigation.navigationStart,
            timestamp: Date.now(),
            type: 'timing',
          });
        }

        // First Contentful Paint
        const fcpEntry = performance.getEntriesByName(
          'first-contentful-paint'
        )[0];
        if (fcpEntry) {
          this.recordMetric({
            name: 'first_contentful_paint',
            value: fcpEntry.startTime,
            timestamp: Date.now(),
            type: 'timing',
          });
        }
      }, 0);
    });
  }

  // Record a custom metric
  recordMetric(metric: PerformanceMetric) {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Send to service worker for potential offline storage
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PERFORMANCE_MARK',
        name: metric.name,
        value: metric.value,
        time: metric.timestamp,
      });
    }

    // Log performance issues
    this.checkPerformanceThresholds(metric);
  }

  // Check if metrics exceed performance thresholds
  private checkPerformanceThresholds(metric: PerformanceMetric) {
    const thresholds = {
      first_contentful_paint: 1800, // 1.8s
      largest_contentful_paint: 2500, // 2.5s
      first_input_delay: 100, // 100ms
      long_task: 50, // 50ms
      time_to_first_byte: 600, // 600ms
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(
        `Performance threshold exceeded for ${metric.name}: ${metric.value}ms (threshold: ${threshold}ms)`
      );
    }
  }

  // Track component render time
  trackComponentRender(componentName: string, renderTime: number) {
    this.recordMetric({
      name: 'component_render_time',
      value: renderTime,
      timestamp: Date.now(),
      type: 'timing',
      tags: {
        component: componentName,
      },
    });
  }

  // Track API call performance
  trackApiCall(endpoint: string, duration: number, status: number) {
    this.recordMetric({
      name: 'api_call_duration',
      value: duration,
      timestamp: Date.now(),
      type: 'timing',
      tags: {
        endpoint,
        status: status.toString(),
      },
    });
  }

  // Track user interactions
  trackUserInteraction(action: string, duration?: number) {
    this.recordMetric({
      name: 'user_interaction',
      value: duration || 0,
      timestamp: Date.now(),
      type: 'counter',
      tags: {
        action,
      },
    });
  }

  // Track memory usage
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric({
        name: 'memory_used',
        value: memory.usedJSHeapSize,
        timestamp: Date.now(),
        type: 'gauge',
      });

      this.recordMetric({
        name: 'memory_total',
        value: memory.totalJSHeapSize,
        timestamp: Date.now(),
        type: 'gauge',
      });

      this.recordMetric({
        name: 'memory_limit',
        value: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
        type: 'gauge',
      });
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      totalMetrics: this.metrics.length,
      byType: {} as Record<string, number>,
      byName: {} as Record<
        string,
        { count: number; avg: number; min: number; max: number }
      >,
      recentMetrics: this.metrics.slice(-10),
    };

    // Group by type
    this.metrics.forEach((metric) => {
      summary.byType[metric.type] = (summary.byType[metric.type] || 0) + 1;
    });

    // Group by name with statistics
    this.metrics.forEach((metric) => {
      if (!summary.byName[metric.name]) {
        summary.byName[metric.name] = {
          count: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity,
        };
      }

      const stats = summary.byName[metric.name];
      stats.count++;
      stats.min = Math.min(stats.min, metric.value);
      stats.max = Math.max(stats.max, metric.value);
      stats.avg = (stats.avg * (stats.count - 1) + metric.value) / stats.count;
    });

    return summary;
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = [];
  }

  // Disable monitoring
  disable() {
    this.isEnabled = false;
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  // Enable monitoring
  enable() {
    this.isEnabled = true;
    this.initializeObservers();
  }
}

// Create a singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  React.useEffect(() => {
    return () => {
      const endTime = performance.now();
      performanceMonitor.trackComponentRender(
        componentName,
        endTime - startTime
      );
    };
  }, [componentName, startTime]);
}

// Higher-order component for performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component';

  const WithPerformanceTracking: React.FC<P> = (props) => {
    usePerformanceTracking(displayName);
    return React.createElement(WrappedComponent, props);
  };

  WithPerformanceTracking.displayName = `withPerformanceTracking(${displayName})`;
  return WithPerformanceTracking;
}

// Web Vitals integration (if web-vitals library is available)
export function initWebVitals() {
  // This would integrate with the web-vitals library if installed
  // For now, we'll use our own basic implementation

  if (typeof window !== 'undefined') {
    // Track Core Web Vitals manually
    let clsValue = 0;
    let clsEntries: any[] = [];

    // Cumulative Layout Shift
    if (
      'PerformanceObserver' in window &&
      PerformanceObserver.supportedEntryTypes.includes('layout-shift')
    ) {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Report CLS on page unload
      window.addEventListener('beforeunload', () => {
        performanceMonitor.recordMetric({
          name: 'cumulative_layout_shift',
          value: clsValue,
          timestamp: Date.now(),
          type: 'gauge',
        });
      });
    }
  }
}

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  initWebVitals();
}

// Export types
export type { PerformanceMetric, WebVitalsMetric };
