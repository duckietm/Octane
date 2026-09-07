import wiredMonitorImage from '../../assets/images/wiredtools/wired_monitor.png';
import { Button, Text } from '../../common';
import { MonitorLog, MonitorLogDetails, MonitorStat } from './WiredCreatorTools.types';

export interface WiredMonitorTabViewProps {
    monitorStats: MonitorStat[];
    monitorLogs: MonitorLog[];
    /**
     * Used only as a disabled-state predicate for the "Clear all" button:
     * if both this is empty and every log has amount '0', there is nothing
     * to clear. The view does not render the history itself.
     */
    monitorHistoryRows: { id: string }[];
    onOpenMonitorInfo: () => void;
    onOpenMonitorHistory: () => void;
    onClearMonitorLogs: () => void;
    onOpenMonitorLogDetails: (type: string, details: Pick<MonitorLogDetails, 'severity' | 'amount' | 'latest' | 'reason' | 'sourceLabel' | 'sourceId'>) => void;
}

/**
 * The "Monitor" tab body of WiredCreatorToolsView, extracted from the
 * parent's inline JSX. The three modal overlays that used to live
 * inside this block were dead code (`{ false && ... }`) and have been
 * dropped; the live versions of those modals (Monitor History, Monitor
 * Info, Error Info) are mounted outside the OctaneCardView by the parent.
 */
export const WiredMonitorTabView = (props: WiredMonitorTabViewProps) => {
    const { monitorStats, monitorLogs, monitorHistoryRows, onOpenMonitorInfo, onOpenMonitorHistory, onClearMonitorLogs, onOpenMonitorLogDetails } = props;

    return (
        <div className="p-3 flex flex-col gap-3 relative">
            <div className="grid grid-cols-[190px_1fr] gap-3">
                <div className="bg-white rounded border border-[#b9b3a5] p-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <Text bold>Statistics:</Text>
                        <button
                            className="rounded border border-[#7f7f7f] bg-[#ece9e1] px-2 py-[2px] text-[11px] text-[#333] hover:bg-[#e3ded2]"
                            type="button"
                            onClick={onOpenMonitorInfo}
                        >
                            Info
                        </button>
                    </div>
                    {monitorStats.map((stat) => (
                        <div key={stat.label} className="flex justify-between gap-2 text-[12px]">
                            <span>{stat.label}:</span>
                            <span>{stat.value}</span>
                        </div>
                    ))}
                </div>
                <div className="min-h-[140px] flex items-center justify-center px-4">
                    <img alt="Monitor preview" className="max-w-full max-h-[180px] object-contain" src={wiredMonitorImage} />
                </div>
            </div>
            <div className="bg-white rounded border border-[#b9b3a5] p-2 flex flex-col gap-2">
                <Text bold>Logs:</Text>
                <div className="max-h-[180px] overflow-y-auto border border-[#d1ccbf] rounded">
                    <table className="w-full text-[12px]">
                        <thead className="bg-[#efede5] sticky top-0">
                            <tr>
                                <th className="text-left px-2 py-1">Type</th>
                                <th className="text-left px-2 py-1">Severity</th>
                                <th className="text-left px-2 py-1">Amount</th>
                                <th className="text-left px-2 py-1">Latest occurrence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monitorLogs.map((log, index) => (
                                <tr
                                    key={log.type}
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f8f6f0]'} cursor-pointer hover:bg-[#e8eefc]`}
                                    onClick={() =>
                                        onOpenMonitorLogDetails(log.type, {
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
                        disabled={!monitorHistoryRows.length && !monitorLogs.some((log) => log.amount !== '0')}
                        variant="danger"
                        onClick={onClearMonitorLogs}
                    >
                        Clear all
                    </Button>
                    <Button disabled={!monitorHistoryRows.length} variant="secondary" onClick={onOpenMonitorHistory}>
                        View full logs
                    </Button>
                </div>
            </div>
        </div>
    );
};
