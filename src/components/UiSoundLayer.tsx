"use client";

import { useEffect, useRef } from "react";

type SoundTone = "close" | "confirm" | "danger" | "hover" | "login" | "nav" | "pagination" | "press" | "quantity" | "select";

type OscSoundLayer = {
  delay?: number;
  duration: number;
  end?: number;
  frequency: number;
  kind?: "osc";
  pan?: number;
  type?: OscillatorType;
  volume: number;
};

type NoiseSoundLayer = {
  delay?: number;
  duration: number;
  filter: BiquadFilterType;
  frequency: number;
  kind: "noise";
  pan?: number;
  q?: number;
  volume: number;
};

type SoundLayer = NoiseSoundLayer | OscSoundLayer;

type SoundPreset = {
  layers: SoundLayer[][];
  master: number;
};

const soundAssets: Record<SoundTone, string[]> = {
  close: ["/sounds/ui/close-1.webm", "/sounds/ui/close-2.webm"],
  confirm: ["/sounds/ui/confirm-1.webm", "/sounds/ui/confirm-2.webm", "/sounds/ui/confirm-3.webm", "/sounds/ui/confirm-4.webm"],
  danger: ["/sounds/ui/danger-1.webm", "/sounds/ui/danger-2.webm"],
  hover: ["/sounds/ui/hover-1.webm", "/sounds/ui/hover-2.webm", "/sounds/ui/hover-3.webm", "/sounds/ui/hover-4.webm", "/sounds/ui/hover-5.webm"],
  login: ["/sounds/ui/login-1.webm", "/sounds/ui/login-2.webm", "/sounds/ui/login-3.webm", "/sounds/ui/login-4.webm", "/sounds/ui/login-5.webm"],
  nav: ["/sounds/ui/nav-1.webm", "/sounds/ui/nav-2.webm", "/sounds/ui/nav-3.webm", "/sounds/ui/nav-4.webm", "/sounds/ui/nav-5.webm", "/sounds/ui/nav-6.webm"],
  pagination: ["/sounds/ui/pagination-1.webm", "/sounds/ui/pagination-2.webm"],
  press: ["/sounds/ui/press-1.webm", "/sounds/ui/press-2.webm", "/sounds/ui/press-3.webm", "/sounds/ui/press-4.webm", "/sounds/ui/press-5.webm", "/sounds/ui/press-6.webm"],
  quantity: ["/sounds/ui/quantity-1.webm", "/sounds/ui/quantity-2.webm", "/sounds/ui/quantity-3.webm", "/sounds/ui/quantity-4.webm"],
  select: ["/sounds/ui/select-1.webm", "/sounds/ui/select-2.webm", "/sounds/ui/select-3.webm", "/sounds/ui/select-4.webm"],
};

const interactiveSelector = [
  "a[href]",
  "button",
  "select",
  "summary",
  "[role='button']",
  "[role='tab']",
  "[data-ui-sound]",
].join(",");

const hoverSelector = [
  ".site-nav-link",
  ".mobile-sidebar-link",
  ".site-auth-button",
  ".hero-button",
  ".royal-button",
  ".primary-market-cta",
  ".currency-tab",
  ".item-range-tab",
  "[data-ui-hover-sound]",
].join(",");

function isDisabled(element: Element) {
  return element instanceof HTMLButtonElement
    ? element.disabled
    : element.getAttribute("aria-disabled") === "true";
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getTone(element: Element): SoundTone {
  const explicit = element.getAttribute("data-ui-sound") as SoundTone | null;
  if (explicit) return explicit;

  const className = element.getAttribute("class") ?? "";
  const text = element.textContent?.toLowerCase() ?? "";
  const role = element.getAttribute("role") ?? "";

  if (element instanceof HTMLSelectElement || role === "tab" || className.includes("filter") || className.includes("currency-tab")) {
    return "select";
  }

  if (className.includes("site-nav") || className.includes("mobile-sidebar-link") || className.includes("hero-button") || role === "link") {
    return "nav";
  }

  if (className.includes("site-auth-button") || text.includes("login")) {
    return "login";
  }

  if (className.includes("delete") || className.includes("danger") || text.includes("delete") || text.includes("remove")) {
    return "danger";
  }

  if (className.includes("close") || className.includes("clear") || text === "x" || text.includes("clear")) {
    return "close";
  }

  if (className.includes("save") || className.includes("confirm") || text.includes("save")) {
    return "confirm";
  }

  if (className.includes("pagination") || text.includes("previous") || text.includes("next")) {
    return "pagination";
  }

  if (className.includes("quantity") || text === "+" || text === "-") {
    return "quantity";
  }

  return "press";
}

function getSoundTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const element = target.closest(interactiveSelector);

  if (!element || isDisabled(element)) return null;

  return element;
}

function getHoverTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const element = target.closest(hoverSelector);

  if (!element || isDisabled(element)) return null;

  return element;
}

export function UiSoundLayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastHoverTargetRef = useRef<Element | null>(null);
  const lastHoverAtRef = useRef(0);
  const lastSoundAtRef = useRef(0);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const assetBufferRef = useRef<Map<string, AudioBuffer>>(new Map());
  const loadingAssetRef = useRef<Set<string>>(new Set());
  const soundCounterRef = useRef(0);

  useEffect(() => {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    function getContext() {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }

      return audioContextRef.current;
    }

    async function loadAsset(context: AudioContext, url: string) {
      if (assetBufferRef.current.has(url) || loadingAssetRef.current.has(url)) return;

      loadingAssetRef.current.add(url);

      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        assetBufferRef.current.set(url, audioBuffer);
      } catch {
        // Procedural fallback covers browsers/codecs that cannot decode this asset.
      } finally {
        loadingAssetRef.current.delete(url);
      }
    }

    function warmAssets(context: AudioContext, tone: SoundTone) {
      soundAssets[tone].forEach((url) => {
        void loadAsset(context, url);
      });
    }

    function playAsset(context: AudioContext, tone: SoundTone, seed: number) {
      const urls = soundAssets[tone];
      const offset = tone === "hover" ? soundCounterRef.current : 0;
      const url = urls[(seed + offset) % urls.length];
      const buffer = assetBufferRef.current.get(url);

      warmAssets(context, tone);

      if (!buffer) return false;

      const source = context.createBufferSource();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const now = context.currentTime;

      source.buffer = buffer;
      panner.pan.setValueAtTime(((seed % 5) - 2) * 0.035, now);
      gain.gain.setValueAtTime(tone === "hover" ? 0.48 : 0.72, now);

      source.connect(gain);
      gain.connect(panner);
      panner.connect(context.destination);
      source.start(now);

      return true;
    }

    function getNoiseBuffer(context: AudioContext) {
      if (noiseBufferRef.current) return noiseBufferRef.current;

      const buffer = context.createBuffer(1, context.sampleRate * 0.22, context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
      }

      noiseBufferRef.current = buffer;
      return buffer;
    }

    function connectWithPan(context: AudioContext, source: AudioNode, destination: AudioNode, pan = 0) {
      const panner = context.createStereoPanner();
      panner.pan.setValueAtTime(pan, context.currentTime);
      source.connect(panner);
      panner.connect(destination);
    }

    function playOscLayer(context: AudioContext, layer: OscSoundLayer, destination: AudioNode, startAt: number) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const layerStart = startAt + (layer.delay ?? 0);
      const layerEnd = layerStart + layer.duration;
      const endFrequency = layer.end ?? layer.frequency;

      oscillator.type = layer.type ?? "sine";
      oscillator.frequency.setValueAtTime(layer.frequency, layerStart);

      if (endFrequency !== layer.frequency) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), layerEnd);
      }

      gain.gain.setValueAtTime(0.0001, layerStart);
      gain.gain.exponentialRampToValueAtTime(layer.volume, layerStart + Math.min(0.018, layer.duration * 0.38));
      gain.gain.exponentialRampToValueAtTime(0.0001, layerEnd);

      oscillator.connect(gain);
      connectWithPan(context, gain, destination, layer.pan);
      oscillator.start(layerStart);
      oscillator.stop(layerEnd + 0.024);
    }

    function playNoiseLayer(context: AudioContext, layer: NoiseSoundLayer, destination: AudioNode, startAt: number) {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const layerStart = startAt + (layer.delay ?? 0);
      const layerEnd = layerStart + layer.duration;

      source.buffer = getNoiseBuffer(context);
      filter.type = layer.filter;
      filter.frequency.setValueAtTime(layer.frequency, layerStart);
      filter.Q.setValueAtTime(layer.q ?? (layer.filter === "bandpass" ? 10 : 0.8), layerStart);

      gain.gain.setValueAtTime(0.0001, layerStart);
      gain.gain.exponentialRampToValueAtTime(layer.volume, layerStart + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, layerEnd);

      source.connect(filter);
      filter.connect(gain);
      connectWithPan(context, gain, destination, layer.pan);
      source.start(layerStart);
      source.stop(layerEnd + 0.012);
    }

    function playLayer(context: AudioContext, layer: SoundLayer, destination: AudioNode, startAt: number) {
      if (layer.kind === "noise") {
        playNoiseLayer(context, layer, destination, startAt);
        return;
      }

      playOscLayer(context, layer, destination, startAt);
    }

    function playTone(tone: SoundTone, element?: Element) {
      const context = getContext();
      const performanceNow = performance.now();
      if (performanceNow - lastSoundAtRef.current < 24) return;
      lastSoundAtRef.current = performanceNow;

      const presets: Record<SoundTone, SoundPreset> = {
        hover: {
          master: 0.58,
          layers: [
            [
              { duration: 0.014, filter: "bandpass", frequency: 8600, kind: "noise", pan: -0.18, q: 16, volume: 0.007 },
              { delay: 0.007, duration: 0.07, end: 1680, frequency: 1260, pan: 0.16, type: "sine", volume: 0.0048 },
            ],
            [
              { duration: 0.014, filter: "bandpass", frequency: 7200, kind: "noise", pan: 0.14, q: 14, volume: 0.0068 },
              { delay: 0.006, duration: 0.065, end: 1180, frequency: 1480, pan: -0.1, type: "sine", volume: 0.0045 },
            ],
            [
              { duration: 0.013, filter: "bandpass", frequency: 9800, kind: "noise", pan: 0.08, q: 18, volume: 0.006 },
              { delay: 0.006, duration: 0.074, end: 1900, frequency: 1180, pan: -0.12, type: "triangle", volume: 0.0038 },
            ],
            [
              { duration: 0.014, filter: "bandpass", frequency: 7900, kind: "noise", pan: -0.08, q: 16, volume: 0.0064 },
              { delay: 0.01, duration: 0.06, frequency: 2100, pan: 0.14, type: "sine", volume: 0.0036 },
            ],
          ],
        },
        press: {
          master: 0.92,
          layers: [
            [
              { duration: 0.018, filter: "bandpass", frequency: 2600, kind: "noise", q: 14, volume: 0.024 },
              { duration: 0.062, end: 145, frequency: 240, type: "triangle", volume: 0.026 },
              { delay: 0.012, duration: 0.026, filter: "highpass", frequency: 8600, kind: "noise", q: 0.9, volume: 0.004 },
            ],
            [
              { duration: 0.017, filter: "bandpass", frequency: 3200, kind: "noise", pan: 0.12, q: 14, volume: 0.022 },
              { duration: 0.058, end: 165, frequency: 292, type: "triangle", volume: 0.024 },
              { delay: 0.012, duration: 0.026, filter: "highpass", frequency: 9000, kind: "noise", q: 0.9, volume: 0.0038 },
            ],
            [
              { duration: 0.018, filter: "bandpass", frequency: 2100, kind: "noise", pan: -0.1, q: 13, volume: 0.021 },
              { duration: 0.06, end: 172, frequency: 330, type: "triangle", volume: 0.022 },
              { delay: 0.012, duration: 0.024, filter: "highpass", frequency: 8200, kind: "noise", q: 0.9, volume: 0.0035 },
            ],
          ],
        },
        nav: {
          master: 0.94,
          layers: [
            [
              { duration: 0.017, filter: "bandpass", frequency: 2600, kind: "noise", pan: -0.08, q: 15, volume: 0.025 },
              { duration: 0.06, end: 150, frequency: 270, pan: -0.08, type: "triangle", volume: 0.027 },
              { delay: 0.012, duration: 0.022, filter: "highpass", frequency: 9800, kind: "noise", pan: 0.12, q: 1, volume: 0.005 },
              { delay: 0.024, duration: 0.052, frequency: 880, pan: 0.14, type: "sine", volume: 0.005 },
            ],
            [
              { duration: 0.016, filter: "bandpass", frequency: 3300, kind: "noise", pan: 0.08, q: 16, volume: 0.023 },
              { duration: 0.058, end: 165, frequency: 315, pan: -0.1, type: "triangle", volume: 0.025 },
              { delay: 0.012, duration: 0.022, filter: "highpass", frequency: 10400, kind: "noise", pan: 0.12, q: 1, volume: 0.0048 },
              { delay: 0.024, duration: 0.05, frequency: 988, pan: 0.16, type: "sine", volume: 0.0048 },
            ],
          ],
        },
        select: {
          master: 0.78,
          layers: [
            [
              { duration: 0.026, filter: "bandpass", frequency: 3100, kind: "noise", volume: 0.017 },
              { delay: 0.006, duration: 0.055, end: 700, frequency: 560, type: "triangle", volume: 0.016 },
            ],
            [
              { duration: 0.024, filter: "bandpass", frequency: 2600, kind: "noise", pan: -0.08, volume: 0.015 },
              { delay: 0.008, duration: 0.05, end: 620, frequency: 460, type: "square", volume: 0.009 },
              { delay: 0.016, duration: 0.055, frequency: 690, type: "sine", volume: 0.009 },
            ],
          ],
        },
        confirm: {
          master: 0.76,
          layers: [
            [
              { duration: 0.035, filter: "highpass", frequency: 6200, kind: "noise", pan: 0.18, volume: 0.012 },
              { duration: 0.08, frequency: 523.25, pan: -0.16, type: "sine", volume: 0.019 },
              { delay: 0.04, duration: 0.1, frequency: 659.25, type: "sine", volume: 0.015 },
              { delay: 0.082, duration: 0.13, frequency: 1046.5, pan: 0.2, type: "sine", volume: 0.011 },
            ],
            [
              { duration: 0.032, filter: "highpass", frequency: 5600, kind: "noise", pan: -0.12, volume: 0.011 },
              { duration: 0.08, frequency: 587.33, pan: -0.12, type: "sine", volume: 0.018 },
              { delay: 0.04, duration: 0.11, frequency: 739.99, type: "sine", volume: 0.014 },
              { delay: 0.088, duration: 0.13, frequency: 1174.66, pan: 0.2, type: "sine", volume: 0.01 },
            ],
          ],
        },
        danger: {
          master: 0.76,
          layers: [
            [
              { duration: 0.07, filter: "lowpass", frequency: 420, kind: "noise", volume: 0.018 },
              { duration: 0.11, end: 82, frequency: 160, type: "sawtooth", volume: 0.017 },
              { delay: 0.07, duration: 0.09, end: 70, frequency: 110, type: "triangle", volume: 0.014 },
            ],
            [
              { duration: 0.065, filter: "lowpass", frequency: 520, kind: "noise", pan: -0.1, volume: 0.016 },
              { duration: 0.1, end: 92, frequency: 180, type: "sawtooth", volume: 0.016 },
              { delay: 0.065, duration: 0.085, end: 64, frequency: 120, type: "triangle", volume: 0.012 },
            ],
          ],
        },
        close: {
          master: 0.72,
          layers: [
            [
              { duration: 0.055, filter: "bandpass", frequency: 1600, kind: "noise", pan: 0.12, volume: 0.014 },
              { duration: 0.09, end: 220, frequency: 640, type: "triangle", volume: 0.014 },
            ],
            [
              { duration: 0.05, filter: "bandpass", frequency: 1200, kind: "noise", pan: -0.1, volume: 0.013 },
              { duration: 0.08, end: 180, frequency: 520, type: "triangle", volume: 0.013 },
            ],
          ],
        },
        quantity: {
          master: 0.8,
          layers: [
            [
              { duration: 0.022, filter: "bandpass", frequency: 4200, kind: "noise", volume: 0.012 },
              { duration: 0.048, end: 900, frequency: 700, type: "triangle", volume: 0.018 },
            ],
            [
              { duration: 0.02, filter: "bandpass", frequency: 5000, kind: "noise", pan: 0.1, volume: 0.011 },
              { duration: 0.042, end: 760, frequency: 520, type: "triangle", volume: 0.017 },
            ],
          ],
        },
        pagination: {
          master: 0.74,
          layers: [
            [
              { duration: 0.055, filter: "bandpass", frequency: 2500, kind: "noise", pan: -0.18, volume: 0.018 },
              { delay: 0.02, duration: 0.06, frequency: 330, pan: -0.1, type: "triangle", volume: 0.014 },
              { delay: 0.055, duration: 0.07, frequency: 494, pan: 0.12, type: "sine", volume: 0.011 },
            ],
            [
              { duration: 0.055, filter: "bandpass", frequency: 3100, kind: "noise", pan: 0.18, volume: 0.017 },
              { delay: 0.02, duration: 0.06, frequency: 370, pan: -0.08, type: "triangle", volume: 0.014 },
              { delay: 0.055, duration: 0.07, frequency: 554, pan: 0.1, type: "sine", volume: 0.011 },
            ],
          ],
        },
        login: {
          master: 0.94,
          layers: [
            [
              { duration: 0.017, filter: "bandpass", frequency: 2900, kind: "noise", pan: -0.12, q: 16, volume: 0.025 },
              { duration: 0.064, end: 155, frequency: 300, pan: -0.12, type: "triangle", volume: 0.027 },
              { delay: 0.012, duration: 0.024, filter: "highpass", frequency: 10800, kind: "noise", pan: 0.16, q: 1, volume: 0.0055 },
              { delay: 0.026, duration: 0.07, frequency: 740, pan: 0.1, type: "sine", volume: 0.007 },
              { delay: 0.062, duration: 0.1, frequency: 988, pan: 0.18, type: "sine", volume: 0.0048 },
            ],
          ],
        },
      };
      const preset = presets[tone];
      const seed = hashString(`${element?.textContent ?? ""}${element?.getAttribute("class") ?? ""}${tone}`);

      if (playAsset(context, tone, seed)) {
        soundCounterRef.current += 1;
        return;
      }

      const fallbackOffset = tone === "hover" ? soundCounterRef.current : 0;
      const layers = preset.layers[(seed + fallbackOffset) % preset.layers.length];
      const compressor = context.createDynamicsCompressor();
      const master = context.createGain();
      const now = context.currentTime;

      soundCounterRef.current += 1;

      master.gain.setValueAtTime(preset.master, now);
      compressor.threshold.setValueAtTime(-30, now);
      compressor.knee.setValueAtTime(18, now);
      compressor.ratio.setValueAtTime(4, now);
      compressor.attack.setValueAtTime(0.004, now);
      compressor.release.setValueAtTime(0.08, now);

      master.connect(compressor);
      compressor.connect(context.destination);

      layers.forEach((layer) => playLayer(context, layer, master, now));
    }

    function onPointerDown(event: PointerEvent) {
      const element = getSoundTarget(event.target);
      if (!element) return;

      playTone(getTone(element), element);
    }

    function onPointerOver(event: PointerEvent) {
      const element = getHoverTarget(event.target);
      if (!element || element === lastHoverTargetRef.current) return;

      const now = performance.now();
      if (now - lastHoverAtRef.current < 180) return;

      lastHoverTargetRef.current = element;
      lastHoverAtRef.current = now;
      playTone("hover", element);
    }

    function onChange(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
      if (target instanceof HTMLInputElement && !["checkbox", "radio", "range"].includes(target.type)) return;

      playTone("select", target);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("change", onChange, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("change", onChange, true);
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  return null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
