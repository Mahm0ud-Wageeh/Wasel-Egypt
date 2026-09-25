/**
 * Central registry of backend endpoints (Laravel API v1).
 * Aligned with Wasel Egypt Laravel backend routes/api.php.
 */

export const endpoints = {
  // Auth
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    user: '/auth/user',
    oauthStatus: '/auth/oauth-status',
  },

  // Users
  users: {
    show: (id: string | number) => `/users/${id}`,
    update: (id: string | number) => `/users/${id}`,
    preferences: (id: string | number) => `/users/${id}/preferences`,
    updatePreferences: (id: string | number) => `/users/${id}/preferences`,
    trust: (id: string | number) => `/users/${id}/trust`,
  },

  // Public Transit
  public: {
    routes: '/public-routes',
    route: (id: string | number) => `/public-routes/${id}`,
    routeStops: (id: string | number) => `/routes/${id}/stops`,
    variantGeometry: (variantId: string | number) => `/route-variants/${variantId}/geometry`,
    stops: '/stops',
    stop: (id: string | number) => `/stops/${id}`,
    stopWithRoutes: (id: string | number) => `/stops/${id}?with_routes=1`,
    stopDepartures: (id: string | number) => `/stops/${id}/departures`,
    transitModes: '/transit-modes',
    governorates: '/governorates',
    areas: '/areas',
    transitOperators: '/transit-operators',
    schedules: '/public-schedules',
    activeServiceAlerts: '/service-alerts/active',
    placesSearch: '/places/search',
    publicReports: '/community-reports',
    publicReport: (id: string | number) => `/community-reports/${id}`,
    networkStats: '/network/stats',
    fares: '/fares',
    fareEstimate: (originId: string | number, destinationId: string | number) =>
      `/fares/estimate?origin=${originId}&destination=${destinationId}`,
  },

  // Places Search
  places: {
    search: '/places/search',
  },

  // Stops
  stops: {
    list: '/stops',
    show: (id: string | number) => `/stops/${id}`,
    departures: (id: string | number) => `/stops/${id}/departures`,
  },

  // AI
  ai: {
    status: '/ai/status',
    chat: '/ai/chat',
  },

  // Journeys
  journeys: {
    search: '/journeys/search',
    list: '/journeys',
    create: '/journeys',
    show: (id: string | number) => `/journeys/${id}`,
    remove: (id: string | number) => `/journeys/${id}`,
    alternatives: (id: string | number) => `/journeys/${id}/alternatives`,
    start: (id: string | number) => `/journeys/${id}/start`,
  },

  // Active Journeys & Live GPS & Deviations
  activeJourneys: {
    list: '/active-journeys',
    show: (id: string | number) => `/active-journeys/${id}`,
    location: (id: string | number) => `/active-journeys/${id}/location`,
    progress: (id: string | number) => `/active-journeys/${id}/progress`,
    complete: (id: string | number) => `/active-journeys/${id}/complete`,
    cancel: (id: string | number) => `/active-journeys/${id}/cancel`,
    deviations: (id: string | number) => `/active-journeys/${id}/deviations`,
    resume: (id: string | number) => `/active-journeys/${id}/resume`,
    recoveryOptions: (id: string | number) => `/active-journeys/${id}/recovery-options`,
    acceptRecovery: (id: string | number, recoveryId: string | number) =>
      `/active-journeys/${id}/recovery-options/${recoveryId}/accept`,
  },

  // Reports
  reports: {
    list: '/reports',
    create: '/reports',
    show: (id: string | number) => `/reports/${id}`,
    remove: (id: string | number) => `/reports/${id}`,
    moderate: (id: string | number) => `/reports/${id}/moderate`,
    moderations: (id: string | number) => `/reports/${id}/moderations`,
  },

  // Incidents (Community v2.1)
  incidents: {
    list: '/incidents',
    create: '/incidents',
    show: (id: string | number) => `/incidents/${id}`,
    vote: (id: string | number) => `/incidents/${id}/vote`,
    publicList: '/public/incidents',
  },

  // Saved Places (v2.1)
  savedPlaces: {
    list: '/saved-places',
    create: '/saved-places',
    remove: (id: string | number) => `/saved-places/${id}`,
  },

  // Notifications
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id: string | number) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    remove: (id: string | number) => `/notifications/${id}`,
  },

  // Admin Analytics
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

  // Admin
  admin: {
    dashboard: '/admin/analytics/dashboard',
    systemHealth: '/admin/analytics/system-health',
    journeys: '/admin/analytics/journeys',
    deviations: '/admin/analytics/deviations',
    usage: '/admin/analytics/usage',
    reports: '/admin/analytics/reports',
    users: '/admin/users',
    user: (id: string | number) => `/admin/users/${id}`,
    deleteUser: (id: string | number) => `/admin/users/${id}`,
    roles: '/admin/roles',
    role: (id: string | number) => `/admin/roles/${id}`,
    assignPermission: (roleId: string | number) => `/admin/roles/${roleId}/assign-permission`,
    removePermission: (roleId: string | number, permissionId: string | number) =>
      `/admin/roles/${roleId}/remove-permission/${permissionId}`,
    permissions: '/admin/permissions',
    fares: '/admin/fares',
    dataImports: '/admin/data/imports',
    dataQuality: '/admin/data/quality',
    dataAudit: '/admin/data/audit',
    rollbackPreview: (id: string | number) => `/admin/data/imports/${id}/rollback-preview`,
    rollback: (id: string | number) => `/admin/data/imports/${id}/rollback`,
  },

  // Admin Transit consoles
  adminTransit: {
    stopTimes: '/stop-times',
    stopTime: (id: string | number) => `/stop-times/${id}`,
    routeGeometry: '/route-geometry',
    routeGeometryItem: (id: string | number) => `/route-geometry/${id}`,
  },

  // Saved Favorite Locations
  favoriteLocations: {
    list: '/favorite-locations',
    create: '/favorite-locations',
    remove: (id: string | number) => `/favorite-locations/${id}`,
    delete: (id: string | number) => `/favorite-locations/${id}`,
  },

  // Digital Wallet
  wallet: {
    show: '/wallet',
    topup: '/wallet/topup',
    pay: '/wallet/pay',
  },

  // Smart QR Transit Tickets
  tickets: {
    active: '/tickets/active',
    purchase: '/tickets/purchase',
    validate: (code: string) => `/tickets/validate/${code}`,
  },

  // Carbon Rewards & Gamification
  rewards: {
    show: '/rewards',
    redeem: '/rewards/redeem',
  },

  // Live Telemetry
  telemetry: {
    live: '/telemetry/live',
  },
}
