import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigatorUiStore } from '../../../../hooks';
import { NavigatorSearchView } from './NavigatorSearchView';

const sendMessageComposer = vi.fn();

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        SendMessageComposer: (composer: unknown) => sendMessageComposer(composer)
    };
});

vi.mock('../../../../hooks', async () => {
    const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');

    return {
        ...actual,
        useNavigatorData: () => ({ topLevelContext: { code: 'hotel_view' } })
    };
});

beforeEach(() => {
    useNavigatorUiStore.setState({ currentTabCode: 'hotel_view', currentFilter: '' });
});

afterEach(() => {
    cleanup();
    sendMessageComposer.mockReset();
});

describe('NavigatorSearchView', () => {
    it('searches when Enter is pressed in the field', () => {
        render(<NavigatorSearchView searchResult={null} />);

        const input = screen.getByRole('textbox');

        fireEvent.change(input, { target: { value: 'noeltje' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(useNavigatorUiStore.getState().currentFilter).toBe('noeltje');
    });

    it('searches again when Enter repeats the search already on screen', () => {
        useNavigatorUiStore.setState({ currentFilter: 'noeltje' });
        render(<NavigatorSearchView searchResult={null} />);

        const input = screen.getByRole('textbox');

        fireEvent.change(input, { target: { value: 'noeltje' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(sendMessageComposer).toHaveBeenCalledTimes(1);
    });

    it('does not search while an input method is composing', () => {
        render(<NavigatorSearchView searchResult={null} />);

        const input = screen.getByRole('textbox');

        fireEvent.change(input, { target: { value: 'noeltje' } });
        fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

        expect(useNavigatorUiStore.getState().currentFilter).toBe('');
    });
});
