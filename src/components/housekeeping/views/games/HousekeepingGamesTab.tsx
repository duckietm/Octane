import { FC, useEffect, useMemo, useState } from 'react';
import { FaGamepad, FaGift, FaPlus, FaTicketAlt, FaTrash } from 'react-icons/fa';
import {
    GameCenterApi,
    GameCenterApiError,
    GameRewardKind,
    GameRewardType,
    IGameAdminFound,
    IGameAdminGame,
    IGameAdminReward,
    IGameAdminView,
    gct
} from '../../../../api';
import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
import { NumberInput } from '../../../../common/NumberInput';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { GAME_CATALOG } from '../../../game-center/GameCatalog';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingSection } from '../common/HousekeepingParts';

/** The panel's field, its width set by each use (the shared class takes the whole width). */
const INLINE_INPUT = HOUSEKEEPING_INPUT_CLASS.replace('w-full ', '');

/** A text of this page, `housekeeping.games.<key>`. */
const t = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`housekeeping.games.${ key }`, fallback, parameters, replacements);

const KINDS: [ GameRewardKind, string ][] = [ [ 'play', 'Each game played' ], [ 'win', 'Each game won' ], [ 'week', 'Week\'s leaderboard' ] ];
const TYPES: [ GameRewardType, string ][] = [ [ 'furni', 'Furni' ], [ 'clothing', 'Clothes' ], [ 'badge', 'Badge' ], [ 'currency', 'Currency' ] ];
const ERRORS: Record<string, string> = {
    bad_offer: 'A pack is not right: 1 to 10,000 games, a price from 0 to 100,000 (6 packs at most).',
    bad_reward: 'A reward is not right (60 at most).',
    bad_furni: 'A furni reward needs a furni that exists, and 1 to 5 of them.',
    bad_clothing: 'A clothes reward needs clothes that exist.',
    bad_badge: 'A badge code: letters, numbers and _ only.',
    bad_currency: 'A currency reward needs an amount from 1 to 100,000.',
    forbidden: 'You cannot change the games.',
    no_game: 'This game does not exist.'
};

const gameName = (id: string): string => {
    if (id === 'snowwar') return localizeWithFallback('gamecenter.snowwar.description_title', 'SnowStorm');

    const entry = GAME_CATALOG.find((item) => item.id === id);

    return entry ? gct(`${ id }.title`, entry.title) : id;
};

const Num: FC<{ value: number; min?: number; max?: number; onChange: (value: number) => void; width?: string; disabled?: boolean }> = ({ value, min = 0, max, onChange, width = 'w-20', disabled = false }) => (
    <NumberInput className={`${ INLINE_INPUT } ${ width } shrink-0`} min={min} max={max} disabled={disabled} value={value} onChange={(event) => onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : min)} />
);

/** Finding a furni or clothes for a reward, by name or id. */
const Lookup: FC<{ type: 'furni' | 'clothing'; onPick: (found: IGameAdminFound) => void }> = ({ type, onPick }) => {
    const [ query, setQuery ] = useState('');
    const [ found, setFound ] = useState<IGameAdminFound[]>([]);
    const [ searching, setSearching ] = useState(false);

    const search = () => {
        if (query.trim().length < 2) return;

        setSearching(true);
        GameCenterApi.adminLookup(type, query.trim()).then((result) => setFound(result.found ?? [])).catch(() => setFound([])).finally(() => setSearching(false));
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex gap-1">
                <input className={HOUSEKEEPING_INPUT_CLASS} placeholder={type === 'furni' ? t('lookup.furni', 'Furni name or id') : t('lookup.clothing', 'Clothes name or id')} value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') search();
                    }} />
                <HousekeepingButton size="sm" variant="neutral" disabled={searching || query.trim().length < 2} onClick={search}>{t('lookup.search', 'Search')}</HousekeepingButton>
            </div>
            {found.length > 0 && (
                <div className="flex max-h-28 flex-col overflow-y-auto rounded border border-zinc-300 bg-white">
                    {found.map((item) => (
                        <BaseButton key={item.id} type="button" className="flex gap-2 px-2 py-0.5 text-left text-[11px] text-black hover:bg-amber-100" onClick={() => {
                            onPick(item);
                            setFound([]);
                        }}>
                            <b>#{item.id}</b><span>{item.name}</span><span className="ml-auto text-zinc-400">{item.detail}</span>
                        </BaseButton>
                    ))}
                </div>
            )}
        </div>
    );
};

const RewardRow: FC<{ reward: IGameAdminReward; currencies: { id: number; name: string }[]; onChange: (reward: IGameAdminReward) => void; onRemove: () => void }> = ({ reward, currencies, onChange, onRemove }) => {
    const set = (patch: Partial<IGameAdminReward>) => onChange({ ...reward, ...patch });
    const single = reward.type === 'badge' || reward.type === 'clothing';

    return (
        <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-white/70 p-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-black">
                <select className={`${ INLINE_INPUT } w-44 shrink-0`} value={reward.kind} onChange={(event) => set({ kind: event.target.value as GameRewardKind })}>
                    {KINDS.map(([ value, label ]) => <option key={value} value={value}>{t(`kind.${ value }`, label)}</option>)}
                </select>
                {reward.kind === 'week' && (
                    <>
                        <span>{t('rank_from', 'from rank')}</span>
                        <Num value={reward.rankFrom} min={1} max={1000} width="w-14" onChange={(value) => set({ rankFrom: value, rankTo: Math.max(value, reward.rankTo) })} />
                        <span>{t('rank_to', 'to')}</span>
                        <Num value={reward.rankTo} min={reward.rankFrom} max={1000} width="w-14" onChange={(value) => set({ rankTo: value })} />
                    </>
                )}
                <select className={`${ INLINE_INPUT } w-28 shrink-0`} value={reward.type} onChange={(event) => set({ type: event.target.value as GameRewardType, value: event.target.value === 'currency' ? '-1' : '', label: '', amount: 1 })}>
                    {TYPES.map(([ value, label ]) => <option key={value} value={value}>{t(`type.${ value }`, label)}</option>)}
                </select>
                {reward.type === 'currency' && (
                    <select className={`${ INLINE_INPUT } w-28 shrink-0`} value={reward.value} onChange={(event) => set({ value: event.target.value })}>
                        {currencies.map((currency) => <option key={currency.id} value={String(currency.id)}>{currency.name}</option>)}
                    </select>
                )}
                {reward.type === 'badge' && <input className={`${ INLINE_INPUT } w-28 shrink-0`} placeholder={t('badge_code', 'Badge code')} value={reward.value} onChange={(event) => set({ value: event.target.value })} onKeyDown={(event) => event.stopPropagation()} />}
                {(reward.type === 'furni' || reward.type === 'clothing') && <span className="font-bold">{reward.value ? `#${ reward.value } ${ reward.label ?? '' }` : t('none_chosen', 'none chosen')}</span>}
                {!single && (
                    <>
                        <span>x</span>
                        <Num value={reward.amount} min={1} max={reward.type === 'furni' ? 5 : 100000} width="w-20" onChange={(value) => set({ amount: value })} />
                    </>
                )}
                <BaseButton type="button" className="ml-auto text-red-700" aria-label={t('remove', 'Remove')} onClick={onRemove}><FaTrash /></BaseButton>
            </div>
            {(reward.type === 'furni' || reward.type === 'clothing') && <Lookup type={reward.type} onPick={(found) => set({ value: String(found.id), label: found.name })} />}
        </div>
    );
};

/**
 * Housekeeping's Games page (`acc_hk_games`): for each game of the Game Center (SnowStorm first), the free games a
 * day, the Habbo Club's extra ones, the packs of games to buy (games, price, currency) and the rewards: for each game
 * played or won, and for the week's leaderboard (by ranks), a furni, clothes, a badge or currency.
 */
export const HousekeepingGamesTab: FC = () => {
    const [ view, setView ] = useState<IGameAdminView | null>(null);
    const [ selected, setSelected ] = useState('snowwar');
    const [ draft, setDraft ] = useState<IGameAdminGame | null>(null);
    const [ status, setStatus ] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
    const [ saving, setSaving ] = useState(false);

    useEffect(() => {
        GameCenterApi.admin().then(setView).catch(() => setStatus({ tone: 'error', text: t('error.load', 'The games could not be loaded.') }));
    }, []);

    const original = useMemo(() => view?.games.find((game) => game.id === selected) ?? null, [ view, selected ]);

    useEffect(() => {
        setDraft(original ? JSON.parse(JSON.stringify(original)) as IGameAdminGame : null);
    }, [ original ]);

    const changed = !!draft && !!original && JSON.stringify(draft) !== JSON.stringify(original);
    const maxOffers = selected === 'snowwar' ? 3 : 6;
    const currencies = view?.currencies ?? [];
    const set = (patch: Partial<IGameAdminGame>) => draft && setDraft({ ...draft, ...patch });

    const save = () => {
        if (!draft) return;

        setSaving(true);
        setStatus(null);
        GameCenterApi.adminSave(draft)
            .then((next) => {
                setView(next);
                setStatus({ tone: 'ok', text: t('saved', 'Saved: the Game Center uses it within 30 seconds.') });
            })
            .catch((caught) => {
                const code = caught instanceof GameCenterApiError ? caught.code : 'http_error';

                setStatus({ tone: 'error', text: t(`error.${ code }`, ERRORS[code] ?? 'Not saved, try again.') });
            })
            .finally(() => setSaving(false));
    };

    return (
        <NativeTextTree>
            <div className="flex h-full min-h-0 gap-2">
                <div className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto">
                    {(view?.games ?? []).map((game) => (
                        <BaseButton key={game.id} type="button" className={`rounded px-2 py-1 text-left text-xs ${ game.id === selected ? 'bg-amber-400 font-bold text-black' : 'text-black hover:bg-amber-100' }`} onClick={() => setSelected(game.id)}>
                            {gameName(game.id)}
                        </BaseButton>
                    ))}
                </div>
                {draft && (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                        <HousekeepingSection title={t('free.title', 'Free games')} icon={<FaGamepad />}>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-black">
                                <label className="flex items-center gap-1">
                                    <input type="checkbox" checked={draft.freeDaily < 0} onChange={(event) => set({ freeDaily: event.target.checked ? -1 : 10 })} />
                                    {t('free.unlimited', 'Unlimited')}
                                </label>
                                {draft.freeDaily >= 0 && (
                                    <>
                                        <span>{t('free.daily', 'Free games a day:')}</span>
                                        <Num value={draft.freeDaily} min={0} max={1000} onChange={(value) => set({ freeDaily: value })} />
                                        <span>{t('free.hc', 'Extra games a day for the Habbo Club:')}</span>
                                        <Num value={Math.max(0, draft.hcExtra)} min={0} max={1000} onChange={(value) => set({ hcExtra: value })} />
                                    </>
                                )}
                            </div>
                        </HousekeepingSection>

                        <HousekeepingSection title={t('offers.title', 'Packs of games')} icon={<FaTicketAlt />} aside={
                            <HousekeepingButton size="sm" variant="neutral" disabled={draft.offers.length >= maxOffers} onClick={() => set({ offers: [ ...draft.offers, { games: 10, price: 10, currency: -1 } ] })}><FaPlus /> {t('offers.add', 'Add a pack')}</HousekeepingButton>
                        }>
                            {!draft.offers.length && <span className="text-[11px] text-zinc-500">{t('offers.none', 'No pack: the players cannot buy games.')}</span>}
                            {draft.offers.map((offer, index) => (
                                <div key={index} className="flex flex-wrap items-center gap-1.5 text-[11px] text-black">
                                    <span>+</span>
                                    <Num value={offer.games} min={1} max={10000} onChange={(value) => set({ offers: draft.offers.map((item, at) => (at === index ? { ...item, games: value } : item)) })} />
                                    <span>{t('offers.games_for', 'games for')}</span>
                                    <Num value={offer.price} min={0} max={100000} onChange={(value) => set({ offers: draft.offers.map((item, at) => (at === index ? { ...item, price: value } : item)) })} />
                                    <select className={`${ INLINE_INPUT } w-28 shrink-0`} value={offer.currency} onChange={(event) => set({ offers: draft.offers.map((item, at) => (at === index ? { ...item, currency: Number(event.target.value) } : item)) })}>
                                        {currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.name}</option>)}
                                    </select>
                                    <BaseButton type="button" className="text-red-700" aria-label={t('remove', 'Remove')} onClick={() => set({ offers: draft.offers.filter((_, at) => at !== index) })}><FaTrash /></BaseButton>
                                </div>
                            ))}
                            {selected === 'snowwar' && <span className="text-[11px] text-zinc-500">{t('offers.snowwar', 'SnowStorm keeps three packs at most.')}</span>}
                        </HousekeepingSection>

                        <HousekeepingSection title={t('rewards.title', 'Rewards')} icon={<FaGift />} aside={
                            <HousekeepingButton size="sm" variant="neutral" onClick={() => set({ rewards: [ ...draft.rewards, { kind: 'win', rankFrom: 1, rankTo: 1, type: 'currency', value: '-1', amount: 10 } ] })}><FaPlus /> {t('rewards.add', 'Add a reward')}</HousekeepingButton>
                        }>
                            <span className="text-[11px] text-zinc-600">{t('rewards.help', 'At the end of each game (played, or won), or each Monday for the week\'s leaderboard (by ranks). A badge or clothes are given once.')}</span>
                            {draft.rewards.map((reward, index) => (
                                <RewardRow key={index} reward={reward} currencies={currencies}
                                    onChange={(next) => set({ rewards: draft.rewards.map((item, at) => (at === index ? next : item)) })}
                                    onRemove={() => set({ rewards: draft.rewards.filter((_, at) => at !== index) })} />
                            ))}
                        </HousekeepingSection>

                        <div className="flex items-center gap-2">
                            <HousekeepingButton variant="success" disabled={!changed || saving} onClick={save}>{t('save', 'Save')}</HousekeepingButton>
                            <HousekeepingButton variant="neutral" disabled={!changed || saving} onClick={() => setDraft(JSON.parse(JSON.stringify(original)) as IGameAdminGame)}>{t('cancel', 'Cancel the changes')}</HousekeepingButton>
                            {status && <span className={`text-[11px] font-bold ${ status.tone === 'ok' ? 'text-green-700' : 'text-red-700' }`}>{status.text}</span>}
                        </div>
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
