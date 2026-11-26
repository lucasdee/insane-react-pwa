import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useOnlineStatus from '../useOnlineStatus';

const setOnLine = (value: boolean) =>
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(value);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOnlineStatus', () => {
  it.each([true, false])('starts with navigator.onLine (%s)', (online) => {
    setOnLine(online);

    expect(renderHook(() => useOnlineStatus()).result.current).toBe(online);
  });

  it('follows the offline and online events', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('stops listening when unmounted', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
