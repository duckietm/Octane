import { localizeWithFallback } from '../../api';
import wiredMonitorImage from '../../assets/images/wiredtools/wired_monitor.png';
import { Button, Text } from '../../common';
import { MonitorLog, MonitorLogDetails, MonitorStat } from './WiredCreatorTools.types';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export interface WiredMonitorTabViewProps {
    monitorStats: MonitorStat[];
    monitorLogs: MonitorLog[];
    /** Enables the History button; the view does not render the history itself. */
    monitorHistoryRows: { id: string }[];
    onOpenMonitorInfo: () => void;
    onOpenMonitorHistory: () => void;
    /** Opens the room's paged wired log window. */
    onOpenRoomLogs: () => void;
    /** AIR CLEAR_LOGS_TIMEOUT: "Clear all" stays disabled for a few seconds after a clear. */
    isClearCoolingDown?: boolean;
    /** AIR hasWritePermission: only users who may modify the room's wired can clear the logs. */
    canClearLogs?: boolean;
    onClearMonitorLogs: () => void;
    onOpenMonitorLogDetails: (type: string, details: Pick<MonitorLogDetails, 'errorId' | 'severity' | 'amount' | 'latest' | 'reason' | 'sourceLabel' | 'sourceId'>) => void;
}

/**
 * The "Monitor" tab body of WiredCreatorToolsView, extracted from the
 * parent's inline JSX. The three modal overlays that used to live
 * inside this block were dead code (`{ false && ... }`) and have been
 * dropped; the live versions of those modals (Monitor History, Monitor
 * Info, Error Info) are mounted outside the OctaneCardView by the parent.
 */
export const WiredMonitorTabView = (props: WiredMonitorTabViewProps) => {
    const { monitorStats, monitorLogs, monitorHistoryRows, onOpenMonitorInfo, onOpenMonitorHistory, onOpenRoomLogs, isClearCoolingDown = false, canClearLogs = true, onClearMonitorLogs, onOpenMonitorLogDetails } = props;

    return (
        <NativeTextTree>
            <div className="p-3 flex flex-col gap-3 relative">
                <div className="grid grid-cols-[190px_1fr] gap-3">
                    <div className="bg-white rounded border border-[#b9b3a5] p-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                            <Text bold>{localizeWithFallback('wiredmenu.monitor.statistics', 'Statistics:')}</Text>
                            <BaseButton
                                className="rounded border border-[#7f7f7f] bg-[#ece9e1] px-2 py-[2px] text-[12px] text-[#333] hover:bg-[#e3ded2]"
                                type="button"
                                onClick={onOpenMonitorInfo}
                            >
                                {localizeWithFallback('wiredmenu.monitor.info', 'Info')}
                            </BaseButton>
                        </div>
                        {monitorStats.map((stat) => (
                            <div key={stat.label} className="flex justify-between gap-2 text-[12px]">
                                <span>{stat.label}:</span>
                                <span style={stat.color ? { color: stat.color } : undefined}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="min-h-[140px] flex items-center justify-center px-4">
                        <img alt="Monitor preview" className="max-w-full max-h-[180px] object-contain" src={wiredMonitorImage} />
                    </div>
                </div>
                <div className="bg-white rounded border border-[#b9b3a5] p-2 flex flex-col gap-2">
                    <Text bold>{localizeWithFallback('wiredmenu.monitor.log', 'Logs:')}</Text>
                    <div className="max-h-[180px] overflow-y-auto border border-[#d1ccbf] rounded">
                        <table className="w-full text-[12px]">
                            <thead className="bg-[#efede5] sticky top-0">
                                {/* Official column titles and widths (33 / 22 / 15 / 30 %). */}
                                <tr>
                                    <th className="text-left px-2 py-1 w-[33%]">{localizeWithFallback('wiredmenu.monitor.column.type', 'Type')}</th>
                                    <th className="text-left px-2 py-1 w-[22%]">{localizeWithFallback('wiredmenu.monitor.column.category', 'Category')}</th>
                                    <th className="text-left px-2 py-1 w-[15%]">{localizeWithFallback('wiredmenu.monitor.column.occurrences', 'Amount')}</th>
                                    <th className="text-left px-2 py-1 w-[30%]">{localizeWithFallback('wiredmenu.monitor.column.latest', 'Latest occurrence')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monitorLogs.map((log, index) => (
                                    <tr
                                        key={log.type}
                                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f8f6f0]'} cursor-pointer hover:bg-[#e8eefc]`}
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
                                        <td className="px-2 py-1 text-[#1b57b2] underline-offset-2 hover:underline">{log.type}</td>
                                        <td className="px-2 py-1">{log.category}</td>
                                        <td className="px-2 py-1">{log.amount}</td>
                                        <td className="px-2 py-1">{log.latest}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between gap-2">
                        <Button
                            classNames={['octane-wired-menu__clear-log']}
                            disabled={isClearCoolingDown || !canClearLogs}
                            variant="danger"
                            onClick={onClearMonitorLogs}
                        >
                            {localizeWithFallback('wiredmenu.monitor.clear_all', 'Clear all')}
                        </Button>
                        <div className="flex gap-2">
                            {/* Official log_overview opens the room's log list; the history window is ours. */}
                            <Button variant="secondary" onClick={onOpenRoomLogs}>
                                {localizeWithFallback('wiredmenu.monitor.log_overview', 'View full logs')}
                            </Button>
                            <Button disabled={!monitorHistoryRows.length} variant="secondary" onClick={onOpenMonitorHistory}>
                                {localizeWithFallback('wiredmenu.monitor.history', 'History')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
