import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface ChildDetails {
  childName: string;
  /** The child's name in the other script (auto-transliterated, parent-correctable). */
  childNameAlt?: string;
  childAge: string;
  childGender: 'male' | 'female';
  childPhotoUrl?: string;
}

export type StoryMode = 'template' | 'ai';

export interface StoryConfig {
  theme: string;
  language: 'ar' | 'en' | 'he';
  customThemeNote?: string;
  generatedText?: string;
  storyId?: string;
  /** How the customer chose to make the story. Defaults to 'template' (handwritten). */
  mode?: StoryMode;
}

export interface BookCustomization {
  coverColor: string;
  bookPackage: string;
  packageType?: string;
  quantity?: number;
  couponDetails?: any;
  extraBooks?: any[];
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  buildingNo: string;
  postalCode: string;
  country: string;
  floor?: string;
  notes?: string;
  deliveryMethod?: 'delivery' | 'pickup';
  pickupLocation?: string;
}

export interface StoryProgress {
  currentStep: number;
  childDetails: Partial<ChildDetails>;
  storyConfig: Partial<StoryConfig>;
  bookCustomization: Partial<BookCustomization>;
  shippingAddress: Partial<ShippingAddress>;
}

interface StoryProgressContextType {
  progress: StoryProgress;
  setStep: (step: number) => void;
  setChildDetails: (data: Partial<ChildDetails>) => void;
  setStoryConfig: (data: Partial<StoryConfig>) => void;
  setBookCustomization: (data: Partial<BookCustomization>) => void;
  setShippingAddress: (data: Partial<ShippingAddress>) => void;
  resetProgress: () => void;
}

const defaultProgress: StoryProgress = {
  currentStep: 1,
  childDetails: { childAge: '3-5', childGender: 'male' },
  storyConfig: { theme: 'adventure', language: 'ar' },
  bookCustomization: { coverColor: '#1B1F5E', bookPackage: 'color', quantity: 1, extraBooks: [] },
  shippingAddress: { country: 'SA', deliveryMethod: 'delivery' },
};

const StoryProgressContext = createContext<StoryProgressContextType | undefined>(undefined);

export const StoryProgressProvider = ({ children }: { children: ReactNode }) => {
  const [progress, setProgress] = useState<StoryProgress>(() => {
    try {
      const saved = localStorage.getItem('mmb_story_progress');
      if (!saved) return defaultProgress;
      const parsed = JSON.parse(saved) || {};
      // Merge over the defaults instead of trusting the stored shape. Payloads
      // written by older versions of the wizard can be missing a whole section
      // (e.g. storyConfig), and reading `progress.storyConfig.theme` off such a
      // payload throws — leaving the customer on a permanently blank /create
      // page that only clearing site data would fix.
      const merged = {
        ...defaultProgress,
        ...parsed,
        childDetails: { ...defaultProgress.childDetails, ...(parsed.childDetails || {}) },
        storyConfig: { ...defaultProgress.storyConfig, ...(parsed.storyConfig || {}) },
        bookCustomization: { ...defaultProgress.bookCustomization, ...(parsed.bookCustomization || {}) },
        shippingAddress: { ...defaultProgress.shippingAddress, ...(parsed.shippingAddress || {}) },
      };
      // A stored step past 1 without the child's name is a dead end: the wizard
      // renders step 2, "next" posts a story the API rejects for the missing
      // name, and nothing on screen says to go back. Send them to step 1, which
      // is the only place that field can be filled in.
      if ((merged.currentStep ?? 1) > 1 && !String(merged.childDetails?.childName || '').trim()) {
        merged.currentStep = 1;
      }
      return merged;
    } catch {
      return defaultProgress;
    }
  });

  const updateProgress = (updater: (prev: StoryProgress) => StoryProgress) => {
    setProgress((prev) => {
      const updated = updater(prev);
      localStorage.setItem('mmb_story_progress', JSON.stringify(updated));
      return updated;
    });
  };

  const setStep = (step: number) => updateProgress(prev => ({ ...prev, currentStep: step }));
  const setChildDetails = (data: Partial<ChildDetails>) => updateProgress(prev => ({ ...prev, childDetails: { ...prev.childDetails, ...data } }));
  const setStoryConfig = (data: Partial<StoryConfig>) => updateProgress(prev => ({ ...prev, storyConfig: { ...prev.storyConfig, ...data } }));
  const setBookCustomization = (data: Partial<BookCustomization>) => updateProgress(prev => ({ ...prev, bookCustomization: { ...prev.bookCustomization, ...data } }));
  const setShippingAddress = (data: Partial<ShippingAddress>) => updateProgress(prev => ({ ...prev, shippingAddress: { ...prev.shippingAddress, ...data } }));
  const resetProgress = () => { localStorage.removeItem('mmb_story_progress'); setProgress(defaultProgress); };

  return (
    <StoryProgressContext.Provider value={{ progress, setStep, setChildDetails, setStoryConfig, setBookCustomization, setShippingAddress, resetProgress }}>
      {children}
    </StoryProgressContext.Provider>
  );
};

export const useStoryProgress = () => {
  const ctx = useContext(StoryProgressContext);
  if (!ctx) throw new Error('useStoryProgress must be used within StoryProgressProvider');
  return ctx;
};
