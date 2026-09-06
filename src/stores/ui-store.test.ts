import { beforeEach, describe, expect, it } from "vitest";
import { createDashboardUiStore } from "./ui-store";

describe("dashboard UI store", () => {
  beforeEach(() => localStorage.clear());

  it("toggles sidebar collapse state", () => {
    const store = createDashboardUiStore();
    expect(store.getState().sidebarCollapsed).toBe(false);

    store.getState().toggleSidebar();

    expect(store.getState().sidebarCollapsed).toBe(true);
  });
});
