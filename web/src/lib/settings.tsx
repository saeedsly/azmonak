import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

export interface Branding {
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  supportText: string;
  footerText: string;
}

const DEFAULT_BRANDING: Branding = {
  appName: 'ازمونک',
  tagline: 'سامانه آزمون آنلاین و نظرسنجی',
  logoUrl: '',
  primaryColor: '#4f46e5',
  supportText: '',
  footerText: '',
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    api
      .get<{ branding: Partial<Branding> }>('/public/settings')
      .then((data) => setBranding({ ...DEFAULT_BRANDING, ...data.branding }))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (branding.primaryColor) {
      document.documentElement.style.setProperty('--color-brand-600', branding.primaryColor);
    }
  }, [branding.primaryColor]);

  const value = useMemo(() => branding, [branding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
