/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../test-utils/selectOption';
import { MONITOR_ERROR_INFO, MONITOR_LOG_ORDER } from './WiredCreatorTools.constants';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    handlers: [] as Array<(event: any) => void>
}));

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string, parameters?: string[], replacements?: string[]) =>
        (parameters ?? []).reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements?.[index] ?? ''), fallback),
    SendMessageComposer: mocks.send
}));

vi.mock('../../common', () => ({
    Button: ({ children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    DraggableWindowPosition: { TOP_LEFT: 'top-left' },
    OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText, onCloseClick }: { headerText: string; onCloseClick: () => void }) => (
        <div>
            <span>{headerText}</span>
            <button type="button" onClick={onCloseClick}>
                close
            </button>
        </div>
    ),
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../hooks', () => ({
    useMessageEvent: (_eventType: unknown, handler: (event: any) => void) => {
        mocks.handlers.push(handler);
    }
}));

import { WiredRoomLogsView } from './WiredRoomLogsView';

const deliverPage = (page: { totalEntries: number; currentPage: number; entries: any[]; logLevelFilter?: number; logSourceFilter?: number; query?: string }) => {
    const parser = { logLevelFilter: -1, logSourceFilter: -1, query: '', ...page };

    act(() => {
        for (const handler of mocks.handlers) handler({ getParser: () => parser });
    });
};

const entry = (id: number, level: number, source: number, message: string) => ({
    id,
    logLevel: level,
    logSource: source,
    logMessage: message,
    timestamp: 1000 * id,
    timestampStr: `21/09/2026 07:0${id}:00`
});

describe('WiredRoomLogsView', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.handlers.length = 0;
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('asks for the first unfiltered page on open and lists what comes back', () => {
        render(<WiredRoomLogsView onClose={() => undefined} />);

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual([1, 50, -1, -1, '']);

        deliverPage({ totalEntries: 2, currentPage: 1, entries: [entry(1, 0, 6, 'nothing to move'), entry(2, 1, 4, 'chain killed')] });

        expect(screen.getByText('nothing to move')).toBeTruthy();
        expect(screen.getByText('chain killed')).toBeTruthy();
        expect(screen.getByText('2 found. Showing page')).toBeTruthy();
        expect(screen.getByText('of 1')).toBeTruthy();
    });

    it('shows a write-to-logs line under its own source and at its own level', () => {
        render(<WiredRoomLogsView onClose={() => undefined} />);

        deliverPage({ totalEntries: 2, currentPage: 1, entries: [entry(1, 0, 8, 'door opened'), entry(2, 3, 8, 'boss escaped')] });

        expect(screen.getAllByText('WIRED_LOG').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('DEBUG').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('ERROR').length).toBeGreaterThanOrEqual(1);
    });

    it('a filter change asks for page 1 with the new filters and the page echoes them back into the menus', () => {
        render(<WiredRoomLogsView onClose={() => undefined} />);
        deliverPage({ totalEntries: 0, currentPage: 1, entries: [] });
        mocks.send.mockClear();
        vi.advanceTimersByTime(400);

        const [sourceSelect, levelSelect] = screen.getAllByRole('combobox');

        selectOption(levelSelect, 'INFO');

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual([1, 50, 1, -1, '']);

        deliverPage({ totalEntries: 1, currentPage: 1, entries: [entry(3, 1, 0, 'cap hit')], logLevelFilter: 1, logSourceFilter: 3 });

        expect(levelSelect).toHaveTextContent('INFO');
        expect(sourceSelect).toHaveTextContent(MONITOR_ERROR_INFO[MONITOR_LOG_ORDER[3]]?.title ?? MONITOR_LOG_ORDER[3]);
    });

    it('auto refresh re-asks for the shown page with its own filters every 2.5 s and stops when unticked', () => {
        render(<WiredRoomLogsView onClose={() => undefined} />);
        deliverPage({ totalEntries: 60, currentPage: 2, entries: [], logLevelFilter: 0, logSourceFilter: -1, query: 'move' });
        mocks.send.mockClear();

        vi.advanceTimersByTime(2500);
        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual([2, 50, 0, -1, 'move']);

        fireEvent.click(screen.getByRole('checkbox'));
        vi.advanceTimersByTime(5000);
        expect(mocks.send).toHaveBeenCalledTimes(1);
    });

    it('the page buttons go through the rate limiter', () => {
        render(<WiredRoomLogsView onClose={() => undefined} />);
        deliverPage({ totalEntries: 120, currentPage: 1, entries: [] });
        mocks.send.mockClear();
        vi.advanceTimersByTime(400);

        fireEvent.click(screen.getByTitle('Next page'));
        fireEvent.click(screen.getByTitle('Last page'));

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0].getMessageArray()[0]).toBe(2);

        vi.advanceTimersByTime(400);
        fireEvent.click(screen.getByTitle('Last page'));
        expect(mocks.send).toHaveBeenCalledTimes(2);
        expect(mocks.send.mock.calls[1][0].getMessageArray()[0]).toBe(3);
    });
});
