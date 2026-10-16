import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWebApiBoxParams, canAllowBulkDelete, expandLocalizedText, parseWebApiBoxParams } from '../../../../api/wired/WiredWebApi';

const mocks = vi.hoisted(() => ({
    copyToClipboard: vi.fn(async (_text: string) => true),
    openUrl: vi.fn(),
    send: vi.fn(),
    showSingleBubble: vi.fn(),
    showConfirm: vi.fn(),
    setIntParams: vi.fn(),
    setStringParam: vi.fn(),
    openExplorer: vi.fn(),
    handlers: [] as Array<(event: unknown) => void>,
    isOwner: true,
    save: null as null | (() => void)
}));

let trigger: { id: number; stringData: string; intData: number[] } | null = null;

vi.mock('../../../../api', () => ({
    buildWebApiBoxParams,
    canAllowBulkDelete,
    CopyToClipboard: (text: string) => mocks.copyToClipboard(text),
    expandLocalizedText,
    GetRoomSession: () => ({ roomId: 321 }),
    GetWebApiDocsUrl: () => 'https://hotel.example/api/public/api-docs/',
    IsOwnerOfFloorFurniture: () => mocks.isOwner,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    NotificationBubbleType: { INFO: 'info' },
    OpenUrl: (url: string) => mocks.openUrl(url),
    parseWebApiBoxParams,
    SendMessageComposer: (composer: unknown) => mocks.send(composer),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useMessageEvent: (_type: unknown, handler: (event: unknown) => void) => {
        mocks.handlers.push(handler);
    },
    useNotification: () => ({ showSingleBubble: mocks.showSingleBubble, showConfirm: mocks.showConfirm }),
    useWired: () => ({ trigger, setIntParams: mocks.setIntParams, setStringParam: mocks.setStringParam })
}));

vi.mock('../../../../state/variablesExplorer', () => ({
    useVariablesExplorerStore: (selector: (state: { open: typeof mocks.openExplorer }) => unknown) => selector({ open: mocks.openExplorer })
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, footer, save }: PropsWithChildren<{ footer?: ReactNode; save: () => void }>) => {
        mocks.save = save;

        return (
            <div>
                {children}
                {footer}
            </div>
        );
    }
}));

import { WiredExtraVariableWebApiView } from './WiredExtraVariableWebApiView';

const READ = 'r'.repeat(43);
const WRITE = 'w'.repeat(43);

const deliverKey = (itemId: number, isReadKey: boolean, key: string) =>
    act(() => {
        for (const handler of mocks.handlers) handler({ getParser: () => ({ itemId, isReadKey, key }) });
    });

const bulkDeleteBox = () => screen.getByRole('checkbox');

describe('WiredExtraVariableWebApiView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.handlers.length = 0;
        mocks.isOwner = true;
        trigger = { id: 55, stringData: `${READ}\t${WRITE}`, intData: [0] };
    });

    it('shows both keys read-only and copies them with the bubble', async () => {
        render(<WiredExtraVariableWebApiView />);

        expect(screen.getByLabelText('Read key')).toHaveValue(READ);
        expect(screen.getByLabelText('Write key')).toHaveAttribute('readonly');

        fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[1]);

        await waitFor(() => expect(mocks.showSingleBubble).toHaveBeenCalledWith('Successfully copied API key to clipboard', 'info'));
        expect(mocks.copyToClipboard).toHaveBeenCalledWith(WRITE);
    });

    it('asks the server for a key and shows the one it sends back for this box only', () => {
        trigger = { id: 55, stringData: '', intData: [] };
        render(<WiredExtraVariableWebApiView />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Generate' })[0]);

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect((mocks.send.mock.calls[0][0] as { getMessageArray: () => unknown[] }).getMessageArray()).toEqual([55, true]);

        deliverKey(99, true, 'other-box');
        expect(screen.getByLabelText('Read key')).toHaveValue('');

        deliverKey(55, true, READ);
        expect(screen.getByLabelText('Read key')).toHaveValue(READ);
        expect(screen.getAllByRole('button', { name: 'Regenerate' })).toHaveLength(1);
    });

    it('does not let someone else generate keys', () => {
        mocks.isOwner = false;
        render(<WiredExtraVariableWebApiView />);

        expect(screen.getAllByRole('button', { name: 'Regenerate' })[0]).toBeDisabled();
    });

    it('saves the kept keys and clears a cleared one', () => {
        trigger = { id: 55, stringData: `${READ}\t${WRITE}`, intData: [1] };
        render(<WiredExtraVariableWebApiView />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Clear' })[0]);
        act(() => mocks.save());

        expect(mocks.setStringParam).toHaveBeenCalledWith(`\t*`);
        expect(mocks.setIntParams).toHaveBeenCalledWith([1]);
    });

    it('turns bulk delete off and disables it when the write key is cleared', () => {
        trigger = { id: 55, stringData: `${READ}\t${WRITE}`, intData: [1] };
        render(<WiredExtraVariableWebApiView />);

        expect(bulkDeleteBox()).toBeChecked();

        fireEvent.click(screen.getAllByRole('button', { name: 'Clear' })[1]);

        expect(bulkDeleteBox()).not.toBeChecked();
        expect(bulkDeleteBox()).toHaveAttribute('aria-disabled', 'true');

        act(() => mocks.save());
        expect(mocks.setIntParams).toHaveBeenCalledWith([0]);
    });

    it('only enables bulk delete after the warning is confirmed', () => {
        render(<WiredExtraVariableWebApiView />);

        fireEvent.click(bulkDeleteBox());

        expect(bulkDeleteBox()).not.toBeChecked();
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.showConfirm.mock.calls[0][5]).toBe('Are you sure?');

        act(() => mocks.showConfirm.mock.calls[0][1]());

        expect(bulkDeleteBox()).toBeChecked();
    });

    it('opens the docs and the explorer for this room with the keys', () => {
        render(<WiredExtraVariableWebApiView />);

        fireEvent.click(screen.getByRole('button', { name: 'Open API documentation' }));
        fireEvent.click(screen.getByRole('button', { name: 'Open explorer' }));

        expect(mocks.openUrl).toHaveBeenCalledWith('https://hotel.example/api/public/api-docs/');
        expect(mocks.openExplorer).toHaveBeenCalledWith({ roomId: 321, readKey: READ, writeKey: WRITE });
    });
});
