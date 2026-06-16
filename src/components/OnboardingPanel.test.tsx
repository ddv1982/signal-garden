import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPanel } from './OnboardingPanel';

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });
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

describe('OnboardingPanel accessibility', () => {
  it('marks sibling content inert while the modal onboarding panel is mounted', () => {
    act(() => {
      root.render(
        <>
          <button type="button">Behind the panel</button>
          <OnboardingPanel onComplete={vi.fn()} />
        </>
      );
    });

    const behindButton = container.querySelector<HTMLButtonElement>('button');
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');

    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(behindButton?.inert).toBe(true);
    expect(behindButton?.getAttribute('aria-hidden')).toBe('true');

    act(() => root.unmount());

    expect(behindButton?.inert).toBe(false);
    expect(behindButton?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('keeps Tab focus inside the onboarding form', () => {
    act(() => {
      root.render(<OnboardingPanel onComplete={vi.fn()} />);
    });

    const panel = container.querySelector<HTMLFormElement>('.onboarding-panel');
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])')
    );
    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    expect(document.activeElement).toBe(panel);

    firstElement.focus();
    act(() => {
      firstElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      );
    });
    expect(document.activeElement).toBe(lastElement);

    act(() => {
      lastElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(firstElement);
  });
});
