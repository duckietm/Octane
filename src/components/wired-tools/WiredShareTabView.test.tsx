/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    sent: [] as unknown[],
    handlers: new Map<unknown, (event: unknown) => void>(),
    showConfirm: vi.fn(),
    canModify: true
}));

vi.mock('@octane/renderer', () => {
    class Recording {
        args: unknown[];
        constructor(...args: unknown[]) {
            this.args = args;
        }
    }
    class WiredSetupExportComposer extends Recording {}
    class WiredSetupImportComposer extends Recording {}
    class WiredSetupExportResultEvent {}
    class WiredSetupImportResultEvent {}

    return {
        GetSessionDataManager: () => ({ getFloorItemDataByName: (name: string) => ({ name: `Furni ${name}` }) }),
        WiredSetupExportComposer,
        WiredSetupImportComposer,
        WiredSetupExportResultEvent,
        WiredSetupImportResultEvent
    };
});

vi.mock('../../api', async () => {
    const share = await vi.importActual<typeof import('../../api/wired/WiredSetupShare')>('../../api/wired/WiredSetupShare');

    return {
        ...share,
        CopyToClipboard: vi.fn(async () => true),
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string, keys: string[] = null, values: string[] = null) =>
            (keys ?? []).reduce((text, key, index) => text.replace(`%${key}%`, values?.[index] ?? ''), fallback),
        SendMessageComposer: (composer: unknown) => mocks.sent.push(composer)
    };
});

vi.mock('../../api/utils/localizeWithFallback', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../common', () => ({
    Button: ({ children, classNames: _classNames, variant: _variant, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { classNames?: string[]; variant?: string }>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useNotification: () => ({ showConfirm: mocks.showConfirm }),
    useRoom: () => ({ roomSession: { roomId: 12 } }),
    useWiredTools: () => ({ roomSettings: { isLoaded: true, canModify: mocks.canModify } })
}));

import { act } from 'react';
import { WiredSetupExportResultEvent, WiredSetupImportResultEvent } from '@octane/renderer';
import { WiredShareTabView } from './WiredShareTabView';

const emit = (type: unknown, parser: unknown) => act(() => mocks.handlers.get(type)?.({ getParser: () => parser }));

describe('WiredShareTabView', () => {
    beforeEach(() => {
        mocks.sent.length = 0;
        mocks.handlers.clear();
        mocks.showConfirm.mockReset();
        mocks.canModify = true;
    });

    afterEach(cleanup);

    it('asks for a code and shows the one the server sends', () => {
        render(<WiredShareTabView />);

        fireEvent.click(screen.getByText('Make code'));
        expect((mocks.sent[0] as { args: unknown[] }).args).toEqual([1]);

        emit(WiredSetupExportResultEvent, { status: 0, boxCount: 3, code: 'OWS1:abc' });
        expect(screen.getByLabelText('Wired code')).toHaveProperty('value', 'OWS1:abc');
        expect(screen.getByText('3 wired boxes in this code.')).toBeTruthy();
    });

    it('shows why a code could not be made', () => {
        render(<WiredShareTabView />);

        emit(WiredSetupExportResultEvent, { status: 2, boxCount: 0, code: '' });
        expect(screen.getByText('There is no wired in this room.')).toBeTruthy();
    });

    it('previews first and imports only after the confirm', () => {
        render(<WiredShareTabView />);

        const importButton = screen.getByText('Import') as HTMLButtonElement;
        fireEvent.change(screen.getByLabelText('Wired code to import'), { target: { value: ' OWS1:ab\ncd ' } });
        expect(importButton.disabled).toBe(true);

        fireEvent.click(screen.getByText('Preview'));
        expect((mocks.sent[0] as { args: unknown[] }).args).toEqual(['OWS1:abcd', 1, false, false]);

        emit(WiredSetupImportResultEvent, {
            report: {
                confirmed: false,
                status: 0,
                anchorX: 1,
                anchorY: 2,
                total: 1,
                configured: 1,
                placed: 0,
                missing: 0,
                refused: 0,
                entries: [{ index: 0, type: 'wf_act_give_score', holder: 'ACTION', x: 1, y: 2, status: 1, itemId: 5, reason: '' }]
            }
        });
        expect(screen.getByText('Furni wf_act_give_score')).toBeTruthy();
        expect(importButton.disabled).toBe(false);

        fireEvent.click(importButton);
        expect(mocks.showConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.sent).toHaveLength(1);

        act(() => mocks.showConfirm.mock.calls[0][1]());
        expect((mocks.sent[1] as { args: unknown[] }).args).toEqual(['OWS1:abcd', 1, false, true]);
    });

    it('sends nothing without the modify right', () => {
        mocks.canModify = false;
        render(<WiredShareTabView />);

        fireEvent.click(screen.getByText('Make code'));
        expect(mocks.sent).toHaveLength(0);
    });
});
