import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let handler: (event: unknown) => void = () => undefined;

vi.mock('@octane/renderer', () => ({
    AppealReportMessageComposer: class {},
    MyReportsStatusMessageEvent: class {},
    MyReportStatusData: { APPEAL_NONE: 0, APPEAL_PENDING: 1, APPEAL_ACTION: 2, APPEAL_NO_ACTION: 3 }
}));
vi.mock('../../../api', () => ({ localizeWithFallback: (_key: string, fallback: string) => fallback, SendMessageComposer: vi.fn() }));
vi.mock('../../../common', () => ({
    OctaneCardView: (props: { children: unknown }) => <div>{props.children as never}</div>,
    OctaneCardContentView: (props: { children: unknown }) => <div>{props.children as never}</div>,
    OctaneCardHeaderView: (props: { headerText: string }) => <h1>{props.headerText}</h1>
}));
vi.mock('../../../hooks', () => ({ useMessageEvent: (_type: unknown, callback: (event: unknown) => void) => { handler = callback; } }));
vi.mock('../../../layout', () => ({ OctaneButton: (props: { children: unknown }) => <button>{props.children as never}</button> }));

const { MyReportsStatusView } = await import('./MyReportsStatusView');

afterEach(cleanup);

describe('MyReportsStatusView', () => {
    it('uses the columns and states of the official table', () => {
        render(<MyReportsStatusView />);
        act(() =>
            handler({
                getParser: () => ({ reports: [{ id: 1, creationTime: 0, closeTime: 5, sanctioned: false, appealStatus: 0, reportedAccountName: 'tester', userMessage: 'g'.repeat(80) }] })
            })
        );

        expect(screen.getByText('Report date')).toBeTruthy();
        expect(screen.getByText('Account')).toBeTruthy();
        expect(screen.getByText('Decided')).toBeTruthy();
        expect(screen.getByText('No action taken')).toBeTruthy();
        expect(screen.getByText('Appeal')).toBeTruthy();
    });
});
