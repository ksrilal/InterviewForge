import { create } from "zustand";

interface UIState {
  endSessionDialogOpen: boolean;
  setEndSessionDialogOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  endSessionDialogOpen: false,
  setEndSessionDialogOpen: (open) => set({ endSessionDialogOpen: open }),
}));
