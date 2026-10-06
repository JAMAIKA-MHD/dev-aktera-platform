import {
  Box,
  CircleHelp,
  Coins,
  Crown,
  Flame,
  Gem,
  Gift,
  Percent,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "../domain/icons";

export { ICON_NAMES, type IconName } from "../domain/icons";

// Record<IconName, …> makes TypeScript require a component for every icon name.
export const ICON_COMPONENTS: Readonly<Record<IconName, LucideIcon>> = {
  crown: Crown,
  trophy: Trophy,
  gift: Gift,
  coins: Coins,
  zap: Zap,
  star: Star,
  gem: Gem,
  ticket: Ticket,
  percent: Percent,
  wifi: Wifi,
  target: Target,
  "help-circle": CircleHelp,
  box: Box,
  flame: Flame,
  sparkles: Sparkles,
  "shopping-bag": ShoppingBag,
};
