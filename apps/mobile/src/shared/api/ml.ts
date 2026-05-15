import { apiConfig } from "./config";
import { requestJson } from "./http";

export type VoiceTranscription = {
  text: string;
  language: string;
  confidence: number;
};

type CollectionVoiceResponse = {
  id: string;
  transcribed_text: string;
  entities?: string | Record<string, unknown> | null;
  status?: string;
  confidence?: number | null;
};

const DEMO_TRANSCRIPTION_TEXT = "потратил 450 рублей на продукты в пятерочке вчера";

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
  try {
    const uploaded = await uploadVoiceFile(file);
    if (uploaded?.transcribed_text) {
      assertNotDemoTranscription(uploaded.transcribed_text);
      const entityPayload = parseEntities(uploaded.entities);
      return {
        text: uploaded.transcribed_text,
        language: String(entityPayload?.language || "ru"),
        confidence: Number(entityPayload?.confidence ?? uploaded.confidence ?? 0.9),
      };
    }
  } catch {
    // Direct ML fallback below.
  }

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "audio/m4a",
  } as any);

  const direct = await requestJson<VoiceTranscription>({
    baseUrl: apiConfig.mlBaseUrl,
    path: "/api/v1/voice/transcribe",
    method: "POST",
    body: formData,
  });
  assertNotDemoTranscription(direct.text);
  return direct;
}

export async function uploadVoiceFile(file: { uri: string; name: string; mimeType?: string | null }): Promise<CollectionVoiceResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "audio/m4a",
  } as any);

  return requestJson<CollectionVoiceResponse>({
    baseUrl: apiConfig.collectionBaseUrl,
    path: "/api/v1/voice/upload",
    method: "POST",
    body: formData,
  });
}

export async function enrichText(text: string): Promise<EnrichedVoiceTransaction> {
  try {
    const remote = await requestJson<EnrichedVoiceTransaction>({
      baseUrl: apiConfig.mlBaseUrl,
      path: "/api/v1/enrich",
      method: "POST",
      body: { text },
    });
    const local = fallbackEnrichText(text);
    if ((remote.needs_review || remote.transaction.category_code === "other") && local.transaction.category_code !== "other") {
      return {
        ...local,
        confidence: {
          ...local.confidence,
          overall: Math.max(local.confidence.overall, remote.confidence.overall || 0),
        },
      };
    }
    return remote;
  } catch {
    return fallbackEnrichText(text);
  }
}

function fallbackEnrichText(text: string): EnrichedVoiceTransaction {
  const amountMatch = text.match(/\b(\d{1,9}(?:[ .,]\d{3})*(?:[,.]\d{1,2})?|\d{1,9})\b/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/\s/g, "").replace(",", ".")) : undefined;
  const lowered = text.toLowerCase();
  const isIncome = /(получил|получила|зачислили|зарплата|аванс|доход|премия|кэшбэк|кешбэк)/i.test(lowered);
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
      categorization: category.code === "other" ? 0.55 : 0.8,
      overall: amount ? 0.72 : 0.52,
    },
    needs_review: !amount || category.code === "other",
    model_versions: {
      ner: "local-fallback",
      categorization: "local-fallback",
    },
  };
}

function detectCategory(text: string, isIncome: boolean) {
  if (isIncome) {
    if (/(фриланс|заказ|проект)/i.test(text)) return { code: "freelance", name: "Фриланс" };
    if (/(премия|бонус)/i.test(text)) return { code: "bonus", name: "Бонусы и премии" };
    if (/(кэшбэк|кешбэк|cashback)/i.test(text)) return { code: "cashback", name: "Кэшбэк" };
    if (/(перевод|подарили|подарок)/i.test(text)) return { code: "gifts_income", name: "Подарки и переводы" };
    return { code: "salary", name: "Зарплата" };
  }

  if (/(пятер|магнит|перекресток|лента|вкусвилл|продукт|супермаркет)/i.test(text)) return { code: "groceries", name: "Продукты" };
  if (/(кафе|ресторан|кофе|пицц|бургер|доставка еды)/i.test(text)) return { code: "restaurants", name: "Кафе и рестораны" };
  if (/(такси|метро|автобус|транспорт|бензин|азс|парковка)/i.test(text)) return { code: "transport", name: "Транспорт" };
  if (/(netflix|spotify|youtube premium|яндекс плюс|подписк|ivi)/i.test(text)) return { code: "subscriptions", name: "Подписки" };
  if (/(аптек|лекарств|клиник|стоматолог|врач|здоров)/i.test(text)) return { code: "health", name: "Здоровье" };
  if (/(аренд|ипотек|квартир|жилье|жильё)/i.test(text)) return { code: "housing", name: "Жилье" };
  if (/(жкх|коммунал|электрич|вода|газ|интернет)/i.test(text)) return { code: "utilities", name: "Коммунальные услуги" };
  if (/(курс|обучен|учеб|университет|школ|репетитор)/i.test(text)) return { code: "education", name: "Образование" };
  if (/(wildberries|ozon|marketplace|покупк|товар)/i.test(text)) return { code: "shopping", name: "Покупки" };
  if (/(одежд|обув|кроссовк|куртк|футболк)/i.test(text)) return { code: "clothing", name: "Одежда и обувь" };
  if (/(отель|авиабилет|поездк|отпуск|путешеств)/i.test(text)) return { code: "travel", name: "Путешествия" };
  if (/(ребен|ребён|дети|садик|игрушк|подгузник)/i.test(text)) return { code: "family", name: "Семья и дети" };
  if (/(маникюр|салон|косметик|барбершоп|уход)/i.test(text)) return { code: "beauty", name: "Красота и уход" };
  if (/(фитнес|зал|спорт|тренировк|бассейн)/i.test(text)) return { code: "sports", name: "Спорт" };
  if (/(зоомагазин|ветеринар|корм|кот|собак|питом)/i.test(text)) return { code: "pets", name: "Питомцы" };
  if (/(смартфон|ноутбук|наушник|техник|электроник|dns)/i.test(text)) return { code: "electronics", name: "Электроника" };
  if (/(подарок|цветы|букет|праздник)/i.test(text)) return { code: "gifts", name: "Подарки" };
  if (/(комисси|налог|штраф|пошлин|сбор)/i.test(text)) return { code: "fees", name: "Налоги и комиссии" };
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

function parseEntities(value: CollectionVoiceResponse["entities"]): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function assertNotDemoTranscription(text: string): void {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === DEMO_TRANSCRIPTION_TEXT) {
    throw new Error("ML-сервис работает в демо-режиме. Пересоберите ml-service с ENABLE_REAL_MODELS=true и реальным Whisper.");
  }
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
