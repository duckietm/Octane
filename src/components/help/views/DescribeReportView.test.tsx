/* @vitest-environment jsdom */

import { GetLocalizationManager } from '@octane/renderer';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IHelpReport, ReportState, ReportType } from '../../../api';
import { DescribeReportView } from './DescribeReportView';
import { getReportMessageError, resolveReportMessageMinimumLength } from './reportMessageRules';

const setActiveReport = vi.fn();
const simpleAlert = vi.fn();
const cfhCategories = [
    { name: 'bullying', topics: [{ id: 1 }] },
    { name: 'unlawful_activity', topics: [{ id: 21 }] }
];

let activeReport: IHelpReport;

vi.mock('../../../hooks', () => ({
    useHelp: () => ({ activeReport, setActiveReport }),
    useModTools: () => ({ cfhCategories }),
    useNotification: () => ({ simpleAlert })
}));

const report = (overrides: Partial<IHelpReport> = {}): IHelpReport => ({
    reportType: ReportType.ROOM,
    reportedUserId: 12,
    reportedChats: [],
    cfhCategory: 0,
    cfhTopic: 1,
    roomId: 1,
    roomName: '',
    groupId: -1,
    threadId: -1,
    messageId: -1,
    extraData: '',
    roomObjectId: -1,
    message: '',
    currentStep: ReportState.INPUT_REPORT_MESSAGE,
    ...overrides
});

const submit = (text: string) => {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
    fireEvent.click(screen.getByText('help.emergency.main.submit.button'));
};

describe('DescribeReportView', () => {
    beforeEach(() => {
        // The renderer stub localizes to nothing; keys are enough to find the texts.
        vi.mocked(GetLocalizationManager).mockReturnValue({ getValueWithParameters: (key: string) => key } as never);
        setActiveReport.mockClear();
        simpleAlert.mockClear();
        activeReport = report();
    });

    afterEach(cleanup);

    it('asks for evidence when the report is about unlawful activity', () => {
        activeReport = report({ cfhCategory: 1, cfhTopic: 21 });

        render(<DescribeReportView />);

        expect(screen.getByText(/sufficient evidence/)).toBeInTheDocument();
        expect(screen.queryByText('help.cfh.input.text')).not.toBeInTheDocument();
    });

    it('keeps the generic prompt for every other category', () => {
        render(<DescribeReportView />);

        expect(screen.getByText('help.cfh.input.text')).toBeInTheDocument();
    });

    it('refuses an empty or too short description with an alert instead of moving on', () => {
        render(<DescribeReportView />);

        submit('   ');
        submit('too short');

        expect(simpleAlert).toHaveBeenCalledTimes(2);
        expect(simpleAlert.mock.calls[0][0]).toContain('before sending a call for help');
        expect(simpleAlert.mock.calls[1][0]).toContain('More details please');
        expect(setActiveReport).not.toHaveBeenCalled();
    });

    it('moves to the summary once the description is long enough', () => {
        render(<DescribeReportView />);

        submit('This user keeps insulting everyone in the room.');

        expect(simpleAlert).not.toHaveBeenCalled();
        expect(setActiveReport).toHaveBeenCalledTimes(1);

        const next = setActiveReport.mock.calls[0][0](activeReport);

        expect(next.currentStep).toBe(ReportState.REPORT_SUMMARY);
        expect(next.message).toBe('This user keeps insulting everyone in the room.');
    });
});

describe('report message rules', () => {
    it('falls back to the official 15 characters when the hotel sets no usable minimum', () => {
        expect(resolveReportMessageMinimumLength(undefined)).toBe(15);
        expect(resolveReportMessageMinimumLength('abc')).toBe(15);
        expect(resolveReportMessageMinimumLength(0)).toBe(15);
        expect(resolveReportMessageMinimumLength(30)).toBe(30);
        expect(resolveReportMessageMinimumLength('20')).toBe(20);
    });

    it('classifies the description errors the way the official client does', () => {
        expect(getReportMessageError('', 15)).toBe('nomsg');
        expect(getReportMessageError('   ', 15)).toBe('nomsg');
        expect(getReportMessageError('short one', 15)).toBe('msgtooshort');
        expect(getReportMessageError('this is long enough', 15)).toBeNull();
    });
});
