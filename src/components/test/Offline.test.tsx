import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Offline from '../Offline';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Offline', () => {
  it('explains that the app is offline', () => {
    render(<Offline />);

    expect(screen.getByRole('heading', { name: /offline mode/i })).toBeInTheDocument();
    expect(screen.getByText('Please check your internet connection.')).toBeInTheDocument();
  });

  it('reloads the page on "Try Again"', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(<Offline />);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(reload).toHaveBeenCalledOnce();
  });
});
