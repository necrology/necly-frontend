import { create } from "zustand";
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

type DashboardUiState = {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
};

const initializer = (set: (partial: Partial<DashboardUiState> | ((state: DashboardUiState) => Partial<DashboardUiState>)) => void): DashboardUiState => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
});

export const createDashboardUiStore = () => createStore<DashboardUiState>()(initializer);

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(initializer, {
    name: "necly-dashboard-ui",
    partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
  }),
);
