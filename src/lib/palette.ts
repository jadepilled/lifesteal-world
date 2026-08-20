import sharp from 'sharp';
import type { Palette } from './schema';

type Rgb = { r: number; g: number; b: number };

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const hex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, '0')).join('')}`;
const mix = (left: Rgb, right: Rgb, ratio: number): Rgb => ({
  r: left.r + (right.r - left.r) * ratio,
  g: left.g + (right.g - left.g) * ratio,
  b: left.b + (right.b - left.b) * ratio,
});
const luminance = (colour: Rgb) => {
  const channels = [colour.r, colour.g, colour.b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const saturation = (colour: Rgb) => {
  const values = [colour.r, colour.g, colour.b].map((value) => value / 255);
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max === min ? 0 : (max - min) / (1 - Math.abs(max + min - 1));
};
const average = (colours: Rgb[]): Rgb => {
  const total = colours.reduce(
    (sum, colour) => ({ r: sum.r + colour.r, g: sum.g + colour.g, b: sum.b + colour.b }),
    { r: 0, g: 0, b: 0 },
  );
  const count = Math.max(colours.length, 1);
  return { r: total.r / count, g: total.g / count, b: total.b / count };
};

export function relativeLuminance(value: string): number {
  const clean = value.replace('#', '');
  return luminance({
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  });
}

export function contrastRatio(left: string, right: string): number {
  const light = Math.max(relativeLuminance(left), relativeLuminance(right));
  const dark = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (light + 0.05) / (dark + 0.05);
}

export async function extractPalette(input: Buffer | string): Promise<Palette> {
  const image = await sharp(input).resize(72, 72, { fit: 'inside' }).removeAlpha().raw().toBuffer();
  const colours: Rgb[] = [];
  for (let index = 0; index < image.length; index += 3) {
    colours.push({ r: image[index], g: image[index + 1], b: image[index + 2] });
  }
  colours.sort((left, right) => luminance(left) - luminance(right));
  const slice = Math.max(8, Math.floor(colours.length * 0.08));
  let background = mix(average(colours.slice(0, slice)), { r: 0, g: 0, b: 0 }, 0.72);
  const rankedAccents = [...colours]
    .filter((colour) => luminance(colour) > 0.12)
    .sort(
      (left, right) =>
        saturation(right) * 0.72 +
        luminance(right) * 0.28 -
        (saturation(left) * 0.72 + luminance(left) * 0.28),
    );
  let accent = average(rankedAccents.slice(0, Math.max(6, Math.floor(slice / 2))));
  if (contrastRatio(hex(accent), hex(background)) < 3)
    accent = mix(accent, { r: 255, g: 255, b: 255 }, 0.42);
  if (luminance(background) > 0.08) background = mix(background, { r: 0, g: 0, b: 0 }, 0.5);
  const foreground = contrastRatio('#f8f6f1', hex(background)) >= 4.5 ? '#f8f6f1' : '#000000';

  return {
    background: hex(background),
    surface: hex(mix(background, { r: 255, g: 255, b: 255 }, 0.075)),
    foreground,
    accent: hex(accent),
    glow: hex(mix(accent, { r: 255, g: 255, b: 255 }, 0.2)),
  };
}
