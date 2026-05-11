import { apiConfig } from "./config";
import { requestJson } from "./http";

export type ApiSubscription = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  recurrence: string;
  usage_index: number;
  recommendation?: string | null;
};

type SubscriptionsResponse = {
  subscriptions?: ApiSubscription[] | null;
  count?: number;
};

export async function listSubscriptions(): Promise<ApiSubscription[]> {
  const response = await requestJson<SubscriptionsResponse>({
    baseUrl: apiConfig.subscriptionsBaseUrl,
    path: "/api/v1/subscriptions",
    method: "GET",
  });
  return Array.isArray(response.subscriptions) ? response.subscriptions : [];
}

export async function analyzeSubscriptions(): Promise<ApiSubscription[]> {
  const response = await requestJson<SubscriptionsResponse>({
    baseUrl: apiConfig.subscriptionsBaseUrl,
    path: "/api/v1/analyze-subscriptions",
    method: "POST",
  });
  return Array.isArray(response.subscriptions) ? response.subscriptions : [];
}
