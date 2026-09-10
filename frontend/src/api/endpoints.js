/**
 * Central registry of backend endpoints (Laravel API v1).
 *
 * Source of truth: routes/api.php — audited 2026-09-04,
 * stop-info endpoints added 2026-09-09 (design v3 §10 stop panel).
 * Only endpoints that exist on the backend may be added here.
 */

export const endpoints = {
  // ---- Auth ----
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    user: '/auth/user',
  },

  // ---- Users ----
  users: {
    show: (id) => `/users/${id}`,
    update: (id) => `/users/${id}`,
    preferences: (id) => `/users/${id}/preferences`,
    updatePreferences: (id) => `/users/${id}/preferences`,
    trust: (id) => `/users/${id}/trust`,
  },

  // ---- Public transit data ----
  public: {
    routes: '/public-routes',
    route: (id) => `/public-routes/${id}`,
    routeStops: (id) => `/routes/${id}/stops`,
    // Route/line page (final-product completion): enriched detail (active
    // variants + frequency) and the stored variant polyline.
    routeDetail: (id) => `/public-routes/${id}`,
    variantGeometry: (variantId) => `/route-variants/${variantId}/geometry`,
    stops: '/stops',
    stop: (id) => `/stops/${id}`,
    // Design v3 §10 — stop info panel: serving routes + next departures,
    // plus nearby-radius search for the map layer.
    stopWithRoutes: (id) => `/stops/${id}?with_routes=1`,
    stopDepartures: (id) => `/stops/${id}/departures`,
    nearbyStops: '/stops', // + ?lat=&lng=&radius= query params
    transitModes: '/transit-modes',
    transitMode: (id) => `/transit-modes/${id}`,
    governorates: '/governorates',
    areas: '/areas',
    transitOperators: '/transit-operators',
    schedules: '/public-schedules',
    schedule: (id) => `/public-schedules/${id}`,
    activeServiceAlerts: '/service-alerts/active',
    placesSearch: '/places/search',
    publicReports: '/community-reports',
    publicReport: (id) => `/community-reports/${id}`,
  },

  // ---- Journey planning ----
  journeys: {
    search: '/journeys/search',
    list: '/journeys',
    create: '/journeys',
    show: (id) => `/journeys/${id}`,
    remove: (id) => `/journeys/${id}`,
    alternatives: (id) => `/journeys/${id}/alternatives`,
    start: (id) => `/journeys/${id}/start`,
  },

  // ---- Active journey / execution / deviation / recovery ----
  activeJourneys: {
    list: '/active-journeys',
    show: (id) => `/active-journeys/${id}`,
    location: (id) => `/active-journeys/${id}/location`,
    progress: (id) => `/active-journeys/${id}/progress`,
    complete: (id) => `/active-journeys/${id}/complete`,
    cancel: (id) => `/active-journeys/${id}/cancel`,
    deviations: (id) => `/active-journeys/${id}/deviations`,
    resume: (id) => `/active-journeys/${id}/resume`,
    recoveryOptions: (id) => `/active-journeys/${id}/recovery-options`,
    acceptRecovery: (id, recoveryId) =>
      `/active-journeys/${id}/recovery-options/${recoveryId}/accept`,
  },

  // ---- Community reports ----
  reports: {
    list: '/reports',
    create: '/reports',
    show: (id) => `/reports/${id}`,
    remove: (id) => `/reports/${id}`,
    moderate: (id) => `/reports/${id}/moderate`,
    moderations: (id) => `/reports/${id}/moderations`,
  },

  // ---- Notifications ----
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    remove: (id) => `/notifications/${id}`,
  },

  // ---- Admin analytics ----
  adminAnalytics: {
    dashboard: '/admin/analytics/dashboard',
    journeys: '/admin/analytics/journeys',
    deviations: '/admin/analytics/deviations',
    usage: '/admin/analytics/usage',
    reports: '/admin/analytics/reports',
    trust: '/admin/analytics/trust',
    notifications: '/admin/analytics/notifications',
    modes: '/admin/analytics/modes',
  },

  // ---- Admin user/role management ----
  admin: {
    users: '/admin/users',
    user: (id) => `/admin/users/${id}`,
    roles: '/admin/roles',
    role: (id) => `/admin/roles/${id}`,
    assignPermission: (roleId) => `/admin/roles/${roleId}/assign-permission`,
    removePermission: (roleId, permissionId) =>
      `/admin/roles/${roleId}/remove-permission/${permissionId}`,
    permissions: '/admin/permissions',
  },
}
