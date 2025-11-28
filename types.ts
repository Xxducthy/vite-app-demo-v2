
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
  lastReviewed?: number;
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

export type ViewMode = 'study' | 'list' | 'import' | 'dictionary' | 'store';

// New: For Dashboard Heatmap
export type StudyHistory = Record<string, number>; // "YYYY-MM-DD": count

export type StudyMode = 'flashcard' | 'spelling';

// --- New Features Interfaces ---

export interface ConfusionItem {
  term: string;
  definition: string;
  difference: string; // Key difference/nuance
  example: string;
}

export interface ComparatorResult {
  target: string;
  confusingWords: ConfusionItem[];
  summary: string;
}

export interface EtymologyPart {
  part: string;
  meaning: string;
  type: 'prefix' | 'root' | 'suffix';
}

export interface CognateItem {
  term: string;
  definition: string;
}

export interface EtymologyResult {
  root: string;
  rootMeaning: string;
  breakdown: EtymologyPart[];
  cognates: CognateItem[]; // List of related words with definitions
}

// --- Love Store Interfaces ---

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string; // Emoji
  isCustom?: boolean;
}

export interface UserCoupon {
  id: string; // Unique instance ID
  itemId: string;
  name: string;
  description: string;
  icon: string;
  purchasedAt: number;
  isUsed: boolean;
  usedAt?: number;
}