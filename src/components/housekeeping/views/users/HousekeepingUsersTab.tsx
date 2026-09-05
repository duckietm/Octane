import { FC, useEffect, useRef, useState } from 'react';
import {
    FaBan,
    FaBolt,
    FaCircle,
    FaCoins,
    FaEnvelope,
    FaExclamationTriangle,
    FaIdBadge,
    FaKey,
    FaLock,
    FaPlug,
    FaSearch,
    FaTimes,
    FaUser,
    FaUserShield,
    FaUserSlash,
    FaVolumeMute
} from 'react-icons/fa';
import { findTemplateById, HK_SANCTION_TEMPLATES, HousekeepingSanctionType, LocalizeText } from '../../../../api';
import { Button, LayoutAvatarImageView, LayoutCurrencyIcon } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';

const DEFAULT_BAN_HOURS = 18;
const DEFAULT_MUTE_MINUTES = 60;
const DEFAULT_TRADE_LOCK_HOURS = 168;
const BULK_CONFIRM_THRESHOLD = 5;

export const HousekeepingUsersTab: FC = () => {
    const {
        selectedUser,
        setSelectedUser,
        lookupUserByName,
        lookupUserById,
        isUserLoading,
        isActionPending,
        banUser,
        unbanUser,
        kickUser,
        muteUser,
        forceDisconnectUser,
        resetUserPassword,
        setUserRank,
        tradeLockUser,
        userSuggestions,
        requestUserSuggestions,
        recentLookups,
        kickFromCurrentRoom,
        banFromCurrentRoom,
        muteInCurrentRoom,
        selectedUserIds,
        toggleUserSelection,
        clearUserSelection,
        banUsersBulk,
        kickUsersBulk,
        muteUsersBulk
    } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [reason, setReason] = useState('');
    const [banHours, setBanHours] = useState<number>(DEFAULT_BAN_HOURS);
    const [muteMinutes, setMuteMinutes] = useState<number>(DEFAULT_MUTE_MINUTES);
    const [tradeLockHours, setTradeLockHours] = useState<number>(DEFAULT_TRADE_LOCK_HOURS);
    const [rankDraft, setRankDraft] = useState<number>(1);
    const [templateId, setTemplateId] = useState<string>('');
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        },
        []
    );

    useEffect(() => {
        requestUserSuggestions(query);
    }, [query, requestUserSuggestions]);

    const submitLookup = () => {
        const trimmed = query.trim();

        if (!trimmed.length) return;

        lookupUserByName(trimmed);
        setIsFocused(false);
    };

    const recentUsers = recentLookups.filter((entry) => entry.kind === 'user').slice(0, 5);
    const showSuggestionPanel = isFocused && (userSuggestions.length > 0 || (recentUsers.length > 0 && query.trim().length < 2));

    const disableActions = !selectedUser || isActionPending;
    const reasonOrDefault = reason.trim().length ? reason.trim() : LocalizeText('housekeeping.reason.default');

    const applyTemplate = (id: string) => {
        setTemplateId(id);

        const template = findTemplateById(id);

        if (!template) return;

        setReason(template.defaultReason);

        if (template.type === HousekeepingSanctionType.BAN) setBanHours(template.durationValue);
        if (template.type === HousekeepingSanctionType.MUTE) setMuteMinutes(template.durationValue);
        if (template.type === HousekeepingSanctionType.TRADE_LOCK) setTradeLockHours(template.durationValue);
    };

    const runBulkWithGate = (kind: 'ban' | 'kick' | 'mute', actionLabel: string, runner: () => void) => {
        if (selectedUserIds.length === 0) return;

        if (selectedUserIds.length >= BULK_CONFIRM_THRESHOLD) {
            confirm(LocalizeText('housekeeping.bulk.confirm', ['action', 'count'], [actionLabel, String(selectedUserIds.length)]), runner);

            return;
        }

        runner();
    };

    const bulkBan = () =>
        runBulkWithGate('ban', LocalizeText('housekeeping.action.ban_h', ['h'], [String(banHours)]), () =>
            banUsersBulk(selectedUserIds, reasonOrDefault, banHours)
        );
    const bulkKick = () => runBulkWithGate('kick', LocalizeText('housekeeping.action.kick'), () => kickUsersBulk(selectedUserIds, reasonOrDefault));
    const bulkMute = () =>
        runBulkWithGate('mute', LocalizeText('housekeeping.action.mute_min', ['m'], [String(muteMinutes)]), () =>
            muteUsersBulk(selectedUserIds, reasonOrDefault, muteMinutes)
        );

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <div className="flex gap-1.5 items-center">
                    <div className="flex items-center gap-1 grow rounded border border-zinc-300 bg-white px-2 py-1">
                        <FaSearch className="text-zinc-400 shrink-0" size={11} />
                        <input
                            className="grow text-sm bg-transparent outline-none placeholder:text-black placeholder:italic"
                            placeholder={LocalizeText('housekeeping.user.search.placeholder')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => {
                                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                                blurTimerRef.current = setTimeout(() => setIsFocused(false), 120);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') submitLookup();
                                if (event.key === 'Escape') setIsFocused(false);
                            }}
                        />
                    </div>
                    <Button gap={1} disabled={isUserLoading} onClick={submitLookup}>
                        <FaSearch size={10} />
                        <span>{LocalizeText('housekeeping.user.search.button')}</span>
                    </Button>
                </div>
                {showSuggestionPanel && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded border border-zinc-200 bg-white shadow-lg max-h-[200px] overflow-y-auto">
                        {userSuggestions.length > 0
                            ? userSuggestions.map((entry) => {
                                  const isChecked = selectedUserIds.includes(entry.id);

                                  return (
                                      <div
                                          key={entry.id}
                                          className="w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-sky-50 border-b border-zinc-100 last:border-b-0"
                                          onMouseDown={(event) => event.preventDefault()}
                                      >
                                          <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => toggleUserSelection(entry.id)}
                                              title={isChecked ? LocalizeText('housekeeping.bulk.clear') : LocalizeText('housekeeping.bulk.apply')}
                                              className="shrink-0"
                                          />
                                          <button
                                              className="flex items-center gap-2 grow text-left"
                                              onClick={() => {
                                                  setQuery(entry.username);
                                                  setIsFocused(false);
                                                  lookupUserById(entry.id);
                                              }}
                                          >
                                              <FaCircle size={6} className={entry.online ? 'text-emerald-500' : 'text-zinc-400'} />
                                              <span className="font-medium truncate grow">{entry.username}</span>
                                              <span className="text-[10px] text-zinc-500 shrink-0">
                                                  #{entry.id} · r{entry.rank}
                                              </span>
                                          </button>
                                      </div>
                                  );
                              })
                            : recentUsers.map((entry) => (
                                  <button
                                      key={entry.id}
                                      className="w-full flex items-center gap-2 px-2 py-1 text-left text-xs hover:bg-sky-50 border-b border-zinc-100 last:border-b-0"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                          setQuery(entry.label);
                                          setIsFocused(false);
                                          lookupUserById(entry.id);
                                      }}
                                  >
                                      <span className="text-[10px] text-zinc-400 uppercase shrink-0">recent</span>
                                      <span className="font-medium truncate grow">{entry.label}</span>
                                      <span className="text-[10px] text-zinc-500 shrink-0">#{entry.id}</span>
                                  </button>
                              ))}
                    </div>
                )}
            </div>

            {selectedUserIds.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap rounded border border-sky-300 bg-sky-50 p-1.5">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-sky-800 mr-1">
                        {LocalizeText('housekeeping.bulk.label', ['count'], [String(selectedUserIds.length)])}
                    </span>
                    <Button size="sm" variant="danger" disabled={isActionPending} onClick={bulkBan}>
                        <FaBan size={10} />
                        <span className="ml-1">{LocalizeText('housekeeping.action.ban_h', ['h'], [String(banHours)])}</span>
                    </Button>
                    <Button size="sm" variant="warning" disabled={isActionPending} onClick={bulkMute}>
                        <FaVolumeMute size={10} />
                        <span className="ml-1">{LocalizeText('housekeeping.action.mute_min', ['m'], [String(muteMinutes)])}</span>
                    </Button>
                    <Button size="sm" variant="warning" disabled={isActionPending} onClick={bulkKick}>
                        <FaUserSlash size={10} />
                        <span className="ml-1">{LocalizeText('housekeeping.action.kick')}</span>
                    </Button>
                    <button
                        className="ml-auto text-zinc-500 hover:text-rose-600 px-1"
                        onClick={clearUserSelection}
                        title={LocalizeText('housekeeping.bulk.clear')}
                    >
                        <FaTimes size={10} />
                    </button>
                </div>
            )}

            {selectedUser ? (
                <div className="relative overflow-hidden rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="relative rounded-full bg-sky-100 ring-2 ring-sky-200 shrink-0 w-[50px] h-[50px] overflow-hidden">
                            {selectedUser.figure ? (
                                <LayoutAvatarImageView
                                    classNames={['!absolute', '!-left-[20px]', '!-top-[20px]']}
                                    direction={2}
                                    figure={selectedUser.figure}
                                    headOnly={true}
                                />
                            ) : (
                                <span className="absolute inset-0 m-auto octane-icon octane-icon-hk-hero icon-modtools" />
                            )}
                        </div>
                        <div className="grow min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-base truncate">{selectedUser.username}</span>
                                <span className="text-[10px] text-zinc-500 tabular-nums">#{selectedUser.id}</span>
                                <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${selectedUser.online ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}
                                >
                                    <FaCircle size={6} className={selectedUser.online ? 'animate-pulse' : ''} />
                                    {selectedUser.online ? 'online' : 'offline'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 border border-violet-200 text-violet-700">
                                    <FaIdBadge size={8} />
                                    {selectedUser.rankName} · r{selectedUser.rank}
                                </span>
                                {selectedUser.isBanned && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 border border-rose-200 text-rose-700">
                                        <FaBan size={8} /> banned
                                    </span>
                                )}
                                {selectedUser.isMuted && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 border border-amber-200 text-amber-700">
                                        <FaVolumeMute size={8} /> muted
                                    </span>
                                )}
                                {selectedUser.isTradeLocked && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-700">
                                        <FaLock size={8} /> trade-lock
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-zinc-600 truncate mt-0.5 italic">{selectedUser.motto || '—'}</div>
                            <div className="grid grid-cols-3 gap-1 text-[10px] mt-2">
                                <div
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200"
                                    title={LocalizeText('housekeeping.user.credits')}
                                >
                                    <LayoutCurrencyIcon type={-1} />
                                    <span className="tabular-nums font-semibold text-amber-800">{selectedUser.creditsBalance.toLocaleString()}</span>
                                </div>
                                <div
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200"
                                    title={LocalizeText('housekeeping.user.duckets')}
                                >
                                    <LayoutCurrencyIcon type={0} />
                                    <span className="tabular-nums font-semibold text-orange-800">{selectedUser.ducketsBalance.toLocaleString()}</span>
                                </div>
                                <div
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200"
                                    title={LocalizeText('housekeeping.user.diamonds')}
                                >
                                    <LayoutCurrencyIcon type={5} />
                                    <span className="tabular-nums font-semibold text-sky-800">{selectedUser.diamondsBalance.toLocaleString()}</span>
                                </div>
                            </div>
                            {selectedUser.email && (
                                <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1.5 truncate" title={selectedUser.email}>
                                    <FaEnvelope size={8} />
                                    <span className="truncate">{selectedUser.email}</span>
                                </div>
                            )}
                        </div>
                        <button
                            className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                            onClick={() => setSelectedUser(null)}
                            title={LocalizeText('housekeeping.user.clear')}
                        >
                            <FaTimes size={12} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-xs text-zinc-500 italic">
                    <FaUserSlash size={14} />
                    {LocalizeText('housekeeping.user.none')}
                </div>
            )}

            {selectedUser && selectedUser.online && (
                <div className="rounded-md border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-1.5 flex items-center gap-1 flex-wrap shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 mr-1 flex items-center gap-1">
                        <FaBolt size={9} className="text-amber-500" />
                        {LocalizeText('housekeeping.user.live.label')}
                    </span>
                    <Button size="sm" variant="warning" disabled={isActionPending} onClick={() => kickFromCurrentRoom(selectedUser.id)}>
                        {LocalizeText('housekeeping.user.live.kick')}
                    </Button>
                    <Button size="sm" variant="warning" disabled={isActionPending} onClick={() => muteInCurrentRoom(selectedUser.id, 2)}>
                        {LocalizeText('housekeeping.user.live.mute_2m')}
                    </Button>
                    <Button size="sm" variant="warning" disabled={isActionPending} onClick={() => muteInCurrentRoom(selectedUser.id, 10)}>
                        {LocalizeText('housekeeping.user.live.mute_10m')}
                    </Button>
                    <Button size="sm" variant="danger" disabled={isActionPending} onClick={() => banFromCurrentRoom(selectedUser.id, 'hour')}>
                        {LocalizeText('housekeeping.user.live.ban_h')}
                    </Button>
                    <Button size="sm" variant="danger" disabled={isActionPending} onClick={() => banFromCurrentRoom(selectedUser.id, 'day')}>
                        {LocalizeText('housekeeping.user.live.ban_d')}
                    </Button>
                </div>
            )}

            <div className="flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-zinc-50/50 p-2">
                <div className="flex items-center gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60 shrink-0">Template</label>
                    <select
                        className="grow px-1.5 py-0.5 rounded border border-zinc-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                        value={templateId}
                        onChange={(event) => applyTemplate(event.target.value)}
                    >
                        <option value="">—</option>
                        {HK_SANCTION_TEMPLATES.map((template) => (
                            <option key={template.id} value={template.id}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                </div>
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60">{LocalizeText('housekeeping.field.reason')}</label>
                <textarea
                    className="min-h-[48px] px-2 py-1 rounded text-sm border border-zinc-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 placeholder:text-black placeholder:italic"
                    placeholder={LocalizeText('housekeeping.field.reason.placeholder')}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                />
            </div>

            <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60 -mb-0.5">{LocalizeText('housekeeping.field.duration')}</label>
            <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50/40 px-1.5 py-1">
                    <input
                        type="number"
                        min={1}
                        className="w-14 px-1 py-0.5 rounded border border-rose-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-rose-400"
                        value={banHours}
                        onChange={(event) => setBanHours(parseInt(event.target.value) || 0)}
                    />
                    <span className="text-[10px] text-rose-700">h</span>
                    <Button
                        variant="danger"
                        disabled={disableActions}
                        className="grow ml-auto"
                        onClick={() => banUser(selectedUser.id, reasonOrDefault, banHours)}
                    >
                        <FaBan size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.action.ban_h', ['h'], [String(banHours)])}</span>
                    </Button>
                </div>
                <div className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/40 px-1.5 py-1">
                    <input
                        type="number"
                        min={1}
                        className="w-14 px-1 py-0.5 rounded border border-amber-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
                        value={muteMinutes}
                        onChange={(event) => setMuteMinutes(parseInt(event.target.value) || 0)}
                    />
                    <span className="text-[10px] text-amber-700">m</span>
                    <Button
                        variant="warning"
                        disabled={disableActions}
                        className="grow ml-auto"
                        onClick={() => muteUser(selectedUser.id, reasonOrDefault, muteMinutes)}
                    >
                        <FaVolumeMute size={10} />
                        <span className="ml-1">{LocalizeText('housekeeping.action.mute_min', ['m'], [String(muteMinutes)])}</span>
                    </Button>
                </div>
                <div className="flex items-center gap-1 rounded-md border border-fuchsia-200 bg-fuchsia-50/40 px-1.5 py-1">
                    <input
                        type="number"
                        min={1}
                        className="w-14 px-1 py-0.5 rounded border border-fuchsia-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                        value={tradeLockHours}
                        onChange={(event) => setTradeLockHours(parseInt(event.target.value) || 0)}
                    />
                    <span className="text-[10px] text-fuchsia-700">h</span>
                    <Button
                        variant="secondary"
                        disabled={disableActions}
                        className="grow ml-auto"
                        onClick={() => tradeLockUser(selectedUser.id, tradeLockHours, reasonOrDefault)}
                    >
                        <FaLock size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.action.trade_lock_h', ['h'], [String(tradeLockHours)])}</span>
                    </Button>
                </div>
                <Button variant="warning" disabled={disableActions} onClick={() => kickUser(selectedUser.id, reasonOrDefault)}>
                    <FaUserSlash size={10} />
                    <span className="ml-1">{LocalizeText('housekeeping.action.kick')}</span>
                </Button>
                <Button variant="danger" disabled={disableActions || !selectedUser?.isBanned} onClick={() => unbanUser(selectedUser.id)}>
                    <FaExclamationTriangle size={10} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.action.unban')}</span>
                </Button>
                <Button variant="danger" disabled={disableActions} onClick={() => forceDisconnectUser(selectedUser.id, reasonOrDefault)}>
                    <FaPlug size={10} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.action.force_disconnect')}</span>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-md border border-violet-200 bg-violet-50/40 p-2">
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        min={1}
                        max={12}
                        className="w-14 px-1.5 py-0.5 rounded border border-violet-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400"
                        value={rankDraft}
                        onChange={(event) => setRankDraft(parseInt(event.target.value) || 0)}
                    />
                    <Button variant="primary" disabled={disableActions} className="grow" onClick={() => setUserRank(selectedUser.id, rankDraft)}>
                        <FaUserShield size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.action.set_rank')}</span>
                    </Button>
                </div>
                <Button variant="dark" disabled={disableActions} onClick={() => resetUserPassword(selectedUser.id)}>
                    <FaKey size={10} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.action.reset_password')}</span>
                </Button>
            </div>

            <div className="text-[10px] text-zinc-500 italic pt-1 border-t border-zinc-200 flex items-center gap-1">
                <FaEnvelope size={9} className="opacity-50" />
                {LocalizeText('housekeeping.user.audit_hint')}
            </div>
        </div>
    );
};
