import { AppealReportMessageComposer, MyReportsStatusMessageEvent, MyReportStatusData } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent } from '../../../hooks';
import { OctaneButton } from '../../../layout';

const formatTime = (time: number): string => (time > 0 ? new Date(time).toLocaleString() : '-');

/** The official appeal button is only enabled on a decided report without a sanction that was never appealed. */
const canAppeal = (report: MyReportStatusData): boolean =>
    report.closeTime > 0 && !report.sanctioned && report.appealStatus === MyReportStatusData.APPEAL_NONE;

const statusText = (report: MyReportStatusData): string => {
    switch (report.appealStatus) {
        case MyReportStatusData.APPEAL_PENDING:
            return localizeWithFallback('help.myreports.status.appeal.pending', 'Appeal waiting for a moderator');
        case MyReportStatusData.APPEAL_ACTION:
            return localizeWithFallback('help.myreports.status.appeal.action', 'Appeal reviewed: action taken');
        case MyReportStatusData.APPEAL_NO_ACTION:
            return localizeWithFallback('help.myreports.status.appeal.noaction', 'Appeal reviewed: no action');
    }

    if (report.closeTime <= 0) return localizeWithFallback('help.myreports.status.pending', 'Waiting for a moderator');

    return report.sanctioned
        ? localizeWithFallback('help.myreports.status.sanctioned', 'Action taken')
        : localizeWithFallback('help.myreports.status.noaction', 'No action taken');
};

/** The reports this player filed and what became of them, with an appeal for the ones closed without action. */
export const MyReportsStatusView: FC<{}> = () => {
    const [reports, setReports] = useState<MyReportStatusData[]>(null);

    useMessageEvent<MyReportsStatusMessageEvent>(MyReportsStatusMessageEvent, (event) => setReports([...(event.getParser().reports ?? [])]));

    if (!reports) return null;

    return (
        <OctaneCardView className="octane-help min-w-0 w-[min(520px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" theme="primary-slim" uniqueKey="help-my-reports">
            <OctaneCardHeaderView headerText={localizeWithFallback('help.main.my.reports.status', 'My reports')} onCloseClick={() => setReports(null)} />
            <OctaneCardContentView className="text-black">
                {!reports.length && <div>{localizeWithFallback('help.myreports.empty', 'You have not reported anything yet.')}</div>}
                {reports.length > 0 && (
                    <div className="max-h-[360px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left">
                                    <th>{localizeWithFallback('help.myreports.date', 'Date')}</th>
                                    <th>{localizeWithFallback('help.myreports.reported', 'Reported')}</th>
                                    <th>{localizeWithFallback('help.myreports.status', 'Status')}</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr key={report.id} className="border-t border-black/10 align-top">
                                        <td className="whitespace-nowrap pr-2">{formatTime(report.creationTime)}</td>
                                        <td className="pr-2">
                                            <div className="font-bold">{report.reportedAccountName || '-'}</div>
                                            {report.userMessage && <div className="break-words text-xs text-[#595959]">{report.userMessage}</div>}
                                        </td>
                                        <td className="pr-2">{statusText(report)}</td>
                                        <td className="text-right">
                                            {canAppeal(report) && (
                                                <OctaneButton className="text-xs" onClick={() => SendMessageComposer(new AppealReportMessageComposer(report.id))}>
                                                    {localizeWithFallback('help.myreports.appeal', 'Appeal')}
                                                </OctaneButton>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
