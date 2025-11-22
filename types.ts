
export interface Meaning {
  partOfSpeech: string;
  definition: string; // Chinese exam definition
  example: string;
  translation: string;
}

export interface Word {
  id: string;
  term: string;
  phonetic?: string;
  meanings: Meaning[];
  status: WordStatus;
  tags: string[];
  
  // New Content Features
  mnemonic?: string;   // 记忆辅助 (Root/Affix/Association)
  examSource?: string; // 真题溯源 (e.g., "2010 Text 1")

  // Spaced Repetition System (SRS) fields
  nextReview: number; // Timestamp for when the card is next due
  interval: number;   // Current interval in days
  repetitions: number; // Number of consecutive successful recalls
  easeFactor: number; // SM-2 Ease Factor (starts at 2.5)
}

export enum WordStatus {
  New = 'new',
  Learning = 'learning',
  Mastered = 'mastered',
}

export interface AIEnrichResponse {
  term?: string; // The corrected word returned by AI
  phonetic: string;
  meanings: Meaning[];
  mnemonic?: string;
  examSource?: string;
}

export interface DictionaryEntry {
  term: string;
  pos: string;
  definition: string;
}

export type ViewMode = 'study' | 'list' | 'import' | 'dictionary';
