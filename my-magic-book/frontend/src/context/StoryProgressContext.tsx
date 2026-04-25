import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface ChildDetails {
  childName: string;
  childAge: string;
  childGender: 'male' | 'female';
  childPhotoUrl?: string;
}

export interface StoryConfig {
  theme: string;
  language: 'ar' | 'en' | 'he';
  customThemeNote?: string;
  generatedText?: string;
  storyId?: string;
}

export interface BookCustomization {
  coverColor: string;
  bookPackage: 'color' | 'coloring' | 'pro';
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
  bookCustomization: { coverColor: '#1B1F5E', bookPackage: 'color' },
  shippingAddress: { country: 'SA' },
};

const StoryProgressContext = createContext<StoryProgressContextType | undefined>(undefined);

export const StoryProgressProvider = ({ children }: { children: ReactNode }) => {
  const [progress, setProgress] = useState<StoryProgress>(() => {
    try {
      const saved = localStorage.getItem('mmb_story_progress');
      return saved ? JSON.parse(saved) : defaultProgress;
    } catch {
      return defaultProgress;
    }
  });

  const save = (updated: StoryProgress) => {
    setProgress(updated);
    localStorage.setItem('mmb_story_progress', JSON.stringify(updated));
  };

  const setStep = (step: number) => save({ ...progress, currentStep: step });
  const setChildDetails = (data: Partial<ChildDetails>) => save({ ...progress, childDetails: { ...progress.childDetails, ...data } });
  const setStoryConfig = (data: Partial<StoryConfig>) => save({ ...progress, storyConfig: { ...progress.storyConfig, ...data } });
  const setBookCustomization = (data: Partial<BookCustomization>) => save({ ...progress, bookCustomization: { ...progress.bookCustomization, ...data } });
  const setShippingAddress = (data: Partial<ShippingAddress>) => save({ ...progress, shippingAddress: { ...progress.shippingAddress, ...data } });
  const resetProgress = () => { localStorage.removeItem('mmb_story_progress'); save(defaultProgress); };

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
