
import { AIEnrichResponse } from "../types";

// DeepSeek / OpenAI Compatible Service
const API_URL = "https://api.deepseek.com/chat/completions";

const getApiKey = () => {
  let apiKey = '';
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        apiKey = (import.meta as any).env.VITE_API_KEY;
    }
  } catch (e) {}

  if (!apiKey) {
      try {
          if (typeof process !== 'undefined' && process.env) {
              apiKey = process.env.VITE_API_KEY;
          }
      } catch (e) {}
  }
  
  return apiKey ? apiKey.trim() : '';
};

const RESULT_CACHE: Record<string, AIEnrichResponse> = {};

// Helper to clean Markdown code blocks ```json ... ```
const parseJsonFromLLM = (text: string) => {
    try {
        // 1. Try direct parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Try extracting from markdown code blocks
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch (e2) {
                throw new Error("Failed to parse extracted JSON");
            }
        }
        // 3. Try finding first { and last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             try {
                return JSON.parse(text.substring(start, end + 1));
            } catch (e3) {
                throw new Error("Failed to parse fuzzy JSON");
            }
        }
        throw e;
    }
};

export const enrichWordWithAI = async (inputTerm: string): Promise<AIEnrichResponse> => {
  const normalizedTerm = inputTerm.toLowerCase().trim();
  if (RESULT_CACHE[normalizedTerm]) {
    return RESULT_CACHE[normalizedTerm];
  }

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing. Please set VITE_API_KEY (DeepSeek) in Vercel/Cloudflare.");

  // Optimized prompt for speed
  const systemPrompt = `You are a Kaoyan English expert. Output JSON ONLY.
Word: "${inputTerm}"
Schema:
{
  "term": "${inputTerm}",
  "phonetic": "IPA",
  "mnemonic": "Chinese memory aid (very brief)",
  "examSource": "e.g. 2010 Text 1",
  "meanings": [
    {
      "partOfSpeech": "vt./n.",
      "definition": "CHINESE ONLY",
      "example": "Short sentence (approx 10 words)",
      "translation": "Chinese translation"
    }
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "JSON" }
            ],
            temperature: 0.1,
            stream: false
        }),
        signal: controller.signal
      });

      if (!response.ok) {
          const err = await response.text();
          throw new Error(`DeepSeek API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = parseJsonFromLLM(content);

      RESULT_CACHE[normalizedTerm] = parsed;
      if (parsed.term) RESULT_CACHE[parsed.term.toLowerCase()] = parsed;
      
      return parsed;

  } catch (error: any) {
      if (error.name === 'AbortError') {
          throw new Error("Timeout: DeepSeek API took too long to respond.");
      }
      console.error("AI Enrich Error:", error);
      throw error;
  } finally {
      clearTimeout(timeoutId);
  }
};

export const batchEnrichWords = async (inputTerms: string[]): Promise<AIEnrichResponse[]> => {
  const uncachedTerms = inputTerms.filter(t => !RESULT_CACHE[t.toLowerCase().trim()]);
  const cachedResults = inputTerms.map(t => RESULT_CACHE[t.toLowerCase().trim()]).filter(Boolean);

  if (uncachedTerms.length === 0) return cachedResults;

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const systemPrompt = `Kaoyan Vocab Engine.
Input: ${JSON.stringify(uncachedTerms)}
Output: JSON Array.
Schema per item: {term, phonetic, mnemonic(brief), meanings:[{partOfSpeech, definition(CN), example(short), translation}]}.
Keep brief. JSON ONLY.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for batch

  try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate JSON Array" }
            ],
            temperature: 0.1,
            stream: false
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Batch API Error: ${response.status}`);

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      let parsedArray: AIEnrichResponse[] = [];
      try {
          parsedArray = parseJsonFromLLM(content);
      } catch (e) {
          console.error("Batch JSON parse failed", e);
      }

      if (Array.isArray(parsedArray)) {
          parsedArray.forEach(item => {
              if (item && item.term) RESULT_CACHE[item.term.toLowerCase()] = item;
          });
          return [...cachedResults, ...parsedArray];
      } else {
          return cachedResults;
      }

  } catch (error) {
      console.error("Batch Error:", error);
      return cachedResults;
  } finally {
      clearTimeout(timeoutId);
  }
};
