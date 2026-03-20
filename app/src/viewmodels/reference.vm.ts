import { create } from "zustand";

export type ReferenceTab = "files" | "changes";

export interface ReferenceFile {
  id: string;
  path: string;
  name: string;
  language: string;
  content: string;
  addedAt: string;
}

export interface CodeChange {
  id: string;
  filePath: string;
  fileName: string;
  type: "added" | "modified" | "deleted";
  diff: string;
  timestamp: string;
}

interface ReferenceViewModel {
  /** Panel open state */
  panelOpen: boolean;
  /** Panel width in pixels */
  panelWidth: number;
  /** Active tab */
  activeTab: ReferenceTab;
  /** Referenced files */
  files: ReferenceFile[];
  /** Code changes */
  changes: CodeChange[];

  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  setActiveTab: (tab: ReferenceTab) => void;

  addFile: (file: Omit<ReferenceFile, "id" | "addedAt">) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  addChange: (change: Omit<CodeChange, "id" | "timestamp">) => void;
  removeChange: (id: string) => void;
  clearChanges: () => void;
}

let fileId = 1;
let changeId = 1;

export const useReferenceVM = create<ReferenceViewModel>((set) => ({
  panelOpen: true,
  panelWidth: 380,
  activeTab: "files",
  files: [],
  changes: [],

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setPanelWidth: (width) => set({ panelWidth: Math.max(280, Math.min(600, width)) }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  addFile: (file) =>
    set((s) => ({
      files: [
        ...s.files,
        { ...file, id: `ref-${fileId++}`, addedAt: new Date().toISOString() },
      ],
      panelOpen: true,
      activeTab: "files",
    })),

  removeFile: (id) =>
    set((s) => ({ files: s.files.filter((f) => f.id !== id) })),

  clearFiles: () => set({ files: [] }),

  addChange: (change) =>
    set((s) => ({
      changes: [
        {
          ...change,
          id: `chg-${changeId++}`,
          timestamp: new Date().toISOString(),
        },
        ...s.changes,
      ],
      panelOpen: true,
      activeTab: "changes",
    })),

  removeChange: (id) =>
    set((s) => ({ changes: s.changes.filter((c) => c.id !== id) })),

  clearChanges: () => set({ changes: [] }),
}));
