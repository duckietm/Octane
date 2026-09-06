import { GetSessionDataManager, ModAlertMessageComposer } from '@octane/renderer';
import { FC, useCallback, useMemo, useState } from 'react';
import { FaBan, FaCoins, FaCouch, FaExclamationTriangle, FaMinus, FaPlus } from 'react-icons/fa';
import { HousekeepingApi, localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../../../api';
import {
    Button,
    DraggableWindowPosition,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardTabsItemView,
    OctaneCardTabsView,
    OctaneCardView
} from '../../../../common';
import { useModTools, useNotification } from '../../../../hooks';
import {
    BAN_DURATIONS,
    clampAmount,
    getWarningBounds,
    MAX_COIN_AMOUNT,
    MAX_FURNI_AMOUNT,
    MIN_COIN_AMOUNT,
    MIN_FURNI_AMOUNT,
    parseFurniReference,
    validateWarning
} from './ModToolsNewToolFormat';

interface ModToolsNewToolViewProps {
    onCloseClick: () => void;
}

type ToolTab = 'ban' | 'warning' | 'coins' | 'furni';

/** Topic id the official send-message window uses when no CFH topic was chosen. */
const TOPIC_NOT_SELECTED = -999;

const Label: FC<{ text: string }> = ({ text }) => <label className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">{text}</label>;

const Stepper: FC<{ value: number; min: number; max: number; onChange: (value: number) => void }> = ({ value, min, max, onChange }) => (
    <div className="flex items-center gap-1">
        <button
            className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-300 bg-white hover:bg-zinc-100"
            disabled={value <= min}
            type="button"
            onClick={() => onChange(clampAmount(value - 1, min, max))}
        >
            <FaMinus size={9} />
        </button>
        <input
            className="w-20 text-center tabular-nums"
            inputMode="numeric"
            type="text"
            value={value}
            onChange={(event) => onChange(clampAmount(event.target.value, min, max))}
        />
        <button
            className="inline-flex items-center justify-center w-7 h-7 rounded border border-zinc-300 bg-white hover:bg-zinc-100"
            disabled={value >= max}
            type="button"
            onClick={() => onChange(clampAmount(value + 1, min, max))}
        >
            <FaPlus size={9} />
        </button>
    </div>
);

/**
 * The "new moderation tool" of the official client: ban management, warnings, coins and
 * furni behind one small tabbed window. The hotel alert tab is left out on purpose, the
 * housekeeping dashboard already sends hotel alerts. Users are typed by name and resolved
 * through the housekeeping lookup before any packet that needs an id goes out.
 */
export const ModToolsNewToolView: FC<ModToolsNewToolViewProps> = (props) => {
    const { onCloseClick = null } = props;
    const [tab, setTab] = useState<ToolTab>('ban');
    const [busy, setBusy] = useState(false);
    const ownName = GetSessionDataManager()?.userName ?? '';
    const [banUsername, setBanUsername] = useState(ownName);
    const [banMode, setBanMode] = useState<'ban' | 'unban'>('ban');
    const [banDuration, setBanDuration] = useState(BAN_DURATIONS.length - 1);
    const [banReason, setBanReason] = useState('');
    const [warningUsername, setWarningUsername] = useState('');
    const [warningText, setWarningText] = useState('');
    const [coinsUsername, setCoinsUsername] = useState(ownName);
    const [coinsAmount, setCoinsAmount] = useState(MIN_COIN_AMOUNT);
    const [furniUsername, setFurniUsername] = useState(ownName);
    const [furniReference, setFurniReference] = useState('');
    const [furniAmount, setFurniAmount] = useState(MIN_FURNI_AMOUNT);
    const { settings = null } = useModTools();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const warningBounds = useMemo(() => getWarningBounds(), []);
    const warningProblem = validateWarning(warningText, warningBounds.min, warningBounds.max);

    const errorTitle = localizeWithFallback('generic.error_title', 'Error');
    const successTitle = localizeWithFallback('generic.success', 'Success');

    const notify = useCallback((message: string, title: string) => simpleAlert?.(message, NotificationAlertType.MODERATION, null, null, title), [simpleAlert]);

    // Names are what a moderator types; every packet below wants an id. The lookup is the
    // housekeeping one because the mod tool packets have no name variant of their own.
    const resolveUserId = useCallback(
        async (username: string): Promise<number | null> => {
            const trimmed = (username || '').trim();

            if (!trimmed.length) {
                notify(localizeWithFallback('modtools.newtool.error.no_user', 'Type the name of a user first'), errorTitle);
                return null;
            }

            try {
                const user = await HousekeepingApi.findUserByName(trimmed);

                if (user) return user.id;
            } catch {
                // A timeout or a refused lookup ends up in the same "not found" message below.
            }

            notify(localizeWithFallback('modtools.newtool.error.user_not_found', 'No user called %name% was found', ['name'], [trimmed]), errorTitle);

            return null;
        },
        [notify, errorTitle]
    );

    const runBan = async () => {
        const userId = await resolveUserId(banUsername);

        if (userId === null) return;

        const duration = BAN_DURATIONS[banDuration] ?? BAN_DURATIONS[BAN_DURATIONS.length - 1];
        const durationLabel = localizeWithFallback(`modtools.newtool.ban.duration.${duration.key}`, duration.fallbackLabel);
        const actionLabel =
            banMode === 'ban'
                ? localizeWithFallback('modtools.newtool.ban.action.ban', 'BAN')
                : localizeWithFallback('modtools.newtool.ban.action.unban', 'UNBAN');
        const summary =
            banMode === 'ban'
                ? localizeWithFallback(
                      'modtools.newtool.ban.confirm.ban',
                      'You are about to %action% %user% for %duration%. Continue?',
                      ['action', 'user', 'duration'],
                      [actionLabel, banUsername.trim(), durationLabel]
                  )
                : localizeWithFallback(
                      'modtools.newtool.ban.confirm.unban',
                      'You are about to %action% %user%. Continue?',
                      ['action', 'user'],
                      [actionLabel, banUsername.trim()]
                  );

        showConfirm?.(
            summary,
            async () => {
                setBusy(true);

                try {
                    const result =
                        banMode === 'ban' ? await HousekeepingApi.banUser(userId, banReason.trim(), duration.hours) : await HousekeepingApi.unbanUser(userId);

                    notify(result.message || (result.ok ? successTitle : errorTitle), result.ok ? successTitle : errorTitle);
                } catch {
                    notify(localizeWithFallback('generic.error', 'Something went wrong.'), errorTitle);
                } finally {
                    setBusy(false);
                }
            },
            null,
            null,
            null,
            localizeWithFallback('modtools.newtool.ban.confirm.title', 'Ban management')
        );
    };

    const runWarning = async () => {
        if (warningProblem) {
            const text =
                warningProblem === 'short'
                    ? localizeWithFallback(
                          'modtools.newtool.warning.validation_short',
                          'The warning must be at least %x% characters long',
                          ['x'],
                          [String(warningBounds.min)]
                      )
                    : warningProblem === 'long'
                      ? localizeWithFallback(
                            'modtools.newtool.warning.validation_long',
                            'The warning must be at most %x% characters long',
                            ['x'],
                            [String(warningBounds.max)]
                        )
                      : localizeWithFallback('modtools.newtool.warning.validation_empty', 'Write the warning first');

            notify(text, localizeWithFallback('modtools.newtool.warning.warn_title', 'Cannot send the warning'));
            return;
        }

        const userId = await resolveUserId(warningUsername);

        if (userId === null) return;

        SendMessageComposer(new ModAlertMessageComposer(userId, warningText.trim(), TOPIC_NOT_SELECTED));
        notify(localizeWithFallback('modtools.newtool.warning.sent', 'Warning sent to %name%', ['name'], [warningUsername.trim()]), successTitle);
        setWarningText('');
    };

    const runGiveCoins = async () => {
        const userId = await resolveUserId(coinsUsername);

        if (userId === null) return;

        setBusy(true);

        try {
            const result = await HousekeepingApi.giveCredits(userId, coinsAmount);

            notify(result.message || (result.ok ? successTitle : errorTitle), result.ok ? successTitle : errorTitle);
        } catch {
            notify(localizeWithFallback('generic.error', 'Something went wrong.'), errorTitle);
        } finally {
            setBusy(false);
        }
    };

    const runGiveFurni = async () => {
        const reference = parseFurniReference(furniReference);
        // A class name is looked up in furnidata; the hotel's item ids follow furnidata ids
        // in every deployment this client targets.
        const itemId = reference.itemId ?? (reference.className ? (GetSessionDataManager()?.getFloorItemDataByName?.(reference.className)?.id ?? null) : null);

        if (!itemId) {
            notify(
                localizeWithFallback('modtools.newtool.furni.error.unknown', 'No furni matches %product%', ['product'], [furniReference.trim()]),
                errorTitle
            );
            return;
        }

        const userId = await resolveUserId(furniUsername);

        if (userId === null) return;

        setBusy(true);

        try {
            const result = await HousekeepingApi.grantItem(userId, itemId, furniAmount);

            notify(result.message || (result.ok ? successTitle : errorTitle), result.ok ? successTitle : errorTitle);
        } catch {
            notify(localizeWithFallback('generic.error', 'Something went wrong.'), errorTitle);
        } finally {
            setBusy(false);
        }
    };

    const canBan = !!settings?.banPermission;
    const canWarn = !!settings?.alertPermission;
    const noPermissionHint = localizeWithFallback('modtools.userinfo.button.no_permission', 'You do not have the right to use this tool');

    return (
        <OctaneCardView
            className="octane-mod-tools-new-tool min-w-0 w-[min(360px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('modtools.newtool.title', 'Moderation tool')} onCloseClick={() => onCloseClick()} />
            <OctaneCardTabsView>
                <OctaneCardTabsItemView isActive={tab === 'ban'} onClick={() => setTab('ban')}>
                    <span className="inline-flex items-center gap-1">
                        <FaBan size={10} /> {localizeWithFallback('modtools.newtool.tab.ban', 'Ban users')}
                    </span>
                </OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={tab === 'warning'} onClick={() => setTab('warning')}>
                    <span className="inline-flex items-center gap-1">
                        <FaExclamationTriangle size={10} /> {localizeWithFallback('modtools.newtool.tab.warning', 'Send warning')}
                    </span>
                </OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={tab === 'coins'} onClick={() => setTab('coins')}>
                    <span className="inline-flex items-center gap-1">
                        <FaCoins size={10} /> {localizeWithFallback('modtools.newtool.tab.coins', 'Give coins')}
                    </span>
                </OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={tab === 'furni'} onClick={() => setTab('furni')}>
                    <span className="inline-flex items-center gap-1">
                        <FaCouch size={10} /> {localizeWithFallback('modtools.newtool.tab.furni', 'Give furni')}
                    </span>
                </OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView className="text-black" gap={2}>
                {tab === 'ban' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Label text={localizeWithFallback('modtools.newtool.ban.user', 'User')} />
                            <input className="w-full" type="text" value={banUsername} onChange={(event) => setBanUsername(event.target.value)} />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <input
                                    checked={banMode === 'ban'}
                                    className="form-check-input"
                                    name="ban-mode"
                                    type="radio"
                                    onChange={() => setBanMode('ban')}
                                />
                                {localizeWithFallback('modtools.newtool.ban.ban', 'Ban')}
                            </label>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <input
                                    checked={banMode === 'unban'}
                                    className="form-check-input"
                                    name="ban-mode"
                                    type="radio"
                                    onChange={() => setBanMode('unban')}
                                />
                                {localizeWithFallback('modtools.newtool.ban.unban', 'Unban')}
                            </label>
                            <select
                                aria-label={localizeWithFallback('modtools.newtool.ban.duration', 'Duration')}
                                className="form-select form-select-sm ml-auto w-auto"
                                disabled={banMode !== 'ban'}
                                value={banDuration}
                                onChange={(event) => setBanDuration(parseInt(event.target.value, 10))}
                            >
                                {BAN_DURATIONS.map((duration, index) => (
                                    <option key={duration.key} value={index}>
                                        {localizeWithFallback(`modtools.newtool.ban.duration.${duration.key}`, duration.fallbackLabel)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {banMode === 'ban' && (
                            <div className="flex flex-col gap-1">
                                <Label text={localizeWithFallback('modtools.newtool.ban.reason', 'Reason')} />
                                <input className="w-full" type="text" value={banReason} onChange={(event) => setBanReason(event.target.value)} />
                            </div>
                        )}
                        <Button disabled={busy || !canBan} fullWidth gap={1} title={!canBan ? noPermissionHint : undefined} variant="danger" onClick={runBan}>
                            <FaBan size={11} /> {localizeWithFallback('modtools.newtool.ban.do', 'Do it')}
                        </Button>
                    </div>
                )}
                {tab === 'warning' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Label text={localizeWithFallback('modtools.newtool.warning.user', 'User')} />
                            <input className="w-full" type="text" value={warningUsername} onChange={(event) => setWarningUsername(event.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label text={localizeWithFallback('modtools.newtool.warning.text', 'Warning')} />
                            <textarea
                                className="min-h-[70px] px-2 py-1.5 rounded text-sm border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                value={warningText}
                                onChange={(event) => setWarningText(event.target.value)}
                            />
                            <div className={`text-xs ${warningProblem && warningText.trim().length ? 'text-rose-600' : 'opacity-60'}`}>
                                {localizeWithFallback(
                                    'modtools.newtool.warning.length',
                                    '%count% / %max% characters (at least %min%)',
                                    ['count', 'max', 'min'],
                                    [String(warningText.trim().length), String(warningBounds.max), String(warningBounds.min)]
                                )}
                            </div>
                        </div>
                        <Button
                            disabled={busy || !canWarn}
                            fullWidth
                            gap={1}
                            title={!canWarn ? noPermissionHint : undefined}
                            variant="primary"
                            onClick={runWarning}
                        >
                            <FaExclamationTriangle size={11} /> {localizeWithFallback('modtools.newtool.warning.send', 'Send warning')}
                        </Button>
                    </div>
                )}
                {tab === 'coins' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Label text={localizeWithFallback('modtools.newtool.coins.user', 'User')} />
                            <input className="w-full" type="text" value={coinsUsername} onChange={(event) => setCoinsUsername(event.target.value)} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <Label text={localizeWithFallback('modtools.newtool.coins.amount', 'Amount of coins')} />
                            <Stepper max={MAX_COIN_AMOUNT} min={MIN_COIN_AMOUNT} value={coinsAmount} onChange={setCoinsAmount} />
                        </div>
                        <Button disabled={busy} fullWidth gap={1} variant="success" onClick={runGiveCoins}>
                            <FaCoins size={11} /> {localizeWithFallback('modtools.newtool.coins.add', 'Add coins')}
                        </Button>
                    </div>
                )}
                {tab === 'furni' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Label text={localizeWithFallback('modtools.newtool.furni.user', 'User')} />
                            <input className="w-full" type="text" value={furniUsername} onChange={(event) => setFurniUsername(event.target.value)} />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex flex-col gap-1 grow">
                                <Label text={localizeWithFallback('modtools.newtool.furni.product', 'Product name or id')} />
                                <input
                                    className="w-full"
                                    placeholder="throne"
                                    type="text"
                                    value={furniReference}
                                    onChange={(event) => setFurniReference(event.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label text={localizeWithFallback('modtools.newtool.furni.amount', 'Amount')} />
                                <Stepper max={MAX_FURNI_AMOUNT} min={MIN_FURNI_AMOUNT} value={furniAmount} onChange={setFurniAmount} />
                            </div>
                        </div>
                        <Button disabled={busy || !furniReference.trim().length} fullWidth gap={1} variant="success" onClick={runGiveFurni}>
                            <FaCouch size={11} /> {localizeWithFallback('modtools.newtool.furni.add', 'Add furni')}
                        </Button>
                    </div>
                )}
                <div className="text-[.65rem] opacity-50 italic">
                    {localizeWithFallback('modtools.newtool.hotel_alert.hint', 'Hotel alerts are sent from the housekeeping dashboard.')}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
