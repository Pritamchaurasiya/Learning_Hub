export interface AnalyticsResult {
  date: string
  value: number
}

export interface CohortData {
  cohort: string
  week0: number
  week1: number
  week2: number
  week3: number
  week4: number
}

export interface ABTestResult {
  variant: string
  users: number
  events: number
  conversionRate: number
}
