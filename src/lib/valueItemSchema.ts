import { z } from "zod";

export const itemCategorySchema = z.enum(["auras", "families", "perks", "cosmetics", "artifacts"]);
export const itemTrendSchema = z.enum(["rising", "stable", "falling"]);
export const itemRaritySchema = z.enum(["mythic", "legendary", "epic", "rare", "uncommon", "common", "event"]);

export const valueHistoryPointSchema = z.object({
  date: z.string().min(1),
  value: z.coerce.number().nonnegative(),
});

export const valueItemSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  name: z.string().min(1),
  category: itemCategorySchema,
  rarity: itemRaritySchema,
  value: z.coerce.number().nonnegative(),
  valueHistory: z.array(valueHistoryPointSchema).optional(),
  demand: z.coerce.number().min(0).max(100),
  trend: itemTrendSchema,
  taxGems: z.coerce.number().int().nonnegative(),
  prestige: z.coerce.number().int().min(0).max(10),
  iconUrl: z.string().optional(),
  source: z.string().optional(),
  owners: z.string().min(1),
  note: z.string().min(1),
});

export const valueItemInputSchema = valueItemSchema.transform((item) => ({
  ...item,
  iconUrl: item.iconUrl?.trim() || undefined,
  source: item.source?.trim() || undefined,
  valueHistory: item.valueHistory?.filter((point) => point.date.trim()) ?? [],
}));

export const valueItemListSchema = z.array(valueItemInputSchema);
