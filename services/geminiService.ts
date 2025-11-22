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
  if (!apiKey) throw new Error("API Key missing. Please set VITE_API_KEY (DeepSeek) in Vercel.");

  const systemPrompt = `You are a vocabulary expert for the Chinese Postgraduate Entrance Exam (Kaoyan).
Output a valid JSON object for the given word.
Rules:
1. 'term': The word itself.
2. 'phonetic': IPA symbol.
3. 'mnemonic': A short Chinese memory aid (root/affix or association).
4. 'examSource': A likely source (e.g., "2015 Reading Text 1").
5. 'meanings': Array of objects. Each has:
   - 'partOfSpeech': e.g., "vt."
   - 'definition': SIMPLE CHINESE DEFINITION ONLY. NO ENGLISH.
   - 'example': A sophisticated academic English sentence suitable for exams.
   - 'translation': Chinese translation of the sentence.
6. Return ONLY JSON. No markdown.`;

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
                { role: "user", content: `Word: "${inputTerm}"` }
            ],
            temperature: 0.1,
            stream: false
        })
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

  } catch (error) {
      console.error("AI Enrich Error:", error);
      throw error;
  }
};

export const batchEnrichWords = async (inputTerms: string[]): Promise<AIEnrichResponse[]> => {
  const uncachedTerms = inputTerms.filter(t => !RESULT_CACHE[t.toLowerCase().trim()]);
  const cachedResults = inputTerms.map(t => RESULT_CACHE[t.toLowerCase().trim()]).filter(Boolean);

  if (uncachedTerms.length === 0) return cachedResults;

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const systemPrompt = `You are a vocabulary engine for Kaoyan exams.
Input: A list of words.
Output: A JSON ARRAY containing details for each word.
Rules:
1. 'definition' MUST be CHINESE.
2. 'example' must be academic English.
3. Return strictly a JSON Array. No extra text.
4. Handle all words in the list.`;

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
                { role: "user", content: JSON.stringify(uncachedTerms) }
            ],
            temperature: 0.1,
            stream: false
        })
      });

      if (!response.ok) throw new Error(`Batch API Error: ${response.status}`);

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Batch parsing can be tricky with Markdown blocks
      let parsedArray: AIEnrichResponse[] = [];
      try {
          parsedArray = parseJsonFromLLM(content);
      } catch (e) {
          // Fallback: try to parse partial array if LLM messed up format
          console.error("Batch JSON parse failed, returning raw cache", e);
      }

      if (Array.isArray(parsedArray)) {
          parsedArray.forEach(item => {
              if (item && item.term) RESULT_CACHE[item.term.toLowerCase()] = item;
          });
          return [...cachedResults, ...parsedArray];
      } else {
          return cachedResults; // Fail gracefully
      }

  } catch (error) {
      console.error("Batch Error:", error);
      return cachedResults; // Return what we have
  }
};