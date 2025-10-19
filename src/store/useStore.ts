import { create } from 'zustand';

interface StoreState {
  mlAnalysisResults: any | null;
  setMlAnalysisResults: (results: any) => void;
}

export const useStore = create<StoreState>((set) => ({
  mlAnalysisResults: null,
  setMlAnalysisResults: (results) => set({ mlAnalysisResults: results }),
}));
