import { act, useState } from 'react';
import type { ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LensSessionDraft } from '../../shared/models';
import { emptyLensResponses, lensDefinitions, lensKinds } from '../domain/lenses';
import { m } from '../paraglide/messages.js';
import { LensPanel } from './LensPanel';

const draft: LensSessionDraft = {
  currentLens: 'word',
  responses: { ...emptyLensResponses },
  completedLensIds: [],
  startedAt: '2026-06-07T12:00:00.000Z',
  updatedAt: '2026-06-07T12:00:00.000Z',
};

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

describe('LensPanel', () => {
  it('focuses the prompt field and dismisses with Escape', () => {
    const onDismiss = vi.fn();

    renderPanel({ onDismiss });

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    const form = container.querySelector<HTMLFormElement>('form');

    expect(document.activeElement).toBe(textarea);
    act(() => {
      form?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('submits the current textarea value', () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();

    renderInteractivePanel({ onInputChange, onSubmit });

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    const submitButton = container.querySelector<HTMLButtonElement>('.primary-action');
    expect(submitButton?.textContent).toBe(m.lens_continue());

    act(() => {
      setTextareaValue(textarea!, 'gentle signal');
      textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => submitButton?.click());

    expect(onInputChange).toHaveBeenCalledWith('gentle signal');
    expect(onSubmit).toHaveBeenCalledWith('gentle signal');
  });

  it('uses the final seed action and lets the journey rest', () => {
    const onRest = vi.fn();

    renderPanel({ isLastLens: true, onRest });

    expect(container.querySelector<HTMLButtonElement>('.primary-action')?.textContent).toBe(
      m.lens_make_seed()
    );

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === m.lens_let_it_rest())
        ?.click();
    });

    expect(onRest).toHaveBeenCalledTimes(1);
  });
});

function renderPanel(overrides: Partial<ComponentProps<typeof LensPanel>> = {}) {
  const props: ComponentProps<typeof LensPanel> = {
    draft,
    definition: lensDefinitions.word,
    lensOrder: lensKinds,
    stepNumber: 1,
    isLastLens: false,
    input: '',
    onInputChange: vi.fn(),
    onDismiss: vi.fn(),
    onRest: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };

  act(() => {
    root.render(<LensPanel {...props} />);
  });
}

function renderInteractivePanel(
  overrides: Partial<Omit<ComponentProps<typeof LensPanel>, 'onInputChange'>> & {
    onInputChange: (value: string) => void;
  }
) {
  const props: ComponentProps<typeof LensPanel> = {
    draft,
    definition: lensDefinitions.word,
    lensOrder: lensKinds,
    stepNumber: 1,
    isLastLens: false,
    input: '',
    onDismiss: vi.fn(),
    onRest: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
    onInputChange: overrides.onInputChange,
  };

  function InteractivePanel() {
    const [input, setInput] = useState(props.input);

    return (
      <LensPanel
        draft={props.draft}
        definition={props.definition}
        lensOrder={props.lensOrder}
        stepNumber={props.stepNumber}
        isLastLens={props.isLastLens}
        input={input}
        onDismiss={props.onDismiss}
        onRest={props.onRest}
        onSubmit={props.onSubmit}
        onInputChange={(value) => {
          overrides.onInputChange(value);
          setInput(value);
        }}
      />
    );
  }

  act(() => {
    root.render(<InteractivePanel />);
  });
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
}
