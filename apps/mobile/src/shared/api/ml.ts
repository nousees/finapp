import { apiConfig } from "./config";
import { requestJson } from "./http";

export type VoiceTranscription = {
  text: string;
  language: string;
  confidence: number;
};

export type EnrichedVoiceTransaction = {
  transaction: {
    amount?: number | null;
    currency: string;
    merchant?: string | null;
    date?: string | null;
    operation_type: "expense" | "income" | "transfer" | string;
    description: string;
    category_code: string;
    category_name: string;
  };
  confidence: {
    ner: number;
    categorization: number;
    overall: number;
  };
  needs_review: boolean;
  model_versions: {
    ner: string;
    categorization: string;
  };
};

export async function transcribeAudioFile(file: { uri: string; name: string; mimeType?: string | null }): Promise<VoiceTranscription> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "audio/mpeg",
  } as any);

  return requestJson<VoiceTranscription>({
    baseUrl: apiConfig.mlBaseUrl,
    path: "/api/v1/voice/transcribe",
    method: "POST",
    body: formData,
  });
}

export async function enrichText(text: string): Promise<EnrichedVoiceTransaction> {
  try {
    return await requestJson<EnrichedVoiceTransaction>({
      baseUrl: apiConfig.mlBaseUrl,
      path: "/api/v1/enrich",
      method: "POST",
      body: { text },
    });
  } catch {
    return fallbackEnrichText(text);
  }
}

function fallbackEnrichText(text: string): EnrichedVoiceTransaction {
  const amountMatch = text.match(/\b(\d{1,9}(?:[ .,]\d{3})*(?:[,.]\d{1,2})?|\d{1,9})\b/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/\s/g, "").replace(",", ".")) : undefined;
  const lowered = text.toLowerCase();
  const isIncome = /(получил|получила|зачислили|зарплата|аванс|доход)/i.test(lowered);
  const category = detectCategory(lowered, isIncome);

  return {
    transaction: {
      amount,
      currency: "RUB",
      merchant: detectMerchant(text),
      date: lowered.includes("вчера") ? offsetDate(-1) : new Date().toISOString().slice(0, 10),
      operation_type: isIncome ? "income" : "expense",
      description: text,
      category_code: category.code,
      category_name: category.name,
    },
    confidence: {
      ner: amount ? 0.72 : 0.45,
      categorization: category.code === "other" ? 0.55 : 0.78,
      overall: amount ? 0.7 : 0.5,
    },
    needs_review: !amount || category.code === "other",
    model_versions: {
      ner: "local-fallback",
      categorization: "local-fallback",
    },
  };
}

function detectCategory(text: string, isIncome: boolean) {
  if (isIncome) return { code: "salary", name: "Зарплата" };
  if (/(пятер|магнит|продукт|супермаркет)/i.test(text)) return { code: "groceries", name: "Продукты" };
  if (/(такси|метро|автобус|транспорт)/i.test(text)) return { code: "transport", name: "Транспорт" };
  if (/(netflix|spotify|подписк)/i.test(text)) return { code: "subscriptions", name: "Подписки" };
  if (/(аптек|лекарств|здоров)/i.test(text)) return { code: "health", name: "Здоровье" };
  if (/(кафе|ресторан|кофе)/i.test(text)) return { code: "restaurants", name: "Кафе" };
  return { code: "other", name: "Прочее" };
}

function detectMerchant(text: string): string | null {
  const match = text.match(/\b(?:в|на|через)\s+([а-яёa-z0-9 -]{3,40})/i);
  return match?.[1]?.trim() || null;
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function importStatementFile(file: { uri: string; name: string; mimeType?: string | null }): Promise<{
  import_id: string;
  status: string;
  processed_records: number;
  errors: Array<Record<string, unknown>>;
}> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "text/csv",
  } as any);

  return requestJson({
    baseUrl: apiConfig.collectionBaseUrl,
    path: "/api/v1/import",
    method: "POST",
    body: formData,
  });
}
