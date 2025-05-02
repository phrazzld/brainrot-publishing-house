// Common type definitions for the application

// Translation types from translations/index.ts
export interface Chapter {
  title: string;
  text: string;
  audioSrc: string | null;
}

export interface Translation {
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  status: 'available' | 'coming soon';
  purchaseUrl?: string;
  chapters: Chapter[];
}
