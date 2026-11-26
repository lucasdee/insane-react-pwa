import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import InstallPrompt from '../InstallPrompt';

/** A `beforeinstallprompt` event whose prompt resolves with `outcome`. */
const installEvent = (outcome: 'accepted' | 'dismissed') => {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn(() => Promise.resolve());
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  return { event, prompt };
};

const offerInstall = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
  const install = installEvent(outcome);
  act(() => {
    window.dispatchEvent(install.event);
  });
  return install;
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InstallPrompt', () => {
  it('renders nothing until the browser offers to install', () => {
    const { container } = render(<InstallPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows an install button instead of the browser prompt', () => {
    render(<InstallPrompt />);

    const { event } = offerInstall();

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
  });

  it.each(['accepted', 'dismissed'] as const)(
    'prompts once and hides the button when the user has %s',
    async (outcome) => {
      render(<InstallPrompt />);
      const { prompt } = offerInstall(outcome);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /install app/i }));
      });

      expect(prompt).toHaveBeenCalledOnce();
      expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
      expect(console.log).toHaveBeenCalledWith(`User choice: ${outcome}`);
    },
  );

  it('stops listening when unmounted', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<InstallPrompt />);

    unmount();

    expect(remove).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  });
});
