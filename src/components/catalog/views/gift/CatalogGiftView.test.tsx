/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
    uiHandler: null as null | ((event: unknown) => void),
    friends: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Alan' },
        { id: 3, name: 'Bob' },
        { id: -1, name: 'Hidden' }
    ],
    configuration: { boxTypes: [1, 2], ribbonTypes: [1, 2], stuffTypes: [], defaultStuffTypes: [3], price: 0, isWrappingEnabled: true }
}));

vi.mock('../../../../hooks', () => ({
    useFriends: () => ({ friends: hooks.friends }),
    useGiftConfiguration: () => ({ data: hooks.configuration, refetch: vi.fn() }),
    useCatalogActions: () => ({ resetPlacedOfferData: vi.fn() }),
    useCatalogUiState: () => ({ setGiftReceiver: vi.fn() }),
    useNotification: () => ({ showConfirm: vi.fn(), simpleAlert: vi.fn() }),
    useMessageEvent: () => undefined,
    useUiEvent: (_types: unknown, handler: (event: unknown) => void) => {
        hooks.uiHandler = handler;
    }
}));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback ?? '',
    HasSessionPermission: () => false
}));

vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutAvatarImageView: () => null,
    LayoutFurniImageView: () => null
}));

import { CatalogEvent } from '../../../../events';
import { CatalogGiftView } from './CatalogGiftView';

const open = () => act(() => hooks.uiHandler?.({ type: CatalogEvent.INIT_GIFT, pageId: 1, offerId: 2, extraData: '', receiverName: '' }));
const recipient = () => screen.getByRole('combobox');

describe('CatalogGiftView recipient autocomplete', () => {
    beforeEach(() => {
        hooks.uiHandler = null;
    });

    afterEach(() => cleanup());

    it('suggests matching friends while typing and fills the name from a pick', async () => {
        render(<CatalogGiftView />);
        open();

        fireEvent.focus(recipient());
        fireEvent.change(recipient(), { target: { value: 'al' } });

        await waitFor(() => expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Alice', 'Alan']));

        fireEvent.pointerDown(screen.getAllByRole('option')[1]);
        fireEvent.click(screen.getAllByRole('option')[1]);

        await waitFor(() => expect(recipient()).toHaveValue('Alan'));
        expect(screen.queryByRole('option')).toBeNull();
    });

    it('takes the first suggestion on Enter when nothing is highlighted', async () => {
        render(<CatalogGiftView />);
        open();

        fireEvent.change(recipient(), { target: { value: 'bo' } });
        await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));

        fireEvent.keyDown(recipient(), { key: 'Enter' });

        await waitFor(() => expect(recipient()).toHaveValue('Bob'));
    });

    it('lists the friends on ArrowDown from an empty field and hides the list on Tab', async () => {
        render(<CatalogGiftView />);
        open();

        fireEvent.keyDown(recipient(), { key: 'ArrowDown' });
        await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));

        fireEvent.keyDown(recipient(), { key: 'Tab' });
        await waitFor(() => expect(screen.queryByRole('option')).toBeNull());
    });
});
