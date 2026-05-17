// ─── Story Data Types ─────────────────────────────────────────────────────────
// Shared across all 20 story definitions and all book page components.

/** A single page inside the story body (pages 1-26) */
export interface StoryBodyPage {
  /** Page index within the story body (1-based) */
  pageNumber: number;
  /** 'text' = Arabic story text | 'image' = illustration */
  type: 'text' | 'image';
  /** Story text — use [NAME] as child-name placeholder */
  text?: string;
  /** Relative path to the illustration (from /public/illustrations/<storyId>/) */
  imageSrc?: string;
  /** Alt text for the illustration — use [NAME] as placeholder */
  imageAlt?: string;
}

/** Fully describes one of the 20 stories */
export interface StoryDefinition {
  /** Unique story key, e.g. "zoo_adventure" */
  id: string;
  /** Display order (1-20) */
  order: number;
  /** Story title — use [NAME] as placeholder */
  titleAr: string;
  /** Short tagline shown on back cover / bestsellers */
  taglineAr: string;
  /** Moral / lesson on final page */
  moralAr: string;
  /** Questions for parent on final page (2-3 items) */
  questionsAr: string[];
  /** Conclusion text shown on final page */
  conclusionAr: string;
  /** Dedication body text — use [NAME] as placeholder */
  dedicationAr: string;
  /** URL-safe path to cover illustration (used on front cover) */
  coverImage: string;
  /** Thumbnail used on back cover recommended cards */
  thumbnail: string;
  /** 26 body pages: 13 text + 13 image, alternating text→image */
  pages: StoryBodyPage[];
}
