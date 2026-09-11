import { FC, useMemo, useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, OpenUrl } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';

/**
 * Appeal states as the official `ReportStatusMessage` numbers them: 0 no appeal, 1 appeal
 * pending, 2 appeal reviewed with an action, 3 appeal reviewed without one.
 */
export const REPORT_APPEAL_NONE = 0;
export const REPORT_APPEAL_PENDING = 1;
export const REPORT_APPEAL_ACTION = 2;
export const REPORT_APPEAL_NO_ACTION = 3;

/**
 * One row of the official "My reports" window (`help/MyReportStatus.as`). The renderer
 * has no parser for the report-status packet yet, so this is the typed shape the window
 * expects once one exists: the field order follows the AIR reader.
 */
export interface IMyReportStatusEntry {
    id: number;
    creationTime: number;
    userMessage: string;
    userCategory: number;
    reportedAccountName: string;
    /** -1 while the report is still waiting for review. */
    closeTime: number;
    sanctioned: boolean;
    sanctionGivenByAutoModeration: boolean;
    appealStatus: number;
    appealCreationTime: number;
    /** -1 while the appeal is still waiting for review. */
    appealResolutionTime: number;
}

export interface IMyReportsStatusSource {
    reports: IMyReportStatusEntry[];
    /** False until the renderer can parse the report-status packet; the window says so instead of showing an empty table. */
    isSupported: boolean;
    appeal: (reportId: number) => void;
}

/**
 * Stub source: the renderer exposes `GetCfhStatusMessageComposer` but no event for the
 * report list the official client renders (`class_3608` in AIR 13), so the window has
 * nothing to ask for and nothing to send an appeal with. Swap this for a hook over the
 * real event when the renderer grows one; the view needs no other change.
 */
export const useMyReportsStatusSource = (): IMyReportsStatusSource => ({ reports: [], isSupported: false, appeal: () => undefined });

/** Newest report first, as the official table sorts on creation time. */
export const sortReportsNewestFirst = (reports: IMyReportStatusEntry[]): IMyReportStatusEntry[] =>
    [...(reports || [])].sort((a, b) => b.creationTime - a.creationTime);

/** The state column: appealed, decided, or still waiting. */
export const getReportStateKey = (report: IMyReportStatusEntry): string => {
    if (report.appealStatus !== REPORT_APPEAL_NONE) return 'report.status.state.appealed';
    if (report.closeTime !== -1) return 'report.status.state.decided';

    return 'report.status.state.pending';
};

/** The explanation the official info bubble shows for a decided report, keyed the same way. */
export const getActionExplanationKey = (sanctioned: boolean, byAutoModeration: boolean, appealStatus: number): string => {
    if (appealStatus === REPORT_APPEAL_ACTION) return 'report.status.info.appeal.action';
    if (appealStatus === REPORT_APPEAL_NO_ACTION) return 'report.status.info.appeal.no_action';
    if (byAutoModeration) return sanctioned ? 'report.status.info.auto_moderated.action' : 'report.status.info.auto_moderated.no_action';

    return sanctioned ? 'report.status.info.manually_moderated.action' : 'report.status.info.manually_moderated.no_action';
};

/** An appeal is possible once the report was decided without a sanction and nobody appealed yet. */
export const canAppealReport = (report: IMyReportStatusEntry): boolean =>
    report.appealStatus === REPORT_APPEAL_NONE && report.closeTime !== -1 && !report.sanctioned;

const formatDate = (time: number): string => {
    if (!Number.isFinite(time) || time <= 0) return '-';

    const date = new Date(time);
    const pad = (value: number) => (value < 10 ? `0${value}` : String(value));

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

interface MyReportsStatusViewProps {
    onClose: () => void;
}

export const MyReportsStatusView: FC<MyReportsStatusViewProps> = (props) => {
    const { onClose = null } = props;
    const { reports, isSupported, appeal } = useMyReportsStatusSource();
    const [selectedId, setSelectedId] = useState<number>(null);
    const rows = useMemo(() => sortReportsNewestFirst(reports), [reports]);
    const selected = rows.find((report) => report.id === selectedId) || null;
    const zendeskUrl = GetConfigurationValue<string>('zendesk.url', '');

    const renderDetails = (report: IMyReportStatusEntry) => {
        const appealed = report.appealStatus !== REPORT_APPEAL_NONE;
        const decided = appealed ? report.appealResolutionTime !== -1 : report.closeTime !== -1;
        const decisionDate = appealed ? report.appealResolutionTime : report.closeTime;

        return (
            <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-50 p-2 text-[.8rem]">
                <div className="font-bold">{LocalizeText('report.status.info.title')}</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3">
                    <span className="opacity-60">{LocalizeText(appealed ? 'report.status.info.appealed' : 'report.status.info.reported')}</span>
                    <span>{formatDate(appealed ? report.appealCreationTime : report.creationTime)}</span>
                    <span className="opacity-60">{LocalizeText('report.status.info.decision')}</span>
                    <span>{decided ? formatDate(decisionDate) : '-'}</span>
                </div>
                <div className="font-semibold">
                    {LocalizeText(
                        decided ? (report.sanctioned ? 'report.status.info.action' : 'report.status.info.no_action') : 'report.status.info.sanction_pending'
                    )}
                </div>
                {decided && <div>{LocalizeText(getActionExplanationKey(report.sanctioned, report.sanctionGivenByAutoModeration, report.appealStatus))}</div>}
                {report.sanctioned && zendeskUrl && (
                    <button className="help-link" type="button" onClick={() => OpenUrl(zendeskUrl)}>
                        {localizeWithFallback('report.status.info.sanction_help.link', 'For related inquiries, contact support')}
                    </button>
                )}
                <button
                    className="habbo-btn-green habbo-btn-green--auto self-center"
                    disabled={!canAppealReport(report)}
                    type="button"
                    onClick={() => appeal(report.id)}
                >
                    {LocalizeText('report.status.button.appeal')}
                </button>
            </div>
        );
    };

    return (
        <OctaneCardView className="octane-help min-w-0 w-[min(540px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('report.status.title')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black" gap={2}>
                <div className="min-w-0 overflow-x-auto">
                    <div className="grid grid-cols-[26%_18%_38%_18%] text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                        <div>{LocalizeText('report.status.col.report_date')}</div>
                        <div>{LocalizeText('report.status.col.reported_account')}</div>
                        <div>{LocalizeText('report.status.col.reason')}</div>
                        <div>{LocalizeText('report.status.col.appeal_status')}</div>
                    </div>
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-6 opacity-60 text-sm text-center">
                            <span>{LocalizeText('report.status.no_reports')}</span>
                            {!isSupported && (
                                <span className="inline-flex items-center gap-1 text-xs italic">
                                    <FaInfoCircle size={11} />
                                    {localizeWithFallback('report.status.unsupported', 'This hotel does not send the status of your reports yet.')}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col max-h-[220px] overflow-auto">
                            {rows.map((report) => (
                                <button
                                    key={report.id}
                                    className={`grid grid-cols-[26%_18%_38%_18%] text-start px-1 py-1.5 text-sm border-b border-zinc-100 hover:bg-sky-50/60 ${
                                        report.id === selectedId ? 'bg-sky-50' : ''
                                    }`}
                                    type="button"
                                    onClick={() => setSelectedId((current) => (current === report.id ? null : report.id))}
                                >
                                    <span className="tabular-nums">{formatDate(report.creationTime)}</span>
                                    <span className="truncate">{report.reportedAccountName}</span>
                                    <span className="truncate">{LocalizeText(`help.cfh.topic.${report.userCategory}`)}</span>
                                    <span>{LocalizeText(getReportStateKey(report))}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {selected && renderDetails(selected)}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
