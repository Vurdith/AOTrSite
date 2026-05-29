import type { ItemRarity } from "@/content/items";

export const rarityStyles: Record<
  ItemRarity,
  {
    label: string;
    badge: string;
    crest: string;
    text: string;
  }
> = {
  mythic: {
    label: "Mythic",
    badge: "rarity-badge-mythic",
    crest: "rarity-crest-mythic",
    text: "text-red-100",
  },
  legendary: {
    label: "Legendary",
    badge: "rarity-badge-legendary",
    crest: "rarity-crest-legendary",
    text: "text-orange-100",
  },
  epic: {
    label: "Epic",
    badge: "rarity-badge-epic",
    crest: "rarity-crest-epic",
    text: "text-purple-100",
  },
  rare: {
    label: "Rare",
    badge: "rarity-badge-rare",
    crest: "rarity-crest-rare",
    text: "text-blue-100",
  },
  uncommon: {
    label: "Uncommon",
    badge: "rarity-badge-uncommon",
    crest: "rarity-crest-uncommon",
    text: "text-emerald-100",
  },
  common: {
    label: "Common",
    badge: "rarity-badge-common",
    crest: "rarity-crest-common",
    text: "text-zinc-100",
  },
  event: {
    label: "Event",
    badge: "rarity-badge-event",
    crest: "rarity-crest-event",
    text: "text-amber-100",
  },
};
