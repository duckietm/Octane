import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const copyToClipboard = vi.fn(async (_text: string) => true);
const openUrl = vi.fn();
const showSingleBubble = vi.fn();
let docsLink = '';
let trigger: { stringData: string; intData: number[] } | null = null;

vi.mock('../../../../api', () => ({
    CopyToClipboard: (text: string) => copyToClipboard(text),
    GetConfigurationValue: (key: string, fallback: string) => (key === 'wired.api.docs.link' ? docsLink : fallback),
    localizeWithFallback: (key: string, fallback: string) => fallback,
    NotificationBubbleType: { INFO: 'info' },
    OpenUrl: (url: string) => openUrl(url),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useNotification: () => ({ showSingleBubble }),
    useWired: () => ({ trigger, setIntParams: vi.fn(), setStringParam: vi.fn() }),
    useWiredTools: () => ({ roomVariableDefinitions: [] })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../layout', () => ({
    OctaneInput: (props: { value: string }) => <input readOnly value={props.value} />
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children }: PropsWithChildren) => <div>{children}</div>
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: () => <div data-testid="variable-picker" />
}));

import { WiredExtraVariableWebApiView } from './WiredExtraVariableWebApiView';

describe('WiredExtraVariableWebApiView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        copyToClipboard.mockClear();
        openUrl.mockClear();
        showSingleBubble.mockClear();
        docsLink = '';
        trigger = { stringData: 'score\tREAD-KEY\tWRITE-KEY', intData: [1] };
    });

    it('copies the read key and the write key to the clipboard', async () => {
        render(<WiredExtraVariableWebApiView />);

        const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
        expect(copyButtons).toHaveLength(2);

        fireEvent.click(copyButtons[0]);
        fireEvent.click(copyButtons[1]);
        await Promise.resolve();

        expect(copyToClipboard).toHaveBeenNthCalledWith(1, 'READ-KEY');
        expect(copyToClipboard).toHaveBeenNthCalledWith(2, 'WRITE-KEY');
    });

    it('tells the owner the key was copied', async () => {
        render(<WiredExtraVariableWebApiView />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Copy' })[0]);

        await waitFor(() => expect(showSingleBubble).toHaveBeenCalledTimes(1));
        expect(showSingleBubble.mock.calls[0][0]).toBe('API key copied to clipboard');
    });

    it('offers no copy buttons before the server has minted keys', () => {
        trigger = { stringData: 'score', intData: [0] };

        render(<WiredExtraVariableWebApiView />);

        expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
    });

    it('links to the API documentation when the hotel configures one', () => {
        docsLink = 'https://docs.example.test/wired-api';

        render(<WiredExtraVariableWebApiView />);

        fireEvent.click(screen.getByRole('button', { name: 'API documentation' }));

        expect(openUrl).toHaveBeenCalledWith('https://docs.example.test/wired-api');
    });

    it('hides the documentation link when the hotel has none', () => {
        render(<WiredExtraVariableWebApiView />);

        expect(screen.queryByRole('button', { name: 'API documentation' })).toBeNull();
    });
});
