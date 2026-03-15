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

export async function listTransactions(query?: string): Promise<ApiTransaction[]> {
  const suffix = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const response = await requestJson<ListTransactionsResponse>({
    baseUrl: apiConfig.collectionBaseUrl,
    path: `/api/v1/transactions${suffix}`,
    method: "GET",
  });
  return response.transactions;
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
