import { create } from "zustand";

export type DotArtCategory = "가구" | "데코" | "캐릭터" | "배경" | "내 작품";

export interface DotArt {
  id: string;
  name: string;
  gridSize: number;
  pixels: (string | null)[][];
  category: DotArtCategory;
  isPreset: boolean;
  createdAt: string;
}

interface DotArtViewModel {
  dotArts: DotArt[];
  selectedCategory: DotArtCategory | null;
  loading: boolean;

  loadAll: (category?: DotArtCategory) => Promise<void>;
  addDotArt: (name: string, gridSize: number, pixels: (string | null)[][], category: DotArtCategory) => Promise<void>;
  removeDotArt: (id: string) => Promise<void>;
  setCategory: (category: DotArtCategory | null) => void;
}

function toModel(row: {
  id: string;
  name: string;
  grid_size: number;
  pixels: string;
  category: string;
  is_preset: number;
  created_at: string;
}): DotArt {
  return {
    id: row.id,
    name: row.name,
    gridSize: row.grid_size,
    pixels: JSON.parse(row.pixels),
    category: row.category as DotArtCategory,
    isPreset: row.is_preset === 1,
    createdAt: row.created_at,
  };
}

export const useDotArtVM = create<DotArtViewModel>((set) => ({
  dotArts: [],
  selectedCategory: null,
  loading: false,

  loadAll: async (category) => {
    set({ loading: true });
    const rows = await window.deskerAPI.dotart.getAll(category);
    set({ dotArts: rows.map(toModel), loading: false });
  },

  addDotArt: async (name, gridSize, pixels, category) => {
    const row = await window.deskerAPI.dotart.add({
      name,
      grid_size: gridSize,
      pixels: JSON.stringify(pixels),
      category,
    });
    set((s) => ({ dotArts: [toModel(row), ...s.dotArts] }));
  },

  removeDotArt: async (id) => {
    await window.deskerAPI.dotart.remove(id);
    set((s) => ({ dotArts: s.dotArts.filter((d) => d.id !== id) }));
  },

  setCategory: (category) => set({ selectedCategory: category }),
}));
