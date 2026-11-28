import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

vi.mock('../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'show.google.ads' ? true : fallback),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));
vi.mock('../../common', () => ({
    OctaneCardContentView: () => null,
    OctaneCardHeaderView: () => null,
    OctaneCardView: () => <div data-testid="desktop-ads" />
}));
vi.mock('../../secure-assets', () => ({ configFileUrl: (name: string) => `/configuration/${name}` }));

const { GoogleAdsView } = await import('./GoogleAdsView');

const fetchSpy = vi.fn(() => new Promise<Response>(() => {}));

beforeEach(() => {
    vi.useFakeTimers();
    fetchSpy.mockClear();
    vi.stubGlobal('fetch', fetchSpy);
    const container = document.createElement('div');
    container.id = 'draggable-windows-container';
    document.body.appendChild(container);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('GoogleAdsView on a phone', () => {
    it('opens as a card with the same loading and closes from its 44 px button', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        render(<GoogleAdsView />);
        act(() => vi.advanceTimersByTime(600));

        const card = screen.getByTestId('google-ads-card');

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(card.textContent).toContain('Loading…');
        expect(screen.queryByTestId('desktop-ads')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));

        expect(screen.queryByTestId('google-ads-card')).toBeNull();
    });

    it('keeps the desktop window off a phone', () => {
        render(<GoogleAdsView />);
        act(() => vi.advanceTimersByTime(600));

        expect(screen.getByTestId('desktop-ads')).toBeInTheDocument();
        expect(screen.queryByTestId('google-ads-card')).toBeNull();
    });
});
