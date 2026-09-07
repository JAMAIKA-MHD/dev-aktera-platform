import { UIProject, ScreenId, UIElement } from "../types";
import { SOFT_UI_THEME } from "../theme/tokens";

export function createProjectForGameType(
  gameType: string = "lucky_wheel",
  campaignName: string = "Lucky Rewards Campaign",
): UIProject {
  const normalizedType = gameType.toLowerCase();

  const themeConfig = {
    colors: {
      primary: SOFT_UI_THEME.colors.accent,
      secondary: SOFT_UI_THEME.colors.textSecondary,
      accent: SOFT_UI_THEME.colors.accent,
      background: SOFT_UI_THEME.colors.bg,
      surface: SOFT_UI_THEME.colors.card,
      text: SOFT_UI_THEME.colors.textPrimary,
    },
    fonts: {
      heading: "Inter, system-ui, sans-serif",
      body: "Inter, system-ui, sans-serif",
    },
  };

  const bgConfig = {
    type: "color" as const,
    value: SOFT_UI_THEME.colors.bg,
  };

  // 1. Pregame Screen Elements (Landing & Form)
  const pregameElements: UIElement[] = [
    {
      id: "landing-logo-avatar",
      type: "avatar",
      name: "Brand Logo Badge",
      locked: false,
      transform: {
        position: { x: 50, y: 12 },
        size: { width: 16, height: 16 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        borderRadius: SOFT_UI_THEME.radii.card,
        borderWidth: "2px",
        borderColor: SOFT_UI_THEME.colors.border,
        boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
        backgroundColor: SOFT_UI_THEME.colors.card,
      },
      content:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
      animations: [{ trigger: "onMount", preset: "popIn", duration: 400 }],
    },
    {
      id: "landing-title",
      type: "text",
      name: "Campaign Title",
      locked: false,
      transform: {
        position: { x: 50, y: 23 },
        size: { width: 88, height: 7 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textPrimary,
        fontSize: "22px",
        fontWeight: "800",
        textAlign: "center",
      },
      content: campaignName.toUpperCase(),
      animations: [],
    },
    {
      id: "landing-slogan",
      type: "text",
      name: "Subtitle Slogan",
      locked: false,
      transform: {
        position: { x: 50, y: 30 },
        size: { width: 88, height: 5 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textSecondary,
        fontSize: "13px",
        fontWeight: "500",
        textAlign: "center",
      },
      content:
        normalizedType === "scratch_card"
          ? "احك البطاقة واربح هدايا فورية قيمة"
          : normalizedType === "mystery_box"
            ? "اختر الصندوق الرابح واكشف هديتك الفورية"
            : normalizedType === "hit_it"
              ? "اضرب الأهداف بأسرع ما يمكنك واربح الجائزة"
              : normalizedType === "quiz"
                ? "أجب على الأسئلة واكشف هديتك الفورية"
                : "أدر العجلة واربح جوائز وهدايا فورية قيمة",
      animations: [],
    },
    {
      id: "player-name-input",
      type: "input",
      name: "Full Name Input",
      placeholder: "Full Name / الاسم الكامل",
      locked: false,
      transform: {
        position: { x: 50, y: 43 },
        size: { width: 84, height: 6.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 15,
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
      content: "Karim Benali",
      binding: "player.name",
      animations: [],
    },
    {
      id: "player-phone-input",
      type: "input",
      name: "Phone Input",
      placeholder: "05 / 06 / 07 XX XX XX",
      locked: false,
      transform: {
        position: { x: 50, y: 52.5 },
        size: { width: 84, height: 6.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 15,
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
      content: "0661234567",
      binding: "player.phone",
      animations: [],
    },
    {
      id: "optin-terms-text",
      type: "text",
      name: "Terms Notice",
      locked: false,
      transform: {
        position: { x: 50, y: 61 },
        size: { width: 84, height: 4 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textMuted,
        fontSize: "11px",
        fontWeight: "500",
        textAlign: "center",
      },
      content: "I agree to the campaign terms & privacy conditions",
      animations: [],
    },
    {
      id: "landing-cta-btn",
      type: "button",
      name: "Start Play CTA Button",
      slotId: "startButton",
      locked: false,
      lockedFields: ["position"],
      transform: {
        position: { x: 50, y: 72 },
        size: { width: 84, height: 7.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 20,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: SOFT_UI_THEME.colors.accent,
        color: SOFT_UI_THEME.colors.accentText,
        borderRadius: SOFT_UI_THEME.radii.button,
        fontSize: "15px",
        fontWeight: "700",
        boxShadow: SOFT_UI_THEME.shadows.accentBtn,
      },
      content: "START PLAYING / العب الآن",
      binding: "game.start",
      animations: [{ trigger: "onMount", preset: "slideIn", duration: 300 }],
    },
  ];

  // 2. Game Screen Elements Builder per Game Mechanic
  const getGameElements = (): UIElement[] => {
    const commonTopElements: UIElement[] = [
      {
        id: "hud-user-greeting",
        type: "text",
        name: "Player Name Greeting",
        locked: false,
        transform: {
          position: { x: 50, y: 6 },
          size: { width: 86, height: 5 },
          rotation: 0,
          anchor: "center",
          zIndex: 10,
          scaleMode: "stretch",
        },
        style: {
          color: SOFT_UI_THEME.colors.textPrimary,
          fontSize: "14px",
          fontWeight: "700",
          textAlign: "center",
        },
        content: "Saha Karim! Discover your reward",
        binding: "player.greeting",
        animations: [],
      },
      {
        id: "hud-score-badge",
        type: "text",
        name: "Score Pill Badge",
        locked: false,
        transform: {
          position: { x: 50, y: 12.5 },
          size: { width: 44, height: 4.5 },
          rotation: 0,
          anchor: "center",
          zIndex: 10,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          color: SOFT_UI_THEME.colors.accent,
          borderRadius: SOFT_UI_THEME.radii.pill,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.border,
          boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
          fontSize: "12px",
          fontWeight: "700",
          textAlign: "center",
        },
        content: "Score: 1500 PTS",
        binding: "player.score",
        animations: [],
      },
    ];

    let mechanicElement: UIElement;
    let actionButton: UIElement;

    if (normalizedType === "scratch_card") {
      mechanicElement = {
        id: "game-scratch-surface",
        type: "panel",
        name: "Interactive Scratch Area",
        slotId: "ticketArea",
        locked: true,
        transform: {
          position: { x: 50, y: 44 },
          size: { width: 84, height: 42 },
          rotation: 0,
          anchor: "center",
          zIndex: 15,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          borderRadius: SOFT_UI_THEME.radii.cardLg,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.borderSubtle,
          boxShadow: SOFT_UI_THEME.shadows.extruded,
        },
        content: "",
        binding: "scratch.surface",
        animations: [],
      };
      actionButton = {
        id: "hud-action-btn",
        type: "button",
        name: "Reveal Prize Button",
        slotId: "actionButton",
        locked: false,
        lockedFields: ["position"],
        transform: {
          position: { x: 50, y: 76 },
          size: { width: 84, height: 7.5 },
          rotation: 0,
          anchor: "center",
          zIndex: 20,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.accent,
          color: SOFT_UI_THEME.colors.accentText,
          borderRadius: SOFT_UI_THEME.radii.button,
          fontSize: "15px",
          fontWeight: "700",
          boxShadow: SOFT_UI_THEME.shadows.accentBtn,
        },
        content: "REVEAL PRIZE / اكشف الجائزة",
        binding: "prize.claim",
        animations: [],
      };
    } else if (normalizedType === "mystery_box") {
      mechanicElement = {
        id: "game-mystery-group",
        type: "panel",
        name: "Mystery Boxes Row",
        slotId: "mysteryBoxGroup",
        locked: true,
        transform: {
          position: { x: 50, y: 44 },
          size: { width: 86, height: 38 },
          rotation: 0,
          anchor: "center",
          zIndex: 15,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          borderRadius: SOFT_UI_THEME.radii.cardLg,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.borderSubtle,
          boxShadow: SOFT_UI_THEME.shadows.extruded,
        },
        content: "",
        binding: "mystery.boxes",
        animations: [],
      };
      actionButton = {
        id: "hud-action-btn",
        type: "button",
        name: "Open Box Button",
        slotId: "actionButton",
        locked: false,
        lockedFields: ["position"],
        transform: {
          position: { x: 50, y: 76 },
          size: { width: 84, height: 7.5 },
          rotation: 0,
          anchor: "center",
          zIndex: 20,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.accent,
          color: SOFT_UI_THEME.colors.accentText,
          borderRadius: SOFT_UI_THEME.radii.button,
          fontSize: "15px",
          fontWeight: "700",
          boxShadow: SOFT_UI_THEME.shadows.accentBtn,
        },
        content: "OPEN SELECTED BOX / افتح الصندوق",
        binding: "prize.claim",
        animations: [],
      };
    } else if (normalizedType === "hit_it") {
      mechanicElement = {
        id: "game-hitit-target",
        type: "panel",
        name: "Hit It Target Arena",
        slotId: "targetField",
        locked: true,
        transform: {
          position: { x: 50, y: 44 },
          size: { width: 84, height: 40 },
          rotation: 0,
          anchor: "center",
          zIndex: 15,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          borderRadius: SOFT_UI_THEME.radii.cardLg,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.borderSubtle,
          boxShadow: SOFT_UI_THEME.shadows.extruded,
        },
        content: "",
        binding: "hitit.target",
        animations: [],
      };
      actionButton = {
        id: "hud-action-btn",
        type: "button",
        name: "Hit Target Button",
        slotId: "actionButton",
        locked: false,
        lockedFields: ["position"],
        transform: {
          position: { x: 50, y: 76 },
          size: { width: 84, height: 7.5 },
          rotation: 0,
          anchor: "center",
          zIndex: 20,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.accent,
          color: SOFT_UI_THEME.colors.accentText,
          borderRadius: SOFT_UI_THEME.radii.button,
          fontSize: "15px",
          fontWeight: "700",
          boxShadow: SOFT_UI_THEME.shadows.accentBtn,
        },
        content: "HIT TARGET / اضرب الهدف",
        binding: "prize.claim",
        animations: [],
      };
    } else if (normalizedType === "quiz") {
      mechanicElement = {
        id: "game-quiz-question",
        type: "panel",
        name: "Question Prompt Panel",
        slotId: "questionPanel",
        locked: true,
        transform: {
          position: { x: 50, y: 44 },
          size: { width: 84, height: 40 },
          rotation: 0,
          anchor: "center",
          zIndex: 15,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          borderRadius: SOFT_UI_THEME.radii.cardLg,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.borderSubtle,
          boxShadow: SOFT_UI_THEME.shadows.extruded,
        },
        content: "",
        binding: "quiz.question",
        animations: [],
      };
      actionButton = {
        id: "hud-action-btn",
        type: "button",
        name: "Submit Answer Button",
        slotId: "actionButton",
        locked: false,
        lockedFields: ["position"],
        transform: {
          position: { x: 50, y: 76 },
          size: { width: 84, height: 7.5 },
          rotation: 0,
          anchor: "center",
          zIndex: 20,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.accent,
          color: SOFT_UI_THEME.colors.accentText,
          borderRadius: SOFT_UI_THEME.radii.button,
          fontSize: "15px",
          fontWeight: "700",
          boxShadow: SOFT_UI_THEME.shadows.accentBtn,
        },
        content: "SUBMIT ANSWER / تأكيد الإجابة",
        binding: "prize.claim",
        animations: [],
      };
    } else {
      // Default: Lucky Wheel
      mechanicElement = {
        id: "game-wheel-spinner",
        type: "panel",
        name: "Wheel Container",
        slotId: "wheelContainer",
        locked: true,
        transform: {
          position: { x: 50, y: 44 },
          size: { width: 86, height: 44 },
          rotation: 0,
          anchor: "center",
          zIndex: 15,
          scaleMode: "preserve-aspect",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.card,
          borderRadius: SOFT_UI_THEME.radii.cardLg,
          borderWidth: "1px",
          borderColor: SOFT_UI_THEME.colors.borderSubtle,
          boxShadow: SOFT_UI_THEME.shadows.extruded,
        },
        content: "",
        binding: "wheel.spinner",
        animations: [],
      };
      actionButton = {
        id: "hud-action-btn",
        type: "button",
        name: "Spin Wheel Button",
        slotId: "actionButton",
        locked: false,
        lockedFields: ["position"],
        transform: {
          position: { x: 50, y: 76 },
          size: { width: 84, height: 7.5 },
          rotation: 0,
          anchor: "center",
          zIndex: 20,
          scaleMode: "stretch",
        },
        style: {
          backgroundColor: SOFT_UI_THEME.colors.accent,
          color: SOFT_UI_THEME.colors.accentText,
          borderRadius: SOFT_UI_THEME.radii.button,
          fontSize: "15px",
          fontWeight: "700",
          boxShadow: SOFT_UI_THEME.shadows.accentBtn,
        },
        content: "SPIN THE WHEEL / أدر العجلة",
        binding: "prize.claim",
        animations: [],
      };
    }

    return [...commonTopElements, mechanicElement, actionButton];
  };

  // 3. Victory Screen Elements
  const winElements: UIElement[] = [
    {
      id: "win-trophy-badge",
      type: "avatar",
      name: "Trophy Icon Badge",
      locked: false,
      transform: {
        position: { x: 50, y: 14 },
        size: { width: 18, height: 18 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        backgroundColor: SOFT_UI_THEME.colors.accentLight,
        color: SOFT_UI_THEME.colors.accent,
        borderRadius: SOFT_UI_THEME.radii.card,
        borderWidth: "2px",
        borderColor: SOFT_UI_THEME.colors.border,
        boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
      },
      content:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
      animations: [{ trigger: "onMount", preset: "popIn", duration: 400 }],
    },
    {
      id: "win-title",
      type: "text",
      name: "Victory Headline",
      locked: false,
      transform: {
        position: { x: 50, y: 26 },
        size: { width: 86, height: 6 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textPrimary,
        fontSize: "22px",
        fontWeight: "800",
        textAlign: "center",
      },
      content: "MABROUK ALIK!",
      animations: [],
    },
    {
      id: "win-subtitle",
      type: "text",
      name: "Victory Arabic Message",
      locked: false,
      transform: {
        position: { x: 50, y: 33 },
        size: { width: 86, height: 5 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textSecondary,
        fontSize: "13px",
        fontWeight: "600",
        textAlign: "center",
      },
      content: "مبروك عليك! لقد فزت بقسيمة شرائية مميزة",
      animations: [],
    },
    {
      id: "win-coupon-card",
      type: "panel",
      name: "Reward Voucher Card",
      slotId: "voucherArea",
      locked: false,
      transform: {
        position: { x: 50, y: 48 },
        size: { width: 84, height: 18 },
        rotation: 0,
        anchor: "center",
        zIndex: 15,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: SOFT_UI_THEME.colors.card,
        color: SOFT_UI_THEME.colors.accent,
        borderRadius: SOFT_UI_THEME.radii.card,
        borderWidth: "1px",
        borderColor: SOFT_UI_THEME.colors.border,
        boxShadow: SOFT_UI_THEME.shadows.extruded,
      },
      content: "Voucher Coupon: 1000 DA",
      binding: "player.reward",
      animations: [{ trigger: "onMount", preset: "popIn", duration: 400 }],
    },
    {
      id: "win-claim-btn",
      type: "button",
      name: "Claim Reward Button",
      slotId: "claimButton",
      locked: false,
      lockedFields: ["position"],
      transform: {
        position: { x: 50, y: 74 },
        size: { width: 84, height: 7.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 20,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: SOFT_UI_THEME.colors.accent,
        color: SOFT_UI_THEME.colors.accentText,
        borderRadius: SOFT_UI_THEME.radii.button,
        fontSize: "15px",
        fontWeight: "700",
        boxShadow: SOFT_UI_THEME.shadows.accentBtn,
      },
      content: "CLAIM YOUR REWARD / استلم جائزتك",
      binding: "prize.claim",
      animations: [],
    },
  ];

  // 4. Game Over / Loss Screen Elements
  const loseElements: UIElement[] = [
    {
      id: "lose-frown-badge",
      type: "avatar",
      name: "Consolation Badge",
      locked: false,
      transform: {
        position: { x: 50, y: 16 },
        size: { width: 18, height: 18 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        backgroundColor: SOFT_UI_THEME.colors.surfaceSubtle,
        color: SOFT_UI_THEME.colors.textSecondary,
        borderRadius: SOFT_UI_THEME.radii.card,
        borderWidth: "2px",
        borderColor: SOFT_UI_THEME.colors.border,
        boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
      },
      content:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
      animations: [{ trigger: "onMount", preset: "popIn", duration: 400 }],
    },
    {
      id: "lose-title",
      type: "text",
      name: "Game Over Headline",
      locked: false,
      transform: {
        position: { x: 50, y: 28 },
        size: { width: 86, height: 6 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textPrimary,
        fontSize: "22px",
        fontWeight: "800",
        textAlign: "center",
      },
      content: "MA3LICHE!",
      animations: [],
    },
    {
      id: "lose-subtitle",
      type: "text",
      name: "Arabic Consolation Text",
      locked: false,
      transform: {
        position: { x: 50, y: 35 },
        size: { width: 86, height: 5 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        color: SOFT_UI_THEME.colors.textSecondary,
        fontSize: "13px",
        fontWeight: "600",
        textAlign: "center",
      },
      content: "خيرها في غيرها! حظ أوفر في المرة القادمة",
      animations: [],
    },
    {
      id: "lose-retry-btn",
      type: "button",
      name: "Retry Button",
      slotId: "retryButton",
      locked: false,
      lockedFields: ["position"],
      transform: {
        position: { x: 50, y: 74 },
        size: { width: 84, height: 7.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 20,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: SOFT_UI_THEME.colors.card,
        color: SOFT_UI_THEME.colors.textPrimary,
        borderRadius: SOFT_UI_THEME.radii.button,
        borderWidth: "1px",
        borderColor: SOFT_UI_THEME.colors.border,
        boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
        fontSize: "15px",
        fontWeight: "700",
      },
      content: "PLAY AGAIN TOMORROW / حاول غداً",
      binding: "retry",
      animations: [],
    },
  ];

  return {
    id: `project-${normalizedType}-${Date.now()}`,
    name: campaignName,
    resolution: { width: 1080, height: 1920 },
    templateId: normalizedType,
    theme: themeConfig,
    screens: {
      pregame: {
        id: "pregame",
        label: "1. Start Screen",
        background: bgConfig,
        transitionIn: {
          trigger: "onScreenEnter",
          preset: "fadeIn",
          duration: 300,
        },
        elements: pregameElements,
      },
      game: {
        id: "game",
        label: "2. Gameplay HUD",
        background: bgConfig,
        transitionIn: {
          trigger: "onScreenEnter",
          preset: "fadeIn",
          duration: 300,
        },
        elements: getGameElements(),
      },
      win: {
        id: "win",
        label: "3. Victory",
        background: bgConfig,
        celebrationEffect: "confetti",
        transitionIn: {
          trigger: "onScreenEnter",
          preset: "popIn",
          duration: 400,
        },
        elements: winElements,
      },
      lose: {
        id: "lose",
        label: "4. Game Over",
        background: bgConfig,
        transitionIn: {
          trigger: "onScreenEnter",
          preset: "fadeIn",
          duration: 300,
        },
        elements: loseElements,
      },
    },
  };
}

export const STARTER_PROJECT: UIProject = createProjectForGameType(
  "lucky_wheel",
  "Lucky Rewards Campaign",
);
export const starterProject: UIProject = STARTER_PROJECT;
