export type ThemeMode = {
  name: string;
  accent: string;
  logo: readonly string[];
  logoBackground?: string;
  rain: readonly string[];
};

export const THEME_STORAGE_KEY = 'lifesteal.theme';

export const themeModes: Record<string, ThemeMode> = {
  DEFAULT: {
    name: 'default',
    accent: '#ff304f',
    logo: ['#f7f7f5'],
    rain: ['#ff304f'],
  },
  WHITE: { name: 'white', accent: '#f7f7f5', logo: ['#ffffff'], rain: ['#ffffff'] },
  RED: {
    name: 'red',
    accent: '#ff304f',
    logo: ['#ff304f'],
    rain: ['#ff304f', '#ff6b7f'],
  },
  BLUE: {
    name: 'blue',
    accent: '#2f7cff',
    logo: ['#2f7cff'],
    rain: ['#2f7cff', '#72d7ff'],
  },
  GREEN: {
    name: 'green',
    accent: '#2de37b',
    logo: ['#2de37b'],
    rain: ['#2de37b', '#a4ffbf'],
  },
  PINK: {
    name: 'pink',
    accent: '#ff4fa7',
    logo: ['#ff4fa7'],
    rain: ['#ff4fa7', '#ff9bd0'],
  },
  PURPLE: {
    name: 'purple',
    accent: '#a855f7',
    logo: ['#a855f7'],
    rain: ['#a855f7', '#d7a6ff'],
  },
  ORANGE: {
    name: 'orange',
    accent: '#ff7a1a',
    logo: ['#ff7a1a'],
    rain: ['#ff7a1a', '#ffc067'],
  },
  YELLOW: {
    name: 'yellow',
    accent: '#ffd400',
    logo: ['#ffd400'],
    rain: ['#ffd400', '#fff09a'],
  },
  CYAN: {
    name: 'cyan',
    accent: '#24d8ff',
    logo: ['#24d8ff'],
    rain: ['#24d8ff', '#b6f6ff'],
  },
  MAGENTA: {
    name: 'magenta',
    accent: '#ff2ed1',
    logo: ['#ff2ed1'],
    rain: ['#ff2ed1', '#ff9aea'],
  },
  GAY: {
    name: 'gay',
    accent: '#26ceaa',
    logo: ['#078d70', '#26ceaa', '#98e8c1', '#ffffff', '#7bade2', '#5049cc', '#3d1a78'],
    logoBackground:
      'linear-gradient(180deg, #078d70 0%, #078d70 14.28%, #26ceaa 14.28%, #26ceaa 28.56%, #98e8c1 28.56%, #98e8c1 42.84%, #ffffff 42.84%, #ffffff 57.12%, #7bade2 57.12%, #7bade2 71.4%, #5049cc 71.4%, #5049cc 85.68%, #3d1a78 85.68%, #3d1a78 100%)',
    rain: ['#078d70', '#26ceaa', '#98e8c1', '#ffffff', '#7bade2', '#5049cc', '#3d1a78'],
  },
  LESBIAN: {
    name: 'lesbian',
    accent: '#d362a4',
    logo: ['#d52d00', '#ff9a56', '#ffffff', '#d362a4', '#a30262'],
    logoBackground:
      'linear-gradient(180deg, #d52d00 0%, #d52d00 20%, #ff9a56 20%, #ff9a56 40%, #ffffff 40%, #ffffff 60%, #d362a4 60%, #d362a4 80%, #a30262 80%, #a30262 100%)',
    rain: ['#d52d00', '#ff9a56', '#ffffff', '#d362a4', '#a30262'],
  },
  PAN: {
    name: 'pansexual',
    accent: '#ff218c',
    logo: ['#ff218c', '#ffd800', '#21b1ff'],
    logoBackground:
      'linear-gradient(180deg, #ff218c 0%, #ff218c 33.333%, #ffd800 33.333%, #ffd800 66.666%, #21b1ff 66.666%, #21b1ff 100%)',
    rain: ['#ff218c', '#ffd800', '#21b1ff'],
  },
  BI: {
    name: 'bisexual',
    accent: '#d60270',
    logo: ['#d60270', '#9b4f96', '#0038a8'],
    logoBackground:
      'linear-gradient(180deg, #d60270 0%, #d60270 40%, #9b4f96 40%, #9b4f96 60%, #0038a8 60%, #0038a8 100%)',
    rain: ['#d60270', '#9b4f96', '#0038a8'],
  },
  TRANS: {
    name: 'transgender',
    accent: '#5bcefa',
    logo: ['#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa'],
    logoBackground:
      'linear-gradient(180deg, #5bcefa 0%, #5bcefa 20%, #f5a9b8 20%, #f5a9b8 40%, #ffffff 40%, #ffffff 60%, #f5a9b8 60%, #f5a9b8 80%, #5bcefa 80%, #5bcefa 100%)',
    rain: ['#5bcefa', '#f5a9b8', '#ffffff'],
  },
  INTERSEX: {
    name: 'intersex',
    accent: '#7902aa',
    logo: ['#ffd800', '#7902aa', '#ffd800'],
    logoBackground:
      'radial-gradient(circle at 50% 50%, transparent 0%, transparent 20%, #7902aa 20.5%, #7902aa 30%, transparent 30.5%), #ffd800',
    rain: ['#ffd800', '#7902aa'],
  },
  RAINBOW: {
    name: 'rainbow',
    accent: '#e40303',
    logo: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'],
    logoBackground:
      'linear-gradient(180deg, #e40303 0%, #e40303 16.666%, #ff8c00 16.666%, #ff8c00 33.333%, #ffed00 33.333%, #ffed00 50%, #008026 50%, #008026 66.666%, #24408e 66.666%, #24408e 83.333%, #732982 83.333%, #732982 100%)',
    rain: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'],
  },
  ABORIGINAL: {
    name: 'aboriginal',
    accent: '#dd0000',
    logo: ['#000000', '#dd0000', '#ffcf00'],
    logoBackground:
      'radial-gradient(circle at 50% 50%, #ffcf00 0%, #ffcf00 17%, transparent 17.5%), linear-gradient(180deg, #000000 0%, #000000 50%, #dd0000 50%, #dd0000 100%)',
    rain: ['#000000', '#dd0000', '#ffcf00'],
  },
};

const aliases: Record<string, string> = {
  PANSEXUAL: 'PAN',
  BISEXUAL: 'BI',
  TRANSGENDER: 'TRANS',
  LGBT: 'RAINBOW',
  INDIGENOUS: 'ABORIGINAL',
  GREY: 'WHITE',
  GRAY: 'WHITE',
};

export function resolveThemeCommand(value: string): ThemeMode | undefined {
  const submitted = value.trim().toUpperCase();
  return themeModes[aliases[submitted] ?? submitted];
}

export function findThemeByName(name: string | null): ThemeMode {
  return Object.values(themeModes).find((mode) => mode.name === name) ?? themeModes.DEFAULT;
}

export function applyTheme(mode: ThemeMode, persist = true): void {
  const root = document.documentElement;
  root.dataset.theme = mode.name;
  root.style.setProperty('--accent', mode.accent);
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode.name);
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
    // Keep the default palette when storage is unavailable.
  }
  const mode = findThemeByName(stored);
  applyTheme(mode, false);
  return mode;
}
