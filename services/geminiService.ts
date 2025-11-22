
import { GoogleGenAI, Type } from "@google/genai";
import { AIEnrichResponse } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

// Simple in-memory cache
const RESULT_CACHE: Record<string, AIEnrichResponse> = {};

// Single word enrichment (used for Dictionary Lookup)
export const enrichWordWithAI = async (inputTerm: string): Promise<AIEnrichResponse> => {
  const normalizedTerm = inputTerm.toLowerCase().trim();
  if (RESULT_CACHE[normalizedTerm]) {
    return RESULT_CACHE[normalizedTerm];
  }

  const ai = getClient();
  
  // Optimized Prompt: Explicitly forbid English definitions
  const prompt = `Define "${inputTerm}" for Chinese Postgraduate Entrance Exam (Kaoyan). 
  CRITICAL RULES:
  1. 'definition' MUST be in SIMPLIFIED CHINESE ONLY (e.g., "vt. 废除"). ABSOLUTELY NO ENGLISH IN DEFINITION.
  2. 'example' should be from academic texts. 
  3. 'translation' must be Chinese.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          mnemonic: { type: Type.STRING },
          examSource: { type: Type.STRING },
          meanings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partOfSpeech: { type: Type.STRING },
                definition: { type: Type.STRING },
                example: { type: Type.STRING },
                translation: { type: Type.STRING }
              },
              required: ["partOfSpeech", "definition", "example", "translation"]
            }
          }
        },
        required: ["term", "phonetic", "meanings"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response");

  try {
    const data = JSON.parse(text) as AIEnrichResponse;
    RESULT_CACHE[normalizedTerm] = data;
    if (data.term) RESULT_CACHE[data.term.toLowerCase()] = data;
    return data;
  } catch (e) {
    throw new Error("Invalid JSON");
  }
};

// Batch enrichment (used for Bulk Import)
export const batchEnrichWords = async (inputTerms: string[]): Promise<AIEnrichResponse[]> => {
  const uncachedTerms = inputTerms.filter(t => !RESULT_CACHE[t.toLowerCase().trim()]);
  const cachedResults = inputTerms
    .map(t => RESULT_CACHE[t.toLowerCase().trim()])
    .filter(Boolean);

  if (uncachedTerms.length === 0) {
    return cachedResults;
  }

  const ai = getClient();
  
  // Optimized Batch Prompt with strict Chinese constraints
  const prompt = `Define these words for Kaoyan: ${JSON.stringify(uncachedTerms)}. 
  CRITICAL RULES:
  1. Return a JSON Array.
  2. 'definition' MUST be in SIMPLIFIED CHINESE ONLY (e.g., "vt. 废除"). ABSOLUTELY NO ENGLISH IN DEFINITION.
  3. 'example' should be a complex academic sentence.
  4. 'translation' must be Chinese.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            mnemonic: { type: Type.STRING },
            examSource: { type: Type.STRING },
            meanings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  partOfSpeech: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  example: { type: Type.STRING },
                  translation: { type: Type.STRING }
                },
                required: ["partOfSpeech", "definition", "example", "translation"]
              }
            }
          },
          required: ["term", "phonetic", "meanings"],
        }
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response");

  try {
    const newResults = JSON.parse(text) as AIEnrichResponse[];
    newResults.forEach(data => {
       if(data.term) RESULT_CACHE[data.term.toLowerCase()] = data;
    });
    return [...cachedResults, ...newResults];
  } catch (e) {
    console.error("Batch Parse Error", e);
    throw new Error("Invalid Batch JSON");
  }
};
