/**
 * Utility functions for calculating trends and comparisons
 */

export interface TrendResult {
  value: number;
  percentage: number;
  isPositive: boolean;
  displayValue: string;
}

/**
 * Calculate trend between current and previous values
 */
export function calculateTrend(
  current: number,
  previous: number,
  isLowerBetter: boolean = false
): TrendResult {
  if (previous === 0) {
    return {
      value: current,
      percentage: current > 0 ? 100 : 0,
      isPositive: current > 0,
      displayValue: current > 0 ? `+${current}` : '0',
    };
  }

  const value = current - previous;
  const percentage = Math.abs(((current - previous) / previous) * 100);
  
  // For metrics where lower is better (like resolution time), flip the logic
  const isPositive = isLowerBetter ? value < 0 : value > 0;

  return {
    value,
    percentage,
    isPositive,
    displayValue: isPositive 
      ? `${isLowerBetter ? '-' : '+'}${value > 0 ? value : Math.abs(value)}`
      : `${value < 0 ? '' : '+'}${value}`,
  };
}

/**
 * Calculate trend percentage for percentage-based metrics (like SLA)
 */
export function calculatePercentageTrend(
  current: number,
  previous: number
): TrendResult {
  if (previous === 0) {
    return {
      value: current,
      percentage: 100,
      isPositive: current > 0,
      displayValue: `+${current.toFixed(1)}%`,
    };
  }

  const percentage = ((current - previous) / previous) * 100;
  const isPositive = percentage >= 0;

  return {
    value: current - previous,
    percentage: Math.abs(percentage),
    isPositive,
    displayValue: `${isPositive ? '+' : ''}${percentage.toFixed(1)}%`,
  };
}

/**
 * Calculate trends from analytics data by comparing current period with previous period
 */
export function calculateTrendsFromAnalytics(trends: Array<{ date: string; created?: number; resolved?: number }> | undefined) {
  if (!trends || trends.length < 7) {
    return {
      resolvedTrend: { value: 0, percentage: 0, isPositive: false, displayValue: '0' },
      createdTrend: { value: 0, percentage: 0, isPositive: false, displayValue: '0' },
    };
  }

  // Split into current week (last 7 days) and previous week (7 days before that)
  const currentWeek = trends.slice(-7);
  const previousWeek = trends.length >= 14 ? trends.slice(-14, -7) : [];

  // Calculate totals
  const currentResolved = currentWeek.reduce((sum, day) => sum + (day.resolved || 0), 0);
  const previousResolved = previousWeek.reduce((sum, day) => sum + (day.resolved || 0), 0);
  
  const currentCreated = currentWeek.reduce((sum, day) => sum + (day.created || 0), 0);
  const previousCreated = previousWeek.reduce((sum, day) => sum + (day.created || 0), 0);

  return {
    resolvedTrend: calculateTrend(currentResolved, previousResolved),
    createdTrend: calculateTrend(currentCreated, previousCreated),
  };
}

/**
 * Calculate progress bar value based on actual vs target
 */
export function calculateProgressValue(
  actual: number,
  target: number,
  isLowerBetter: boolean = false
): number {
  if (target === 0) return 0;
  
  if (isLowerBetter) {
    // For metrics where lower is better (like resolution time)
    // Progress = (target / actual) * 100, capped at 100%
    return Math.min(100, (target / actual) * 100);
  } else {
    // For metrics where higher is better (like SLA compliance)
    // Progress = (actual / target) * 100, capped at 100%
    return Math.min(100, (actual / target) * 100);
  }
}

/**
 * Parse resolution time string to hours (e.g., "24.5 hours" -> 24.5)
 */
export function parseResolutionTime(timeString: string | undefined): number {
  if (!timeString || timeString === 'N/A') return 0;
  const match = timeString.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Parse percentage string to number (e.g., "90%" -> 90)
 */
export function parsePercentage(percentageString: string | undefined): number {
  if (!percentageString) return 0;
  const match = percentageString.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}
