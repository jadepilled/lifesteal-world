export type ThemeMode = {
  name: string;
  command: string;
  accent: string;
  logo: readonly string[];
  logoBackground?: string;
  rain: readonly string[];
};

export const THEME_STORAGE_KEY = 'lifesteal.theme';
export const THEME_ACCENT_STORAGE_KEY = 'lifesteal.accent';
export const THEME_BACKGROUND_STORAGE_KEY = 'lifesteal.logoBackground';

const solid = (command: string, name: string, color: string, rain: readonly string[] = [color]) =>
  ({
    command,
    name,
    accent: color,
    logo: [color],
    rain,
  }) satisfies ThemeMode;

export const themeModes: Record<string, ThemeMode> = {
  WHITE: solid('WHITE', 'white', '#f7f7f5'),
  RED: solid('RED', 'red', '#ff304f', ['#ff304f', '#ff6b7f']),
  BLUE: solid('BLUE', 'blue', '#2f7cff', ['#2f7cff', '#72d7ff']),
  GREEN: solid('GREEN', 'green', '#2de37b', ['#2de37b', '#a4ffbf']),
  PINK: solid('PINK', 'pink', '#ff4fa7', ['#ff4fa7', '#ff9bd0']),
  PURPLE: solid('PURPLE', 'purple', '#a855f7', ['#a855f7', '#d7a6ff']),
  ORANGE: solid('ORANGE', 'orange', '#ff7a1a', ['#ff7a1a', '#ffc067']),
  YELLOW: solid('YELLOW', 'yellow', '#ffd400', ['#ffd400', '#fff09a']),
  CYAN: solid('CYAN', 'cyan', '#24d8ff', ['#24d8ff', '#b6f6ff']),
  MAGENTA: solid('MAGENTA', 'magenta', '#ff2ed1', ['#ff2ed1', '#ff9aea']),
  GAY: {
    name: 'gay',
    command: 'GAY',
    accent: '#26ceaa',
    logo: ['#078d70', '#26ceaa', '#98e8c1', '#ffffff', '#7bade2', '#5049cc', '#3d1a78'],
    logoBackground:
      'linear-gradient(180deg, #078d70 0%, #078d70 14.28%, #26ceaa 14.28%, #26ceaa 28.56%, #98e8c1 28.56%, #98e8c1 42.84%, #ffffff 42.84%, #ffffff 57.12%, #7bade2 57.12%, #7bade2 71.4%, #5049cc 71.4%, #5049cc 85.68%, #3d1a78 85.68%, #3d1a78 100%)',
    rain: ['#078d70', '#26ceaa', '#98e8c1', '#ffffff', '#7bade2', '#5049cc', '#3d1a78'],
  },
  LESBIAN: {
    name: 'lesbian',
    command: 'LESBIAN',
    accent: '#d362a4',
    logo: ['#d52d00', '#ff9a56', '#ffffff', '#d362a4', '#a30262'],
    logoBackground:
      'linear-gradient(180deg, #d52d00 0%, #d52d00 20%, #ff9a56 20%, #ff9a56 40%, #ffffff 40%, #ffffff 60%, #d362a4 60%, #d362a4 80%, #a30262 80%, #a30262 100%)',
    rain: ['#d52d00', '#ff9a56', '#ffffff', '#d362a4', '#a30262'],
  },
  PAN: {
    name: 'pansexual',
    command: 'PAN',
    accent: '#ff218c',
    logo: ['#ff218c', '#ffd800', '#21b1ff'],
    logoBackground:
      'linear-gradient(180deg, #ff218c 0%, #ff218c 33.333%, #ffd800 33.333%, #ffd800 66.666%, #21b1ff 66.666%, #21b1ff 100%)',
    rain: ['#ff218c', '#ffd800', '#21b1ff'],
  },
  BI: {
    name: 'bisexual',
    command: 'BI',
    accent: '#d60270',
    logo: ['#d60270', '#9b4f96', '#0038a8'],
    logoBackground:
      'linear-gradient(180deg, #d60270 0%, #d60270 40%, #9b4f96 40%, #9b4f96 60%, #0038a8 60%, #0038a8 100%)',
    rain: ['#d60270', '#9b4f96', '#0038a8'],
  },
  TRANS: {
    name: 'transgender',
    command: 'TRANS',
    accent: '#5bcefa',
    logo: ['#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa'],
    logoBackground:
      'linear-gradient(180deg, #5bcefa 0%, #5bcefa 20%, #f5a9b8 20%, #f5a9b8 40%, #ffffff 40%, #ffffff 60%, #f5a9b8 60%, #f5a9b8 80%, #5bcefa 80%, #5bcefa 100%)',
    rain: ['#5bcefa', '#f5a9b8', '#ffffff'],
  },
  INTERSEX: {
    name: 'intersex',
    command: 'INTERSEX',
    accent: '#7902aa',
    logo: ['#ffd800', '#7902aa', '#ffd800'],
    logoBackground:
      'radial-gradient(circle at 50% 50%, transparent 0%, transparent 20%, #7902aa 20.5%, #7902aa 30%, transparent 30.5%), #ffd800',
    rain: ['#ffd800', '#7902aa'],
  },
  RAINBOW: {
    name: 'rainbow',
    command: 'RAINBOW',
    accent: '#e40303',
    logo: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'],
    logoBackground:
      'linear-gradient(180deg, #e40303 0%, #e40303 16.666%, #ff8c00 16.666%, #ff8c00 33.333%, #ffed00 33.333%, #ffed00 50%, #008026 50%, #008026 66.666%, #24408e 66.666%, #24408e 83.333%, #732982 83.333%, #732982 100%)',
    rain: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'],
  },
  ABORIGINAL: {
    name: 'aboriginal',
    command: 'ABORIGINAL',
    accent: '#dd0000',
    logo: ['#000000', '#dd0000', '#ffcf00'],
    logoBackground:
      'radial-gradient(circle at 50% 50%, #ffcf00 0%, #ffcf00 17%, transparent 17.5%), linear-gradient(180deg, #000000 0%, #000000 50%, #dd0000 50%, #dd0000 100%)',
    rain: ['#000000', '#dd0000', '#ffcf00'],
  },
};

const colourTokens: Record<string, string> = {
  WHITE: '#f7f7f5',
  BLACK: '#050505',
  RED: '#ff304f',
  CRIMSON: '#dc143c',
  SCARLET: '#ff2400',
  CORAL: '#ff6f61',
  ORANGE: '#ff7a1a',
  AMBER: '#ffbf00',
  GOLD: '#ffd700',
  YELLOW: '#ffd400',
  LIME: '#a8ff2d',
  GREEN: '#2de37b',
  EMERALD: '#00a86b',
  MINT: '#74f2ce',
  TEAL: '#18b7a0',
  CYAN: '#24d8ff',
  AQUA: '#00ffff',
  SKY: '#72d7ff',
  BLUE: '#2f7cff',
  NAVY: '#123a8c',
  INDIGO: '#4b42c3',
  PURPLE: '#a855f7',
  VIOLET: '#8f42ff',
  LAVENDER: '#c5a3ff',
  MAGENTA: '#ff2ed1',
  PINK: '#ff4fa7',
  ROSE: '#ff668f',
  PEACH: '#ffb38a',
};

const aliases: Record<string, string> = {
  DEFAULT: 'GREEN',
  BISEXUAL: 'BI',
  PANSEXUAL: 'PAN',
  TRANSGENDER: 'TRANS',
  LGBT: 'RAINBOW',
  PRIDE: 'RAINBOW',
  INDIGENOUS: 'ABORIGINAL',
  GREY: 'WHITE',
  GRAY: 'WHITE',
};

const makeGradient = (colors: readonly string[]) => {
  if (colors.length === 1) return `linear-gradient(90deg, ${colors[0]}, ${colors[0]})`;
  return `linear-gradient(90deg, ${colors
    .map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`)
    .join(', ')})`;
};

export function logoBackground(mode: ThemeMode): string {
  return mode.logoBackground ?? makeGradient(mode.logo);
}

const modeByName = (value: string) =>
  Object.values(themeModes).find((mode) => mode.name.toUpperCase() === value.toUpperCase());

export function resolveThemeCommand(value: string): ThemeMode | undefined {
  const submitted = value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!submitted) return undefined;
  const alias = aliases[submitted] ?? submitted;
  const named = themeModes[alias] ?? modeByName(alias);
  if (named) return named;

  const tokens = submitted.split(' ');
  const colors = tokens.map((token) => colourTokens[aliases[token] ?? token]);
  if (colors.some((color) => !color)) return undefined;
  const resolved = colors as string[];
  return {
    name: tokens.length === 1 ? tokens[0]!.toLowerCase() : 'custom-gradient',
    command: submitted,
    accent: resolved[0]!,
    logo: resolved,
    logoBackground: makeGradient(resolved),
    rain: resolved,
  };
}

export function findThemeByName(name: string | null): ThemeMode {
  if (!name) return themeModes.GREEN!;
  return resolveThemeCommand(name) ?? themeModes.GREEN!;
}

export function applyTheme(mode: ThemeMode, persist = true): void {
  const root = document.documentElement;
  root.dataset.theme = mode.name;
  root.style.setProperty('--accent', mode.accent);
  root.style.setProperty('--site-logo-background', logoBackground(mode));
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode.command);
      localStorage.setItem(THEME_ACCENT_STORAGE_KEY, mode.accent);
      localStorage.setItem(THEME_BACKGROUND_STORAGE_KEY, logoBackground(mode));
    } catch {
      // A denied storage write should not stop the visual theme from changing.
    }
  }
  window.dispatchEvent(new CustomEvent('lifesteal:theme', { detail: mode }));
}

export function applyStoredTheme(): ThemeMode {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Keep the BI palette when storage is unavailable.
  }
  const mode = findThemeByName(stored);
  applyTheme(mode, false);
  try {
    localStorage.setItem(THEME_ACCENT_STORAGE_KEY, mode.accent);
    localStorage.setItem(THEME_BACKGROUND_STORAGE_KEY, logoBackground(mode));
  } catch {
    // The resolved theme still applies when storage cannot be updated.
  }
  return mode;
}

export function resetTheme(): ThemeMode {
  const mode = themeModes.GREEN!;
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.setItem(THEME_ACCENT_STORAGE_KEY, mode.accent);
    localStorage.setItem(THEME_BACKGROUND_STORAGE_KEY, logoBackground(mode));
  } catch {
    // Reset still applies when storage is unavailable.
  }
  applyTheme(mode, false);
  return mode;
}
