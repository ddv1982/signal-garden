import type { ReflectionSeed } from '../../shared/models';
import type { ActiveTheme } from '../domain/theme';
import { growthIndexForSeed } from '../domain/seedDisplay';
import seedUrl from '../assets/garden/props/seed.webp';
import sproutUrl from '../assets/garden/props/sprout.webp';
import budUrl from '../assets/garden/props/bud.webp';
import flowerUrl from '../assets/garden/props/flower.webp';
import seedDarkUrl from '../assets/garden/props-dark/seed.webp';
import sproutDarkUrl from '../assets/garden/props-dark/sprout.webp';
import budDarkUrl from '../assets/garden/props-dark/bud.webp';
import flowerDarkUrl from '../assets/garden/props-dark/flower.webp';

const stageArt: Record<ActiveTheme, [string, string, string, string]> = {
  light: [seedUrl, sproutUrl, budUrl, flowerUrl],
  dark: [seedDarkUrl, sproutDarkUrl, budDarkUrl, flowerDarkUrl],
};

type SeedStageArtProps = {
  /** Resolves the stage from the seed; omit and pass stageIndex for a fixed stage. */
  seed?: ReflectionSeed;
  stageIndex?: number;
  theme: ActiveTheme;
};

/** Garden growth-stage illustration; decorative, the stage is named in adjacent text. */
export function SeedStageArt({ seed, stageIndex = 0, theme }: SeedStageArtProps) {
  const index = seed ? growthIndexForSeed(seed) : stageIndex;
  return (
    <img className="seed-stage-art" src={stageArt[theme][Math.max(0, Math.min(3, index))]} alt="" />
  );
}
