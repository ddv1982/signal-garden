import type { LensKind } from '../../shared/models';

export type LensLighting = {
  glowColor: number;
  focusColor: number;
  moteColor: number;
  inactiveAlpha: number;
  activeAlpha: number;
  glowWidth: number;
  glowHeight: number;
  focusWidth: number;
  focusHeight: number;
  focusYOffset: number;
};

export const DARK_LENS_LIGHTING: Record<LensKind, LensLighting> = {
  word: {
    glowColor: 0xb8d5c9,
    focusColor: 0xf0e6c9,
    moteColor: 0xe6dcc8,
    inactiveAlpha: 0.04,
    activeAlpha: 0.108,
    glowWidth: 0.78,
    glowHeight: 0.32,
    focusWidth: 0.72,
    focusHeight: 0.24,
    focusYOffset: 0.18,
  },
  body: {
    glowColor: 0x9ed7df,
    focusColor: 0xd5f0ed,
    moteColor: 0xd0e9ec,
    inactiveAlpha: 0.048,
    activeAlpha: 0.124,
    glowWidth: 0.9,
    glowHeight: 0.34,
    focusWidth: 0.9,
    focusHeight: 0.24,
    focusYOffset: 0.16,
  },
  emotion: {
    glowColor: 0xf0b875,
    focusColor: 0xffd69a,
    moteColor: 0xffdec0,
    inactiveAlpha: 0.056,
    activeAlpha: 0.145,
    glowWidth: 0.68,
    glowHeight: 0.42,
    focusWidth: 0.62,
    focusHeight: 0.3,
    focusYOffset: 0.18,
  },
  image: {
    glowColor: 0xc8cfe0,
    focusColor: 0xeee5ee,
    moteColor: 0xe4d9e8,
    inactiveAlpha: 0.04,
    activeAlpha: 0.1,
    glowWidth: 0.86,
    glowHeight: 0.34,
    focusWidth: 0.78,
    focusHeight: 0.26,
    focusYOffset: 0.17,
  },
  observer: {
    glowColor: 0x95d2dc,
    focusColor: 0xd4eeeb,
    moteColor: 0xcae8eb,
    inactiveAlpha: 0.044,
    activeAlpha: 0.112,
    glowWidth: 0.9,
    glowHeight: 0.32,
    focusWidth: 0.84,
    focusHeight: 0.24,
    focusYOffset: 0.16,
  },
  meaning: {
    glowColor: 0xc3d8bd,
    focusColor: 0xe6e8c7,
    moteColor: 0xdbe5bd,
    inactiveAlpha: 0.044,
    activeAlpha: 0.116,
    glowWidth: 0.74,
    glowHeight: 0.42,
    focusWidth: 0.68,
    focusHeight: 0.3,
    focusYOffset: 0.18,
  },
  action: {
    glowColor: 0xebc58b,
    focusColor: 0xf6d9a4,
    moteColor: 0xf7dfb4,
    inactiveAlpha: 0.044,
    activeAlpha: 0.116,
    glowWidth: 0.78,
    glowHeight: 0.34,
    focusWidth: 0.7,
    focusHeight: 0.25,
    focusYOffset: 0.17,
  },
};
