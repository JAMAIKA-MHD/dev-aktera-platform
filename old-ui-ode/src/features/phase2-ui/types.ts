export type UiStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type UiCampaignState = 'draft' | 'scheduled' | 'active' | 'paused' | 'ended' | 'archived';

export interface UiStatusBadge {
  key: UiCampaignState;
  label: string;
  tone: UiStatusTone;
}

export interface UiMechanicBadge {
  key: 'wheel' | 'quiz';
  label: string;
}

export interface UiCampaignSummary {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  sourceCampaignId: string | null;
  status: UiStatusBadge;
  mechanic: UiMechanicBadge;
  publicPath: string;
  dashboardPath: string;
  editPath: string;
  updateDraftPath: string;
  relaunchPath: string;
  winProbabilityPercent: number;
  startDateLabel: string;
  endDateLabel: string;
  isPubliclyPlayable: boolean;
}

export interface UiRewardTemplateCard {
  id: string;
  name: string;
  description: string | null;
  category: 'voucher' | 'physical';
  categoryLabel: string;
  imageUrl: string | null;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  stockUsagePercent: number;
  stockHealthLabel: string;
  stockHealthTone: UiStatusTone;
}

export interface UiInventoryCard {
  id: string;
  name: string;
  category: 'voucher' | 'physical';
  categoryLabel: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  distributedStock: number;
  activeCampaignCount: number;
  filledValuesCount: number;
  availabilityPercent: number;
  stockHealthLabel: string;
  stockHealthTone: UiStatusTone;
}

export interface UiLeadRow {
  id: string;
  participantName: string;
  phoneNumber: string;
  campaignName: string;
  createdAtLabel: string;
  resultLabel: string;
  resultTone: UiStatusTone;
  couponCode: string | null;
  couponConfirmed: boolean;
}

export interface UiPlayerPreviewPrize {
  name: string;
  icon: string;
  isWin: boolean;
}

export interface UiPlayerPreviewTheme {
  primaryColor: string;
  secondaryColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface UiPlayerPreview {
  name: string;
  description: string | null;
  logoUrl: string | null;
  theme: UiPlayerPreviewTheme;
  prizes: UiPlayerPreviewPrize[];
  includeLossSlice: boolean;
}
