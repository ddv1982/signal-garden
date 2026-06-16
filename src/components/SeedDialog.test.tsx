import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReflectionSeed } from '../../shared/models';
import { SeedDialog } from './SeedDialog';

const seed: ReflectionSeed = {
  id: 'seed-1',
  createdAt: '2026-06-06T12:00:00.000Z',
  labelText: 'A sharp thought',
  emotions: [],
  bodySignals: [],
  values: [],
  dreams: [],
  tinyAction: 'Take one breath.',
  status: 'planted',
  visualType: 'seed',
};

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });

  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('SeedDialog accessibility', () => {
  it('moves focus and selection through tabs with arrow, Home, and End keys', () => {
    act(() => {
      root.render(
        <SeedDialog seed={seed} onClose={vi.fn()} onWater={() => null} onBloom={() => null} />
      );
    });

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    tabs[0].focus();
    act(() => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);

    act(() => {
      tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[2]);

    act(() => {
      tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[0]);
  });
});
