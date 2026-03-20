import { create } from "zustand";
import type { SidebarPage } from "../types/models";

interface AppViewModel {
  currentPage: SidebarPage;
  sidebarCollapsed: boolean;
  setCurrentPage: (page: SidebarPage) => void;
  toggleSidebar: () => void;
}

export const useAppVM = create<AppViewModel>((set) => ({
  currentPage: "workspace",
  sidebarCollapsed: false,
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
