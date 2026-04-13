const READING_KEY = 'saju-pending-reading';

export interface ReadingData {
  aiText: string;
  sajuResult: unknown;
  userData: unknown;
  appMode: string;
  timestamp: number;
}

export function saveReadingToSession(data: ReadingData): void {
  try {
    sessionStorage.setItem(READING_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage may not be available in some environments
  }
}

export function loadReadingFromSession(): ReadingData | null {
  try {
    const raw = sessionStorage.getItem(READING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingData;
  } catch {
    return null;
  }
}

export function clearReadingFromSession(): void {
  try {
    sessionStorage.removeItem(READING_KEY);
  } catch {
    // sessionStorage may not be available
  }
}
