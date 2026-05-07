import { apiConfig } from "./config";
import { requestJson } from "./http";

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string;
  errors?: Record<string, string>;
  timestamp?: string;
};

export type FinancialInsight = {
  periodStart: string;
  periodEnd: string;
  summary: SpendingSummary;
  healthScore: FinancialHealthScore;
  cashflow: CashflowPoint[];
  categories: CategoryInsight[];
  merchants: MerchantInsight[];
  budgets: BudgetInsight[];
  goals: GoalInsight[];
  anomalies: AnomalyInsight[];
  recommendations: RecommendationCandidate[];
  metadata: InsightMetadata;
};

export type SpendingSummary = {
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  averageDailyExpense: number;
  transactionCount: number;
  recurringExpenseTotal: number;
  dataQualityScore: number;
};

export type FinancialHealthScore = {
  score: number;
  level: "EXCELLENT" | "GOOD" | "ATTENTION" | "RISK" | string;
  factors: string[];
};

export type CashflowPoint = {
  date: string;
  income: number;
  expenses: number;
  netCashflow: number;
};

export type CategoryInsight = {
  categoryId?: string | null;
  categoryName: string;
  type: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type MerchantInsight = {
  merchantName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
};

export type BudgetInsight = {
  budgetId: string;
  categoryId?: string | null;
  categoryName: string;
  periodStart: string;
  periodEnd: string;
  amountLimit: number;
  spentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | string;
  daysRemaining: number;
  forecastedOverspend: number;
  message: string;
};

export type GoalInsight = {
  goalId: string;
  name: string;
  status: string;
  priority?: number | null;
  deadline: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | string;
  daysRemaining: number;
  requiredMonthlyContribution: number;
  monthlyAutoSaveEquivalent: number;
  message: string;
};

export type AnomalyInsight = {
  type: string;
  severity: "MEDIUM" | "HIGH" | string;
  title: string;
  description: string;
  transactionId?: string | null;
  categoryId?: string | null;
  amount: number;
  baselineAmount: number;
  occurredAt: string;
};

export type RecommendationCandidate = {
  type: string;
  title: string;
  description: string;
  actionItems: string[];
  estimatedSavings: number;
  priority: number;
  shouldNotify: boolean;
  entityType?: string | null;
  entityId?: string | null;
  sourceModel: string;
};

export type InsightMetadata = {
  generatedAt: string;
  modelVersion: string;
  dataSources: string[];
  limitations: string[];
};

export type Recommendation = {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  actionItems?: string | null;
  estimatedSavings?: number | null;
  priority: number;
  isApplied: boolean;
  appliedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Budget = {
  id: string;
  userId: string;
  categoryId?: string | null;
  amountLimit: number;
  spentAmount: number;
  period: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  alertThresholds?: number[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  currency?: string;
  deadline: string;
  goalType: string;
  priority?: number | null;
  status?: string | null;
  autoSaveAmount?: number | null;
  autoSaveFrequency?: string | null;
  icon?: string | null;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  sourceModule: string;
  entityType?: string | null;
  entityId?: string | null;
  data?: string | null;
  isRead?: boolean;
  isArchived?: boolean;
  scheduledFor?: string | null;
  createdAt?: string;
};

export type Report = {
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  generatedAt?: string;
  status?: string;
  fileUrl?: string | null;
};

type PagedResult<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
};

export type CreateBudgetRequest = {
  categoryId: string;
  amountLimit: number;
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  periodStart: string;
  periodEnd: string;
  currency?: string;
  alertThresholds?: number[];
  isActive?: boolean;
};

export type CreateGoalRequest = {
  name: string;
  description?: string;
  targetAmount: number;
  deadline: string;
  goalType: "SAVING" | "DEBT_REPAYMENT" | "INVESTMENT" | "PURCHASE";
  priority?: number;
  autoSaveAmount?: number;
  autoSaveFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  icon?: string;
  color?: string;
  currency?: string;
};

export async function getFinancialInsights(params?: {
  periodStart?: string;
  periodEnd?: string;
}): Promise<FinancialInsight> {
  const query = new URLSearchParams();
  if (params?.periodStart) query.set("periodStart", params.periodStart);
  if (params?.periodEnd) query.set("periodEnd", params.periodEnd);
  const suffix = query.toString() ? `?${query}` : "";

  const response = await requestJson<ApiEnvelope<FinancialInsight>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: `/api/v1/insights${suffix}`,
    method: "GET",
  });
  return response.data;
}

export async function listRecommendations(): Promise<Recommendation[]> {
  const response = await requestJson<ApiEnvelope<Recommendation[]>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/recommendations",
    method: "GET",
  });
  return response.data;
}

export async function generateRecommendations(): Promise<Recommendation[]> {
  const response = await requestJson<ApiEnvelope<Recommendation[]>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/recommendations/generate",
    method: "POST",
  });
  return response.data;
}

export async function applyRecommendation(recommendationId: string): Promise<void> {
  await requestJson<ApiEnvelope<null>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: `/api/v1/recommendations/${recommendationId}/apply`,
    method: "POST",
  });
}

export async function listBudgets(): Promise<Budget[]> {
  const response = await requestJson<ApiEnvelope<Budget[]>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/budgets/current",
    method: "GET",
  });
  return response.data;
}

export async function createBudget(data: CreateBudgetRequest): Promise<Budget> {
  const response = await requestJson<ApiEnvelope<Budget>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/budgets",
    method: "POST",
    body: data,
  });
  return response.data;
}

export async function listGoals(): Promise<Goal[]> {
  const response = await requestJson<ApiEnvelope<Goal[]>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/goals",
    method: "GET",
  });
  return response.data;
}

export async function createGoal(data: CreateGoalRequest): Promise<Goal> {
  const response = await requestJson<ApiEnvelope<Goal>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/goals",
    method: "POST",
    body: data,
  });
  return response.data;
}

export async function addFundsToGoal(goalId: string, amount: number): Promise<Goal> {
  const response = await requestJson<ApiEnvelope<Goal>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: `/api/v1/goals/${goalId}/add?amount=${encodeURIComponent(String(amount))}`,
    method: "POST",
  });
  return response.data;
}

export async function listNotifications(params?: { page?: number; size?: number }): Promise<NotificationItem[]> {
  const query = new URLSearchParams();
  if (typeof params?.page === "number") query.set("page", String(params.page));
  if (typeof params?.size === "number") query.set("size", String(params.size));
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await requestJson<ApiEnvelope<PagedResult<NotificationItem> | NotificationItem[]>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: `/api/v1/notifications${suffix}`,
    method: "GET",
  });

  const data = response.data as PagedResult<NotificationItem> | NotificationItem[];
  if (Array.isArray(data)) {
    return data;
  }
  return data.content || [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await requestJson<ApiEnvelope<{ count: number }>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/notifications/unread/count",
    method: "GET",
  });
  return response.data.count;
}

export async function markNotificationsRead(notificationIds?: string[]): Promise<void> {
  await requestJson<ApiEnvelope<null>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/notifications/mark-read",
    method: "POST",
    body: notificationIds && notificationIds.length > 0 ? notificationIds : [],
  });
}

export async function listReports(): Promise<Report[]> {
  const response = await requestJson<ApiEnvelope<Report[]>>({
    baseUrl: apiConfig.analysisBaseUrl,
    path: "/api/v1/reports",
    method: "GET",
  });
  return response.data;
}
