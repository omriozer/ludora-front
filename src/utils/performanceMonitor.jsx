/**
 * Performance Monitoring Utilities
 * Tools for measuring and optimizing Core Web Vitals and general performance
 */

import { getCurrentMetrics, getPerformanceHints } from './webVitals';
import { isDev, isProd } from './environment';

/**
 * Performance monitoring class for development and optimization
 */
class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.observers = new Map();
    this.isProduction = isProd();
  }

  /**
   * Measure loading time of specific components or operations
   */
  startMeasurement(name) {
    if (this.isProduction) return;

    const startTime = performance.now();
    this.measurements.set(name, { startTime, endTime: null });

    console.log(`⏱️ Started measuring: ${name}`);
  }

  /**
   * End measurement and log results
   */
  endMeasurement(name) {
    if (this.isProduction) return;

    const measurement = this.measurements.get(name);
    if (!measurement) {
      console.warn(`No measurement found for: ${name}`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;
    measurement.endTime = endTime;
    measurement.duration = duration;

    // Log with color coding based on performance
    const color = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
    console.log(`${color} ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Measure React component render times
   */
  measureComponentRender(componentName, renderFunction) {
    if (this.isProduction) {
      return renderFunction();
    }

    this.startMeasurement(`${componentName} render`);
    const result = renderFunction();
    this.endMeasurement(`${componentName} render`);

    return result;
  }

  /**
   * Monitor image loading performance
   */
  observeImageLoading() {
    if (this.isProduction || this.observers.has('images')) return;

    const imageObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.initiatorType === 'img') {
          console.log(`🖼️ Image loaded: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      });
    });

    imageObserver.observe({ entryTypes: ['resource'] });
    this.observers.set('images', imageObserver);
  }

  /**
   * Monitor navigation performance
   */
  observeNavigation() {
    if (this.isProduction || this.observers.has('navigation')) return;

    const navigationObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.group('🧭 Navigation Performance');
        console.log(`DNS Lookup: ${(entry.domainLookupEnd - entry.domainLookupStart).toFixed(2)}ms`);
        console.log(`Connection: ${(entry.connectEnd - entry.connectStart).toFixed(2)}ms`);
        console.log(`Request: ${(entry.responseEnd - entry.requestStart).toFixed(2)}ms`);
        console.log(`DOM Loading: ${(entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart).toFixed(2)}ms`);
        console.log(`Total: ${entry.duration.toFixed(2)}ms`);
        console.groupEnd();
      });
    });

    navigationObserver.observe({ entryTypes: ['navigation'] });
    this.observers.set('navigation', navigationObserver);
  }

  /**
   * Monitor long tasks that may block the main thread (affects INP)
   */
  observeLongTasks() {
    if (this.isProduction || this.observers.has('longtasks')) return;

    if ('PerformanceLongTaskTiming' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms (affects INP)`);
          console.log('Consider optimizing:', entry.attribution?.[0]?.name || 'unknown script');
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtasks', longTaskObserver);
    }
  }

  /**
   * Monitor layout shifts that may affect CLS
   */
  observeLayoutShifts() {
    if (this.isProduction || this.observers.has('layout-shift')) return;

    const layoutShiftObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          console.warn(`⚠️ Layout shift detected: score ${entry.value.toFixed(4)} (affects CLS)`);
          entry.sources?.forEach((source) => {
            console.log('Shifted element:', source.node);
          });
        }
      });
    });

    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('layout-shift', layoutShiftObserver);
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const webVitals = getCurrentMetrics();
    const hints = getPerformanceHints();
    const measurements = Array.from(this.measurements.entries()).map(([name, data]) => ({
      name,
      duration: data.duration,
      timestamp: data.startTime
    }));

    return {
      timestamp: new Date().toISOString(),
      webVitals,
      customMeasurements: measurements,
      performanceHints: hints,
      recommendations: this.getRecommendations(webVitals, measurements)
    };
  }

  /**
   * Generate performance recommendations
   */
  getRecommendations(webVitals, measurements) {
    const recommendations = [];

    // Check for slow loading components
    const slowComponents = measurements.filter(m => m.duration > 100);
    if (slowComponents.length > 0) {
      recommendations.push({
        type: 'component-optimization',
        severity: 'medium',
        message: `${slowComponents.length} components are taking over 100ms to render`,
        components: slowComponents.map(c => c.name)
      });
    }

    // Check Web Vitals
    const poorVitals = webVitals.filter(v => v.classification === 'poor');
    if (poorVitals.length > 0) {
      recommendations.push({
        type: 'core-web-vitals',
        severity: 'high',
        message: 'Poor Core Web Vitals scores detected',
        metrics: poorVitals.map(v => v.name)
      });
    }

    return recommendations;
  }

  /**
   * Start all performance monitoring
   */
  startMonitoring() {
    if (this.isProduction) return;

    console.log('🚀 Performance monitoring started');
    this.observeImageLoading();
    this.observeNavigation();
    this.observeLongTasks();
    this.observeLayoutShifts();
  }

  /**
   * Stop all performance monitoring
   */
  stopMonitoring() {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
    console.log('🛑 Performance monitoring stopped');
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary() {
    const report = this.getPerformanceReport();

    console.group('📊 Performance Summary');

    if (report.webVitals.length > 0) {
      console.log('Core Web Vitals:', report.webVitals);
    }

    if (report.customMeasurements.length > 0) {
      console.log('Component Measurements:', report.customMeasurements);
    }

    if (report.recommendations.length > 0) {
      console.warn('Recommendations:', report.recommendations);
    }

    console.groupEnd();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development
if (isDev()) {
  // Start monitoring after a short delay to avoid interfering with initial render
  setTimeout(() => {
    performanceMonitor.startMonitoring();
  }, 1000);
}

export default performanceMonitor;

/**
 * HOC for measuring component render performance
 */
export const withPerformanceMonitoring = (WrappedComponent) => {
  const ComponentWithMonitoring = (props) => {
    return performanceMonitor.measureComponentRender(
      WrappedComponent.displayName || WrappedComponent.name || 'Component',
      () => <WrappedComponent {...props} />
    );
  };

  ComponentWithMonitoring.displayName = `withPerformanceMonitoring(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithMonitoring;
};

/**
 * Hook for measuring operations within components
 */
export const usePerformanceMeasurement = () => {
  return {
    startMeasurement: (name) => performanceMonitor.startMeasurement(name),
    endMeasurement: (name) => performanceMonitor.endMeasurement(name),
    getReport: () => performanceMonitor.getPerformanceReport()
  };
};