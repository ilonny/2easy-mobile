import {createContext, useContext} from 'react';

export type DictionarySelectionAnchor = {
  text: string;
  /** Absolute page coordinates of selection end (for pill placement). */
  pageX: number;
  pageY: number;
};

export type DictionarySelectionContextValue = {
  enabled: boolean;
  onSelection: (anchor: DictionarySelectionAnchor) => void;
  onClearSelection: () => void;
};

const DictionarySelectionContext =
  createContext<DictionarySelectionContextValue | null>(null);

export const DictionarySelectionProvider = DictionarySelectionContext.Provider;

export function useDictionarySelection() {
  return useContext(DictionarySelectionContext);
}
