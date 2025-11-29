import { AIEnrichResponse, ComparatorResult, EtymologyResult } from "../types";

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

const RESULT_CACHE: Record<string, any> = {};

// Helper to clean Markdown code blocks
const parseJsonFromLLM = (text: string) => {
    try {
        // Try parsing directly first
        return JSON.parse(text);
    } catch (e) {
        // If that fails, try to extract JSON from markdown code blocks
        // Regex matches ```json or just ```, and allows optional whitespace/newlines
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try { return JSON.parse(jsonMatch[1]); } catch (e2) {}
        }
        
        // Fallback: extract substring between first { and last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) {}
        }
        
        // If all else fails, throw original error
        console.error("Failed to parse JSON:", text);
        throw e;
    }
};

export const enrichWordWithAI = async (inputTerm: string): Promise<AIEnrichResponse> => {
  const normalizedTerm = inputTerm.toLowerCase().trim();
  if (RESULT_CACHE[`enrich_${normalizedTerm}`]) return RESULT_CACHE[`enrich_${normalizedTerm}`];

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

      RESULT_CACHE[`enrich_${normalizedTerm}`] = parsed;
      
      return parsed;

  } catch (error: any) {
      if (error.name === 'AbortError') throw new Error("Timeout");
      throw error;
  } finally {
      clearTimeout(timeoutId);
  }
};

export const batchEnrichWords = async (inputTerms: string[]): Promise<AIEnrichResponse[]> => {
  const uncachedTerms = inputTerms.filter(t => !RESULT_CACHE[`enrich_${t.toLowerCase().trim()}`]);
  const cachedResults = inputTerms.map(t => RESULT_CACHE[`enrich_${t.toLowerCase().trim()}`]).filter(Boolean);

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
              if (item && item.term) RESULT_CACHE[`enrich_${item.term.toLowerCase()}`] = item;
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

// NEW: Generate Contextual Story with Vocabulary
export const generateStory = async (words: string[]): Promise<{english: string, chinese: string, vocabulary: Array<{word: string, definition: string}>}> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const systemPrompt = `You are a helpful English teacher. 
Task: Write a short, coherent, and slightly funny story (max 120 words) using ALL the following words: ${words.join(', ')}.

Requirements:
1. English: Highlight the keywords using **bold** markdown.
2. Chinese: Provide a translation. **ALSO highlight the corresponding Chinese keywords using **bold** markdown**. 
3. CRITICAL: Do NOT add quotation marks (" ") around the highlighted words in Chinese translation. Just bold them.
4. Vocabulary List: Extract ALL the target words AND any potentially difficult words used in the story. Provide their lemma (root form) and a short Chinese definition.

Return JSON format only: 
{ 
  "english": "...", 
  "chinese": "...",
  "vocabulary": [
    { "word": "abide", "definition": "忍受" },
    { "word": "other_word", "definition": "释义" }
  ]
}`;

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

// NEW: Analyze Confusion (Comparator)
export const analyzeConfusion = async (term: string): Promise<ComparatorResult> => {
    const normalizedTerm = term.toLowerCase().trim();
    if (RESULT_CACHE[`compare_${normalizedTerm}`]) return RESULT_CACHE[`compare_${normalizedTerm}`];

    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    // Modified Prompt: Strictly enforce Chinese Output
    const systemPrompt = `你是一位专业的考研英语老师。请对比单词 "${term}" 及其 2-3 个最常见的易混词（形近词或近义词）。
    
    输出要求：
    1. definition (释义): 必须是中文，简练准确。
    2. difference (辨析): 必须是中文，指出核心区别（如用法、褒贬、侧重）。
    3. summary (总结): 一句话中文总结核心词的独特之处。
    4. example (例句): 保持英文。
    5. target (目标词): 返回 "${term}"。

    请返回如下 JSON 格式 (不要包含 Markdown 代码块):
    {
      "target": "${term}",
      "confusingWords": [
        { "term": "易混词1", "definition": "中文释义", "difference": "中文辨析", "example": "English Example" },
        { "term": "易混词2", "definition": "中文释义", "difference": "中文辨析", "example": "English Example" }
      ],
      "summary": "一句话中文总结"
    }`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: systemPrompt }], temperature: 0.3 })
        });
        const data = await response.json();
        const parsed = parseJsonFromLLM(data.choices[0].message.content);
        RESULT_CACHE[`compare_${normalizedTerm}`] = parsed;
        return parsed;
    } catch (error) {
        throw new Error("Failed to analyze confusion");
    }
};

// NEW: Etymology Breakdown
export const analyzeEtymology = async (term: string): Promise<EtymologyResult> => {
    const normalizedTerm = term.toLowerCase().trim();
    if (RESULT_CACHE[`root_${normalizedTerm}`]) return RESULT_CACHE[`root_${normalizedTerm}`];

    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const systemPrompt = `你是一位词源学家。请拆解单词 "${term}" 的词源结构（前缀、词根、后缀）。
    
    输出要求：
    1. rootMeaning (词根含义): 必须是中文。
    2. meaning (部分含义): 必须是中文。
    3. cognates (同根词): 列出 3-5 个同根词，必须包含英文单词和中文简明释义。
    
    请返回如下 JSON 格式 (不要包含 Markdown 代码块):
    {
      "root": "核心词根 (如 spect)",
      "rootMeaning": "词根中文含义 (如 看)",
      "breakdown": [
        { "part": "前缀/词根/后缀", "meaning": "中文含义", "type": "prefix" | "root" | "suffix" }
      ],
      "cognates": [
        { "term": "prospect", "definition": "前景" },
        { "term": "inspect", "definition": "检查" }
      ]
    }`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: systemPrompt }], temperature: 0.3 })
        });
        const data = await response.json();
        const parsed = parseJsonFromLLM(data.choices[0].message.content);
        RESULT_CACHE[`root_${normalizedTerm}`] = parsed;
        return parsed;
    } catch (error) {
        throw new Error("Failed to analyze etymology");
    }
};