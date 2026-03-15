import { apiConfig } from "./config";
import { requestJson } from "./http";

type ProcessedItem = {
  transaction: {
    id: string;
  };
  category: string;
  confidence: number;
};

type BatchResponse = {
  processed: ProcessedItem[];
  count: number;
};

export function processTransaction(id: string): Promise<ProcessedItem> {
  return requestJson<ProcessedItem>({
    baseUrl: apiConfig.processingBaseUrl,
    path: `/api/v1/process/${id}`,
    method: "POST",
  });
}

export function processPendingTransactions(limit = 50): Promise<BatchResponse> {
  return requestJson<BatchResponse>({
    baseUrl: apiConfig.processingBaseUrl,
    path: "/api/v1/categorize-batch",
    method: "POST",
    body: {
      limit,
      transaction_ids: [],
    },
  });
}
