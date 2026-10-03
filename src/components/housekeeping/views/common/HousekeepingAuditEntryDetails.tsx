import { FC } from 'react';
import { FaCheck, FaExclamationCircle, FaExternalLinkAlt } from 'react-icons/fa';
import {
    formatHousekeepingDateTime,
    HousekeepingTabId,
    IHousekeepingActionLogEntry,
    localizeHousekeepingAction,
    LocalizeText,
    parseAuditDetail,
    resolveHousekeepingTarget
} from '../../../../api';
import { useHousekeepingStore } from '../../../../hooks';

/** The full record behind one audit row, with a jump to the user or room it acted on. */
export const HousekeepingAuditEntryDetails: FC<{ entry: IHousekeepingActionLogEntry }> = ({ entry }) => {
    const { lookupUserById, lookupRoomById, setActiveTab } = useHousekeepingStore();
    const fields = parseAuditDetail(entry.detail);
    const roomField = fields.find((field) => field.key === 'roomId');
    const roomId = entry.targetType === 'room' && entry.targetId ? entry.targetId : roomField ? parseInt(roomField.value) || 0 : 0;
    const userId = entry.targetType === 'user' && entry.targetId ? entry.targetId : 0;

    const open = () => {
        if (roomId > 0) {
            setActiveTab(HousekeepingTabId.ROOMS);
            lookupRoomById(roomId);
        } else if (userId > 0) {
            setActiveTab(HousekeepingTabId.USERS);
            lookupUserById(userId);
        }
    };

    const rows: [string, string][] = [
        [LocalizeText('housekeeping.audit.detail.when'), formatHousekeepingDateTime(entry.timestamp)],
        [LocalizeText('housekeeping.audit.detail.operator'), `${entry.actorName} #${entry.actorId}`],
        [
            LocalizeText('housekeeping.audit.detail.target'),
            `${LocalizeText(`housekeeping.audit.target.${entry.targetType}`)} ${resolveHousekeepingTarget(entry)}${entry.targetLabel && entry.targetId ? ` #${entry.targetId}` : ''}`
        ],
        [LocalizeText('housekeeping.audit.detail.action'), `${localizeHousekeepingAction(entry.action)} (${entry.action})`]
    ];

    return (
        <div className="mt-1 flex flex-col gap-1.5 rounded border border-zinc-200 bg-zinc-50 p-2 text-[11px]">
            <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5">
                {rows.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className="font-semibold text-zinc-500">{label}</dt>
                        <dd className="m-0 break-words text-zinc-800">{value}</dd>
                    </div>
                ))}
                <dt className="font-semibold text-zinc-500">{LocalizeText('housekeeping.audit.detail.result')}</dt>
                <dd className={`m-0 flex items-center gap-1 ${entry.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {entry.success ? <FaCheck size={9} /> : <FaExclamationCircle size={9} />}
                    {LocalizeText(entry.success ? 'housekeeping.audit.detail.ok' : 'housekeeping.audit.detail.failed')}
                </dd>
            </dl>
            {fields.length > 0 && (
                <table className="w-full border-collapse overflow-hidden rounded border border-zinc-200 bg-white">
                    <tbody>
                        {fields.map((field, index) => (
                            <tr key={`${field.key}-${index}`} className="border-b border-zinc-100 last:border-b-0">
                                <td className="w-[110px] px-1.5 py-0.5 align-top font-mono text-[10px] text-zinc-500">
                                    {field.key || LocalizeText('housekeeping.audit.detail.note')}
                                </td>
                                <td className="break-all px-1.5 py-0.5 text-zinc-800">{field.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {(roomId > 0 || userId > 0) && (
                <button
                    className="flex items-center gap-1 self-start rounded border border-sky-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50"
                    type="button"
                    onClick={open}
                >
                    <FaExternalLinkAlt size={8} />
                    {LocalizeText(roomId > 0 ? 'housekeeping.audit.detail.open_room' : 'housekeeping.audit.detail.open_user')}
                </button>
            )}
        </div>
    );
};
