import { useEffect, useRef } from 'react';
import type { GardenState, LensKind, ReflectionSeed } from '../../shared/models';
import { gardenAccessibilityLabel } from '../domain/accessibilityCopy';
import {
  createGardenGame,
  type GardenGameHandle,
  type PetFrameId,
  type PetSequenceId
} from '../game/GardenGame';

type GardenCanvasProps = {
  state: GardenState;
  reducedMotion: boolean;
  pendingSeed: ReflectionSeed | null;
  currentLens: LensKind | null;
  lensSessionActive: boolean;
  petDebug: boolean;
  lastWateringEvent: { seedId: string; eventId: string } | null;
  onPetTapped: () => void;
  onSeedSelected: (seed: ReflectionSeed) => void;
  onSignalRequested: () => void;
  onLensObjectSelected: (kind: LensKind) => void;
  onPendingSeedPlanted: (position: { plotId: string; x: number; y: number }) => void;
  onCanvasWidthChange: (width: number) => void;
};

type GardenCanvasCallbacks = Pick<
  GardenCanvasProps,
  'onPetTapped' | 'onSeedSelected' | 'onSignalRequested' | 'onLensObjectSelected' | 'onPendingSeedPlanted'
>;

const petDebugFrames: Array<{ id: PetFrameId; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'blinkSleepy', label: 'Blink' },
  { id: 'curious', label: 'Curious' },
  { id: 'headbuttWindup', label: 'Windup' },
  { id: 'headbuttContact', label: 'Contact' },
  { id: 'settleBack', label: 'Settle' },
  { id: 'stretch', label: 'Stretch' },
  { id: 'groom', label: 'Groom' },
  { id: 'napCurl', label: 'Nap' },
  { id: 'sleeping', label: 'Sleep' },
  { id: 'wake', label: 'Wake' },
  { id: 'plantProud', label: 'Proud' }
];

const petDebugSequences: Array<{ id: PetSequenceId; label: string }> = [
  { id: 'attention', label: 'Attention' },
  { id: 'headButt', label: 'Head-butt' },
  { id: 'stretch', label: 'Stretch' },
  { id: 'groom', label: 'Groom' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'wake', label: 'Wake' },
  { id: 'plantProud', label: 'Plant proud' }
];

export function GardenCanvas({
  state,
  reducedMotion,
  pendingSeed,
  currentLens,
  lensSessionActive,
  petDebug,
  lastWateringEvent,
  onPetTapped,
  onSeedSelected,
  onSignalRequested,
  onLensObjectSelected,
  onPendingSeedPlanted,
  onCanvasWidthChange
}: GardenCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GardenGameHandle | null>(null);
  const callbacksRef = useRef<GardenCanvasCallbacks>({
    onPetTapped,
    onSeedSelected,
    onSignalRequested,
    onLensObjectSelected,
    onPendingSeedPlanted
  });

  callbacksRef.current = {
    onPetTapped,
    onSeedSelected,
    onSignalRequested,
    onLensObjectSelected,
    onPendingSeedPlanted
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let previousWidth = 0;
    const reportWidth = (width: number) => {
      const roundedWidth = Math.round(width);
      if (roundedWidth > 0 && roundedWidth !== previousWidth) {
        previousWidth = roundedWidth;
        onCanvasWidthChange(roundedWidth);
      }
    };

    reportWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) reportWidth(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [onCanvasWidthChange]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    containerRef.current.replaceChildren();
    gameRef.current = createGardenGame({
      parent: containerRef.current,
      state,
      reducedMotion,
      pendingSeed,
      currentLens,
      lensSessionActive,
      petDebug,
      lastWateringEvent,
      onPetTapped: () => callbacksRef.current.onPetTapped(),
      onSeedSelected: (seed) => callbacksRef.current.onSeedSelected(seed),
      onSignalRequested: () => callbacksRef.current.onSignalRequested(),
      onLensObjectSelected: (kind) => callbacksRef.current.onLensObjectSelected(kind),
      onPendingSeedPlanted: (position) => callbacksRef.current.onPendingSeedPlanted(position)
    });

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
      containerRef.current?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    gameRef.current?.update(state, reducedMotion, pendingSeed, currentLens, lensSessionActive, lastWateringEvent);
  }, [state, reducedMotion, pendingSeed, currentLens, lensSessionActive, lastWateringEvent]);

  return (
    <>
      <div
        ref={containerRef}
        className="garden-canvas"
        data-testid="garden-canvas"
        data-watered-seed={lastWateringEvent?.seedId ?? undefined}
        data-watering-event={lastWateringEvent?.eventId ?? undefined}
        role="img"
        aria-label={gardenAccessibilityLabel(state.seeds.length)}
      />
      {petDebug && (
        <div className="pet-debug-panel" data-testid="pet-debug-panel" aria-label="Pet animation debug controls">
          <div>
            <strong>Freeze pose</strong>
            <div>
              {petDebugFrames.map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  data-testid={`pet-debug-frame-${frame.id}`}
                  onClick={() => gameRef.current?.previewPetFrame(frame.id)}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <strong>Play sequence</strong>
            <div>
              {petDebugSequences.map((sequence) => (
                <button
                  key={sequence.id}
                  type="button"
                  data-testid={`pet-debug-sequence-${sequence.id}`}
                  onClick={() => gameRef.current?.previewPetSequence(sequence.id)}
                >
                  {sequence.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
