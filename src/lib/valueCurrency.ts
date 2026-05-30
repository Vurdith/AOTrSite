export type ValueMode = "keys" | "masks" | "scrolls";

export type ValueCurrencySettings = {
  maskToKeys: number;
  scrollToKeys: number;
};

export const defaultValueCurrencySettings: ValueCurrencySettings = {
  maskToKeys: 900,
  scrollToKeys: 3,
};

export const valueModeIcon: Record<ValueMode, string> = {
  keys: "key",
  masks: "mask",
  scrolls: "scroll",
};

export function sanitizeCurrencySettings(settings?: Partial<ValueCurrencySettings> | null): ValueCurrencySettings {
  return {
    maskToKeys: Number(settings?.maskToKeys) > 0 ? Number(settings?.maskToKeys) : defaultValueCurrencySettings.maskToKeys,
    scrollToKeys: Number(settings?.scrollToKeys) > 0 ? Number(settings?.scrollToKeys) : defaultValueCurrencySettings.scrollToKeys,
  };
}

export function getValueModes(settings?: Partial<ValueCurrencySettings> | null) {
  const safeSettings = sanitizeCurrencySettings(settings);

  return {
    keys: { label: "Keys", shortLabel: "Keys", unit: "keys", rate: 1, icon: valueModeIcon.keys },
    masks: { label: "Vizards", shortLabel: "Vizards", unit: "vizards", rate: safeSettings.maskToKeys, icon: valueModeIcon.masks },
    scrolls: { label: "Scrolls", shortLabel: "Scrolls", unit: "scrolls", rate: safeSettings.scrollToKeys, icon: valueModeIcon.scrolls },
  } as const;
}

export function getCurrencyValues(valueKeys: number, settings?: Partial<ValueCurrencySettings> | null) {
  const modes = getValueModes(settings);

  return {
    valueKeys,
    valueMasks: valueKeys / modes.masks.rate,
    valueScrolls: valueKeys / modes.scrolls.rate,
  };
}

export function getDisplayValue(valueKeys: number, mode: ValueMode, settings?: Partial<ValueCurrencySettings> | null) {
  return valueKeys / getValueModes(settings)[mode].rate;
}
