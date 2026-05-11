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
  is_verified: boolean;
  is_recurring: boolean;
};

type ListTransactionsResponse = {
  transactions: ApiTransaction[];
  count: number;
};

export type CreateTransactionPayload = {
  amount: number;
  type: "INCOME" | "EXPENSE";
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
  const response = await requestJson<ListTransactionsResponse>({
    baseUrl: apiConfig.collectionBaseUrl,
    path: `/api/v1/transactions${suffix}`,
    method: "GET",
  });
  return response.transactions;
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
      description: payload.description,
      date: payload.date,
    },
  });
}
