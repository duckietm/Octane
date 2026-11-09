import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setActiveReport = vi.fn();
const startBullyReport = vi.fn();
let guardiansEnabled = false;

vi.mock('@octane/renderer', () => ({ GetCfhStatusMessageComposer: class {}, GetMyReportsStatusMessageComposer: class {} }));
vi.mock('../../../api', () => ({
    CreateLinkEvent: vi.fn(),
    DispatchUiEvent: vi.fn(),
    GetConfigurationValue: () => true,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    ReportState: { SELECT_USER: 1 },
    ReportType: { EMERGENCY: 1, BULLY: 2 },
    SendMessageComposer: vi.fn()
}));
vi.mock('../../../events', () => ({ GuideToolEvent: class { public static CREATE_HELP_REQUEST = 'x'; } }));
vi.mock('../../../hooks', () => ({ isGuardiansEnabled: () => guardiansEnabled, useHelp: () => ({ setActiveReport, startBullyReport }) }));

const { HelpIndexView } = await import('./HelpIndexView');

const run = (call: number) => (setActiveReport.mock.calls[call][0] as (value: object) => Record<string, unknown>)({});

afterEach(() => {
    cleanup();
    setActiveReport.mockClear();
    startBullyReport.mockClear();
    guardiansEnabled = false;
});

describe('HelpIndexView', () => {
    it('starts the report of a bully, and the emergency with the wish to leave the room', () => {
        render(<HelpIndexView />);

        fireEvent.click(screen.getAllByText('Report a case of bullying')[1]);
        expect(run(0)).toMatchObject({ reportType: 2, currentStep: 1, leaveRoom: false });

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByText('Get help now!'));
        expect(run(1)).toMatchObject({ reportType: 1, currentStep: 1, leaveRoom: true });
    });

    it('with the Guardians on, asks whether a bully may be reported instead of opening the report', () => {
        guardiansEnabled = true;
        render(<HelpIndexView />);

        fireEvent.click(screen.getAllByText('Report a case of bullying')[1]);

        expect(startBullyReport).toHaveBeenCalledTimes(1);
        expect(setActiveReport).not.toHaveBeenCalled();
    });
});
