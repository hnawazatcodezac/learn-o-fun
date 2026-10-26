import { createContext, useContext } from 'react';
import type { PreviewParams } from './params';

interface PreviewContextValue {
  params: PreviewParams;
  update: (change: Partial<PreviewParams>) => void;
}

/** Lets a preview page read and change the toolbar settings, as the settings panel does. */
export const PreviewContext = createContext<PreviewContextValue | null>(null);

export function usePreview(): PreviewContextValue {
  const value = useContext(PreviewContext);
  if (!value) throw new Error('usePreview must be used inside the preview page');
  return value;
}
