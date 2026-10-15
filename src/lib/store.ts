import { create } from "zustand";
import type { ScoreKey } from "@/lib/types";

/** Quiz-taker trait vector — shared so ANY distro dialog (explorer,
 *  table, palette-opened) can overlay "You" on its trait radar. */
export type DistroProfile = Partial<Record<ScoreKey, number>>;

interface DistroScopeState {
  /** distro ids highlighted from quiz results or OS-similarity picks */
  highlight: string[];
  setHighlight: (ids: string[]) => void;
  clearHighlight: () => void;
  /** distro ids added to the compare tray (max 3, rolling) */
  compare: string[];
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  clearCompare: () => void;
  /** user trait profile from the last quiz result (null before/after retake) */
  profile: DistroProfile | null;
  setProfile: (profile: DistroProfile) => void;
  clearProfile: () => void;
}

export const useDistroScope = create<DistroScopeState>((set, get) => ({
  highlight: [],
  setHighlight: (ids) => set({ highlight: ids }),
  clearHighlight: () => set({ highlight: [] }),
  compare: [],
  toggleCompare: (id) => {
    const current = get().compare;
    if (current.includes(id)) {
      set({ compare: current.filter((x) => x !== id) });
    } else if (current.length < 3) {
      set({ compare: [...current, id] });
    } else {
      // roll: drop the oldest, keep the newest three
      set({ compare: [current[1], current[2], id] });
    }
  },
  setCompare: (ids) => set({ compare: ids.slice(0, 3) }),
  clearCompare: () => set({ compare: [] }),
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}));
