export type ScreenId = "pregame" | "game" | "lose" | "win";

export type ElementType =
  | "button"
  | "text"
  | "image"
  | "progressBar"
  | "icon"
  | "panel"
  | "input"
  | "avatar"
  | "lottie";

export type AnchorType =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "centerLeft"
  | "center"
  | "centerRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

export type ScaleMode =
  "preserve-aspect" | "stretch" | "fit-width" | "fit-height";

export interface Transform {
  /** X position as percentage of canvas container (0-100) */
  position: { x: number; y: number };
  /** Width/Height as percentage (0-100) or aspect-relative units */
  size: { width: number; height: number };
  rotation: number;
  anchor: AnchorType;
  zIndex: number;
  scaleMode?: ScaleMode;
}

export type AnimationTrigger =
  | "onMount"
  | "onHover"
  | "onClick"
  | "onGameEvent"
  | "onScreenEnter"
  | "onScreenExit";

export type AnimationPreset =
  "fadeIn" | "slideIn" | "popIn" | "shake" | "pulse" | "bounce" | "custom";

export interface CustomKeyframe {
  /** Keyframe time in seconds or offset */
  time: number;
  /** CSS / Motion properties: x, y, scale, rotate, opacity, backgroundColor, etc. */
  properties: Record<string, string | number>;
  easing?: string;
}

export interface AnimationConfig {
  id?: string;
  trigger: AnimationTrigger;
  gameEvent?: string; // 'scoreIncrease' | 'damageTaken' | 'coinCollected' | 'win' | 'lose'
  preset: AnimationPreset;
  duration: number; // in milliseconds
  delay?: number; // in milliseconds
  easing?: string;
  loop?: boolean;
  customKeyframes?: CustomKeyframe[];
  // If element should trigger an imperative effect like confetti on click/event
  celebrationEffect?: "confetti" | "none";
}

export interface UIElement {
  id: string;
  type: ElementType;
  name: string;
  /** Hard lock flag - completely prevents moving/resizing/rotating/editing */
  locked: boolean;
  /** Temporary soft lock in editor (e.g. from layers panel) */
  softLocked?: boolean;
  /** Hidden flag */
  hidden?: boolean;
  /** Partial lock for specific transform keys (e.g. ['position'] locks position but allows styling/resizing) */
  lockedFields?: (keyof Transform)[];
  /** Slot ID this element fulfills from the GameTemplate */
  slotId?: string;
  transform: Transform;
  style: Record<string, string | number>;
  content?: string;
  /** Wires element to live game data: 'player.health' | 'player.score' | 'player.name' | 'player.avatar' | 'game.timer' */
  binding?: string;
  animations: AnimationConfig[];
  children?: UIElement[];
  /** Lottie vector animation URL or raw JSON data */
  lottieUrl?: string;
  lottieData?: Record<string, any>;
  /** Icon name (e.g. FontAwesome or Lucide) */
  iconName?: string;
  /** Placeholder or input metadata */
  placeholder?: string;
}

export interface ScreenBackground {
  type: "color" | "image" | "video" | "gradient";
  value: string;
}

export interface Screen {
  id: ScreenId;
  label: string;
  background: ScreenBackground;
  elements: UIElement[];
  transitionIn?: AnimationConfig;
  transitionOut?: AnimationConfig;
  celebrationEffect?: "confetti" | "none";
}

export interface UIProjectTheme {
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

export interface UIProject {
  id: string;
  name: string;
  /** Project resolution basis (e.g. { width: 1920, height: 1080 }) */
  resolution: { width: number; height: number };
  templateId: string;
  screens: Record<ScreenId, Screen>;
  theme: UIProjectTheme;
}

export interface GameSlotDefinition {
  slotId: string;
  label: string;
  description?: string;
  requiredOnScreens: ScreenId[];
  allowedTypes: ElementType[];
  /** Which transform fields the designer CANNOT touch */
  lockedFields: (keyof Transform)[];
  defaultTransform: Transform;
  binding: string;
}

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  slots: GameSlotDefinition[];
}

export interface SlotValidationError {
  screenId: ScreenId;
  slotId: string;
  message: string;
  severity: "error" | "warning";
}

export function validateSlots(
  screen: Screen,
  template: GameTemplate,
): SlotValidationError[] {
  const errors: SlotValidationError[] = [];
  for (const slot of template.slots) {
    if (!slot.requiredOnScreens.includes(screen.id)) continue;
    const matchingElements = screen.elements.filter(
      (e) =>
        (e.slotId && e.slotId === slot.slotId) ||
        (e.binding && e.binding === slot.binding),
    );

    if (matchingElements.length === 0) {
      errors.push({
        screenId: screen.id,
        slotId: slot.slotId,
        message: `Screen "${screen.label || screen.id}" is missing required slot "${slot.label || slot.slotId}" (binding: ${slot.binding})`,
        severity: "error",
      });
    } else {
      const el = matchingElements[0];
      if (!slot.allowedTypes.includes(el.type)) {
        errors.push({
          screenId: screen.id,
          slotId: slot.slotId,
          message: `Slot "${slot.label || slot.slotId}" must be one of type: ${slot.allowedTypes.join(", ")}, but found "${el.type}"`,
          severity: "error",
        });
      }
      if (matchingElements.length > 1) {
        errors.push({
          screenId: screen.id,
          slotId: slot.slotId,
          message: `Duplicate elements bound to slot "${slot.label || slot.slotId}". Each required slot must have a unique binding.`,
          severity: "warning",
        });
      }
    }
  }
  return errors;
}
