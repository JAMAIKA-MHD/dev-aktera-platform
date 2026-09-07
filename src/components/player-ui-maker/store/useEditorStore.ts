import { create } from "zustand";
import { temporal } from "zundo";
import {
  UIProject,
  ScreenId,
  UIElement,
  Transform,
  ScreenBackground,
} from "../types";
import { STARTER_PROJECT } from "./defaultProjects";

export interface ResolutionPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  {
    id: "mobile-portrait",
    label: "Mobile (iPhone / Android)",
    width: 393,
    height: 852,
    aspectRatio: "9/16",
  },
  {
    id: "tablet-4-3",
    label: 'Tablet (iPad 11")',
    width: 834,
    height: 1194,
    aspectRatio: "3/4",
  },
  {
    id: "desktop-1080p",
    label: "Desktop Monitor",
    width: 1280,
    height: 800,
    aspectRatio: "16/10",
  },
  {
    id: "mobile-landscape",
    label: "Mobile Landscape",
    width: 852,
    height: 393,
    aspectRatio: "16/9",
  },
];

export interface EditorState {
  project: UIProject;
  activeScreen: ScreenId;
  selectedIds: string[];
  hoveredId: string | null;
  zoom: number;
  canvasResolution: ResolutionPreset;
  isGridVisible: boolean;
  isSnapToGrid: boolean;
  gridSize: number;
  clipboard: UIElement[] | null;
  previewMode: boolean;
  mockData: Record<string, any>;

  // Actions
  setActiveScreen: (screenId: ScreenId) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectId: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;

  updateElement: (
    screenId: ScreenId,
    elementId: string,
    patch: Partial<UIElement>,
  ) => void;
  updateElementTransform: (
    screenId: ScreenId,
    elementId: string,
    transformPatch: Partial<Transform>,
  ) => void;
  addElement: (screenId: ScreenId, element: UIElement) => void;
  deleteElements: (screenId: ScreenId, elementIds?: string[]) => void;
  duplicateElements: (screenId: ScreenId, elementIds?: string[]) => void;
  reorderElements: (
    screenId: ScreenId,
    oldIndex: number,
    newIndex: number,
  ) => void;

  setElementLock: (
    screenId: ScreenId,
    elementId: string,
    locked: boolean,
  ) => void;
  setElementSoftLock: (
    screenId: ScreenId,
    elementId: string,
    softLocked: boolean,
  ) => void;
  setElementHidden: (
    screenId: ScreenId,
    elementId: string,
    hidden: boolean,
  ) => void;
  renameElement: (screenId: ScreenId, elementId: string, name: string) => void;

  setScreenBackground: (
    screenId: ScreenId,
    background: ScreenBackground,
  ) => void;

  alignElements: (
    screenId: ScreenId,
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  distributeElements: (
    screenId: ScreenId,
    axis: "horizontal" | "vertical",
  ) => void;

  copySelection: () => void;
  pasteSelection: () => void;

  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setCanvasResolution: (preset: ResolutionPreset) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;

  setMockData: (key: string, value: any) => void;
  setAllMockData: (data: Record<string, any>) => void;
  setPreviewMode: (preview: boolean) => void;

  loadProject: (project: UIProject) => void;
  resetToStarter: () => void;
}

const STORAGE_KEY = "player_ui_maker_project_v1";

function getInitialProject(): UIProject {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.screens?.pregame && parsed?.screens?.game) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load saved UI project from localStorage:", e);
  }
  return STARTER_PROJECT;
}

let autosaveTimeout: any = null;
function triggerAutosave(project: UIProject) {
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.warn("Autosave failed:", e);
    }
  }, 600);
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      project: getInitialProject(),
      activeScreen: "pregame",
      selectedIds: [],
      hoveredId: null,
      zoom: 1,
      canvasResolution: RESOLUTION_PRESETS[0],
      isGridVisible: true,
      isSnapToGrid: true,
      gridSize: 20,
      clipboard: null,
      previewMode: false,
      mockData: {
        "player.name": "Saha Player",
        "player.phone": "0555123456",
        "player.score": "1500",
        "game.timer": 30,
        "game.turns": 3,
        "prize.title": "15% Off Voucher",
        "prize.code": "OCTO-WIN-2026",
      },

      setActiveScreen: (screenId) => {
        set({ activeScreen: screenId, selectedIds: [] });
      },

      setSelectedIds: (ids) => set({ selectedIds: ids }),

      toggleSelectId: (id, multi = false) => {
        set((state) => {
          if (!multi) {
            return {
              selectedIds: state.selectedIds.includes(id)
                ? state.selectedIds
                : [id],
            };
          }
          if (state.selectedIds.includes(id)) {
            return { selectedIds: state.selectedIds.filter((x) => x !== id) };
          }
          return { selectedIds: [...state.selectedIds, id] };
        });
      },

      clearSelection: () => set({ selectedIds: [] }),

      setHoveredId: (id) => set({ hoveredId: id }),

      updateElement: (screenId, elementId, patch) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = screen.elements.map((el) =>
            el.id === elementId ? { ...el, ...patch } : el,
          );

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      updateElementTransform: (screenId, elementId, transformPatch) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = screen.elements.map((el) => {
            if (el.id !== elementId) return el;
            return {
              ...el,
              transform: { ...el.transform, ...transformPatch },
            };
          });

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      addElement: (screenId, element) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = [...screen.elements, element];
          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject, selectedIds: [element.id] };
        });
      },

      deleteElements: (screenId, elementIds) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const targetIds = elementIds ?? state.selectedIds;
          if (targetIds.length === 0) return state;

          // Filter out elements, respecting hard lock
          const elements = screen.elements.filter((el) => {
            if (!targetIds.includes(el.id)) return true;
            // Prevent deleting hard locked elements
            return el.locked;
          });

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return {
            project: nextProject,
            selectedIds: state.selectedIds.filter(
              (id) => !targetIds.includes(id),
            ),
          };
        });
      },

      duplicateElements: (screenId, elementIds) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const targetIds = elementIds ?? state.selectedIds;
          if (targetIds.length === 0) return state;

          const newElements: UIElement[] = [];
          const newSelectedIds: string[] = [];

          screen.elements.forEach((el) => {
            if (targetIds.includes(el.id)) {
              const newId = `${el.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              // NOTE: Strip binding and slotId to prevent duplicate slot conflicts
              const cloned: UIElement = {
                ...JSON.parse(JSON.stringify(el)),
                id: newId,
                name: `${el.name} (Copy)`,
                locked: false,
                slotId: undefined,
                binding: undefined,
                transform: {
                  ...el.transform,
                  position: {
                    x: Math.min(95, el.transform.position.x + 3),
                    y: Math.min(95, el.transform.position.y + 3),
                  },
                  zIndex: (el.transform.zIndex || 1) + 1,
                },
              };
              newElements.push(cloned);
              newSelectedIds.push(newId);
            }
          });

          const elements = [...screen.elements, ...newElements];
          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject, selectedIds: newSelectedIds };
        });
      },

      reorderElements: (screenId, oldIndex, newIndex) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const items = [...screen.elements];
          const [moved] = items.splice(oldIndex, 1);
          items.splice(newIndex, 0, moved);

          // Update zIndices sequentially
          const elements = items.map((el, idx) => ({
            ...el,
            transform: {
              ...el.transform,
              zIndex: idx + 1,
            },
          }));

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      setElementLock: (screenId, elementId, locked) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = screen.elements.map((el) =>
            el.id === elementId ? { ...el, locked } : el,
          );

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      setElementSoftLock: (screenId, elementId, softLocked) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = screen.elements.map((el) =>
            el.id === elementId ? { ...el, softLocked } : el,
          );

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      setElementHidden: (screenId, elementId, hidden) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = screen.elements.map((el) =>
            el.id === elementId ? { ...el, hidden } : el,
          );

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      renameElement: (screenId, elementId, name) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const elements = screen.elements.map((el) =>
            el.id === elementId ? { ...el, name } : el,
          );

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      setScreenBackground: (screenId, background) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen) return state;

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, background },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      alignElements: (screenId, alignment) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen || state.selectedIds.length === 0) return state;

          const selectedEls = screen.elements.filter(
            (el) =>
              state.selectedIds.includes(el.id) &&
              !el.locked &&
              !el.lockedFields?.includes("position"),
          );
          if (selectedEls.length === 0) return state;

          let targetX = 50;
          let targetY = 50;

          if (selectedEls.length === 1) {
            // Align single element to canvas
            switch (alignment) {
              case "left":
                targetX = selectedEls[0].transform.size.width / 2;
                break;
              case "center":
                targetX = 50;
                break;
              case "right":
                targetX = 100 - selectedEls[0].transform.size.width / 2;
                break;
              case "top":
                targetY = selectedEls[0].transform.size.height / 2;
                break;
              case "middle":
                targetY = 50;
                break;
              case "bottom":
                targetY = 100 - selectedEls[0].transform.size.height / 2;
                break;
            }
          } else {
            // Align multiple elements relative to bounding group
            const xs = selectedEls.map((e) => e.transform.position.x);
            const ys = selectedEls.map((e) => e.transform.position.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            switch (alignment) {
              case "left":
                targetX = minX;
                break;
              case "center":
                targetX = (minX + maxX) / 2;
                break;
              case "right":
                targetX = maxX;
                break;
              case "top":
                targetY = minY;
                break;
              case "middle":
                targetY = (minY + maxY) / 2;
                break;
              case "bottom":
                targetY = maxY;
                break;
            }
          }

          const elements = screen.elements.map((el) => {
            if (
              !state.selectedIds.includes(el.id) ||
              el.locked ||
              el.lockedFields?.includes("position")
            ) {
              return el;
            }
            const pos = { ...el.transform.position };
            if (["left", "center", "right"].includes(alignment)) {
              pos.x = Number(targetX.toFixed(2));
            }
            if (["top", "middle", "bottom"].includes(alignment)) {
              pos.y = Number(targetY.toFixed(2));
            }
            return {
              ...el,
              transform: { ...el.transform, position: pos },
            };
          });

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      distributeElements: (screenId, axis) => {
        set((state) => {
          const screen = state.project.screens[screenId];
          if (!screen || state.selectedIds.length < 3) return state;

          const eligibleEls = screen.elements
            .filter(
              (el) =>
                state.selectedIds.includes(el.id) &&
                !el.locked &&
                !el.lockedFields?.includes("position"),
            )
            .sort((a, b) =>
              axis === "horizontal"
                ? a.transform.position.x - b.transform.position.x
                : a.transform.position.y - b.transform.position.y,
            );

          if (eligibleEls.length < 3) return state;

          const first = eligibleEls[0];
          const last = eligibleEls[eligibleEls.length - 1];
          const totalDistance =
            axis === "horizontal"
              ? last.transform.position.x - first.transform.position.x
              : last.transform.position.y - first.transform.position.y;
          const step = totalDistance / (eligibleEls.length - 1);

          const updatedMap = new Map<string, number>();
          eligibleEls.forEach((el, index) => {
            const startVal =
              axis === "horizontal"
                ? first.transform.position.x
                : first.transform.position.y;
            updatedMap.set(el.id, Number((startVal + index * step).toFixed(2)));
          });

          const elements = screen.elements.map((el) => {
            if (!updatedMap.has(el.id)) return el;
            const newVal = updatedMap.get(el.id)!;
            return {
              ...el,
              transform: {
                ...el.transform,
                position: {
                  ...el.transform.position,
                  [axis === "horizontal" ? "x" : "y"]: newVal,
                },
              },
            };
          });

          const nextProject: UIProject = {
            ...state.project,
            screens: {
              ...state.project.screens,
              [screenId]: { ...screen, elements },
            },
          };

          triggerAutosave(nextProject);
          return { project: nextProject };
        });
      },

      copySelection: () => {
        const state = get();
        const screen = state.project.screens[state.activeScreen];
        if (!screen || state.selectedIds.length === 0) return;

        const selected = screen.elements.filter((el) =>
          state.selectedIds.includes(el.id),
        );
        set({ clipboard: JSON.parse(JSON.stringify(selected)) });
      },

      pasteSelection: () => {
        const state = get();
        if (!state.clipboard || state.clipboard.length === 0) return;

        const screen = state.project.screens[state.activeScreen];
        if (!screen) return;

        const newElements: UIElement[] = [];
        const newSelectedIds: string[] = [];

        state.clipboard.forEach((el) => {
          const newId = `${el.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const pasted: UIElement = {
            ...JSON.parse(JSON.stringify(el)),
            id: newId,
            name: `${el.name} (Paste)`,
            locked: false,
            slotId: undefined,
            binding: undefined,
            transform: {
              ...el.transform,
              position: {
                x: Math.min(95, el.transform.position.x + 4),
                y: Math.min(95, el.transform.position.y + 4),
              },
              zIndex: (el.transform.zIndex || 1) + 1,
            },
          };
          newElements.push(pasted);
          newSelectedIds.push(newId);
        });

        const elements = [...screen.elements, ...newElements];
        const nextProject: UIProject = {
          ...state.project,
          screens: {
            ...state.project.screens,
            [state.activeScreen]: { ...screen, elements },
          },
        };

        triggerAutosave(nextProject);
        set({ project: nextProject, selectedIds: newSelectedIds });
      },

      setZoom: (zoomOrFn) => {
        set((state) => {
          const next =
            typeof zoomOrFn === "function" ? zoomOrFn(state.zoom) : zoomOrFn;
          return {
            zoom: Math.max(0.25, Math.min(2.5, Number(next.toFixed(2)))),
          };
        });
      },

      setCanvasResolution: (preset) => {
        set({ canvasResolution: preset });
      },

      toggleGrid: () => set((s) => ({ isGridVisible: !s.isGridVisible })),
      toggleSnap: () => set((s) => ({ isSnapToGrid: !s.isSnapToGrid })),
      setGridSize: (size) => set({ gridSize: size }),

      setMockData: (key, value) => {
        set((state) => ({
          mockData: { ...state.mockData, [key]: value },
        }));
      },

      setAllMockData: (data) => set({ mockData: data }),

      setPreviewMode: (preview) =>
        set({ previewMode: preview, selectedIds: [] }),

      loadProject: (project) => {
        triggerAutosave(project);
        set({ project, selectedIds: [], activeScreen: "pregame" });
      },

      resetToStarter: () => {
        triggerAutosave(STARTER_PROJECT);
        set({
          project: STARTER_PROJECT,
          selectedIds: [],
          activeScreen: "pregame",
        });
      },
    }),
    {
      // Only track project changes in undo/redo history (not selection, hover, or zoom)
      partialize: (state) => ({ project: state.project }),
      limit: 50,
    },
  ),
);
