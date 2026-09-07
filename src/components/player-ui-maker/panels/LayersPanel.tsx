import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "../store/useEditorStore";
import { UIElement } from "../types";
import { SOFT_UI_THEME } from "../theme/tokens";

interface SortableLayerItemProps {
  element: UIElement;
  isSelected: boolean;
  onSelect: (multi: boolean) => void;
  onToggleLock: () => void;
  onToggleSoftLock: () => void;
  onToggleHide: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  element,
  isSelected,
  onSelect,
  onToggleLock,
  onToggleSoftLock,
  onToggleHide,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameVal, setNameVal] = useState(element.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getTypeIcon = () => {
    switch (element.type) {
      case "button":
        return "fa-solid fa-square-check text-[#2F6FED]";
      case "text":
        return "fa-solid fa-font text-sky-600";
      case "progressBar":
        return "fa-solid fa-bars-progress text-emerald-600";
      case "avatar":
        return "fa-solid fa-circle-user text-purple-600";
      case "image":
        return "fa-regular fa-image text-amber-600";
      case "icon":
        return "fa-solid fa-icons text-pink-600";
      case "panel":
        return "fa-solid fa-table-cells-large text-slate-500";
      case "input":
        return "fa-solid fa-i-cursor text-teal-600";
      case "lottie":
        return "fa-solid fa-film text-violet-600";
      default:
        return "fa-solid fa-cube text-slate-500";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border ${
        isSelected
          ? "bg-blue-50/90 text-[#2F6FED] border-blue-200 shadow-sm font-semibold"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-transparent"
      }`}
    >
      {/* Drag Handle & Type Icon */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-0.5"
          title="Drag to reorder z-index"
        >
          <i className="fa-solid fa-grip-vertical text-[10px]" />
        </button>

        <i className={`${getTypeIcon()} text-sm shrink-0`} />

        {/* Name / Inline Rename */}
        {isEditing ? (
          <input
            type="text"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              if (nameVal.trim()) onRename(nameVal.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsEditing(false);
                if (nameVal.trim()) onRename(nameVal.trim());
              }
              if (e.key === "Escape") {
                setIsEditing(false);
                setNameVal(element.name);
              }
            }}
            autoFocus
            className="flex-1 bg-white text-slate-800 px-1.5 py-0.5 rounded border border-[#2F6FED] focus:outline-none text-xs"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            className="truncate select-none"
            title={element.name}
          >
            {element.name}
          </span>
        )}

        {/* Slot / Binding badge */}
        {element.slotId && (
          <span className="shrink-0 px-1.5 py-0.2 rounded bg-blue-100 border border-blue-200 text-[9px] text-[#2F6FED] font-bold">
            SLOT
          </span>
        )}
      </div>

      {/* Layer Actions (Hide, Soft Lock, Hard Lock, Delete) */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleHide();
          }}
          className={`p-1 rounded hover:bg-slate-100 ${
            element.hidden
              ? "text-amber-500"
              : "text-slate-400 hover:text-slate-700"
          }`}
          title={element.hidden ? "Show element" : "Hide element"}
        >
          <i
            className={`fa-regular ${element.hidden ? "fa-eye-slash" : "fa-eye"} text-[11px]`}
          />
        </button>

        {/* Soft lock toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSoftLock();
          }}
          className={`p-1 rounded hover:bg-slate-100 ${
            element.softLocked
              ? "text-[#2F6FED]"
              : "text-slate-400 hover:text-slate-700"
          }`}
          title={
            element.softLocked
              ? "Unlock canvas drag (soft)"
              : "Lock canvas drag (soft)"
          }
        >
          <i
            className={`fa-solid ${element.softLocked ? "fa-lock" : "fa-lock-open"} text-[11px]`}
          />
        </button>

        {/* Delete non-slot element */}
        {!element.slotId && !element.locked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
            title="Delete layer"
          >
            <i className="fa-regular fa-trash-can text-[11px]" />
          </button>
        )}
      </div>
    </div>
  );
};

export interface LayersPanelProps {
  onToggleCollapse?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  onToggleCollapse,
}) => {
  const {
    project,
    activeScreen,
    selectedIds,
    toggleSelectId,
    reorderElements,
    setElementHidden,
    setElementSoftLock,
    setElementLock,
    renameElement,
    deleteElements,
    duplicateElements,
    addElement,
  } = useEditorStore();

  const screen = project.screens[activeScreen] || project.screens.pregame;
  const elements = screen?.elements || [];

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex((el) => el.id === active.id);
      const newIndex = elements.findIndex((el) => el.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderElements(activeScreen, oldIndex, newIndex);
      }
    }
  };

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUploadClick = () => {
    setIsAddMenuOpen(false);
    logoFileInputRef.current?.click();
  };

  const handleLogoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newId = `logo-${Date.now()}`;
      const newEl: UIElement = {
        id: newId,
        type: "image",
        name: "Brand Logo",
        locked: false,
        transform: {
          position: { x: 50, y: 12 },
          size: { width: 32, height: 10 },
          rotation: 0,
          anchor: "center",
          zIndex: elements.length + 1,
          scaleMode: "preserve-aspect",
        },
        style: {
          borderRadius: SOFT_UI_THEME.radii.card,
          boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
        },
        content: dataUrl,
        animations: [{ trigger: "onMount", preset: "popIn", duration: 350 }],
      };
      addElement(activeScreen, newEl);
      toggleSelectId(newId, false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddElement = (
    type: "text" | "button" | "icon" | "panel" | "input",
    subtype?: string,
  ) => {
    setIsAddMenuOpen(false);
    const newId = `${type}-${Date.now()}`;
    let newEl: UIElement;

    if (type === "text") {
      const isHeadline = subtype === "headline";
      newEl = {
        id: newId,
        type: "text",
        name: isHeadline ? "New Headline" : "New Label",
        locked: false,
        transform: {
          position: { x: 50, y: 50 },
          size: { width: isHeadline ? 80 : 60, height: isHeadline ? 6 : 4 },
          rotation: 0,
          anchor: "center",
          zIndex: elements.length + 1,
          scaleMode: "stretch",
        },
        style: {
          color: SOFT_UI_THEME.colors.textPrimary,
          fontSize: isHeadline ? "22px" : "14px",
          fontWeight: isHeadline ? "700" : "400",
          textAlign: "center",
        },
        content: isHeadline ? "Main Headline" : "Subtitle text goes here",
        animations: [],
      };
    } else if (type === "button") {
      const isPill = subtype === "pill";
      newEl = {
        id: newId,
        type: "button",
        name: "Action Button",
        locked: false,
        transform: {
          position: { x: 50, y: 70 },
          size: { width: 75, height: 7 },
          rotation: 0,
          anchor: "center",
          zIndex: elements.length + 1,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.accent,
          color: SOFT_UI_THEME.colors.accentText,
          fontSize: "15px",
          fontWeight: "700",
          borderRadius: isPill
            ? SOFT_UI_THEME.radii.pill
            : SOFT_UI_THEME.radii.button,
          boxShadow: SOFT_UI_THEME.shadows.accentBtn,
        },
        content: "Play Now",
        animations: [{ trigger: "onHover", preset: "pulse", duration: 250 }],
      };
    } else if (type === "icon") {
      newEl = {
        id: newId,
        type: "icon",
        name: "Star Icon",
        locked: false,
        transform: {
          position: { x: 50, y: 30 },
          size: { width: 15, height: 8 },
          rotation: 0,
          anchor: "center",
          zIndex: elements.length + 1,
          scaleMode: "preserve-aspect",
        },
        style: {
          color: SOFT_UI_THEME.colors.accent,
          fontSize: "32px",
        },
        content: "",
        iconName: "fa-solid fa-star",
        animations: [],
      };
    } else if (type === "panel") {
      newEl = {
        id: newId,
        type: "panel",
        name: "Soft Card",
        locked: false,
        transform: {
          position: { x: 50, y: 50 },
          size: { width: 85, height: 35 },
          rotation: 0,
          anchor: "center",
          zIndex: elements.length + 1,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          borderRadius: SOFT_UI_THEME.radii.card,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.border,
          boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
        },
        content: "",
        animations: [],
      };
    } else {
      // Input
      newEl = {
        id: newId,
        type: "input",
        name: "Phone Input",
        locked: false,
        transform: {
          position: { x: 50, y: 58 },
          size: { width: 80, height: 6.5 },
          rotation: 0,
          anchor: "center",
          zIndex: elements.length + 1,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.inputBg,
          color: SOFT_UI_THEME.colors.inputText,
          borderRadius: SOFT_UI_THEME.radii.input,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.inputBorder,
          boxShadow: SOFT_UI_THEME.shadows.inset,
        },
        content: "05 / 06 / 07... Phone number",
        animations: [],
      };
    }

    addElement(activeScreen, newEl);
    toggleSelectId(newId, false);
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200/90 flex flex-col select-none shrink-0 relative text-slate-800">
      {/* Hidden File Input for Logo Upload */}
      <input
        ref={logoFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoFileSelected}
      />

      {/* Panel Header */}
      <div className="h-12 px-4 border-b border-slate-200/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-layer-group text-[#2F6FED] text-sm" />
          <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
            Layers ({elements.length})
          </span>
        </div>

        <div className="flex items-center gap-1 relative">
          {/* Add Element Button & Dropdown */}
          <button
            onClick={() => setIsAddMenuOpen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAddMenuOpen
                ? "bg-[#2F6FED] text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
            }`}
            title="Add element to screen"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span className="text-[11px]">Add</span>
          </button>

          {/* Add Element Dropdown Menu */}
          {isAddMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAddMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-scale-in text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Add Component
                </div>

                {/* Brand Logo (Upload from Files) */}
                <button
                  onClick={handleLogoUploadClick}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2F6FED] text-left transition-colors border border-blue-200 cursor-pointer"
                >
                  <i className="fa-regular fa-image text-[#2F6FED] w-4 text-center" />
                  <div>
                    <div className="font-bold text-xs">Brand Logo</div>
                    <div className="text-[10px] text-slate-500">
                      Choose file from device
                    </div>
                  </div>
                </button>

                {/* Text Options */}
                <button
                  onClick={() => handleAddElement("text", "headline")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-heading text-sky-600 w-4 text-center" />
                  <div>
                    <div className="font-semibold text-xs">Headline Text</div>
                    <div className="text-[10px] text-slate-400">
                      Bold title banner
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleAddElement("text", "body")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-font text-sky-500 w-4 text-center" />
                  <div>
                    <div className="font-semibold text-xs">
                      Subtitle / Label
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Regular description text
                    </div>
                  </div>
                </button>

                {/* Button Options */}
                <button
                  onClick={() => handleAddElement("button", "cta")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-square-check text-[#2F6FED] w-4 text-center" />
                  <div>
                    <div className="font-semibold text-xs">Action Button</div>
                    <div className="text-[10px] text-slate-400">
                      Clickable CTA trigger
                    </div>
                  </div>
                </button>

                {/* Icon */}
                <button
                  onClick={() => handleAddElement("icon")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-icons text-pink-600 w-4 text-center" />
                  <div>
                    <div className="font-semibold text-xs">Graphic Icon</div>
                    <div className="text-[10px] text-slate-400">
                      Symbol or trophy badge
                    </div>
                  </div>
                </button>

                {/* Container Panel */}
                <button
                  onClick={() => handleAddElement("panel")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-table-cells-large text-slate-600 w-4 text-center" />
                  <div>
                    <div className="font-semibold text-xs">Card / Panel</div>
                    <div className="text-[10px] text-slate-400">
                      Soft elevated container
                    </div>
                  </div>
                </button>

                {/* Input Field */}
                <button
                  onClick={() => handleAddElement("input")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-i-cursor text-teal-600 w-4 text-center" />
                  <div>
                    <div className="font-semibold text-xs">Form Input</div>
                    <div className="text-[10px] text-slate-400">
                      Name or phone field
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={() => duplicateElements(activeScreen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs cursor-pointer"
              title="Duplicate selected"
            >
              <i className="fa-regular fa-clone" />
            </button>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs ml-0.5 cursor-pointer"
              title="Hide Layers Sidebar"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
          )}
        </div>
      </div>

      {/* Layers List with Drag-and-Drop */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {elements.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400 text-xs">
            <i className="fa-regular fa-folder-open text-2xl mb-2 opacity-40 block" />
            No elements on this screen.
            <br />
            Click <strong>+ Add</strong> to place a component.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={elements.map((el) => el.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Reverse to display topmost z-index at top of list */}
              {[...elements].reverse().map((el) => (
                <SortableLayerItem
                  key={el.id}
                  element={el}
                  isSelected={selectedIds.includes(el.id)}
                  onSelect={(multi) => toggleSelectId(el.id, multi)}
                  onToggleLock={() =>
                    setElementLock(activeScreen, el.id, !el.locked)
                  }
                  onToggleSoftLock={() =>
                    setElementSoftLock(activeScreen, el.id, !el.softLocked)
                  }
                  onToggleHide={() =>
                    setElementHidden(activeScreen, el.id, !el.hidden)
                  }
                  onRename={(name) => renameElement(activeScreen, el.id, name)}
                  onDelete={() => deleteElements(activeScreen, [el.id])}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="p-2 border-t border-slate-200/90 bg-slate-50 text-[10px] text-slate-500 text-center">
        <span>Top of list = Front z-index</span>
      </div>
    </aside>
  );
};
