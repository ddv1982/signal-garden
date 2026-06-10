import type { PetFrameId, PetSequenceId } from '../game/GardenGame';

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
  { id: 'plantProud', label: 'Proud' },
];

const petDebugSequences: Array<{ id: PetSequenceId; label: string }> = [
  { id: 'attention', label: 'Attention' },
  { id: 'headButt', label: 'Head-butt' },
  { id: 'stretch', label: 'Stretch' },
  { id: 'groom', label: 'Groom' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'wake', label: 'Wake' },
  { id: 'plantProud', label: 'Plant proud' },
];

type PetDebugPanelProps = {
  onPreviewFrame: (frame: PetFrameId) => void;
  onPreviewSequence: (sequence: PetSequenceId) => void;
};

export function PetDebugPanel({ onPreviewFrame, onPreviewSequence }: PetDebugPanelProps) {
  return (
    <div
      className="pet-debug-panel"
      data-testid="pet-debug-panel"
      aria-label="Pet animation debug controls"
    >
      <div>
        <strong>Freeze pose</strong>
        <div>
          {petDebugFrames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              data-testid={`pet-debug-frame-${frame.id}`}
              onClick={() => onPreviewFrame(frame.id)}
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
              onClick={() => onPreviewSequence(sequence.id)}
            >
              {sequence.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
