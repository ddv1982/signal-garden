import { describe, expect, it } from 'vitest';
import { GARDEN_TEXTURE_URLS, textureKeyForTheme } from '../assets';
import { DARK_LENS_LIGHTING } from '../lensLighting';
import { PET_FRAME_TEXTURES } from '../petAnimation';

// GardenScene draws props with no procedural fallback, so a missing texture
// would render Phaser's missing-texture frame. These are the base keys the
// scene requests directly (background, landmark props, seed growth stages).
const SCENE_TEXTURE_KEYS = [
  'garden-background-v4',
  'prop-lantern',
  'prop-vine',
  'prop-dream-stone',
  'prop-seed',
  'prop-sprout',
  'prop-bud',
  'prop-flower',
];

const requiredKeys = [
  ...SCENE_TEXTURE_KEYS,
  ...Object.keys(DARK_LENS_LIGHTING).map((kind) => `lens-${kind}`),
  ...Object.values(PET_FRAME_TEXTURES),
];

describe('garden texture coverage', () => {
  it('bundles a light variant for every texture the scene requests', () => {
    for (const key of requiredKeys) {
      expect(GARDEN_TEXTURE_URLS[textureKeyForTheme(key, 'light')], key).toBeTruthy();
    }
  });

  it('bundles a dark variant for every texture the scene requests', () => {
    for (const key of requiredKeys) {
      const darkKey = textureKeyForTheme(key, 'dark');
      expect(GARDEN_TEXTURE_URLS[darkKey], darkKey).toBeTruthy();
    }
  });

  it('keeps every bundled texture reachable from a scene request', () => {
    const reachable = new Set(
      requiredKeys.flatMap((key) => [
        textureKeyForTheme(key, 'light'),
        textureKeyForTheme(key, 'dark'),
      ])
    );
    const orphaned = Object.keys(GARDEN_TEXTURE_URLS).filter((key) => !reachable.has(key));
    expect(orphaned).toEqual([]);
  });
});
