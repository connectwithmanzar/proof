export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_TIMEOUT_MS = 25_000;
const MAX_IMAGE_BYTES = 1_800_000;

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export type GeminiImagePart = {
  mimeType: "image/jpeg";
  data: string;
};

export async function blobToInlineJpeg(
  blob: Blob,
): Promise<GeminiImagePart | null> {
  if (blob.size <= 0 || blob.size > MAX_IMAGE_BYTES) return null;
  const buffer = Buffer.from(await blob.arrayBuffer());
  return {
    mimeType: "image/jpeg",
    data: buffer.toString("base64"),
  };
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

export async function generateGeminiText(input: {
  system: string;
  userText: string;
  images: GeminiImagePart[];
}): Promise<string> {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const parts: Array<Record<string, unknown>> = [
    { text: input.userText },
    ...input.images.map((image) => ({
      inlineData: { mimeType: image.mimeType, data: image.data },
    })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 350,
        },
      }),
      signal: controller.signal,
    });
    const json = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(json.error?.message || `Gemini ${response.status}`);
    }
    const text = json.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned empty text");
    return cleanGeminiText(text);
  } finally {
    clearTimeout(timer);
  }
}

function cleanGeminiText(text: string): string {
  return text
    .replace(/^```(?:\w+)?\s*/, "")
    .replace(/\s*```$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
