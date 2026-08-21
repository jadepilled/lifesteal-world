import { describe, expect, it } from 'vitest';
import {
  COLOUR_CATALOGUE_SIZE,
  findThemeByName,
  logoBackground,
  resolveThemeCommand,
} from '../src/lib/theme';

describe('terminal theme commands', () => {
  it('uses the green palette when no saved command exists', () => {
    const theme = findThemeByName(null);
    expect(theme.name).toBe('green');
    expect(theme.accent).toBe('#2de37b');
  });

  it('preserves ordered and repeated colours in custom gradients', () => {
    const theme = resolveThemeCommand('red red blue green red');
    expect(theme?.accent).toBe('#ff304f');
    expect(theme?.logo).toEqual(['#ff304f', '#ff304f', '#2f7cff', '#2de37b', '#ff304f']);
    expect(logoBackground(theme!)).toContain('#2de37b 75%');
  });

  it('accepts expanded colour names while keeping pride aliases intact', () => {
    expect(resolveThemeCommand('lavender mint')?.logo).toEqual(['#c5a3ff', '#74f2ce']);
    expect(resolveThemeCommand('bisexual')?.name).toBe('bisexual');
    expect(resolveThemeCommand('indigenous')?.name).toBe('aboriginal');
  });

  it('loads every unique name from the supplied colour catalogue', () => {
    expect(COLOUR_CATALOGUE_SIZE).toBe(1295);
    expect(resolveThemeCommand('absolute zero')?.accent).toBe('#0048ba');
    expect(resolveThemeCommand('robin egg blue')?.accent).toBe('#00cccc');
    expect(resolveThemeCommand('st patricks blue')?.accent).toBe('#23297a');
  });

  it('treats LIGHT and DARK as per-colour modifiers in gradients', () => {
    const theme = resolveThemeCommand('light blue dark red light robin egg blue');
    expect(theme?.logo).toHaveLength(3);
    expect(theme?.logo[0]).not.toBe(resolveThemeCommand('blue')?.accent);
    expect(theme?.logo[1]).not.toBe(resolveThemeCommand('red')?.accent);
    expect(theme?.logo[2]).not.toBe(resolveThemeCommand('robin egg blue')?.accent);
    expect(theme?.accent).toMatch(/^#[0-9a-f]{6}$/);
  });
});
