import { apiConfig } from "./config";
import { requestJson } from "./http";

export type ApiTransaction = {
  id: string;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category_id?: string | null;
  description?: string | null;
  original_description?: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
  ml_confidence?: number | null;
  is_verified: boolean;
  is_recurring: boolean;
};

type ListTransactionsResponse = {
  transactions?: ApiTransaction[] | null;
  data?: ApiTransaction[] | null;
  count?: number;
};

export type CreateTransactionPayload = {
  amount: number;
  type: "INCOME" | "EXPENSE";
  category_id?: string | null;
  description?: string;
  date?: string;
  currency?: string;
};

export async function listTransactions(params?: string | { q?: string; type?: "INCOME" | "EXPENSE" | "TRANSFER"; limit?: number; offset?: number }): Promise<ApiTransaction[]> {
  const search = new URLSearchParams();
  if (typeof params === "string") {
    if (params.trim()) search.set("q", params.trim());
  } else if (params) {
    if (params.q?.trim()) search.set("q", params.q.trim());
    if (params.type) search.set("type", params.type);
    if (typeof params.limit === "number") search.set("limit", String(params.limit));
    if (typeof params.offset === "number") search.set("offset", String(params.offset));
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await requestJson<ListTransactionsResponse | ApiTransaction[] | null>({
    baseUrl: apiConfig.collectionBaseUrl,
    path: `/api/v1/transactions${suffix}`,
    method: "GET",
  });
  return normalizeTransactionsResponse(response);
}

function normalizeTransactionsResponse(response: ListTransactionsResponse | ApiTransaction[] | null): ApiTransaction[] {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];
  if (Array.isArray(response.transactions)) return response.transactions;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload> & {
  is_verified?: boolean;
  category_id?: string | null;
};

export function updateTransaction(id: string, payload: UpdateTransactionPayload): Promise<ApiTransaction> {
  return requestJson<ApiTransaction>({
    baseUrl: apiConfig.collectionBaseUrl,
    path: `/api/v1/transactions/${id}`,
    method: "PATCH",
    body: payload,
  });
}

export function createTransaction(payload: CreateTransactionPayload): Promise<ApiTransaction> {
  return requestJson<ApiTransaction>({
    baseUrl: apiConfig.collectionBaseUrl,
    path: "/api/v1/transactions",
    method: "POST",
    body: {
      amount: payload.amount,
      currency: payload.currency || "RUB",
      type: payload.type,
      category_id: payload.category_id,
      description: payload.description,
      date: payload.date,
    },
  });
}
