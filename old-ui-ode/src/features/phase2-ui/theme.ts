import type { Campaign } from '../../types';
import type { UiCampaignState, UiPlayerPreviewTheme, UiStatusBadge } from './types';

export const UI_FONT_STACK = "'Poppins', 'Noto Sans Arabic', sans-serif";

export function toAlphaColor(hex: string, alpha: number) {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  const opacity = Math.round(normalizedAlpha * 255)
    .toString(16)
    .padStart(2, '0');

  if (/^#([0-9a-fA-F]{6})$/.test(hex)) {
    return `${hex}${opacity}`;
  }

  return `rgba(124, 58, 237, ${normalizedAlpha})`;
}

export const UI_STATUS_STYLES: Record<UiStatusBadge['tone'], string> = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-rose-100 text-rose-700 border-rose-200',
};

const PRESET_THEME_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#E11D48'];

function clampColorChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function sanitizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : null;
}

function shiftHexColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  const nextRed = clampColorChannel(red + amount);
  const nextGreen = clampColorChannel(green + amount);
  const nextBlue = clampColorChannel(blue + amount);

  return `#${nextRed.toString(16).padStart(2, '0')}${nextGreen.toString(16).padStart(2, '0')}${nextBlue.toString(16).padStart(2, '0')}`;
}

function getPresetThemeColor(seed: string): string {
  const hash = Array.from(seed).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
  return PRESET_THEME_COLORS[hash % PRESET_THEME_COLORS.length];
}

export function getCampaignUiState(campaign: Pick<Campaign, 'status' | 'start_date' | 'end_date'>, now = new Date()): UiCampaignState {
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);

  if (campaign.status === 'archived') return 'archived';
  if (campaign.status === 'draft') return 'draft';
  if (campaign.status === 'paused') return 'paused';
  if (campaign.status === 'ended' || end < now) return 'ended';
  if (campaign.status === 'active' && start > now) return 'scheduled';
  return 'active';
}

export function getCampaignStatusBadge(campaign: Pick<Campaign, 'status' | 'start_date' | 'end_date'>, now = new Date()): UiStatusBadge {
  const state = getCampaignUiState(campaign, now);
  switch (state) {
    case 'draft':
      return { key: state, label: 'Draft', tone: 'neutral' };
    case 'scheduled':
      return { key: state, label: 'Upcoming', tone: 'info' };
    case 'active':
      return { key: state, label: 'Active', tone: 'success' };
    case 'paused':
      return { key: state, label: 'Paused', tone: 'warning' };
    case 'ended':
      return { key: state, label: 'Ended', tone: 'danger' };
    case 'archived':
      return { key: state, label: 'Archived', tone: 'neutral' };
  }
}

export function getCampaignPreviewTheme(campaign: Pick<Campaign, 'name' | 'theme_color'>): UiPlayerPreviewTheme {
  const primaryColor = sanitizeHexColor(campaign.theme_color) ?? getPresetThemeColor(campaign.name);
  return {
    primaryColor,
    secondaryColor: shiftHexColor(primaryColor, 36),
    gradientFrom: shiftHexColor(primaryColor, 22),
    gradientTo: shiftHexColor(primaryColor, -28),
  };
}
