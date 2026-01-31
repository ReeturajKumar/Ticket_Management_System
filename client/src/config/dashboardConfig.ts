/**
 * Dashboard Configuration
 * Centralized configuration for dashboard targets, thresholds, and display settings
 */

export const DASHBOARD_CONFIG = {
  targets: {
    resolutionTimeHours: 72, // 3 days default target
    resolutionTimeHoursShort: 24, // 1 day for strict SLA
    slaCompliance: 90, // Default SLA compliance target
    slaComplianceStrict: 95, // Strict SLA compliance target
  },
  thresholds: {
    performance: {
      excellent: 90,
      good: 70,
      stable: 50,
    },
    workload: {
      warning: 5, // Show warning badge if active tickets exceed this
      maxActive: 10, // Maximum active tickets for progress bar calculation
    },
  },
  multipliers: {
    activeWorkloadThreshold: 0.5, // 50% of total tickets should be active (for progress calculation)
    progressBarScale: 10, // Multiplier for progress bar (10 tickets = 100%)
  },
  display: {
    maxTeamMembers: 5, // Max team members to show in workload section
    maxRecentTickets: 3, // Max recent tickets to display
    teamTablePageSize: 10, // Items per page in team table
    defaultAnalyticsPeriod: '7d', // Default analytics period
  },
} as const;
