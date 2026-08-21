import { describe, expect, it } from 'vitest';
import { findThemeByName, logoBackground, resolveThemeCommand } from '../src/lib/theme';

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
});
