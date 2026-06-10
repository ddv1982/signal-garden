import type Phaser from 'phaser';
import type { ActiveTheme } from '../domain/theme';
import blinkSleepyUrl from '../assets/companion/frames/blink-sleepy.png';
import curiousLeanUrl from '../assets/companion/frames/curious-lean.png';
import groomUrl from '../assets/companion/frames/groom.png';
import headbuttContactUrl from '../assets/companion/frames/headbutt-contact.png';
import headbuttWindupUrl from '../assets/companion/frames/headbutt-windup.png';
import idleSitUrl from '../assets/companion/frames/idle-sit.png';
import napCurlUrl from '../assets/companion/frames/nap-curl.png';
import plantProudUrl from '../assets/companion/frames/plant-proud.png';
import settleBackUrl from '../assets/companion/frames/settle-back.png';
import sleepingUrl from '../assets/companion/frames/sleeping.png';
import stretchUrl from '../assets/companion/frames/stretch.png';
import wakeUrl from '../assets/companion/frames/wake.png';
import blinkSleepyDarkUrl from '../assets/companion/frames-dark/blink-sleepy.png';
import curiousLeanDarkUrl from '../assets/companion/frames-dark/curious-lean.png';
import groomDarkUrl from '../assets/companion/frames-dark/groom.png';
import headbuttContactDarkUrl from '../assets/companion/frames-dark/headbutt-contact.png';
import headbuttWindupDarkUrl from '../assets/companion/frames-dark/headbutt-windup.png';
import idleSitDarkUrl from '../assets/companion/frames-dark/idle-sit.png';
import napCurlDarkUrl from '../assets/companion/frames-dark/nap-curl.png';
import plantProudDarkUrl from '../assets/companion/frames-dark/plant-proud.png';
import settleBackDarkUrl from '../assets/companion/frames-dark/settle-back.png';
import sleepingDarkUrl from '../assets/companion/frames-dark/sleeping.png';
import stretchDarkUrl from '../assets/companion/frames-dark/stretch.png';
import wakeDarkUrl from '../assets/companion/frames-dark/wake.png';
import gardenBackgroundUrl from '../assets/garden/background-v4.webp';
import gardenBackgroundDarkUrl from '../assets/garden/background-dusk-v3.jpg';
import budUrl from '../assets/garden/props/bud.png';
import dreamStoneUrl from '../assets/garden/props/dream-stone.png';
import flowerUrl from '../assets/garden/props/flower.png';
import lanternUrl from '../assets/garden/props/lantern.png';
import seedUrl from '../assets/garden/props/seed.png';
import soilPatchUrl from '../assets/garden/props/soil-patch.png';
import sproutUrl from '../assets/garden/props/sprout.png';
import vineUrl from '../assets/garden/props/vine.png';
import budDarkUrl from '../assets/garden/props-dark/bud.png';
import dreamStoneDarkUrl from '../assets/garden/props-dark/dream-stone.png';
import flowerDarkUrl from '../assets/garden/props-dark/flower.png';
import lanternDarkUrl from '../assets/garden/props-dark/lantern.png';
import seedDarkUrl from '../assets/garden/props-dark/seed.png';
import soilPatchDarkUrl from '../assets/garden/props-dark/soil-patch.png';
import sproutDarkUrl from '../assets/garden/props-dark/sprout.png';
import vineDarkUrl from '../assets/garden/props-dark/vine.png';
import actionBasketUrl from '../assets/lenses/props/action-basket.png';
import bodyRippleUrl from '../assets/lenses/props/body-ripple.png';
import emotionLanternUrl from '../assets/lenses/props/emotion-lantern.png';
import imageCloudUrl from '../assets/lenses/props/image-cloud.png';
import meaningGateUrl from '../assets/lenses/props/meaning-gate.png';
import observerPoolUrl from '../assets/lenses/props/observer-pool.png';
import wordStonesUrl from '../assets/lenses/props/word-stones.png';
import actionBasketDarkUrl from '../assets/lenses/props-dark/action-basket.png';
import bodyRippleDarkUrl from '../assets/lenses/props-dark/body-ripple.png';
import emotionLanternDarkUrl from '../assets/lenses/props-dark/emotion-lantern.png';
import imageCloudDarkUrl from '../assets/lenses/props-dark/image-cloud.png';
import meaningGateDarkUrl from '../assets/lenses/props-dark/meaning-gate.png';
import observerPoolDarkUrl from '../assets/lenses/props-dark/observer-pool.png';
import wordStonesDarkUrl from '../assets/lenses/props-dark/word-stones.png';

/**
 * Every garden texture by key. Dark-theme variants use the `-dark` suffix
 * convention consumed by textureKeyForTheme().
 */
const GARDEN_TEXTURE_URLS: Record<string, string> = {
  'garden-background-v4': gardenBackgroundUrl,
  'garden-background-v4-dark': gardenBackgroundDarkUrl,
  'prop-bud': budUrl,
  'prop-dream-stone': dreamStoneUrl,
  'prop-flower': flowerUrl,
  'prop-lantern': lanternUrl,
  'prop-seed': seedUrl,
  'prop-soil-patch': soilPatchUrl,
  'prop-sprout': sproutUrl,
  'prop-vine': vineUrl,
  'prop-bud-dark': budDarkUrl,
  'prop-dream-stone-dark': dreamStoneDarkUrl,
  'prop-flower-dark': flowerDarkUrl,
  'prop-lantern-dark': lanternDarkUrl,
  'prop-seed-dark': seedDarkUrl,
  'prop-soil-patch-dark': soilPatchDarkUrl,
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
