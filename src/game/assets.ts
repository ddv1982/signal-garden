import type Phaser from 'phaser';
import type { ActiveTheme } from '../domain/theme';
import blinkSleepyUrl from '../assets/companion/frames/blink-sleepy.webp';
import curiousLeanUrl from '../assets/companion/frames/curious-lean.webp';
import groomUrl from '../assets/companion/frames/groom.webp';
import headbuttContactUrl from '../assets/companion/frames/headbutt-contact.webp';
import headbuttWindupUrl from '../assets/companion/frames/headbutt-windup.webp';
import idleSitUrl from '../assets/companion/frames/idle-sit.webp';
import napCurlUrl from '../assets/companion/frames/nap-curl.webp';
import plantProudUrl from '../assets/companion/frames/plant-proud.webp';
import settleBackUrl from '../assets/companion/frames/settle-back.webp';
import sleepingUrl from '../assets/companion/frames/sleeping.webp';
import stretchUrl from '../assets/companion/frames/stretch.webp';
import wakeUrl from '../assets/companion/frames/wake.webp';
import blinkSleepyDarkUrl from '../assets/companion/frames-dark/blink-sleepy.webp';
import curiousLeanDarkUrl from '../assets/companion/frames-dark/curious-lean.webp';
import groomDarkUrl from '../assets/companion/frames-dark/groom.webp';
import headbuttContactDarkUrl from '../assets/companion/frames-dark/headbutt-contact.webp';
import headbuttWindupDarkUrl from '../assets/companion/frames-dark/headbutt-windup.webp';
import idleSitDarkUrl from '../assets/companion/frames-dark/idle-sit.webp';
import napCurlDarkUrl from '../assets/companion/frames-dark/nap-curl.webp';
import plantProudDarkUrl from '../assets/companion/frames-dark/plant-proud.webp';
import settleBackDarkUrl from '../assets/companion/frames-dark/settle-back.webp';
import sleepingDarkUrl from '../assets/companion/frames-dark/sleeping.webp';
import stretchDarkUrl from '../assets/companion/frames-dark/stretch.webp';
import wakeDarkUrl from '../assets/companion/frames-dark/wake.webp';
import gardenBackgroundUrl from '../assets/garden/background-v4.webp';
import gardenBackgroundDarkUrl from '../assets/garden/background-dusk-v3.jpg';
import budUrl from '../assets/garden/props/bud.webp';
import dreamStoneUrl from '../assets/garden/props/dream-stone.webp';
import flowerUrl from '../assets/garden/props/flower.webp';
import lanternUrl from '../assets/garden/props/lantern.webp';
import seedUrl from '../assets/garden/props/seed.webp';
import sproutUrl from '../assets/garden/props/sprout.webp';
import vineUrl from '../assets/garden/props/vine.webp';
import budDarkUrl from '../assets/garden/props-dark/bud.webp';
import dreamStoneDarkUrl from '../assets/garden/props-dark/dream-stone.webp';
import flowerDarkUrl from '../assets/garden/props-dark/flower.webp';
import lanternDarkUrl from '../assets/garden/props-dark/lantern.webp';
import seedDarkUrl from '../assets/garden/props-dark/seed.webp';
import sproutDarkUrl from '../assets/garden/props-dark/sprout.webp';
import vineDarkUrl from '../assets/garden/props-dark/vine.webp';
import actionBasketUrl from '../assets/lenses/props/action-basket.webp';
import bodyRippleUrl from '../assets/lenses/props/body-ripple.webp';
import emotionLanternUrl from '../assets/lenses/props/emotion-lantern.webp';
import imageCloudUrl from '../assets/lenses/props/image-cloud.webp';
import meaningGateUrl from '../assets/lenses/props/meaning-gate.webp';
import observerPoolUrl from '../assets/lenses/props/observer-pool.webp';
import wordStonesUrl from '../assets/lenses/props/word-stones.webp';
import actionBasketDarkUrl from '../assets/lenses/props-dark/action-basket.webp';
import bodyRippleDarkUrl from '../assets/lenses/props-dark/body-ripple.webp';
import emotionLanternDarkUrl from '../assets/lenses/props-dark/emotion-lantern.webp';
import imageCloudDarkUrl from '../assets/lenses/props-dark/image-cloud.webp';
import meaningGateDarkUrl from '../assets/lenses/props-dark/meaning-gate.webp';
import observerPoolDarkUrl from '../assets/lenses/props-dark/observer-pool.webp';
import wordStonesDarkUrl from '../assets/lenses/props-dark/word-stones.webp';

/**
 * Every garden texture by key. Dark-theme variants use the `-dark` suffix
 * convention consumed by textureKeyForTheme().
 */
export const GARDEN_TEXTURE_URLS: Record<string, string> = {
  'garden-background-v4': gardenBackgroundUrl,
  'garden-background-v4-dark': gardenBackgroundDarkUrl,
  'prop-bud': budUrl,
  'prop-dream-stone': dreamStoneUrl,
  'prop-flower': flowerUrl,
  'prop-lantern': lanternUrl,
  'prop-seed': seedUrl,
  'prop-sprout': sproutUrl,
  'prop-vine': vineUrl,
  'prop-bud-dark': budDarkUrl,
  'prop-dream-stone-dark': dreamStoneDarkUrl,
  'prop-flower-dark': flowerDarkUrl,
  'prop-lantern-dark': lanternDarkUrl,
  'prop-seed-dark': seedDarkUrl,
  'prop-sprout-dark': sproutDarkUrl,
  'prop-vine-dark': vineDarkUrl,
  'companion-idle': idleSitUrl,
  'companion-curious': curiousLeanUrl,
  'companion-headbutt-windup': headbuttWindupUrl,
  'companion-headbutt-contact': headbuttContactUrl,
  'companion-settle-back': settleBackUrl,
  'companion-blink-sleepy': blinkSleepyUrl,
  'companion-stretch': stretchUrl,
  'companion-groom': groomUrl,
  'companion-nap-curl': napCurlUrl,
  'companion-sleeping': sleepingUrl,
  'companion-wake': wakeUrl,
  'companion-plant-proud': plantProudUrl,
  'companion-idle-dark': idleSitDarkUrl,
  'companion-curious-dark': curiousLeanDarkUrl,
  'companion-headbutt-windup-dark': headbuttWindupDarkUrl,
  'companion-headbutt-contact-dark': headbuttContactDarkUrl,
  'companion-settle-back-dark': settleBackDarkUrl,
  'companion-blink-sleepy-dark': blinkSleepyDarkUrl,
  'companion-stretch-dark': stretchDarkUrl,
  'companion-groom-dark': groomDarkUrl,
  'companion-nap-curl-dark': napCurlDarkUrl,
  'companion-sleeping-dark': sleepingDarkUrl,
  'companion-wake-dark': wakeDarkUrl,
  'companion-plant-proud-dark': plantProudDarkUrl,
  'lens-word': wordStonesUrl,
  'lens-body': bodyRippleUrl,
  'lens-emotion': emotionLanternUrl,
  'lens-image': imageCloudUrl,
  'lens-observer': observerPoolUrl,
  'lens-meaning': meaningGateUrl,
  'lens-action': actionBasketUrl,
  'lens-word-dark': wordStonesDarkUrl,
  'lens-body-dark': bodyRippleDarkUrl,
  'lens-emotion-dark': emotionLanternDarkUrl,
  'lens-image-dark': imageCloudDarkUrl,
  'lens-observer-dark': observerPoolDarkUrl,
  'lens-meaning-dark': meaningGateDarkUrl,
  'lens-action-dark': actionBasketDarkUrl,
};

export function preloadGardenTextures(load: Phaser.Loader.LoaderPlugin) {
  for (const [key, url] of Object.entries(GARDEN_TEXTURE_URLS)) {
    load.image(key, url);
  }
}

export function textureKeyForTheme(textureKey: string, theme: ActiveTheme) {
  return theme === 'dark' ? `${textureKey}-dark` : textureKey;
}
