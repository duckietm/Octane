import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaPlus, FaStickyNote, FaTrash } from 'react-icons/fa';
import { formatHousekeepingDateTime, HousekeepingApi, housekeepingFailureKey, IHousekeepingList, IHousekeepingUser, LocalizeText } from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingEmptyState, HousekeepingSection } from '../common/HousekeepingParts';

const NOTES_LIST = 'user.notes';
const NOTE_MAX = 500;

/** Internal staff notes on the user, newest first; each operator can delete their own. */
export const HousekeepingUserNotesView: FC<{ user: IHousekeepingUser }> = ({ user }) => {
    const { isActionPending, addUserNote, deleteUserNote } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [list, setList] = useState<IHousekeepingList | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);
    const [draft, setDraft] = useState('');
    const ownId = GetSessionDataManager()?.userId ?? 0;

    useEffect(() => {
        const controller = new AbortController();

        setError(null);

        HousekeepingApi.requestList(NOTES_LIST, user.id, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;

                setList(result);
                setError(result.ok ? null : result.message || 'housekeeping.list.failed');
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(housekeepingFailureKey(reason, 'housekeeping.list.failed'));
            });

        return () => controller.abort();
    }, [user.id, reload]);

    const column = (name: string) => list?.columns.indexOf(name) ?? -1;
    const cell = (row: string[], name: string) => {
        const index = column(name);

        return index >= 0 ? row[index] : '';
    };

    const trimmed = draft.trim();

    const add = async () => {
        const result = await addUserNote(user.id, trimmed);

        if (!result?.ok) return;

        setDraft('');
        setReload((value) => value + 1);
    };

    const remove = (noteId: number) =>
        confirm(LocalizeText('housekeeping.user.notes.delete.confirm'), async () => {
            const result = await deleteUserNote(user.id, noteId);

            if (result?.ok) setReload((value) => value + 1);
        });

    return (
        <HousekeepingSection icon={<FaStickyNote className="text-amber-500" size={9} />} title={LocalizeText('housekeeping.user.notes.label')} tone="warning">
            <div className="text-[10px] text-zinc-500">{LocalizeText('housekeeping.user.notes.hint')}</div>
            <textarea
                className={`${HOUSEKEEPING_INPUT_CLASS} min-h-[60px] resize-y`}
                maxLength={NOTE_MAX}
                placeholder={LocalizeText('housekeeping.user.notes.placeholder')}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
            />
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-zinc-500">
                    {trimmed.length}/{NOTE_MAX}
                </span>
                <HousekeepingButton classNames={['ml-auto']} disabled={isActionPending || !trimmed} gap={1} size="sm" variant="primary" onClick={add}>
                    <FaPlus size={9} />
                    <span>{LocalizeText('housekeeping.user.notes.add')}</span>
                </HousekeepingButton>
            </div>

            {error && <HousekeepingEmptyState>{LocalizeText(error)}</HousekeepingEmptyState>}
            {!error && !list && <HousekeepingEmptyState>{LocalizeText('generic.loading')}</HousekeepingEmptyState>}
            {!error && list && list.rows.length === 0 && <HousekeepingEmptyState>{LocalizeText('housekeeping.user.notes.empty')}</HousekeepingEmptyState>}

            {!error &&
                list?.rows.map((row) => {
                    const noteId = parseInt(cell(row, 'note_id')) || 0;
                    const isOwn = (parseInt(cell(row, 'staff_id')) || 0) === ownId;

                    return (
                        <div key={noteId} className="flex flex-col gap-0.5 rounded border border-amber-200 bg-amber-50/40 p-1.5 text-[11px]">
                            <div className="whitespace-pre-wrap break-words text-zinc-800">{cell(row, 'note')}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                <span className="font-semibold">{cell(row, 'staff') || '-'}</span>
                                <span>{formatHousekeepingDateTime((parseInt(cell(row, 'time')) || 0) * 1000)}</span>
                                {isOwn && (
                                    <button
                                        className="ml-auto text-zinc-400 hover:text-rose-600 disabled:opacity-40"
                                        disabled={isActionPending}
                                        title={LocalizeText('housekeeping.user.notes.delete')}
                                        type="button"
                                        onClick={() => remove(noteId)}
                                    >
                                        <FaTrash size={9} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
        </HousekeepingSection>
    );
};
