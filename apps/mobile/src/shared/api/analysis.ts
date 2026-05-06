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
