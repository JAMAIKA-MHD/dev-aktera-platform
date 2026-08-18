import { supabase } from "../lib/supabase";

export interface TemplateItemRow {
  id: string;
  prize_template_id: string;
  item_index: number;
  item_value: string | null;
  source_type: "manual" | "bulk";
  is_used?: boolean;
  is_redeemed?: boolean;
  redeemed_at?: string | null;
  redeemed_by_player?: boolean;
}

export type ImportMode = "append" | "replace";

export interface DuplicateConflict {
  lineNumber: number; // 1-indexed line in file or paste
  code: string;
  reason: "batch_duplicate" | "existing_duplicate";
  targetSlotIndex?: number;
}

export interface RawParsedCode {
  lineNumber: number;
  code: string;
  explicitIndex?: number;
}

export interface ImportValidationResult {
  success: boolean;
  mode: ImportMode;
  itemsToSave: { id: string; item_value: string | null }[];
  totalParsedCodes: number;
  importedCount: number;
  emptySlotsAvailable: number;
  overflow: boolean;
  overflowCount?: number;
  errorMessage?: string;
  conflicts: DuplicateConflict[];
  rawParsedCodes: RawParsedCode[];
}

export interface GenerateCodesOptions {
  count: number;
  prefix?: string;
  length?: number; // default 8
  existingCodes?: string[] | Set<string>;
}

export interface GeneratedCodesResult {
  success: boolean;
  codes: string[];
  errorMessage?: string;
}

// ── Database Services ──────────────────────────────────────────────────────────

export async function fetchTemplateItemsService(
  prizeTemplateId: string,
): Promise<TemplateItemRow[]> {
  // 1. Fetch all template item rows in pages of 1,000 to bypass PostgREST default row caps
  let allRows: TemplateItemRow[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from("prize_template_items")
      .select("id, prize_template_id, item_index, item_value, source_type")
      .eq("prize_template_id", prizeTemplateId)
      .order("item_index", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (pageError) throw pageError;

    if (pageData && pageData.length > 0) {
      allRows = allRows.concat(pageData as TemplateItemRow[]);
      from += pageData.length;
      if (pageData.length < PAGE_SIZE) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  allRows.sort((a, b) => a.item_index - b.item_index);

  if (allRows.length === 0) return [];

  // 2. Fetch redemption status from coupon_redemptions table AND entries table
  try {
    const itemIds = allRows.map((r) => r.id);
    const redemptionMap = new Map<
      string,
      { redeemed_at: string | null; redeemed_by_player: boolean }
    >();

    const CHUNK_SIZE = 100;
    for (let i = 0; i < itemIds.length; i += CHUNK_SIZE) {
      const chunk = itemIds.slice(i, i + CHUNK_SIZE);
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from("coupon_redemptions")
        .select("prize_template_item_id, redeemed_at, redeemed_by_player")
        .in("prize_template_item_id", chunk);

      if (!redemptionsError && redemptionsData) {
        for (const r of redemptionsData) {
          redemptionMap.set(r.prize_template_item_id, {
            redeemed_at: r.redeemed_at ?? null,
            redeemed_by_player: Boolean(r.redeemed_by_player),
          });
        }
      }
    }

    // Also query entries table to catch any codes redeemed by winners
    const redeemedCodesMap = new Map<string, string>();
    try {
      const { data: entriesData } = await supabase
        .from("entries")
        .select("redeemed_coupon_value, created_at")
        .not("redeemed_coupon_value", "is", null)
        .eq("is_winner", true);

      if (entriesData) {
        for (const entry of entriesData) {
          if (entry.redeemed_coupon_value) {
            const normalized = entry.redeemed_coupon_value.trim().toLowerCase();
            if (normalized) {
              redeemedCodesMap.set(normalized, entry.created_at);
            }
          }
        }
      }
    } catch (entriesErr) {
      console.warn(
        "[fetchTemplateItemsService] Non-fatal: entries fetch skipped:",
        entriesErr,
      );
    }

    for (const row of allRows) {
      const redemption = redemptionMap.get(row.id);
      const codeNormalized = (row.item_value || "").trim().toLowerCase();
      const entryRedeemedAt = codeNormalized
        ? redeemedCodesMap.get(codeNormalized)
        : null;

      if (
        redemption ||
        (entryRedeemedAt !== undefined && entryRedeemedAt !== null)
      ) {
        row.is_redeemed = true;
        row.is_used = true;
        row.redeemed_at = redemption?.redeemed_at || entryRedeemedAt || null;
        row.redeemed_by_player = redemption?.redeemed_by_player ?? true;
      } else {
        row.is_redeemed = false;
        row.is_used = false;
      }
    }
  } catch (redemptionErr) {
    console.warn(
      "[fetchTemplateItemsService] Non-fatal: coupon_redemptions fetch skipped:",
      redemptionErr,
    );
    for (const row of allRows) {
      row.is_redeemed = false;
      row.is_used = false;
    }
  }

  return allRows;
}

export async function createMissingTemplateItemsService(
  missingRows: {
    prize_template_id: string;
    organization_id: string;
    item_index: number;
    item_value: string | null;
    source_type: "manual";
  }[],
): Promise<void> {
  if (missingRows.length === 0) return;
  const CHUNK_SIZE = 500;
  for (let i = 0; i < missingRows.length; i += CHUNK_SIZE) {
    const chunk = missingRows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("prize_template_items")
      .upsert(chunk, { onConflict: "prize_template_id,item_index" });
    if (error) throw error;
  }
}

export async function updateSingleTemplateItemService(
  id: string,
  itemValue: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("prize_template_items")
    .update({
      item_value: itemValue,
      source_type: "manual",
    })
    .eq("id", id);

  if (error) throw error;
}

export async function bulkUpdateTemplateItemsService(
  items: { id: string; item_value: string | null }[],
): Promise<void> {
  if (items.length === 0) return;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const updates = chunk.map((item) =>
      supabase
        .from("prize_template_items")
        .update({
          item_value: item.item_value,
          source_type: "bulk",
        })
        .eq("id", item.id),
    );
    await Promise.all(updates);
  }
}

// ── Pure Validation & Calculation Functions ───────────────────────────────────

/**
 * Parses raw input objects (from CSV/Excel) or lines (from bulk paste) into structured RawParsedCode entries.
 */
export function parseRawCodes(input: {
  rawRows?: Record<string, unknown>[];
  rawLines?: string[];
}): RawParsedCode[] {
  const parsed: RawParsedCode[] = [];

  if (input.rawRows && input.rawRows.length > 0) {
    const sampleRow = input.rawRows[0] ?? {};
    const keys = Object.keys(sampleRow);
    const valKey =
      keys.find(
        (k) =>
          k
            .toLowerCase()
            .replace(/[^a-z]/g, "")
            .includes("itemvalue") ||
          k.toLowerCase().includes("value") ||
          k.toLowerCase().includes("code") ||
          k.toLowerCase().includes("voucher"),
      ) ??
      keys[1] ??
      keys[0];

    const idxKey = keys.find(
      (k) =>
        k
          .toLowerCase()
          .replace(/[^a-z]/g, "")
          .includes("itemindex") || k.toLowerCase().includes("index"),
    );

    input.rawRows.forEach((row, index) => {
      const code = String(row[valKey ?? ""] ?? "").trim();
      if (code.length === 0) return;

      let explicitIndex: number | undefined;
      if (idxKey && row[idxKey] !== undefined) {
        const parsedIdx = parseInt(String(row[idxKey]).trim(), 10);
        if (!isNaN(parsedIdx) && parsedIdx > 0) {
          explicitIndex = parsedIdx;
        }
      }

      parsed.push({
        lineNumber: index + 1,
        code,
        explicitIndex,
      });
    });
  } else if (input.rawLines && input.rawLines.length > 0) {
    input.rawLines.forEach((line, index) => {
      const code = line.trim();
      if (code.length === 0) return;
      parsed.push({
        lineNumber: index + 1,
        code,
      });
    });
  }

  return parsed;
}

/**
 * Validates and maps imported voucher codes according to the selected mode (Append vs Replace).
 * Performs overflow checks, duplicate checks, and constructs itemsToSave payload.
 */
export function validateAndPrepareImportService(options: {
  mode: ImportMode;
  rawInput: { rawRows?: Record<string, unknown>[]; rawLines?: string[] };
  currentItems: TemplateItemRow[];
  totalStock: number;
  preParsedCodes?: RawParsedCode[];
}): ImportValidationResult {
  const { mode, rawInput, currentItems, totalStock } = options;

  const rawParsedCodes = options.preParsedCodes ?? parseRawCodes(rawInput);

  if (rawParsedCodes.length === 0) {
    return {
      success: false,
      mode,
      itemsToSave: [],
      totalParsedCodes: 0,
      importedCount: 0,
      emptySlotsAvailable: 0,
      overflow: false,
      errorMessage: "No valid voucher codes found in the provided input.",
      conflicts: [],
      rawParsedCodes: [],
    };
  }

  // Identify empty slots in ascending order of item_index
  const emptySlots = currentItems.filter(
    (item) => !item.item_value || item.item_value.trim().length === 0,
  );
  const emptySlotsAvailable = emptySlots.length;
  const totalSlotsCapacity = currentItems.length || totalStock;

  // 1. OVERFLOW VALIDATION
  if (mode === "append") {
    if (rawParsedCodes.length > emptySlotsAvailable) {
      const overflowCount = rawParsedCodes.length - emptySlotsAvailable;
      return {
        success: false,
        mode,
        itemsToSave: [],
        totalParsedCodes: rawParsedCodes.length,
        importedCount: 0,
        emptySlotsAvailable,
        overflow: true,
        overflowCount,
        errorMessage: `Import rejected: File contains ${rawParsedCodes.length} codes, but only ${emptySlotsAvailable} empty slots are available in this template. (Total Capacity: ${totalSlotsCapacity}, Filled: ${totalSlotsCapacity - emptySlotsAvailable}).`,
        conflicts: [],
        rawParsedCodes,
      };
    }
  } else {
    // Replace mode
    if (rawParsedCodes.length > totalSlotsCapacity) {
      const overflowCount = rawParsedCodes.length - totalSlotsCapacity;
      return {
        success: false,
        mode,
        itemsToSave: [],
        totalParsedCodes: rawParsedCodes.length,
        importedCount: 0,
        emptySlotsAvailable,
        overflow: true,
        overflowCount,
        errorMessage: `Import rejected: File contains ${rawParsedCodes.length} codes, which exceeds the total template stock capacity of ${totalSlotsCapacity}.`,
        conflicts: [],
        rawParsedCodes,
      };
    }
  }

  // 2. DUPLICATE DETECTION & CONFLICT MAPPING
  const conflicts: DuplicateConflict[] = [];
  const seenInBatch = new Map<string, number>(); // uppercase code -> lineNumber

  // Build existing codes map for conflict checking
  // In append mode: all currently filled items are protected
  // In replace mode: only items beyond the replacement slice keep their codes
  const existingCodesSet = new Set<string>();
  if (mode === "append") {
    for (const item of currentItems) {
      if (item.item_value && item.item_value.trim().length > 0) {
        existingCodesSet.add(item.item_value.trim().toUpperCase());
      }
    }
  } else {
    // Replace mode: any slots past rawParsedCodes.length
    for (let i = rawParsedCodes.length; i < currentItems.length; i++) {
      const item = currentItems[i];
      if (item?.item_value && item.item_value.trim().length > 0) {
        existingCodesSet.add(item.item_value.trim().toUpperCase());
      }
    }
  }

  for (const parsed of rawParsedCodes) {
    const normalizedCode = parsed.code.toUpperCase();

    // Check if duplicate within the same batch
    if (seenInBatch.has(normalizedCode)) {
      conflicts.push({
        lineNumber: parsed.lineNumber,
        code: parsed.code,
        reason: "batch_duplicate",
      });
    } else {
      seenInBatch.set(normalizedCode, parsed.lineNumber);
    }

    // Check if duplicate against existing stored codes
    if (existingCodesSet.has(normalizedCode)) {
      conflicts.push({
        lineNumber: parsed.lineNumber,
        code: parsed.code,
        reason: "existing_duplicate",
      });
    }
  }

  // 3. CONSTRUCT TARGET SLOTS MAPPING (itemsToSave)
  const itemsToSave: { id: string; item_value: string | null }[] = [];

  if (mode === "append") {
    // Sequentially assign parsed codes into the empty slots
    for (let i = 0; i < rawParsedCodes.length; i++) {
      const targetSlot = emptySlots[i];
      if (targetSlot) {
        itemsToSave.push({
          id: targetSlot.id,
          item_value: rawParsedCodes[i].code,
        });
      }
    }
  } else {
    // Replace mode: assign into currentItems from slot 0..N
    for (let i = 0; i < rawParsedCodes.length; i++) {
      const targetSlot = currentItems[i];
      if (targetSlot) {
        itemsToSave.push({
          id: targetSlot.id,
          item_value: rawParsedCodes[i].code,
        });
      }
    }
  }

  return {
    success: conflicts.length === 0,
    mode,
    itemsToSave,
    totalParsedCodes: rawParsedCodes.length,
    importedCount: itemsToSave.length,
    emptySlotsAvailable,
    overflow: false,
    conflicts,
    rawParsedCodes,
  };
}

/**
 * Pure function to resolve a duplicate conflict at a specific line number and re-run validation.
 */
export function resolveConflictAndRevalidateService(
  prevResult: ImportValidationResult,
  conflictLineNumber: number,
  newCode: string,
  currentItems: TemplateItemRow[],
  totalStock: number,
): ImportValidationResult {
  const updatedRawCodes = prevResult.rawParsedCodes.map((item) =>
    item.lineNumber === conflictLineNumber
      ? { ...item, code: newCode.trim() }
      : item,
  );

  return validateAndPrepareImportService({
    mode: prevResult.mode,
    rawInput: {},
    currentItems,
    totalStock,
    preParsedCodes: updatedRawCodes,
  });
}

/**
 * Pure random code generator with collision checking.
 * Generates 8-character (or custom length) uppercase alphanumeric codes with optional prefix.
 */
export function generateRandomVoucherCodesService(
  options: GenerateCodesOptions,
): GeneratedCodesResult {
  const { count, prefix = "", length = 8, existingCodes = [] } = options;

  if (count <= 0) {
    return { success: true, codes: [] };
  }

  const existingSet = new Set<string>();
  if (Array.isArray(existingCodes)) {
    for (const c of existingCodes) {
      if (c) existingSet.add(c.trim().toUpperCase());
    }
  } else if (existingCodes instanceof Set) {
    for (const c of existingCodes) {
      if (c) existingSet.add(c.trim().toUpperCase());
    }
  }

  // Clear uppercase alphanumeric character set without easily confused characters
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const generatedCodes: string[] = [];
  const batchSet = new Set<string>();

  let attempts = 0;
  const maxAttempts = count * 500 + 10000;

  while (generatedCodes.length < count && attempts < maxAttempts) {
    attempts++;
    let randomPart = "";
    for (let i = 0; i < length; i++) {
      const randIdx = Math.floor(Math.random() * charset.length);
      randomPart += charset[randIdx];
    }

    const fullCode = prefix ? `${prefix}${randomPart}` : randomPart;
    const normalized = fullCode.toUpperCase();

    if (!existingSet.has(normalized) && !batchSet.has(normalized)) {
      batchSet.add(normalized);
      generatedCodes.push(fullCode);
    }
  }

  if (generatedCodes.length < count) {
    return {
      success: false,
      codes: generatedCodes,
      errorMessage: `Could only generate ${generatedCodes.length} unique codes without collision out of ${count} requested.`,
    };
  }

  return {
    success: true,
    codes: generatedCodes,
  };
}
