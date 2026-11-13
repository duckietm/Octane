import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ handler: null as ((event: unknown) => void) | null, open: vi.fn(), faq: 'habbopages/mysterybox/faq' as string }));

vi.mock('../../../../api', () => ({
    ColorUtils: { int2rgb: (value: number) => `rgb(${value})` },
    GetOptionalConfigurationValue: () => mocks.faq,
    LocalizeText: (key: string) => key,
    OpenUrl: mocks.open
}));

vi.mock('../../../../hooks', () => ({
    useOctaneEvent: (_type: unknown, handler: (event: unknown) => void) => {
        mocks.handler = handler;
    }
}));

vi.mock('../../../../common/native-text/NativeTextTree', () => ({ NativeTextTree: ({ children }: { children: unknown }) => children }));

import { act } from 'react';
import { MysteryBoxExtensionView } from './MysteryBoxExtensionView';

const show = (boxColor: string, keyColor: string) => act(() => mocks.handler?.({ boxColor, keyColor }));

describe('MysteryBoxExtensionView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        mocks.open.mockClear();
        mocks.faq = 'habbopages/mysterybox/faq';
        window.localStorage.clear();
    });

    it('stays hidden until the server names a colour', () => {
        const { container } = render(<MysteryBoxExtensionView />);

        expect(container.firstChild).toBeNull();

        show('red', 'blue');

        expect(container.querySelector('.octane-mysterybox-tracker')).not.toBeNull();
        expect(container.querySelectorAll('.octane-mysterybox-tracker__base')).toHaveLength(2);
    });

    it('opens the explanation from its link', () => {
        render(<MysteryBoxExtensionView />);
        show('red', 'blue');
        fireEvent.click(screen.getByRole('button', { name: 'mysterybox.tracker.link' }));

        expect(mocks.open).toHaveBeenCalledWith('habbopages/mysterybox/faq');
    });

    it('hides the link when the hotel empties the setting', () => {
        mocks.faq = '';
        render(<MysteryBoxExtensionView />);
        show('red', 'blue');

        expect(screen.queryByRole('button', { name: 'mysterybox.tracker.link' })).toBeNull();
    });

    it('minimises to its title bar with the small box and key, and remembers it', () => {
        const { container, unmount } = render(<MysteryBoxExtensionView />);

        show('red', 'blue');
        fireEvent.click(screen.getByRole('button', { name: 'mysterybox.tracker.title' }));

        expect(container.querySelector('.octane-mysterybox-tracker__body')).toBeNull();
        expect(container.querySelectorAll('.octane-mysterybox-tracker__small')).toHaveLength(2);

        unmount();

        const again = render(<MysteryBoxExtensionView />);

        show('red', 'blue');

        expect(again.container.querySelector('.octane-mysterybox-tracker.is-minimised')).not.toBeNull();
    });
});
