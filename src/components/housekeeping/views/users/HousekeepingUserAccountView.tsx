import { FC, useEffect, useState } from 'react';
import { FaHourglassHalf, FaKey, FaStop, FaUserShield } from 'react-icons/fa';
import {
    formatHousekeepingDateTime,
    HK_MAX_RANK,
    HOUSEKEEPING_TEMP_RANK_DAYS,
    HOUSEKEEPING_TEMP_RANK_MAX_DAYS,
    HousekeepingApi,
    housekeepingTempRankSeconds,
    IHousekeepingList,
    IHousekeepingUser,
    LocalizeText
} from '../../../../api';
import { useHasPermission, useHousekeeping, useHousekeepingDangerConfirm } from '../../../../hooks';
import { HousekeepingButton, HousekeepingNumberField, HousekeepingSection } from '../common/HousekeepingParts';

const TEMP_RANK_LIST = 'user.temp_rank';

interface TemporaryRank {
    rank: string;
    previousRankId: number;
    previous: string;
    expires: number;
    staff: string;
}

const readTemporaryRank = (list: IHousekeepingList | null): TemporaryRank | null => {
    const row = list?.rows[0];

    if (!list || !row) return null;

    const cell = (name: string) => row[list.columns.indexOf(name)] ?? '';
    const named = (name: string, id: string) => (cell(name) ? `${cell(name)} (${cell(id)})` : `#${cell(id)}`);

    return {
        rank: named('rank_name', 'rank'),
        previousRankId: Number(cell('previous_rank')) || 1,
        previous: named('previous_rank_name', 'previous_rank'),
        expires: Number(cell('expires')) || 0,
        staff: cell('staff')
    };
};

/** Rank (lasting or for a number of days) and password of the selected user. */
export const HousekeepingUserAccountView: FC<{ user: IHousekeepingUser }> = ({ user }) => {
    const { isActionPending, setUserRank, resetUserPassword } = useHousekeeping();
    const confirmDanger = useHousekeepingDangerConfirm();
    // Rank changes belong to the permissions area; without it the page keeps the password only.
    const canChangeRank = useHasPermission('acc_hk_permissions');
    const [rankDraft, setRankDraft] = useState<number>(user.rank || 1);
    // 0 = a lasting rank; otherwise the rank lasts this many days, then the previous one comes back.
    const [days, setDays] = useState(0);
    const [temporaryRank, setTemporaryRank] = useState<TemporaryRank | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        HousekeepingApi.requestList(TEMP_RANK_LIST, user.id, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setTemporaryRank(result.ok ? readTemporaryRank(result) : null);
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, [user.id, reload]);

    const durationSeconds = housekeepingTempRankSeconds(days);
    const isTemporary = durationSeconds > 0;
    const unchanged = rankDraft === user.rank && !isTemporary;

    const giveRank = () =>
        confirmDanger(
            isTemporary
                ? LocalizeText('housekeeping.user.account.rank_temp_confirm', ['rank', 'days'], [String(rankDraft), String(days)])
                : LocalizeText('housekeeping.user.account.rank_confirm', ['rank'], [String(rankDraft)]),
            user.username,
            async () => {
                const result = await setUserRank(user.id, rankDraft, durationSeconds);

                if (result?.ok) setReload((value) => value + 1);
            },
            LocalizeText('housekeeping.action.set_rank')
        );

    // Ending early is a lasting change back to the previous rank, which also stops the timer.
    const endTemporaryRank = (rank: TemporaryRank) =>
        confirmDanger(
            LocalizeText('housekeeping.user.account.rank_temp_end_confirm', ['rank'], [rank.previous]),
            user.username,
            async () => {
                const result = await setUserRank(user.id, rank.previousRankId);

                if (result?.ok) {
                    setRankDraft(rank.previousRankId);
                    setReload((value) => value + 1);
                }
            },
            LocalizeText('housekeeping.user.account.rank_temp_end')
        );

    return (
        <div className="flex flex-col gap-2">
            {canChangeRank && (
                <HousekeepingSection
                    icon={<FaUserShield className="text-violet-500" size={9} />}
                    title={LocalizeText('housekeeping.user.account.rank')}
                    tone="accent"
                >
                    {temporaryRank && (
                        <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                            <FaHourglassHalf className="shrink-0 text-amber-600" size={11} />
                            <span className="grow">
                                {LocalizeText(
                                    'housekeeping.user.account.rank_temp_running',
                                    ['rank', 'until', 'previous', 'staff'],
                                    [
                                        temporaryRank.rank,
                                        formatHousekeepingDateTime(temporaryRank.expires * 1000),
                                        temporaryRank.previous,
                                        temporaryRank.staff || '-'
                                    ]
                                )}
                            </span>
                            <HousekeepingButton
                                disabled={isActionPending}
                                gap={1}
                                size="sm"
                                variant="secondary"
                                onClick={() => endTemporaryRank(temporaryRank)}
                            >
                                <FaStop size={8} />
                                <span>{LocalizeText('housekeeping.user.account.rank_temp_end')}</span>
                            </HousekeepingButton>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <HousekeepingNumberField label={LocalizeText('housekeeping.field.rank')} max={HK_MAX_RANK} value={rankDraft} onChange={setRankDraft} />
                        <span className="text-[10px] text-zinc-500">
                            {LocalizeText('housekeeping.user.account.rank_current', ['rank'], [`${user.rankName} (${user.rank})`])}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                            {LocalizeText('housekeeping.user.account.rank_for')}
                        </span>
                        <HousekeepingButton size="sm" variant={days === 0 ? 'primary' : 'neutral'} onClick={() => setDays(0)}>
                            <span>{LocalizeText('housekeeping.user.account.rank_lasting')}</span>
                        </HousekeepingButton>
                        {HOUSEKEEPING_TEMP_RANK_DAYS.map((preset) => (
                            <HousekeepingButton key={preset} size="sm" variant={days === preset ? 'primary' : 'neutral'} onClick={() => setDays(preset)}>
                                <span>{LocalizeText('housekeeping.user.account.rank_days', ['days'], [String(preset)])}</span>
                            </HousekeepingButton>
                        ))}
                        <HousekeepingNumberField
                            max={HOUSEKEEPING_TEMP_RANK_MAX_DAYS}
                            unit={LocalizeText('housekeeping.unit.days')}
                            value={days}
                            widthClass="w-14"
                            onChange={setDays}
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-500">
                            {isTemporary
                                ? LocalizeText('housekeeping.user.account.rank_temp_hint', ['days'], [String(days)])
                                : LocalizeText('housekeeping.user.account.rank_lasting_hint')}
                        </span>
                        <HousekeepingButton classNames={['ml-auto']} disabled={isActionPending || unchanged} gap={1} variant="primary" onClick={giveRank}>
                            <FaUserShield size={10} />
                            <span>{LocalizeText('housekeeping.action.set_rank')}</span>
                        </HousekeepingButton>
                    </div>
                </HousekeepingSection>
            )}
            <HousekeepingSection icon={<FaKey className="text-zinc-500" size={9} />} title={LocalizeText('housekeeping.user.account.password')}>
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-600">{LocalizeText('housekeeping.user.account.password_hint')}</span>
                    <HousekeepingButton
                        classNames={['ml-auto', 'shrink-0']}
                        disabled={isActionPending}
                        gap={1}
                        variant="secondary"
                        onClick={() =>
                            confirmDanger(
                                LocalizeText('housekeeping.action.reset_password.confirm'),
                                user.username,
                                () => resetUserPassword(user.id),
                                LocalizeText('housekeeping.action.reset_password')
                            )
                        }
                    >
                        <FaKey size={10} />
                        <span>{LocalizeText('housekeeping.action.reset_password')}</span>
                    </HousekeepingButton>
                </div>
            </HousekeepingSection>
        </div>
    );
};
