import { format } from 'date-fns';
import type { InventoryRow } from '../../hooks/useInventory';
import type { PrizeTemplateInventorySummary } from '../../hooks/usePrizeTemplates';
import type { Campaign, Entry, Prize } from '../../types';
import {
  type UiCampaignSummary,
  type UiInventoryCard,
  type UiLeadRow,
  type UiPlayerPreview,
  type UiPlayerPreviewPrize,
  type UiRewardTemplateCard,
} from './types';
import { getCampaignPreviewTheme, getCampaignStatusBadge, getCampaignUiState } from './theme';

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getMechanicLabel(campaign: Pick<Campaign, 'require_quiz'>): UiCampaignSummary['mechanic'] {
  return campaign.require_quiz
    ? { key: 'quiz', label: 'Quiz Challenge' }
    : { key: 'wheel', label: 'Lucky Wheel' };
}

function getStockHealth(availableQuantity: number): Pick<UiRewardTemplateCard, 'stockHealthLabel' | 'stockHealthTone'> {
  if (availableQuantity === 0) {
    return { stockHealthLabel: 'Fully reserved', stockHealthTone: 'danger' };
  }
  if (availableQuantity < 5) {
    return { stockHealthLabel: 'Low stock', stockHealthTone: 'warning' };
  }
  return { stockHealthLabel: 'Available', stockHealthTone: 'success' };
}

function getPrizeIcon(prize: Pick<Prize, 'image_url' | 'name'>): string {
  if (prize.image_url) return '🎁';
  const normalizedName = prize.name.toLowerCase();
  if (normalizedName.includes('voucher') || normalizedName.includes('coupon') || normalizedName.includes('credit')) {
    return '🎟️';
  }
  if (normalizedName.includes('pass') || normalizedName.includes('internet') || normalizedName.includes('data')) {
    return '📱';
  }
  return '🎁';
}

export function formatWinProbabilityPercent(value: number): number {
  return clampPercent(value * 100);
}

export function adaptCampaignToUiSummary(campaign: Campaign, now = new Date()): UiCampaignSummary {
  const status = getCampaignStatusBadge(campaign, now);
  const uiState = getCampaignUiState(campaign, now);

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    slug: campaign.slug,
    sourceCampaignId: campaign.source_campaign_id,
    status,
    mechanic: getMechanicLabel(campaign),
    publicPath: `/play/${campaign.slug}`,
    dashboardPath: `/dashboard/campaigns/${campaign.id}`,
    editPath: `/dashboard/campaigns/${campaign.id}/edit`,
    updateDraftPath: `/dashboard/campaigns/new?from=${campaign.id}&mode=update`,
    relaunchPath: `/dashboard/campaigns/new?from=${campaign.id}`,
    winProbabilityPercent: formatWinProbabilityPercent(campaign.win_probability),
    startDateLabel: format(new Date(campaign.start_date), 'dd MMM yyyy'),
    endDateLabel: format(new Date(campaign.end_date), 'dd MMM yyyy'),
    isPubliclyPlayable: uiState === 'active',
  };
}

export function adaptPrizeTemplateToUiRewardCard(template: PrizeTemplateInventorySummary): UiRewardTemplateCard {
  const totalStock = Number(template.stock_quantity ?? 0);
  const reservedStock = Number(template.reserved_quantity ?? 0);
  const availableStock = Number(template.available_quantity ?? 0);
  const stockHealth = getStockHealth(availableStock);

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    categoryLabel: template.category === 'physical' ? 'Physical' : 'Voucher',
    imageUrl: template.image_url,
    totalStock,
    reservedStock,
    availableStock,
    stockUsagePercent: totalStock > 0 ? clampPercent((reservedStock / totalStock) * 100) : 0,
    stockHealthLabel: stockHealth.stockHealthLabel,
    stockHealthTone: stockHealth.stockHealthTone,
  };
}

export function adaptInventoryRowToUiCard(row: InventoryRow): UiInventoryCard {
  const totalStock = Number(row.stock_quantity ?? 0);
  const availableStock = Number(row.available_quantity ?? 0);
  const stockHealth = getStockHealth(availableStock);

  return {
    id: row.id,
    name: row.prize_template_name,
    category: row.prize_category,
    categoryLabel: row.prize_category === 'physical' ? 'Physical' : 'Voucher',
    totalStock,
    reservedStock: Number(row.reserved_quantity ?? 0),
    availableStock,
    distributedStock: Number(row.distributed_quantity ?? 0),
    activeCampaignCount: Number(row.active_campaign_count ?? 0),
    filledValuesCount: Number(row.filled_values_count ?? 0),
    availabilityPercent: totalStock > 0 ? clampPercent((availableStock / totalStock) * 100) : 0,
    stockHealthLabel: stockHealth.stockHealthLabel,
    stockHealthTone: stockHealth.stockHealthTone,
  };
}

export function adaptEntryToUiLeadRow(
  entry: Entry,
  options: { campaignName?: string; prizeName?: string } = {},
): UiLeadRow {
  const resultLabel = entry.is_winner ? options.prizeName ?? 'Winner' : 'No prize';

  return {
    id: entry.id,
    participantName: entry.participant_name?.trim() || 'Anonymous participant',
    phoneNumber: entry.phone_number?.trim() || 'No phone number',
    campaignName: options.campaignName ?? 'Unknown campaign',
    createdAtLabel: format(new Date(entry.created_at), 'dd MMM yyyy HH:mm'),
    resultLabel,
    resultTone: entry.is_winner ? 'success' : 'neutral',
    couponCode: entry.redeemed_coupon_value,
    couponConfirmed: entry.coupon_confirmed,
  };
}

export function adaptCampaignToUiPlayerPreview(campaign: Campaign, prizes: Prize[]): UiPlayerPreview {
  const previewPrizes: UiPlayerPreviewPrize[] = prizes.map((prize) => ({
    name: prize.name,
    icon: getPrizeIcon(prize),
    isWin: true,
  }));

  return {
    name: campaign.name,
    description: campaign.description,
    logoUrl: null,
    theme: getCampaignPreviewTheme(campaign),
    prizes: previewPrizes,
    includeLossSlice: campaign.win_probability < 1,
  };
}
