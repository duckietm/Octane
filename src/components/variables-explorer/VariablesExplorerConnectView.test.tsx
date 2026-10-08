import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as explorer from '../../api/wired/variablesExplorer';
import * as webApi from '../../api/wired/variablesWebApi';

const fetchMock = vi.fn();

vi.mock('../../api', async () => {
    const actualExplorer = await vi.importActual<typeof explorer>('../../api/wired/variablesExplorer');
    const actualWebApi = await vi.importActual<typeof webApi>('../../api/wired/variablesWebApi');

    return {
        ...actualExplorer,
        ...actualWebApi,
        createVariablesWebApiClient: (options: Parameters<typeof actualWebApi.createVariablesWebApiClient>[0]) =>
            actualWebApi.createVariablesWebApiClient({ ...options, fetchImpl: fetchMock as unknown as typeof fetch }),
        GetWebApiHotels: () => [{ name: 'Main hotel', url: 'https://main.example' }],
        localizeWithFallback: (_key: string, fallback: string) => fallback
    };
});

vi.mock('../../common', () => ({
    Button: ({ children, disabled, onClick }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    DraggableWindowPosition: { TOP_LEFT: 'top-left' },
    OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <div>{headerText}</div>,
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

import { VariablesExplorerConnectView } from './VariablesExplorerConnectView';

const KEY = 'k'.repeat(43);

describe('VariablesExplorerConnectView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        fetchMock.mockReset();
        try {
            window.localStorage.clear();
        } catch {}
    });

    it('shows the connect form like the official explorer', () => {
        render(<VariablesExplorerConnectView prefill={null} onConnected={vi.fn()} onClose={vi.fn()} />);

        expect(screen.getByText('Connect to a room')).toBeInTheDocument();
        expect(screen.getByText('Browse and manage variables and variable holders in your room, making use of the Variables Web API.')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Main hotel' })).toBeInTheDocument();
    });

    it('does not call the hotel while the form is incomplete', () => {
        const onConnected = vi.fn();

        render(<VariablesExplorerConnectView prefill={null} onConnected={onConnected} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open explorer' }));

        expect(screen.getByText('Enter a room id')).toBeInTheDocument();
        expect(screen.getByText('Enter a read key or a write key')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(onConnected).not.toHaveBeenCalled();
    });

    it('connects with the prefilled room and key', async () => {
        const onConnected = vi.fn();
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ variables: [] }), { status: 200 }));

        render(<VariablesExplorerConnectView prefill={{ roomId: 88, readKey: KEY }} onConnected={onConnected} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open explorer' }));

        await waitFor(() => expect(onConnected).toHaveBeenCalledWith({ hotelUrl: 'https://main.example', roomId: 88, readKey: KEY, writeKey: '' }, []));
        expect(fetchMock.mock.calls[0][0]).toBe('https://main.example/api/public/rooms/88/variables/definitions');
        expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)['X-Wired-Read-Key']).toBe(KEY);
        expect(window.localStorage.length).toBe(0);
    });

    it('shows the server error when the key is refused', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'wired.variables.key_invalid' }), { status: 403 }));

        render(<VariablesExplorerConnectView prefill={{ roomId: 88, writeKey: KEY }} onConnected={vi.fn()} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open explorer' }));

        expect(await screen.findByText('The key was not accepted.')).toBeInTheDocument();
    });
});
