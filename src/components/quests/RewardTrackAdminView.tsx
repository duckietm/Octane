import { RewardTrackAdminPrize, RewardTrackAdminTask, RewardTrackAdminTrack } from '@octane/renderer';
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, reorderRewardTrackEntries, RewardTrackFieldErrors, validateRewardTrackInput, validateRewardTrackPrizeInput, validateRewardTrackTaskInput } from '../../api';
import { Button, LayoutFurniIconImageView } from '../../common';
import { RewardTrackAdminEntity, RewardTrackAdminPrizeInput, RewardTrackAdminTaskInput, RewardTrackAdminTrackInput, useRewardTrackAdmin } from '../../hooks';
import { RewardTrackAdminModalView } from './RewardTrackAdminModalView';

const text = (key: string, fallback: string) => localizeWithFallback(`reward_track.admin.${key}`, fallback);

/** A unix timestamp (seconds, 0 for none) as the value of a datetime-local input, in local time. */
export const unixToLocalInput = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '';

    const date = new Date(seconds * 1000);
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** The value of a datetime-local input back to unix seconds, 0 when empty or unreadable. */
export const localInputToUnix = (value: string): number => {
    if (!value) return 0;

    const millis = new Date(value).getTime();

    return Number.isFinite(millis) && millis > 0 ? Math.floor(millis / 1000) : 0;
};

export type RewardTrackAdminFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'off';

/** Where a track stands now: off, not started yet, over, or running. */
export const getRewardTrackAdminState = (track: { enabled: boolean; startsAt: number; endsAt: number }, now = Math.floor(Date.now() / 1000)): Exclude<RewardTrackAdminFilter, 'all'> => {
    if (!track.enabled) return 'off';
    if (track.startsAt > 0 && track.startsAt > now) return 'scheduled';
    if (track.endsAt > 0 && track.endsAt <= now) return 'expired';

    return 'active';
};

const FILTERS: RewardTrackAdminFilter[] = ['all', 'active', 'scheduled', 'expired', 'off'];

/** The text keys of a track and its tasks, in the order the editor shows them. */
export const getRewardTrackTextKeys = (taskIds: string[]): { key: string; label: string }[] => [
    { key: 'name', label: text('texts.name', 'Track name') },
    { key: 'desc', label: text('texts.desc', 'Track description') },
    { key: 'info', label: text('texts.info', 'Track info line') },
    ...taskIds.flatMap((taskId) => [
        { key: `task.${taskId}.name`, label: `${taskId} · ${text('texts.task.name', 'name')}` },
        { key: `task.${taskId}.desc`, label: `${taskId} · ${text('texts.task.desc', 'description')}` },
        { key: `task.${taskId}.hint.desc`, label: `${taskId} · ${text('texts.task.hint', 'hint')}` },
        { key: `task.${taskId}.hint.button_text`, label: `${taskId} · ${text('texts.task.button', 'hint button')}` }
    ])
];

const formatDate = (seconds: number): string => (seconds > 0 ? new Date(seconds * 1000).toLocaleDateString() : '');

const toInt = (value: string, fallback = 0): number => {
    const parsed = Number.parseInt(value, 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

const emptyTrack = (): RewardTrackAdminTrackInput => ({
    id: '',
    theme: 'blue',
    sortOrder: 0,
    startsAt: 0,
    endsAt: 0,
    hasPremium: false,
    premiumBoostPercent: 100,
    premiumInstantPoints: 0,
    premiumCostDiamonds: 0,
    premiumCostCredits: 0,
    enabled: true
});

const trackToInput = (track: RewardTrackAdminTrack): RewardTrackAdminTrackInput => ({
    id: track.id,
    theme: track.theme,
    sortOrder: track.sortOrder,
    startsAt: track.startsAt,
    endsAt: track.endsAt,
    hasPremium: track.hasPremium,
    premiumBoostPercent: track.premiumBoostPercent,
    premiumInstantPoints: track.premiumInstantPoints,
    premiumCostDiamonds: track.premiumCostDiamonds,
    premiumCostCredits: track.premiumCostCredits,
    enabled: track.enabled
});

const emptyTask = (trackId: string, actionType: string, sortOrder: number): RewardTrackAdminTaskInput => ({
    trackId,
    id: '',
    actionType,
    parameter: '',
    premium: false,
    sortOrder,
    levels: [{ requiredCount: 1, pointsReward: 10, premium: false }]
});

const taskToInput = (trackId: string, task: RewardTrackAdminTask): RewardTrackAdminTaskInput => ({
    trackId,
    id: task.id,
    actionType: task.actionType,
    parameter: task.parameter,
    premium: task.premium,
    sortOrder: task.sortOrder,
    levels: task.levels.map((level) => ({ ...level }))
});

const emptyPrize = (trackId: string, rewardType: string, sortOrder: number): RewardTrackAdminPrizeInput => ({
    trackId,
    id: '',
    requiredPoints: 0,
    productItemTypeId: 0,
    rewardType,
    extraParams: '',
    rewardAmount: 1,
    premium: false,
    sortOrder
});

const prizeToInput = (trackId: string, prize: RewardTrackAdminPrize): RewardTrackAdminPrizeInput => ({
    trackId,
    id: prize.id,
    requiredPoints: prize.requiredPoints,
    productItemTypeId: prize.productItemTypeId,
    rewardType: prize.rewardType,
    extraParams: prize.extraParams,
    rewardAmount: prize.rewardAmount,
    premium: prize.premium,
    sortOrder: prize.sortOrder
});

/** The twin of a prize on the other row: the free one gets a premium copy 20 points further, and the other way round. */
const prizeTwin = (trackId: string, prize: RewardTrackAdminPrize): RewardTrackAdminPrizeInput => ({
    ...prizeToInput(trackId, prize),
    id: prize.premium ? prize.id.replace(/_premium$/, '') + '_free' : prize.id + '_premium',
    premium: !prize.premium,
    requiredPoints: prize.premium ? Math.max(0, prize.requiredPoints - 20) : prize.requiredPoints + 20,
    sortOrder: prize.sortOrder + 1
});

const BTN = ['octane-reward-track-admin-btn'];

/** A delete button that asks once: the first click arms it, the second one deletes. */
const DeleteButton: FC<{ armed: boolean; disabled?: boolean; onArm: () => void; onConfirm: () => void }> = ({ armed, disabled = false, onArm, onConfirm }) => (
    <Button variant={armed ? 'danger' : 'secondary'} classNames={BTN} disabled={disabled} onClick={armed ? onConfirm : onArm} data-testid={armed ? 'rt-admin-delete-confirm' : 'rt-admin-delete'}>
        {armed ? text('delete.confirm', 'Confirm') : text('delete', 'Delete')}
    </Button>
);

const Field: FC<{ label: string; error?: string; children: ReactNode; span?: number }> = ({ label, error = null, children, span = 1 }) => (
    <label className={`octane-reward-track-admin-field${error ? ' has-error' : ''}`} style={span > 1 ? { gridColumn: `span ${span}` } : undefined}>
        <span className="octane-reward-track-admin-label">{label}</span>
        {children}
        {error && <span className="octane-reward-track-admin-field-error">{error}</span>}
    </label>
);

const Toggle: FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="octane-reward-track-admin-toggle-field">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
    </label>
);

const Tag: FC<{ kind?: 'premium' | 'off' | 'on' | 'info' | 'scheduled' | 'expired'; children: ReactNode }> = ({ kind = 'info', children }) => <span className={`octane-reward-track-admin-tag is-${kind}`}>{children}</span>;

const StateTag: FC<{ state: Exclude<RewardTrackAdminFilter, 'all'> }> = ({ state }) => {
    switch (state) {
        case 'off':
            return <Tag kind="off">{text('state.off', 'off')}</Tag>;
        case 'scheduled':
            return <Tag kind="scheduled">{text('state.scheduled', 'scheduled')}</Tag>;
        case 'expired':
            return <Tag kind="expired">{text('state.expired', 'expired')}</Tag>;
        default:
            return <Tag kind="on">{text('state.active', 'active')}</Tag>;
    }
};

/** A bordered panel; with a collapseKey its head folds it, and it starts folded every time the editor opens. */
const Panel: FC<{ title: ReactNode; summary?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; collapseKey?: string }> = ({
    title,
    summary = null,
    actions = null,
    children,
    className = '',
    collapseKey = null
}) => {
    const [collapsed, setCollapsed] = useState(!!collapseKey);

    return (
        <section className={`octane-reward-track-admin-panel ${className}${collapsed ? ' is-collapsed' : ''}`.trim()}>
            <header className={`octane-reward-track-admin-panel-head${collapseKey ? ' is-toggle' : ''}`} onClick={collapseKey ? () => setCollapsed((value) => !value) : undefined}>
                {collapseKey && (
                    <button type="button" className="octane-reward-track-admin-chevron" aria-expanded={!collapsed} data-testid={`rt-admin-collapse-${collapseKey}`}>
                        {collapsed ? '▸' : '▾'}
                    </button>
                )}
                <span className="octane-reward-track-admin-panel-title">{title}</span>
                {collapsed && summary && <span className="octane-reward-track-admin-panel-summary">{summary}</span>}
                {actions && (
                    <span className="octane-reward-track-admin-panel-actions" onClick={(event) => event.stopPropagation()}>
                        {actions}
                    </span>
                )}
            </header>
            {!collapsed && children}
        </section>
    );
};

const SaveCancel: FC<{ disabled: boolean; errorCount: number; onSave: () => void; onCancel: () => void; before?: ReactNode }> = ({ disabled, errorCount, onSave, onCancel, before = null }) => (
    <div className="octane-reward-track-admin-actions">
        {before}
        <span className="octane-reward-track-admin-spacer" />
        {errorCount > 0 && (
            <span className="octane-reward-track-admin-form-problems" data-testid="rt-admin-form-problems">
                {errorCount === 1 ? text('form.problem', '1 field to fix') : text('form.problems', '%count% fields to fix').replace('%count%', String(errorCount))}
            </span>
        )}
        <Button variant="success" classNames={BTN} disabled={disabled || errorCount > 0} onClick={() => !disabled && errorCount === 0 && onSave()}>
            {text('save', 'Save')}
        </Button>
        <Button variant="secondary" classNames={BTN} onClick={onCancel}>
            {text('cancel', 'Cancel')}
        </Button>
    </div>
);

const hasErrors = (errors: RewardTrackFieldErrors) => Object.keys(errors).length;

const FURNI_SEARCH_DELAY_MS = 300;

/** The furni picker of the prize form: a debounced search on the server, the matches with their icon. */
const FurniPicker: FC<{ value: string; results: { query: string; matches: { name: string; spriteId: number; typeCode: string }[] } | null; onSearch: (query: string) => void; onPick: (name: string) => void }> = ({
    value,
    results,
    onSearch,
    onPick
}) => {
    const [query, setQuery] = useState(value);
    const timer = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => () => timer.current && clearTimeout(timer.current), []);

    const change = (next: string) => {
        setQuery(next);

        if (timer.current) clearTimeout(timer.current);

        if (next.trim().length < 2) return;

        timer.current = setTimeout(() => onSearch(next.trim()), FURNI_SEARCH_DELAY_MS);
    };

    const matches = results && results.query === query.trim() ? results.matches : [];

    return (
        <div className="octane-reward-track-admin-furni-picker" data-testid="rt-admin-furni-picker">
            <input value={query} placeholder={text('furni.search', 'Search a furni by name...')} onChange={(e) => change(e.target.value)} data-testid="rt-admin-furni-query" />
            {matches.length > 0 && (
                <div className="octane-reward-track-admin-furni-results">
                    {matches.map((match) => (
                        <button key={match.name} type="button" className={`octane-reward-track-admin-furni-match${match.name === value ? ' is-picked' : ''}`} onClick={() => onPick(match.name)} data-testid="rt-admin-furni-match">
                            <LayoutFurniIconImageView productType={match.typeCode} productClassId={match.spriteId} className="octane-reward-track-admin-furni-icon" />
                            <span>{match.name}</span>
                        </button>
                    ))}
                </div>
            )}
            {results && results.query === query.trim() && !matches.length && query.trim().length >= 2 && <span className="octane-reward-track-admin-muted">{text('furni.none', 'No furni with that name.')}</span>}
        </div>
    );
};

/** The staff editor of the reward tracks: every stored track, its tasks with their levels, its prizes and its texts. */
export const RewardTrackAdminView: FC<{ onClose: () => void; onPreview?: (trackId: string) => void }> = ({ onClose, onPreview = null }) => {
    const {
        tracks = [],
        actionTypes = [],
        rewardTypes = [],
        loaded = false,
        pending = false,
        lastResult = null,
        furniSearch = null,
        requestData = null,
        saveTrack = null,
        saveTask = null,
        savePrize = null,
        saveTexts = null,
        deleteEntity = null,
        searchFurni = null
    } = useRewardTrackAdmin();
    const [filter, setFilter] = useState<RewardTrackAdminFilter>('all');
    const [selectedTrackId, setSelectedTrackId] = useState<string>(null);
    const [trackForm, setTrackForm] = useState<RewardTrackAdminTrackInput>(null);
    const [duplicateFrom, setDuplicateFrom] = useState<RewardTrackAdminTrack>(null);
    const [taskForm, setTaskForm] = useState<RewardTrackAdminTaskInput>(null);
    const [prizeForm, setPrizeForm] = useState<RewardTrackAdminPrizeInput>(null);
    const [textsForm, setTextsForm] = useState<Record<string, string>>(null);
    const [armed, setArmed] = useState<string>(null);

    const selectedTrack = useMemo(() => tracks.find((track) => track.id === selectedTrackId) ?? null, [tracks, selectedTrackId]);
    const visibleTracks = useMemo(() => tracks.filter((track) => filter === 'all' || getRewardTrackAdminState(track) === filter), [tracks, filter]);
    const trackErrors = useMemo(() => (trackForm ? validateRewardTrackInput(trackForm) : {}), [trackForm]);
    const taskErrors = useMemo(() => (taskForm ? validateRewardTrackTaskInput(taskForm, actionTypes) : {}), [taskForm, actionTypes]);
    const prizeErrors = useMemo(() => (prizeForm ? validateRewardTrackPrizeInput(prizeForm, rewardTypes) : {}), [prizeForm, rewardTypes]);
    const textKeys = useMemo(() => getRewardTrackTextKeys(selectedTrack ? selectedTrack.tasks.map((task) => task.id) : []), [selectedTrack]);

    useEffect(() => {
        requestData && requestData();
    }, [requestData]);

    useEffect(() => {
        if (!selectedTrackId && tracks.length) setSelectedTrackId(tracks[0].id);
    }, [tracks, selectedTrackId]);

    // A successful write closes the form it came from; the fresh list follows from the server.
    useEffect(() => {
        if (!lastResult || !lastResult.success) return;

        setArmed(null);

        if (lastResult.entity === 'task') setTaskForm(null);
        if (lastResult.entity === 'prize') setPrizeForm(null);
        if (lastResult.entity === 'texts') setTextsForm(null);
        if (lastResult.entity === 'track') {
            setTrackForm(null);
            setDuplicateFrom(null);
            setSelectedTrackId(lastResult.trackId || null);
        }
    }, [lastResult]);

    const selectTrack = (id: string) => {
        setSelectedTrackId(id);
        setTrackForm(null);
        setDuplicateFrom(null);
        setTaskForm(null);
        setPrizeForm(null);
        setTextsForm(null);
        setArmed(null);
    };

    const openTrackForm = (form: RewardTrackAdminTrackInput, source: RewardTrackAdminTrack = null) => {
        setTrackForm(form);
        setDuplicateFrom(source);
        setTaskForm(null);
        setPrizeForm(null);
        setTextsForm(null);
    };

    const submitTrack = () => {
        if (!saveTrack || !trackForm) return;

        saveTrack(trackForm);

        // A duplicate copies the tasks, prizes and texts right behind the track; the queue keeps them in order.
        if (duplicateFrom) {
            duplicateFrom.tasks.forEach((task) => saveTask && saveTask(taskToInput(trackForm.id, task)));
            duplicateFrom.prizes.forEach((prize) => savePrize && savePrize(prizeToInput(trackForm.id, prize)));

            const texts = Object.entries(duplicateFrom.texts ?? {}).map(([key, value]) => ({ key, value }));

            if (texts.length && saveTexts) saveTexts(trackForm.id, texts);
        }
    };

    const submitTexts = () => {
        if (!saveTexts || !selectedTrack || !textsForm) return;

        saveTexts(
            selectedTrack.id,
            Object.entries(textsForm)
                .filter(([, value]) => value.trim())
                .map(([key, value]) => ({ key, value: value.trim() }))
        );
    };

    const moveTask = (index: number, direction: -1 | 1) => {
        if (!selectedTrack || !saveTask) return;

        for (const changed of reorderRewardTrackEntries(selectedTrack.tasks, index, index + direction)) {
            saveTask({ ...taskToInput(selectedTrack.id, changed), sortOrder: changed.sortOrder });
        }
    };

    const updateLevel = (index: number, patch: Partial<RewardTrackAdminTaskInput['levels'][number]>) =>
        setTaskForm((form) => ({ ...form, levels: form.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)) }));

    const armKey = (entity: RewardTrackAdminEntity, id: string) => `${entity}:${id}`;
    const isNewTrack = trackForm && !tracks.some((track) => track.id === trackForm.id);
    const nextSortOrder = (entries: { sortOrder: number }[]) => entries.reduce((max, entry) => Math.max(max, entry.sortOrder), 0) + 1;
    const filledTexts = selectedTrack ? Object.keys(selectedTrack.texts ?? {}).length : 0;

    return (
        <div className="octane-reward-track-admin" data-testid="reward-track-admin">
            <div className="octane-reward-track-admin-toolbar">
                <span className="octane-reward-track-admin-heading">{text('title', 'Reward track editor')}</span>
                {lastResult && (
                    <span className={`octane-reward-track-admin-status ${lastResult.success ? 'is-ok' : 'is-error'}`} data-testid="rt-admin-status">
                        {lastResult.success ? text('saved', 'Saved, everyone online has the new track.') : lastResult.message}
                    </span>
                )}
                {pending && <span className="octane-reward-track-admin-status is-pending">{text('saving', 'Saving...')}</span>}
                <Button variant="secondary" classNames={BTN} onClick={onClose}>
                    {text('close', 'Back to the track')}
                </Button>
            </div>

            <div className="octane-reward-track-admin-body">
                <Panel
                    className="is-tracks"
                    title={text('tracks', 'Tracks')}
                    actions={
                        <Button variant="primary" classNames={BTN} onClick={() => openTrackForm(emptyTrack())}>
                            {text('track.new', 'New')}
                        </Button>
                    }
                >
                    <div className="octane-reward-track-admin-filters" data-testid="rt-admin-filters">
                        {FILTERS.map((entry) => (
                            <button key={entry} type="button" className={`octane-reward-track-admin-filter${filter === entry ? ' is-active' : ''}`} onClick={() => setFilter(entry)}>
                                {text(`filter.${entry}`, entry)}
                            </button>
                        ))}
                    </div>
                    <div className="octane-reward-track-admin-track-list">
                        {!loaded && <span className="octane-reward-track-admin-muted">{text('loading', 'Loading...')}</span>}
                        {loaded && !tracks.length && <span className="octane-reward-track-admin-muted">{text('empty', 'No reward track yet.')}</span>}
                        {loaded && tracks.length > 0 && !visibleTracks.length && <span className="octane-reward-track-admin-muted">{text('filter.empty', 'No track in this state.')}</span>}
                        {visibleTracks.map((track) => (
                            <button
                                key={track.id}
                                type="button"
                                className={`octane-reward-track-admin-track${track.id === selectedTrackId ? ' is-active' : ''}${track.enabled ? '' : ' is-disabled'}`}
                                onClick={() => selectTrack(track.id)}
                                data-testid="rt-admin-track-item"
                            >
                                <span className="octane-reward-track-admin-track-swatch" data-theme={track.theme} />
                                <span className="octane-reward-track-admin-track-texts">
                                    <span className="octane-reward-track-admin-track-id">{track.texts?.name ? `${track.texts.name} (${track.id})` : track.id}</span>
                                    <span className="octane-reward-track-admin-muted">
                                        {track.tasks.length} {text('tasks.short', 'tasks')} · {track.prizes.length} {text('prizes.short', 'prizes')}
                                    </span>
                                </span>
                                <StateTag state={getRewardTrackAdminState(track)} />
                            </button>
                        ))}
                    </div>
                </Panel>

                <div className="octane-reward-track-admin-detail">
                    {trackForm && (
                        <RewardTrackAdminModalView
                            title={duplicateFrom ? `${text('track.duplicate', 'Duplicate track')} · ${duplicateFrom.id}` : isNewTrack ? text('track.create', 'New track') : `${text('track.edit', 'Edit track')} · ${trackForm.id}`}
                            width={620}
                            onClose={() => openTrackForm(null)}
                        >
                            <div className="octane-reward-track-admin-form" data-testid="rt-admin-track-form">
                                {duplicateFrom && (
                                    <span className="octane-reward-track-admin-note">
                                        {text('track.duplicate.note', 'The %count% tasks, %prizes% prizes and the texts of %source% are copied under the new id.')
                                            .replace('%count%', String(duplicateFrom.tasks.length))
                                            .replace('%prizes%', String(duplicateFrom.prizes.length))
                                            .replace('%source%', duplicateFrom.id)}
                                    </span>
                                )}
                                <div className="octane-reward-track-admin-grid is-3">
                                    <Field label={text('track.id', 'Id')} error={trackErrors.id}>
                                        <input value={trackForm.id} maxLength={64} placeholder="season_1" disabled={!isNewTrack} onChange={(e) => setTrackForm({ ...trackForm, id: e.target.value })} />
                                    </Field>
                                    <Field label={text('track.theme', 'Theme')} error={trackErrors.theme}>
                                        <input value={trackForm.theme} maxLength={64} placeholder="blue" onChange={(e) => setTrackForm({ ...trackForm, theme: e.target.value })} />
                                    </Field>
                                    <Field label={text('sort', 'Sort order')}>
                                        <input type="number" value={trackForm.sortOrder} onChange={(e) => setTrackForm({ ...trackForm, sortOrder: toInt(e.target.value) })} />
                                    </Field>
                                    <Field label={text('track.starts', 'Starts')}>
                                        <input type="datetime-local" value={unixToLocalInput(trackForm.startsAt)} onChange={(e) => setTrackForm({ ...trackForm, startsAt: localInputToUnix(e.target.value) })} />
                                    </Field>
                                    <Field label={text('track.ends', 'Ends')} error={trackErrors.endsAt}>
                                        <input type="datetime-local" value={unixToLocalInput(trackForm.endsAt)} onChange={(e) => setTrackForm({ ...trackForm, endsAt: localInputToUnix(e.target.value) })} />
                                    </Field>
                                </div>
                                <div className="octane-reward-track-admin-toggles">
                                    <Toggle label={text('track.enabled', 'Enabled: the hotel shows it')} checked={trackForm.enabled} onChange={(enabled) => setTrackForm({ ...trackForm, enabled })} />
                                    <Toggle label={text('track.premium', 'Premium pass on sale')} checked={trackForm.hasPremium} onChange={(hasPremium) => setTrackForm({ ...trackForm, hasPremium })} />
                                </div>
                                {trackForm.hasPremium && (
                                    <>
                                        <div className="octane-reward-track-admin-subtitle">{text('track.premium.section', 'Premium pass')}</div>
                                        <div className="octane-reward-track-admin-grid">
                                            <Field label={text('track.boost', 'Task points boost (%)')} error={trackErrors.premiumBoostPercent}>
                                                <input type="number" min={0} value={trackForm.premiumBoostPercent} onChange={(e) => setTrackForm({ ...trackForm, premiumBoostPercent: toInt(e.target.value) })} />
                                            </Field>
                                            <Field label={text('track.instant', 'Instant points')} error={trackErrors.premiumInstantPoints}>
                                                <input type="number" min={0} value={trackForm.premiumInstantPoints} onChange={(e) => setTrackForm({ ...trackForm, premiumInstantPoints: toInt(e.target.value) })} />
                                            </Field>
                                            <Field label={text('track.diamonds', 'Cost in diamonds')} error={trackErrors.premiumCostDiamonds}>
                                                <input type="number" min={0} value={trackForm.premiumCostDiamonds} onChange={(e) => setTrackForm({ ...trackForm, premiumCostDiamonds: toInt(e.target.value) })} />
                                            </Field>
                                            <Field label={text('track.credits', 'Cost in credits')} error={trackErrors.premiumCostCredits}>
                                                <input type="number" min={0} value={trackForm.premiumCostCredits} onChange={(e) => setTrackForm({ ...trackForm, premiumCostCredits: toInt(e.target.value) })} />
                                            </Field>
                                        </div>
                                    </>
                                )}
                                <SaveCancel disabled={pending} errorCount={hasErrors(trackErrors)} onSave={submitTrack} onCancel={() => openTrackForm(null)} />
                            </div>
                        </RewardTrackAdminModalView>
                    )}

                    {selectedTrack && (
                        <>
                            <Panel
                                className="is-track"
                                title={selectedTrack.texts?.name ? `${selectedTrack.texts.name} · ${selectedTrack.id}` : selectedTrack.id}
                                actions={
                                    <>
                                        {onPreview && (
                                            <Button variant="secondary" classNames={BTN} onClick={() => onPreview(selectedTrack.id)} data-testid="rt-admin-preview">
                                                {text('preview', 'Preview')}
                                            </Button>
                                        )}
                                        <Button variant="secondary" classNames={BTN} onClick={() => openTrackForm({ ...trackToInput(selectedTrack), id: `${selectedTrack.id}_copy`, enabled: false }, selectedTrack)} data-testid="rt-admin-duplicate-track">
                                            {text('duplicate', 'Duplicate')}
                                        </Button>
                                        <Button variant="secondary" classNames={BTN} onClick={() => setTextsForm({ ...(selectedTrack.texts ?? {}) })} data-testid="rt-admin-texts">
                                            {text('texts', 'Texts')} ({filledTexts}/{textKeys.length})
                                        </Button>
                                        <Button variant="primary" classNames={BTN} onClick={() => openTrackForm(trackToInput(selectedTrack))}>
                                            {text('edit', 'Edit')}
                                        </Button>
                                        <DeleteButton
                                            armed={armed === armKey('track', selectedTrack.id)}
                                            disabled={pending}
                                            onArm={() => setArmed(armKey('track', selectedTrack.id))}
                                            onConfirm={() => deleteEntity && deleteEntity('track', selectedTrack.id, '')}
                                        />
                                    </>
                                }
                            >
                                <div className="octane-reward-track-admin-facts">
                                    <StateTag state={getRewardTrackAdminState(selectedTrack)} />
                                    <span>
                                        {text('track.theme', 'Theme')}: <b>{selectedTrack.theme}</b>
                                    </span>
                                    <span>
                                        {text('sort', 'Sort order')}: <b>{selectedTrack.sortOrder}</b>
                                    </span>
                                    <span>
                                        {text('track.period', 'Period')}:{' '}
                                        <b>
                                            {selectedTrack.startsAt > 0 || selectedTrack.endsAt > 0
                                                ? `${formatDate(selectedTrack.startsAt) || '…'} → ${formatDate(selectedTrack.endsAt) || '…'}`
                                                : text('track.always', 'always')}
                                        </b>
                                    </span>
                                    {selectedTrack.hasPremium ? (
                                        <span>
                                            <Tag kind="premium">{text('premium', 'premium')}</Tag> ×{(selectedTrack.premiumBoostPercent / 100).toFixed(2)} · +{selectedTrack.premiumInstantPoints} {text('prize.points', 'pts')} ·{' '}
                                            {selectedTrack.premiumCostDiamonds} {text('diamonds', 'diamonds')}
                                            {selectedTrack.premiumCostCredits > 0 && ` / ${selectedTrack.premiumCostCredits} ${text('credits', 'credits')}`}
                                        </span>
                                    ) : (
                                        <span className="octane-reward-track-admin-muted">{text('track.nopremium', 'No premium pass')}</span>
                                    )}
                                </div>
                            </Panel>

                            {textsForm && (
                                <RewardTrackAdminModalView title={`${text('texts.edit', 'Texts')} · ${selectedTrack.id}`} width={640} onClose={() => setTextsForm(null)}>
                                    <div className="octane-reward-track-admin-form" data-testid="rt-admin-texts-form">
                                        <span className="octane-reward-track-admin-note">
                                            {text('texts.note', 'What players read in the window. An empty field falls back to the client texts (reward_track.%track%.*).').replace('%track%', selectedTrack.id)}
                                        </span>
                                        <div className="octane-reward-track-admin-text-rows">
                                            {textKeys.map(({ key, label }) => (
                                                <label key={key} className="octane-reward-track-admin-text-row">
                                                    <span className="octane-reward-track-admin-label" title={`reward_track.${selectedTrack.id}.${key}`}>
                                                        {label}
                                                    </span>
                                                    <input value={textsForm[key] ?? ''} maxLength={1000} data-testid={`rt-admin-text-${key}`} onChange={(e) => setTextsForm({ ...textsForm, [key]: e.target.value })} />
                                                </label>
                                            ))}
                                        </div>
                                        <SaveCancel disabled={pending} errorCount={0} onSave={submitTexts} onCancel={() => setTextsForm(null)} />
                                    </div>
                                </RewardTrackAdminModalView>
                            )}

                            <Panel
                                collapseKey="tasks"
                                title={`${text('tasks', 'Tasks')} (${selectedTrack.tasks.length})`}
                                summary={selectedTrack.tasks.map((task) => task.id).join(' · ')}
                                actions={
                                    <Button variant="primary" classNames={BTN} onClick={() => setTaskForm(emptyTask(selectedTrack.id, actionTypes[0] ?? '', nextSortOrder(selectedTrack.tasks)))}>
                                        {text('task.new', 'New task')}
                                    </Button>
                                }
                            >
                                {selectedTrack.tasks.length > 0 && (
                                    <table className="octane-reward-track-admin-table">
                                        <thead>
                                            <tr>
                                                <th className="octane-reward-track-admin-order-head" />
                                                <th>{text('task.id', 'Id')}</th>
                                                <th>{text('task.action', 'Action')}</th>
                                                <th>{text('task.levels', 'Levels (count → points)')}</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedTrack.tasks.map((task, index) => (
                                                <tr key={task.id} data-testid="rt-admin-task-row">
                                                    <td className="octane-reward-track-admin-order">
                                                        <button type="button" className="octane-reward-track-admin-arrow" disabled={pending || index === 0} title={text('move.up', 'Move up')} data-testid="rt-admin-task-up" onClick={() => moveTask(index, -1)}>
                                                            ▲
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="octane-reward-track-admin-arrow"
                                                            disabled={pending || index === selectedTrack.tasks.length - 1}
                                                            title={text('move.down', 'Move down')}
                                                            data-testid="rt-admin-task-down"
                                                            onClick={() => moveTask(index, 1)}
                                                        >
                                                            ▼
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <b>{task.id}</b>
                                                        {selectedTrack.texts?.[`task.${task.id}.name`] && <span className="octane-reward-track-admin-muted"> {selectedTrack.texts[`task.${task.id}.name`]}</span>}
                                                        {task.premium && <Tag kind="premium">{text('premium', 'premium')}</Tag>}
                                                    </td>
                                                    <td>
                                                        {task.actionType}
                                                        {task.parameter && <span className="octane-reward-track-admin-muted"> ({task.parameter})</span>}
                                                    </td>
                                                    <td className="octane-reward-track-admin-chips">
                                                        {task.levels.map((level, levelIndex) => (
                                                            <span key={levelIndex} className={`octane-reward-track-admin-chip${level.premium ? ' is-premium' : ''}`}>
                                                                {level.requiredCount} → {level.pointsReward}
                                                            </span>
                                                        ))}
                                                    </td>
                                                    <td className="octane-reward-track-admin-row-actions">
                                                        <Button variant="secondary" classNames={BTN} onClick={() => setTaskForm(taskToInput(selectedTrack.id, task))}>
                                                            {text('edit', 'Edit')}
                                                        </Button>
                                                        <DeleteButton
                                                            armed={armed === armKey('task', task.id)}
                                                            disabled={pending}
                                                            onArm={() => setArmed(armKey('task', task.id))}
                                                            onConfirm={() => deleteEntity && deleteEntity('task', selectedTrack.id, task.id)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Panel>

                            {taskForm && (
                                <RewardTrackAdminModalView
                                    title={taskForm.id && selectedTrack.tasks.some((task) => task.id === taskForm.id) ? `${text('task.edit', 'Edit task')} · ${taskForm.id}` : text('task.create', 'New task')}
                                    width={620}
                                    onClose={() => setTaskForm(null)}
                                >
                                    <div className="octane-reward-track-admin-form" data-testid="rt-admin-task-form">
                                        <div className="octane-reward-track-admin-grid">
                                            <Field label={text('task.id', 'Id')} error={taskErrors.id}>
                                                <input value={taskForm.id} maxLength={64} placeholder="talk" onChange={(e) => setTaskForm({ ...taskForm, id: e.target.value })} />
                                            </Field>
                                            <Field label={text('task.action', 'Action')} error={taskErrors.actionType}>
                                                <select value={taskForm.actionType} onChange={(e) => setTaskForm({ ...taskForm, actionType: e.target.value })}>
                                                    {actionTypes.map((actionType) => (
                                                        <option key={actionType} value={actionType}>
                                                            {actionType}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label={text('task.parameter', 'Parameter')} error={taskErrors.parameter}>
                                                <input value={taskForm.parameter} maxLength={255} onChange={(e) => setTaskForm({ ...taskForm, parameter: e.target.value })} />
                                            </Field>
                                            <Field label={text('sort', 'Sort order')}>
                                                <input type="number" value={taskForm.sortOrder} onChange={(e) => setTaskForm({ ...taskForm, sortOrder: toInt(e.target.value) })} />
                                            </Field>
                                        </div>
                                        <div className="octane-reward-track-admin-toggles">
                                            <Toggle label={text('task.premium', 'Premium pass holders only')} checked={taskForm.premium} onChange={(premium) => setTaskForm({ ...taskForm, premium })} />
                                        </div>
                                        <div className="octane-reward-track-admin-subtitle">
                                            {text('task.levels.section', 'Levels')}
                                            {taskErrors.levels && <span className="octane-reward-track-admin-field-error"> · {taskErrors.levels}</span>}
                                        </div>
                                        <table className="octane-reward-track-admin-table is-levels">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>{text('level.count', 'Required count')}</th>
                                                    <th>{text('level.points', 'Points')}</th>
                                                    <th>{text('level.premium', 'Premium only')}</th>
                                                    <th />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {taskForm.levels.map((level, index) => (
                                                    <tr key={index} data-testid="rt-admin-level-row">
                                                        <td className="octane-reward-track-admin-muted">{index + 1}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={level.requiredCount}
                                                                aria-invalid={!!taskErrors[`level.${index}.requiredCount`]}
                                                                title={taskErrors[`level.${index}.requiredCount`]}
                                                                onChange={(e) => updateLevel(index, { requiredCount: toInt(e.target.value, 1) })}
                                                            />
                                                            {taskErrors[`level.${index}.requiredCount`] && <span className="octane-reward-track-admin-field-error">{taskErrors[`level.${index}.requiredCount`]}</span>}
                                                        </td>
                                                        <td>
                                                            <input type="number" min={0} value={level.pointsReward} aria-invalid={!!taskErrors[`level.${index}.pointsReward`]} onChange={(e) => updateLevel(index, { pointsReward: toInt(e.target.value) })} />
                                                            {taskErrors[`level.${index}.pointsReward`] && <span className="octane-reward-track-admin-field-error">{taskErrors[`level.${index}.pointsReward`]}</span>}
                                                        </td>
                                                        <td>
                                                            <input type="checkbox" checked={level.premium} onChange={(e) => updateLevel(index, { premium: e.target.checked })} />
                                                        </td>
                                                        <td className="octane-reward-track-admin-row-actions">
                                                            <Button
                                                                variant="secondary"
                                                                classNames={BTN}
                                                                disabled={taskForm.levels.length <= 1}
                                                                onClick={() => setTaskForm({ ...taskForm, levels: taskForm.levels.filter((_, i) => i !== index) })}
                                                            >
                                                                {text('level.remove', 'Remove')}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <SaveCancel
                                            disabled={pending}
                                            errorCount={hasErrors(taskErrors)}
                                            onSave={() => saveTask && saveTask(taskForm)}
                                            onCancel={() => setTaskForm(null)}
                                            before={
                                                <Button
                                                    variant="secondary"
                                                    classNames={BTN}
                                                    onClick={() => {
                                                        const last = taskForm.levels[taskForm.levels.length - 1];

                                                        setTaskForm({ ...taskForm, levels: [...taskForm.levels, { requiredCount: (last?.requiredCount ?? 0) + 1, pointsReward: last?.pointsReward ?? 10, premium: false }] });
                                                    }}
                                                >
                                                    {text('level.add', 'Add level')}
                                                </Button>
                                            }
                                        />
                                    </div>
                                </RewardTrackAdminModalView>
                            )}

                            <Panel
                                collapseKey="prizes"
                                title={`${text('prizes', 'Prizes')} (${selectedTrack.prizes.length})`}
                                summary={`${selectedTrack.prizes.filter((prize) => !prize.premium).length} ${text('free', 'free')} · ${selectedTrack.prizes.filter((prize) => prize.premium).length} ${text('premium', 'premium')}`}
                                actions={
                                    <Button variant="primary" classNames={BTN} onClick={() => setPrizeForm(emptyPrize(selectedTrack.id, rewardTypes[0] ?? '', nextSortOrder(selectedTrack.prizes)))}>
                                        {text('prize.new', 'New prize')}
                                    </Button>
                                }
                            >
                                {selectedTrack.prizes.length > 0 && (
                                    <table className="octane-reward-track-admin-table">
                                        <thead>
                                            <tr>
                                                <th>{text('prize.id', 'Id')}</th>
                                                <th>{text('prize.required', 'Points')}</th>
                                                <th>{text('prize.reward', 'Reward')}</th>
                                                <th>{text('prize.row', 'Row')}</th>
                                                <th title={text('prize.claimed.title', 'How many users claimed it')}>{text('prize.claimed', 'Claimed')}</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedTrack.prizes.map((prize) => (
                                                <tr key={prize.id} data-testid="rt-admin-prize-row">
                                                    <td>
                                                        <b>{prize.id}</b>
                                                    </td>
                                                    <td>{prize.requiredPoints}</td>
                                                    <td>
                                                        {prize.rewardAmount} {prize.rewardType}
                                                        {prize.extraParams && <span className="octane-reward-track-admin-muted"> ({prize.extraParams})</span>}
                                                    </td>
                                                    <td>{prize.premium ? <Tag kind="premium">{text('premium', 'premium')}</Tag> : <Tag>{text('free', 'free')}</Tag>}</td>
                                                    <td data-testid="rt-admin-prize-claimed">{prize.claimedCount ?? 0}</td>
                                                    <td className="octane-reward-track-admin-row-actions">
                                                        <Button variant="secondary" classNames={BTN} title={text('prize.twin.title', 'A copy on the other row, 20 points apart')} onClick={() => setPrizeForm(prizeTwin(selectedTrack.id, prize))} data-testid="rt-admin-prize-twin">
                                                            {text('prize.twin', 'Twin')}
                                                        </Button>
                                                        <Button variant="secondary" classNames={BTN} onClick={() => setPrizeForm(prizeToInput(selectedTrack.id, prize))}>
                                                            {text('edit', 'Edit')}
                                                        </Button>
                                                        <DeleteButton
                                                            armed={armed === armKey('prize', prize.id)}
                                                            disabled={pending}
                                                            onArm={() => setArmed(armKey('prize', prize.id))}
                                                            onConfirm={() => deleteEntity && deleteEntity('prize', selectedTrack.id, prize.id)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Panel>

                            {prizeForm && (
                                <RewardTrackAdminModalView
                                    title={prizeForm.id && selectedTrack.prizes.some((prize) => prize.id === prizeForm.id) ? `${text('prize.edit', 'Edit prize')} · ${prizeForm.id}` : text('prize.create', 'New prize')}
                                    width={620}
                                    onClose={() => setPrizeForm(null)}
                                >
                                    <div className="octane-reward-track-admin-form" data-testid="rt-admin-prize-form">
                                        <div className="octane-reward-track-admin-grid">
                                            <Field label={text('prize.id', 'Id')} error={prizeErrors.id}>
                                                <input value={prizeForm.id} maxLength={64} placeholder="p1" onChange={(e) => setPrizeForm({ ...prizeForm, id: e.target.value })} />
                                            </Field>
                                            <Field label={text('prize.required', 'Required points')} error={prizeErrors.requiredPoints}>
                                                <input type="number" min={0} value={prizeForm.requiredPoints} onChange={(e) => setPrizeForm({ ...prizeForm, requiredPoints: toInt(e.target.value) })} />
                                            </Field>
                                            <Field label={text('prize.type', 'Reward type')} error={prizeErrors.rewardType}>
                                                <select value={prizeForm.rewardType} onChange={(e) => setPrizeForm({ ...prizeForm, rewardType: e.target.value })}>
                                                    {rewardTypes.map((rewardType) => (
                                                        <option key={rewardType} value={rewardType}>
                                                            {rewardType}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label={text('prize.amount', 'Amount')} error={prizeErrors.rewardAmount}>
                                                <input type="number" min={0} value={prizeForm.rewardAmount} onChange={(e) => setPrizeForm({ ...prizeForm, rewardAmount: toInt(e.target.value) })} />
                                            </Field>
                                            <Field
                                                label={prizeForm.rewardType === 'furni' ? text('prize.extra.furni', 'Furni name (items_base.item_name)') : text('prize.extra', 'Extra (badge code)')}
                                                error={prizeErrors.extraParams}
                                                span={2}
                                            >
                                                <input
                                                    value={prizeForm.extraParams}
                                                    maxLength={255}
                                                    placeholder={prizeForm.rewardType === 'badge' ? 'ACH_Login1' : prizeForm.rewardType === 'furni' ? 'club_sofa' : ''}
                                                    onChange={(e) => setPrizeForm({ ...prizeForm, extraParams: e.target.value })}
                                                />
                                            </Field>
                                            <Field label={text('prize.product', 'Product type id')} error={prizeErrors.productItemTypeId}>
                                                <input type="number" min={0} max={32767} value={prizeForm.productItemTypeId} onChange={(e) => setPrizeForm({ ...prizeForm, productItemTypeId: toInt(e.target.value) })} />
                                            </Field>
                                            <Field label={text('sort', 'Sort order')}>
                                                <input type="number" value={prizeForm.sortOrder} onChange={(e) => setPrizeForm({ ...prizeForm, sortOrder: toInt(e.target.value) })} />
                                            </Field>
                                        </div>
                                        {prizeForm.rewardType === 'furni' && searchFurni && (
                                            <FurniPicker value={prizeForm.extraParams} results={furniSearch} onSearch={searchFurni} onPick={(name) => setPrizeForm({ ...prizeForm, extraParams: name })} />
                                        )}
                                        <div className="octane-reward-track-admin-toggles">
                                            <Toggle label={text('prize.premium', 'On the premium row')} checked={prizeForm.premium} onChange={(premium) => setPrizeForm({ ...prizeForm, premium })} />
                                        </div>
                                        <SaveCancel disabled={pending} errorCount={hasErrors(prizeErrors)} onSave={() => savePrize && savePrize(prizeForm)} onCancel={() => setPrizeForm(null)} />
                                    </div>
                                </RewardTrackAdminModalView>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
