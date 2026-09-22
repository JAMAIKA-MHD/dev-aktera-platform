import type { GameType } from "../domain/gameTypes";
import { localized, type LocalizedText } from "../domain/locale";
import type {
  FormFieldKey,
  JackpotSection,
  LegalLink,
  PrizeChip,
  ScreenContent,
  ScreenKey,
} from "../domain/types";

// Default player-facing copy, in French, Arabic and English.
// Adapted from the prototype's UI_STRINGS, without its promises ("guaranteed prize", "100%"),
// its "+1 try for a share" and its SMS-only consent (rules.md, B8 and N3/N4).

interface ScreenCopy {
  title: LocalizedText;
  subtitle: LocalizedText;
  cta: LocalizedText;
  hero?: ScreenContent["hero"];
  reinforcement?: ScreenContent["reinforcement"]["kind"];
}

function screen(copy: ScreenCopy): ScreenContent {
  return {
    showHeader: true,
    hero: copy.hero ?? "none",
    title: copy.title,
    subtitle: copy.subtitle,
    reinforcement: { kind: copy.reinforcement ?? "none", text: {} },
    primaryCta: copy.cta,
    secondaryCta: null,
  };
}

const WELCOME: Record<GameType, ScreenCopy> = {
  lucky_wheel: {
    title: localized(
      "Tournez la roue et tentez votre chance",
      "أدر العجلة وجرّب حظك",
      "Spin the wheel and try your luck",
    ),
    subtitle: localized(
      "Inscrivez-vous en quelques secondes, puis faites tourner la roue pour découvrir si vous gagnez.",
      "سجّل في ثوانٍ، ثم أدر العجلة لتكتشف إن كنت من الفائزين.",
      "Sign up in seconds, then spin the wheel to find out if you win.",
    ),
    cta: localized("Lancer le jeu", "ابدأ اللعب", "Start playing"),
  },
  quiz: {
    title: localized(
      "Relevez le quiz express",
      "خض تحدي المسابقة السريعة",
      "Take the speed quiz",
    ),
    subtitle: localized(
      "Répondez à quelques questions pour tenter de remporter un lot.",
      "أجب عن بعض الأسئلة لتحاول الفوز بجائزة.",
      "Answer a few questions for a chance to win a prize.",
    ),
    cta: localized("Commencer le quiz", "ابدأ المسابقة", "Start the quiz"),
  },
  scratch_card: {
    title: localized(
      "Grattez votre ticket chance",
      "امسح بطاقة الحظ",
      "Scratch your lucky ticket",
    ),
    subtitle: localized(
      "Grattez la surface argentée pour découvrir ce qui se cache dessous.",
      "امسح المساحة الفضية لتكتشف ما تخفيه.",
      "Scratch the silver surface to discover what is hidden underneath.",
    ),
    cta: localized("Jouer maintenant", "العب الآن", "Play now"),
  },
  mystery_box: {
    title: localized(
      "Choisissez votre boîte mystère",
      "اختر صندوقك المفاجئ",
      "Pick your mystery box",
    ),
    subtitle: localized(
      "Trois boîtes, un seul choix : laquelle ouvrirez-vous ?",
      "ثلاثة صناديق واختيار واحد: أيها ستفتح؟",
      "Three boxes, one choice: which one will you open?",
    ),
    cta: localized("Jouer maintenant", "العب الآن", "Play now"),
  },
  hit_it: {
    title: localized(
      "Touchez la cible le plus vite possible",
      "المس الهدف بأسرع ما يمكن",
      "Hit the target as fast as you can",
    ),
    subtitle: localized(
      "Atteignez le nombre de touches demandé avant la fin du temps.",
      "حقّق عدد اللمسات المطلوب قبل انتهاء الوقت.",
      "Reach the required number of hits before time runs out.",
    ),
    cta: localized("Relever le défi", "ابدأ التحدي", "Take the challenge"),
  },
};

const PLAY: Record<GameType, ScreenCopy> = {
  lucky_wheel: {
    title: localized("Tournez la roue !", "أدر العجلة!", "Spin the wheel!"),
    subtitle: localized(
      "Touchez la roue ou le bouton pour la lancer.",
      "المس العجلة أو الزر لتدويرها.",
      "Tap the wheel or the button to spin it.",
    ),
    cta: localized("Tourner la roue", "أدر العجلة", "Spin the wheel"),
  },
  quiz: {
    title: localized("À vous de jouer", "حان دورك", "Your turn"),
    subtitle: localized(
      "Choisissez une réponse pour chaque question.",
      "اختر إجابة لكل سؤال.",
      "Pick one answer for each question.",
    ),
    cta: localized("Valider", "تأكيد", "Confirm"),
    reinforcement: "progress",
  },
  scratch_card: {
    title: localized("Grattez le ticket", "امسح البطاقة", "Scratch the ticket"),
    subtitle: localized(
      "Glissez votre doigt sur la surface argentée.",
      "مرّر إصبعك على المساحة الفضية.",
      "Swipe your finger across the silver surface.",
    ),
    cta: localized("Tout révéler", "اكشف الكل", "Reveal all"),
  },
  mystery_box: {
    title: localized("Choisissez une boîte", "اختر صندوقاً", "Pick a box"),
    subtitle: localized(
      "Touchez la boîte de votre choix pour l'ouvrir.",
      "المس الصندوق الذي تختاره لفتحه.",
      "Tap the box of your choice to open it.",
    ),
    cta: localized("Ouvrir la boîte", "افتح الصندوق", "Open the box"),
  },
  hit_it: {
    title: localized("Touchez la cible !", "المس الهدف!", "Hit the target!"),
    subtitle: localized(
      "Chaque touche compte, le temps file.",
      "كل لمسة تُحتسب، والوقت يمر.",
      "Every hit counts, time is ticking.",
    ),
    cta: localized("Commencer", "ابدأ", "Start"),
    reinforcement: "timer",
  },
};

const REGISTER: ScreenCopy = {
  title: localized("Vos coordonnées", "بياناتك", "Your details"),
  subtitle: localized(
    "Elles servent uniquement à gérer votre participation et à vous remettre votre lot.",
    "تُستخدم فقط لإدارة مشاركتك وتسليم جائزتك.",
    "They are only used to manage your entry and deliver your prize.",
  ),
  cta: localized("Participer", "شارك", "Take part"),
};

const WIN: ScreenCopy = {
  title: localized(
    "Félicitations, vous avez gagné !",
    "مبروك، لقد ربحت!",
    "Congratulations, you won!",
  ),
  subtitle: localized(
    "Voici votre lot et votre code. Gardez-le précieusement.",
    "إليك جائزتك ورمزها. احتفظ به جيداً.",
    "Here is your prize and your code. Keep it safe.",
  ),
  cta: localized("Terminer", "إنهاء", "Done"),
  hero: "trophy",
};

const LOSE: ScreenCopy = {
  title: localized(
    "Pas de chance cette fois !",
    "حظ أوفر في المرة القادمة!",
    "Not this time!",
  ),
  subtitle: localized(
    "Merci d'avoir joué. Suivez-nous pour ne pas manquer nos prochaines offres.",
    "شكراً لمشاركتك. تابعنا حتى لا تفوتك عروضنا القادمة.",
    "Thanks for playing. Follow us so you don't miss our next offers.",
  ),
  cta: localized("Retour à l'accueil", "العودة إلى البداية", "Back to start"),
};

export function defaultScreens(
  gameType: GameType,
): Record<ScreenKey, ScreenContent> {
  return {
    welcome: screen(WELCOME[gameType]),
    register: screen(REGISTER),
    play: screen(PLAY[gameType]),
    win: screen(WIN),
    lose: screen(LOSE),
  };
}

export const DEFAULT_SCREEN_CONTENT: Readonly<
  Record<GameType, Record<ScreenKey, ScreenContent>>
> = {
  lucky_wheel: defaultScreens("lucky_wheel"),
  quiz: defaultScreens("quiz"),
  scratch_card: defaultScreens("scratch_card"),
  mystery_box: defaultScreens("mystery_box"),
  hit_it: defaultScreens("hit_it"),
};

// Texts of the waiting and status screens, which brands do not edit (see ScreenKey).
// Status messages themselves come from PARTICIPATION_ERROR_MESSAGES (domain/participation.ts).
export const STATUS_TEXT = {
  resolving: localized(
    "Préparation de votre partie…",
    "جارٍ تحضير لعبتك…",
    "Getting your game ready…",
  ),
  duplicateTitle: localized(
    "Déjà joué !",
    "لقد شاركت بالفعل",
    "Already played",
  ),
  closedTitle: localized("Campagne terminée", "انتهت الحملة", "Campaign ended"),
  errorTitle: localized("Oups !", "عذراً!", "Oops!"),
  retry: localized("Réessayer", "أعد المحاولة", "Try again"),
  back: localized("Retour", "رجوع", "Back"),
  // The page was given a participation gateway it must not use (allowedGatewayModes).
  unavailableTitle: localized(
    "Jeu indisponible",
    "اللعبة غير متاحة",
    "Game unavailable",
  ),
  unavailableBody: localized(
    "Ce jeu n'est pas disponible pour le moment. Revenez un peu plus tard.",
    "هذه اللعبة غير متاحة حالياً. عُد لاحقاً.",
    "This game is not available right now. Please come back later.",
  ),
} as const satisfies Record<string, LocalizedText>;

// Texts of the 8-slot frame itself, which brands do not edit. Placeholder: {name}.
export const FRAME_TEXT = {
  loading: localized("Chargement…", "جارٍ التحميل…", "Loading…"),
  close: localized("Fermer", "إغلاق", "Close"),
  legalTitle: localized(
    "Règlement et mentions légales",
    "القوانين والإشعارات القانونية",
    "Rules and legal notice",
  ),
  organizedBy: localized(
    "Organisé par {name}",
    "تنظيم {name}",
    "Organized by {name}",
  ),
} as const satisfies Record<string, LocalizedText>;

export function defaultJackpot(): JackpotSection {
  return {
    enabled: true,
    eyebrow: localized("Grand jeu", "المسابقة الكبرى", "Grand prize draw"),
    title: localized(
      "Des lots à gagner chaque jour",
      "جوائز للربح كل يوم",
      "Prizes to win every day",
    ),
    badge: localized("À gagner", "للربح", "To win"),
    icon: "trophy",
  };
}

export function defaultPrizeChips(): Omit<PrizeChip, "id">[] {
  return [
    {
      icon: "ticket",
      value: localized("Bons d'achat", "قسائم شراء", "Vouchers"),
      caption: localized(
        "À utiliser en magasin",
        "للاستعمال في المتجر",
        "To use in store",
      ),
      tone: "primary",
    },
    {
      icon: "gift",
      value: localized("Cadeaux", "هدايا", "Gifts"),
      caption: localized(
        "Offerts par la marque",
        "مقدّمة من العلامة",
        "Offered by the brand",
      ),
      tone: "secondary",
    },
    {
      icon: "percent",
      value: localized("Réductions", "تخفيضات", "Discounts"),
      caption: localized(
        "Sur vos prochains achats",
        "على مشترياتك القادمة",
        "On your next purchases",
      ),
      tone: "accent",
    },
  ];
}

export const FORM_FIELD_TEXT: Readonly<
  Record<FormFieldKey, { label: LocalizedText; placeholder: LocalizedText }>
> = {
  fullName: {
    label: localized("Nom complet", "الاسم الكامل", "Full name"),
    placeholder: localized("Entrez votre nom", "أدخل اسمك", "Enter your name"),
  },
  phone: {
    label: localized("Numéro de téléphone", "رقم الهاتف", "Phone number"),
    placeholder: localized(
      "05 / 06 / 07 XX XX XX XX",
      "05 / 06 / 07 XX XX XX XX",
      "05 / 06 / 07 XX XX XX XX",
    ),
  },
  email: {
    label: localized("Adresse email", "البريد الإلكتروني", "Email address"),
    placeholder: localized(
      "nom@exemple.com",
      "name@example.com",
      "name@example.com",
    ),
  },
  wilaya: {
    label: localized("Wilaya", "الولاية", "Wilaya"),
    placeholder: localized(
      "Sélectionnez votre wilaya",
      "اختر ولايتك",
      "Select your wilaya",
    ),
  },
};

// Texts of the registration form that brands do not edit. Each error says how to fix it (D16).
export const FORM_TEXT = {
  errors: {
    required: localized(
      "Ce champ est obligatoire.",
      "هذا الحقل إلزامي.",
      "This field is required.",
    ),
    phone: localized(
      "Numéro invalide : 10 chiffres commençant par 05, 06 ou 07.",
      "رقم غير صحيح: 10 أرقام تبدأ بـ 05 أو 06 أو 07.",
      "Invalid number: 10 digits starting with 05, 06 or 07.",
    ),
    email: localized(
      "Adresse email invalide, par exemple nom@exemple.com.",
      "بريد إلكتروني غير صحيح، مثلاً name@example.com.",
      "Invalid email address, for example name@example.com.",
    ),
    consent: localized(
      "Cochez la case pour participer.",
      "ضع علامة في المربع للمشاركة.",
      "Tick the box to take part.",
    ),
  },
  optional: localized("facultatif", "اختياري", "optional"),
  valid: localized("Valide", "صالح", "Valid"),
  readRules: localized("Lire le règlement", "اقرأ القوانين", "Read the rules"),
} as const;

// Law 18-07: the player agrees to the rules and to the processing of their personal data.
export const CONSENT_TEXT = localized(
  "J'accepte le règlement du jeu et le traitement de mes données personnelles pour la gestion de ma participation, conformément à la loi 18-07.",
  "أوافق على قوانين المسابقة وعلى معالجة بياناتي الشخصية لإدارة مشاركتي، وفقاً للقانون 18-07.",
  "I accept the game rules and the processing of my personal data to manage my entry, in accordance with Law 18-07.",
);

export const LEGAL_LINE = localized(
  "Jeu gratuit sans obligation d'achat • Une participation par numéro",
  "مسابقة مجانية دون إلزامية الشراء • مشاركة واحدة لكل رقم",
  "Free game, no purchase necessary • One entry per phone number",
);

export function defaultLegalLinks(): Omit<LegalLink, "id">[] {
  return [
    {
      kind: "terms",
      label: localized("Règlement", "قوانين المسابقة", "Game rules"),
    },
    {
      kind: "privacy",
      label: localized("Confidentialité", "الخصوصية", "Privacy"),
    },
    { kind: "support", label: localized("Assistance", "المساعدة", "Support") },
  ];
}

// Full legal sheet, adapted from the prototype's terms modal.
export function defaultTermsBody(organizerName: string): LocalizedText {
  const organizer = organizerName.trim();
  const fr = organizer || "l'organisateur de cette campagne";
  const ar = organizer || "منظّم هذه الحملة";
  const en = organizer || "the organizer of this campaign";
  return localized(
    [
      `Opération promotionnelle organisée par ${fr}, conformément à la réglementation en vigueur en Algérie.`,
      "• Jeu gratuit, sans obligation d'achat, ouvert à toute personne résidant en Algérie.",
      "• Une seule participation par numéro de téléphone mobile.",
      "• Les lots sont attribués par un tirage sécurisé, dans la limite des stocks disponibles.",
      "• Vos données (nom, téléphone et, le cas échéant, email et wilaya) servent uniquement à gérer votre participation et à vous remettre votre lot. Conformément à la loi 18-07, vous disposez d'un droit d'accès, de rectification et d'opposition auprès de l'organisateur.",
    ].join("\n"),
    [
      `عملية ترويجية ينظّمها ${ar}، وفقاً للتنظيم المعمول به في الجزائر.`,
      "• مسابقة مجانية دون إلزامية الشراء، مفتوحة لكل شخص مقيم في الجزائر.",
      "• مشاركة واحدة فقط لكل رقم هاتف محمول.",
      "• تُمنح الجوائز عبر سحب آمن، في حدود المخزون المتوفر.",
      "• تُستخدم بياناتك (الاسم والهاتف، وعند الاقتضاء البريد الإلكتروني والولاية) فقط لإدارة مشاركتك وتسليم جائزتك. وفقاً للقانون 18-07، يحق لك الاطلاع على بياناتك وتصحيحها والاعتراض على معالجتها لدى المنظّم.",
    ].join("\n"),
    [
      `Promotional campaign organized by ${en}, in accordance with the regulations in force in Algeria.`,
      "• Free game, no purchase necessary, open to anyone living in Algeria.",
      "• Only one entry per mobile phone number.",
      "• Prizes are awarded through a secure draw, while stocks last.",
      "• Your data (name, phone and, where applicable, email and wilaya) is only used to manage your entry and deliver your prize. Under Law 18-07, you have the right to access, correct and object to its processing with the organizer.",
    ].join("\n"),
  );
}

// Pregame teaser captions (plan.md §8.7). Placeholders: {count}, {seconds}, {threshold}, {duration}.
// They describe the game and never promise a win.
export const TEASER_CAPTIONS: Readonly<Record<GameType, LocalizedText>> = {
  lucky_wheel: localized(
    "{count} lots à gagner",
    "{count} جوائز للربح",
    "{count} prizes to win",
  ),
  quiz: localized("{count} questions", "{count} أسئلة", "{count} questions"),
  scratch_card: localized(
    "Grattez pour découvrir votre surprise",
    "امسح لتكتشف مفاجأتك",
    "Scratch to discover your surprise",
  ),
  mystery_box: localized(
    "Choisissez votre boîte",
    "اختر صندوقك",
    "Pick your box",
  ),
  hit_it: localized(
    "{threshold} touches en {duration} s",
    "{threshold} لمسة في {duration} ثانية",
    "{threshold} hits in {duration}s",
  ),
};

// Appended to the quiz caption when the campaign has a timer.
export const QUIZ_TIMER_CAPTION = localized(
  " · {seconds} s chacune",
  " · {seconds} ثانية لكل سؤال",
  " · {seconds}s each",
);

// Labels of the losing wheel segments, used in turn. No "try again": one entry per phone number.
export const LOSING_SEGMENT_LABELS: readonly LocalizedText[] = [
  localized("Dommage", "للأسف", "Unlucky"),
  localized("Presque !", "كدت تربح!", "So close!"),
  localized("Pas cette fois", "ليس هذه المرة", "Not this time"),
];

export const WHEEL_HUB_LABEL = localized("JOUER", "العب", "PLAY");

export const SCRATCH_COVER_TEXT = localized(
  "Grattez ici",
  "امسح هنا",
  "Scratch here",
);

// Texts of the win and loss screens that brands do not edit (tasks.md T4.4). Placeholders:
// {prize}, {brand}.
export const RESULT_TEXT = {
  codeLabel: localized("Votre code", "رمزك", "Your code"),
  copy: localized("Copier", "نسخ", "Copy"),
  copied: localized("Copié !", "تم النسخ!", "Copied!"),
  // No code was issued: never invent one (B6), show how to collect the prize instead.
  pickupInstructions: localized(
    "Présentez cet écran à un conseiller pour récupérer votre lot.",
    "اعرض هذه الشاشة لأحد المستشارين لاستلام جائزتك.",
    "Show this screen to a staff member to collect your prize.",
  ),
  confirm: localized(
    "J'ai copié mon code",
    "لقد نسخت رمزي",
    "I've copied my code",
  ),
  confirming: localized("Confirmation…", "جارٍ التأكيد…", "Confirming…"),
  confirmed: localized(
    "Merci, c'est noté !",
    "شكراً، تم التسجيل!",
    "Thanks, noted!",
  ),
  // The code stays valid whether or not this background ping succeeds: never alarming.
  confirmFailed: localized(
    "Votre code reste valable même si la confirmation a échoué.",
    "يبقى رمزك صالحاً حتى لو فشل التأكيد.",
    "Your code stays valid even though the confirmation failed.",
  ),
  shareWhatsapp: localized(
    "Partager sur WhatsApp",
    "شارك عبر واتساب",
    "Share on WhatsApp",
  ),
  shareFacebook: localized(
    "Partager sur Facebook",
    "شارك عبر فيسبوك",
    "Share on Facebook",
  ),
  share: localized("Partager", "شارك", "Share"),
  shareWinText: localized(
    "J'ai gagné {prize} chez {brand} ! Tentez votre chance :",
    "لقد ربحت {prize} من {brand}! جرب حظك:",
    "I just won {prize} at {brand}! Try your luck:",
  ),
  shareLoseText: localized(
    "Tentez votre chance et gagnez des lots chez {brand} :",
    "جرب حظك واربح جوائز من {brand}:",
    "Try your luck and win prizes at {brand}:",
  ),
} as const;
