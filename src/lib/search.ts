import { getItemSource, type ValueItem } from "@/content/items";

const aliasPairs: [RegExp, string][] = [
  [/\bvizards?\b/, "mask masks"],
  [/\bmasks?\b/, "vizard vizards"],
  [/\bscrolls?\b/, "scroll scrolls"],
  [/\bkeys?\b/, "key keys"],
  [/\bcosmetics?\b/, "cosmetic cosmetics"],
  [/\bfamilies?\b/, "family families"],
  [/\bskins?\b/, "skin skins"],
];

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"()[\]{}]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function expandSearchText(value: string) {
  const normalized = normalizeSearch(value);
  const aliases = aliasPairs
    .filter(([pattern]) => pattern.test(normalized))
    .map(([, alias]) => alias)
    .join(" ");

  return normalizeSearch(`${normalized} ${aliases}`);
}

export function itemSearchText(item: ValueItem) {
  return expandSearchText(
    [
      item.id,
      item.name,
      item.category,
      item.rarity,
      item.source,
      item.owners,
      item.note,
      item.trend,
      getItemSource(item),
      String(item.value),
      String(item.valueKeys ?? item.value),
      String(item.demand),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function matchesSearch(text: string, query: string) {
  const needle = expandSearchText(query);
  if (!needle) return true;

  const haystack = expandSearchText(text);
  const haystackParts = haystack.split(" ");
  return needle.split(" ").every((part) => haystack.includes(part) || haystackParts.some((candidate) => isCloseSearchToken(candidate, part)));
}

function isCloseSearchToken(candidate: string, query: string) {
  if (query.length < 4 || candidate.length < 4) return false;
  if (candidate[0] !== query[0]) return false;

  const maxDistance = query.length > 7 ? 2 : 1;
  return levenshteinDistance(candidate.slice(0, 24), query.slice(0, 24), maxDistance) <= maxDistance;
}

function levenshteinDistance(a: string, b: string, limit: number) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > limit) return limit + 1;
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}
