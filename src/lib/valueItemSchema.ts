import { z } from "zod";

const maxMarketValue = 1_000_000_000_000;
const safeImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/")) return !value.startsWith("//") && /^\/[a-zA-Z0-9/_\-.%]+$/.test(value);

    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a safe relative path or HTTPS image URL.");

export const itemCategorySchema = z.enum(["auras", "families", "perks", "cosmetics", "artifacts"]);
export const itemTrendSchema = z.enum(["rising", "stable", "falling"]);
export const itemRaritySchema = z.enum(["mythic", "legendary", "epic", "rare", "uncommon", "common", "event"]);

export const valueHistoryPointSchema = z.object({
  date: z.string().trim().min(1).max(64),
  value: z.coerce.number().finite().nonnegative().max(maxMarketValue),
});

export const valueItemSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  name: z.string().trim().min(1).max(120),
  category: itemCategorySchema,
  rarity: itemRaritySchema,
  value: z.coerce.number().finite().nonnegative().max(maxMarketValue),
  valueKeys: z.coerce.number().finite().nonnegative().max(maxMarketValue).optional(),
  valueMasks: z.coerce.number().finite().nonnegative().max(maxMarketValue).optional(),
  valueScrolls: z.coerce.number().finite().nonnegative().max(maxMarketValue).optional(),
  valueHistory: z.array(valueHistoryPointSchema).max(500).optional(),
  demand: z.coerce.number().min(0).max(100),
  trend: itemTrendSchema,
  taxGems: z.coerce.number().int().nonnegative().max(maxMarketValue),
  prestige: z.coerce.number().int().min(0).max(10),
  iconUrl: safeImageUrlSchema.optional(),
  source: z.string().trim().max(120).optional(),
  owners: z.string().trim().min(1).max(120),
  note: z.string().trim().min(1).max(800),
});

export const valueItemInputSchema = valueItemSchema.transform((item) => ({
  ...item,
  iconUrl: item.iconUrl?.trim() || undefined,
  source: item.source?.trim() || undefined,
  valueHistory: item.valueHistory?.filter((point) => point.date.trim()) ?? [],
}));

export const valueItemListSchema = z.array(valueItemInputSchema);
