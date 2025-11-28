
import { AIEnrichResponse } from "../types";

// DeepSeek / OpenAI Compatible Service
const API_URL = "https://api.deepseek.com/chat/completions";

const getApiKey = () => {
  let apiKey = '';
  
  // 1. Try Cloudflare/Vite Environment Variable
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        apiKey = (import.meta as any).env.VITE_API_KEY;
    }
  } catch (e) {}

  // 2. Try Process Environment (Node/System)
  if (!apiKey) {
      try {
          if (typeof process !== 'undefined' && process.env) {
              apiKey = process.env.VITE_API_KEY;
          }
      } catch (e) {}
  }

  // 3. Fallback: User provided key (Hardcoded for immediate use)
  // --- USER HARDCODED KEY START ---
  if (!apiKey || apiKey.trim() === '') {
      apiKey = 'sk-7205d47491db443b95bcc15d57171b47';
  }
  // --- USER HARDCODED KEY END ---
  
  return apiKey ? apiKey.trim() : '';
};

const RESULT_CACHE: Record<string, AIEnrichResponse> = {};

// Helper to clean Markdown code blocks
const parseJsonFromLLM = (text: string) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try { return JSON.parse(jsonMatch[1]); } catch (e2) {}
        }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) {}
        }
        throw e;
    }
};

export const enrichWordWithAI = async (inputTerm: string): Promise<AIEnrichResponse> => {
  const normalizedTerm = inputTerm.toLowerCase().trim();
  if (RESULT_CACHE[normalizedTerm]) return RESULT_CACHE[normalizedTerm];

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing. Please set VITE_API_KEY.");

  // Optimized Prompt: 2 Meanings + Short Examples (<10 words)
  const systemPrompt = `JSON generator. Word: "${inputTerm}"
Reqs:
1. 2 common meanings.
2. Examples: Simple, very short (<10 words).
Schema:
{
  "term": "${inputTerm}",
  "phonetic": "IPA",
  "mnemonic": "Brief Chinese aid",
  "meanings": [
    { "partOfSpeech": "v./n.", "definition": "CN", "example": "Short sentence", "translation": "CN" },
    { "partOfSpeech": "v./n.", "definition": "CN", "example": "Short sentence", "translation": "CN" }
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); 

  try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "JSON" }
            ],
            temperature: 0,
            stream: false,
            max_tokens: 450
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const parsed = parseJsonFromLLM(data.choices[0].message.content);

      RESULT_CACHE[normalizedTerm] = parsed;
      if (parsed.term) RESULT_CACHE[parsed.term.toLowerCase()] = parsed;
      
      return parsed;

  } catch (error: any) {
      if (error.name === 'AbortError') throw new Error("Timeout");
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

  // Batch Prompt: Speed Focused
  const systemPrompt = `Vocab DB. Input: ${JSON.stringify(uncachedTerms)}.
Return JSON Array.
Item: {term, phonetic, mnemonic, meanings:[{partOfSpeech, definition(CN), example(Short <10 words), translation}]}.
JSON ONLY. No filler.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); 

  try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "JSON Array" }
            ],
            temperature: 0,
            stream: false,
            max_tokens: 1600
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Batch Error`);

      const data = await response.json();
      let parsedArray = [];
      try {
          parsedArray = parseJsonFromLLM(data.choices[0].message.content);
      } catch (e) {}

      if (Array.isArray(parsedArray)) {
          parsedArray.forEach(item => {
              if (item && item.term) RESULT_CACHE[item.term.toLowerCase()] = item;
          });
          return [...cachedResults, ...parsedArray];
      }
      return cachedResults;

  } catch (error) {
      return cachedResults;
  } finally {
      clearTimeout(timeoutId);
  }
};

// NEW: Generate Contextual Story
export const generateStory = async (words: string[]): Promise<{english: string, chinese: string}> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const systemPrompt = `You are a helpful English teacher. 
Task: Write a short, coherent, and slightly funny story (max 120 words) using ALL the following words: ${words.join(', ')}.
Requirements:
1. Highlight the keywords in the English story using **bold** markdown (e.g., **apple**).
2. Provide a Chinese translation below it.
3. Return JSON format only: { "english": "...", "chinese": "..." }`;

  try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "user", content: systemPrompt }
            ],
            temperature: 0.7,
            stream: false
        })
      });

      const data = await response.json();
      return parseJsonFromLLM(data.choices[0].message.content);
  } catch (error) {
      console.error(error);
      throw new Error("Failed to generate story");
  }
};
