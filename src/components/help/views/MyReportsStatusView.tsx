import { AppealReportMessageComposer, MyReportsStatusMessageEvent, MyReportStatusData } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent } from '../../../hooks';
import { OctaneButton } from '../../../layout';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const formatTime = (time: number): string => (time > 0 ? new Date(time).toLocaleString() : '-');

/** The official appeal button is only enabled on a decided report without a sanction that was never appealed. */
const canAppeal = (report: MyReportStatusData): boolean =>
    report.closeTime > 0 && !report.sanctioned && report.appealStatus === MyReportStatusData.APPEAL_NONE;

/** The state of a report and, once it is decided, what came of it: the texts of the official table. */
const statusText = (report: MyReportStatusData): { state: string; outcome: string } => {
    if (report.appealStatus !== MyReportStatusData.APPEAL_NONE) {
        return { state: localizeWithFallback('report.status.state.appealed', 'Appealed'), outcome: '' };
    }

    if (report.closeTime <= 0) return { state: localizeWithFallback('report.status.state.pending', 'Pending'), outcome: '' };

    return {
        state: localizeWithFallback('report.status.state.decided', 'Decided'),
        outcome: report.sanctioned ? localizeWithFallback('report.status.info.action', 'Action taken') : localizeWithFallback('report.status.info.no_action', 'No action taken')
    };
};

/** The reports this player filed and what became of them, with an appeal for the ones closed without action. */
export const MyReportsStatusView: FC<{}> = () => {
    const [reports, setReports] = useState<MyReportStatusData[]>(null);

    useMessageEvent<MyReportsStatusMessageEvent>(MyReportsStatusMessageEvent, (event) => setReports([...(event.getParser().reports ?? [])]));

    if (!reports) return null;

    return (
        <NativeTextTree>
            <OctaneCardView
                className="octane-help octane-my-reports min-w-0 w-[min(538px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                theme="primary-slim"
                uniqueKey="help-my-reports"
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('report.status.title', 'My reports')} onCloseClick={() => setReports(null)} />
                <OctaneCardContentView className="text-black">
                    {!reports.length && <div>{localizeWithFallback('report.status.no_reports', 'Nothing to show')}</div>}
                    {reports.length > 0 && (
                        <div className="octane-my-reports__scroll">
                            <table className="octane-my-reports__table">
                                <thead>
                                    <tr>
                                        <th className="is-date">{localizeWithFallback('report.status.col.report_date', 'Report date')}</th>
                                        <th className="is-account">{localizeWithFallback('report.status.col.reported_account', 'Account')}</th>
                                        <th>{localizeWithFallback('report.status.col.report_reason', 'Reason')}</th>
                                        <th className="is-status">{localizeWithFallback('report.status.col.report_status', 'Status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report) => {
                                        const status = statusText(report);

                                        return (
                                            <tr key={report.id}>
                                                <td className="is-date">{formatTime(report.creationTime)}</td>
                                                <td className="is-account">{report.reportedAccountName || '-'}</td>
                                                <td className="is-reason">{report.userMessage}</td>
                                                <td className="is-status">
                                                    <div className="font-bold">{status.state}</div>
                                                    {status.outcome && <div>{status.outcome}</div>}
                                                    {canAppeal(report) && (
                                                        <OctaneButton className="octane-my-reports__appeal" onClick={() => SendMessageComposer(new AppealReportMessageComposer(report.id))}>
                                                            {localizeWithFallback('report.status.button.appeal', 'Appeal')}
                                                        </OctaneButton>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
