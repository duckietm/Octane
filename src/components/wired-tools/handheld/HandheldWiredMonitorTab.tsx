import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { Select } from '../../../common/Select';
import { useHandheldLayout } from '../../../hooks/handheld/useHandheldLayout';
import { MonitorLogDetails } from '../WiredCreatorTools.types';
import { WiredMonitorTabViewProps } from '../WiredMonitorTabView';
import {
    HandheldWiredBack,
    HandheldWiredButton,
    HandheldWiredCard,
    HandheldWiredChevron,
    HandheldWiredChoices,
    HandheldWiredEmpty,
    HandheldWiredField,
    HandheldWiredPair
} from './HandheldWiredParts';

export type MonitorSeverityFilter = 'ALL' | 'ERROR' | 'WARNING';

export interface HandheldMonitorHistoryRow {
    id: string;
    type: string;
    category: string;
    occurredAt: string;
    reason: string;
    sourceLabel: string;
    sourceId: number;
}

export interface HandheldMonitorErrorInfo {
    title: string;
    severity: string;
    description: string[];
}

export interface HandheldWiredMonitorTabProps extends WiredMonitorTabViewProps {
    // The history window ("History")
    isHistoryOpen: boolean;
    onCloseHistory: () => void;
    historyRows: HandheldMonitorHistoryRow[];
    severityFilter: MonitorSeverityFilter;
    onSeverityFilterChange: (severity: MonitorSeverityFilter) => void;
    typeFilter: string;
    typeOptions: string[];
    onTypeFilterChange: (type: string) => void;
    formatSource: (label: string, id: number) => string;
    /** Opens a history line's error, with the time it happened. */
    onOpenHistoryDetails: (type: string, details: Partial<MonitorLogDetails>) => void;
    // The information window ("Info")
    isInfoOpen: boolean;
    onCloseInfo: () => void;
    infoSections: { title: string; lines: string[] }[];
    // The error information of a log line
    errorInfo: HandheldMonitorErrorInfo | null;
    errorDetails: MonitorLogDetails | null;
    errorSource: string;
    onCloseError: () => void;
}

type MonitorPage = 'monitor' | 'history' | 'info';

/**
 * The monitor tab on a phone: the statistics card (Info opens their explanation), the error logs as cards (a card
 * opens what the error means), Clear all, the full room log and the history. History and Info are pages of the
 * sheet; an error is a page upright and stands beside the list on its side. Every flag, filter and handler is the
 * desktop window's, so the desktop's extra windows and these pages are the same state.
 */
export const HandheldWiredMonitorTab: FC<HandheldWiredMonitorTabProps> = (props) => {
    const {
        monitorStats,
        monitorLogs,
        monitorHistoryRows,
        onOpenMonitorInfo,
        onOpenMonitorHistory,
        onOpenRoomLogs,
        isClearCoolingDown = false,
        canClearLogs = true,
        onClearMonitorLogs,
        onOpenMonitorLogDetails,
        isHistoryOpen,
        onCloseHistory,
        historyRows,
        severityFilter,
        onSeverityFilterChange,
        typeFilter,
        typeOptions,
        onTypeFilterChange,
        formatSource,
        onOpenHistoryDetails,
        isInfoOpen,
        onCloseInfo,
        infoSections,
        errorInfo,
        errorDetails,
        errorSource,
        onCloseError
    } = props;
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    const page: MonitorPage = isInfoOpen ? 'info' : isHistoryOpen ? 'history' : 'monitor';
    // Upright the error covers the list it came from; on its side it stands beside it.
    const showList = sideBySide || !errorInfo;
    const severity = errorDetails?.severity ?? errorInfo?.severity ?? '';

    const listPage = () => {
        if (page === 'info')
            return (
                <>
                    <HandheldWiredBack onBack={onCloseInfo} />
                    <div className="octane-handheld-wired__title">{localizeWithFallback('wiredmenu.monitor.info.title', 'Wired Monitor Information')}</div>
                    {infoSections.map((section) => (
                        <HandheldWiredCard key={section.title} title={section.title}>
                            {section.lines.map((line, index) => (
                                <p key={`${section.title}-${index}`} className="octane-handheld-wired__text">
                                    {line}
                                </p>
                            ))}
                        </HandheldWiredCard>
                    ))}
                </>
            );

        if (page === 'history')
            return (
                <>
                    <HandheldWiredBack onBack={onCloseHistory} />
                    <div className="octane-handheld-wired__title">{localizeWithFallback('wiredmenu.monitor.history.title', 'Wired Monitor Logs')}</div>
                    <HandheldWiredChoices<MonitorSeverityFilter>
                        choices={(['ALL', 'WARNING', 'ERROR'] as MonitorSeverityFilter[]).map((key) => ({ key, label: key }))}
                        label={localizeWithFallback('octane.wired_tools.severity', 'Severity:')}
                        value={severityFilter}
                        onChange={onSeverityFilterChange}
                    />
                    <HandheldWiredField label={localizeWithFallback('octane.wired_tools.type', 'Type:')}>
                        <Select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)}>
                            {typeOptions.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </Select>
                    </HandheldWiredField>
                    {!historyRows.length && (
                        <HandheldWiredEmpty>
                            {localizeWithFallback('octane.wired_tools.no_log_history_for_the_current', 'No log history for the current filters')}
                        </HandheldWiredEmpty>
                    )}
                    {historyRows.map((row) => (
                        <BaseButton
                            key={row.id}
                            className="octane-handheld-wired__entry is-link"
                            data-testid="wired-history-entry"
                            onClick={() =>
                                onOpenHistoryDetails(row.type, {
                                    severity: row.category,
                                    occurredAt: row.occurredAt,
                                    reason: row.reason,
                                    sourceLabel: row.sourceLabel,
                                    sourceId: row.sourceId
                                })
                            }
                        >
                            <span className="octane-handheld-wired__entry-title">
                                <span>{row.type}</span>
                                <span className="octane-handheld-wired__badge" data-severity={row.category}>
                                    {row.category}
                                </span>
                            </span>
                            <HandheldWiredPair
                                label={localizeWithFallback('octane.wired_tools.trigger', 'Trigger')}
                                value={formatSource(row.sourceLabel, row.sourceId)}
                            />
                            <HandheldWiredPair label={localizeWithFallback('octane.wired_tools.motivation', 'Motivation')} value={row.reason} />
                            <HandheldWiredPair label={localizeWithFallback('octane.wired_tools.occurred_at', 'Occurred at')} value={row.occurredAt} />
                        </BaseButton>
                    ))}
                </>
            );

        return (
            <>
                <HandheldWiredCard
                    extra={
                        <HandheldWiredButton testId="wired-monitor-info" onClick={onOpenMonitorInfo}>
                            {localizeWithFallback('wiredmenu.monitor.info', 'Info')}
                        </HandheldWiredButton>
                    }
                    testId="wired-monitor-stats"
                    title={localizeWithFallback('wiredmenu.monitor.statistics', 'Statistics:')}
                >
                    {monitorStats.map((stat) => (
                        <div key={stat.label} className="octane-handheld-wired__pair">
                            <span className="octane-handheld-wired__pair-label">{stat.label}</span>
                            <span className="octane-handheld-wired__pair-value is-strong" style={stat.color ? { color: stat.color } : undefined}>
                                {stat.value}
                            </span>
                        </div>
                    ))}
                </HandheldWiredCard>
                <HandheldWiredCard title={localizeWithFallback('wiredmenu.monitor.log', 'Logs:')} testId="wired-monitor-logs">
                    {!monitorLogs.length && <HandheldWiredEmpty>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</HandheldWiredEmpty>}
                    <div className="octane-handheld-wired__rows">
                        {monitorLogs.map((log) => (
                            <BaseButton
                                key={log.type}
                                className="octane-handheld-wired__log"
                                data-testid={`wired-log-${log.type}`}
                                onClick={() =>
                                    onOpenMonitorLogDetails(log.type, {
                                        errorId: log.errorId,
                                        severity: log.category,
                                        amount: log.amount,
                                        latest: log.latest,
                                        reason: log.latestReason,
                                        sourceLabel: log.latestSourceLabel,
                                        sourceId: log.latestSourceId
                                    })
                                }
                            >
                                <span className="octane-handheld-wired__log-text">
                                    <span className="octane-handheld-wired__log-type">{log.type}</span>
                                    <span className="octane-handheld-wired__log-meta">
                                        {`${localizeWithFallback('wiredmenu.monitor.column.occurrences', 'Amount')}: ${log.amount} · ${localizeWithFallback('wiredmenu.monitor.column.latest', 'Latest occurrence')}: ${log.latest}`}
                                    </span>
                                </span>
                                <span className="octane-handheld-wired__badge" data-severity={log.category}>
                                    {log.category}
                                </span>
                                <HandheldWiredChevron />
                            </BaseButton>
                        ))}
                    </div>
                </HandheldWiredCard>
                <div className="octane-handheld-wired__actions is-grid">
                    <HandheldWiredButton testId="wired-room-logs" onClick={onOpenRoomLogs}>
                        {localizeWithFallback('wiredmenu.monitor.log_overview', 'View full logs')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={!monitorHistoryRows.length} testId="wired-monitor-history" onClick={onOpenMonitorHistory}>
                        {localizeWithFallback('wiredmenu.monitor.history', 'History')}
                    </HandheldWiredButton>
                    <HandheldWiredButton disabled={isClearCoolingDown || !canClearLogs} testId="wired-monitor-clear" tone="danger" onClick={onClearMonitorLogs}>
                        {localizeWithFallback('wiredmenu.monitor.clear_all', 'Clear all')}
                    </HandheldWiredButton>
                </div>
            </>
        );
    };

    return (
        <div className="octane-handheld-wired__split" data-page={showList ? page : 'error'} data-testid="wired-monitor">
            {showList && <div className="octane-handheld-wired__column">{listPage()}</div>}
            {!!errorInfo && (
                <div className="octane-handheld-wired__column is-detail" data-testid="wired-monitor-error">
                    <HandheldWiredBack onBack={onCloseError} label={sideBySide ? localizeWithFallback('generic.close', 'Close') : undefined} />
                    <div className="octane-handheld-wired__title-row">
                        <div className="octane-handheld-wired__title">{errorInfo.title}</div>
                        <span className="octane-handheld-wired__badge" data-severity={severity}>
                            {severity}
                        </span>
                    </div>
                    {!!errorDetails && (
                        <HandheldWiredCard>
                            <HandheldWiredPair label={localizeWithFallback('octane.wired_tools.trigger_2', 'Trigger:')} value={errorSource} />
                            <HandheldWiredPair label={localizeWithFallback('octane.wired_tools.motivation_2', 'Motivation:')} value={errorDetails.reason} />
                            {!!errorDetails.amount && (
                                <HandheldWiredPair label={localizeWithFallback('octane.wired_tools.amount_2', 'Amount:')} value={errorDetails.amount} />
                            )}
                            {!!errorDetails.latest && (
                                <HandheldWiredPair
                                    label={localizeWithFallback('octane.wired_tools.latest_occurrence', 'Latest occurrence:')}
                                    value={errorDetails.latest}
                                />
                            )}
                            {!!errorDetails.occurredAt && (
                                <HandheldWiredPair
                                    label={localizeWithFallback('octane.wired_tools.occurred_at_2', 'Occurred at:')}
                                    value={errorDetails.occurredAt}
                                />
                            )}
                        </HandheldWiredCard>
                    )}
                    {errorInfo.description.map((paragraph, index) => (
                        <p key={index} className="octane-handheld-wired__text">
                            {paragraph}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
};
