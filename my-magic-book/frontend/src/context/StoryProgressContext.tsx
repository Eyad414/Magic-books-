import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface ChildDetails {
  childName: string;
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
      return saved ? JSON.parse(saved) : defaultProgress;
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
