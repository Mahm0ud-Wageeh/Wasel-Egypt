/**
 * Privacy-safe Google Analytics 4 integration for Wasel Egypt.
 *
 * Principles:
 * 1. Safe by default: If VITE_GA_MEASUREMENT_ID is absent, silently no-op.
 * 2. Privacy-first: Strips raw latitude/longitude coordinates and PII from event payloads.
 * 3. Never throws: analytics calls never break the user experience.
 */

let isInitialized = false;

export function initGA() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId || typeof window === 'undefined') {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    // Inject Google tag script asynchronously
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false, // We control page view events
    });

    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('[Wasel Analytics] Initialization failed:', err);
    return false;
  }
}

/**
 * Sanitize event parameters to ensure zero location/PII leaks.
 */
function sanitizeParams(params = {}) {
  const sanitized = {};
  const prohibitedKeys = ['lat', 'latitude', 'lon', 'lng', 'longitude', 'coords', 'phone', 'email', 'name', 'token'];

  for (const [key, value] of Object.entries(params)) {
    if (prohibitedKeys.includes(key.toLowerCase())) {
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeParams(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Track a custom transit event.
 *
 * Supported events:
 * - planner_search_started
 * - planner_search_success
 * - best_route_viewed
 * - journey_started
 * - journey_completed
 * - journey_cancelled
 * - deviation_detected
 * - recovery_started
 * - recovery_accepted
 * - fare_viewed
 * - ai_opened
 * - ai_action_executed
 */
export function trackEvent(eventName, params = {}) {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  try {
    const cleanParams = sanitizeParams(params);
    window.gtag('event', eventName, cleanParams);
  } catch (err) {
    // Non-blocking catch
    console.debug('[Wasel Analytics] trackEvent error:', err);
  }
}

/**
 * Track page view for SPA routes
 */
export function trackPageView(pagePath, pageTitle) {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  try {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  } catch (err) {
    console.debug('[Wasel Analytics] trackPageView error:', err);
  }
}
