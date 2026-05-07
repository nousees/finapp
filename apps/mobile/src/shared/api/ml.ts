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
  return requestJson<EnrichedVoiceTransaction>({
    baseUrl: apiConfig.mlBaseUrl,
    path: "/api/v1/enrich",
    method: "POST",
    body: { text },
  });
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
