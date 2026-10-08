import { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBan,
    FaCircle,
    FaCoins,
    FaComments,
    FaGavel,
    FaHistory,
    FaSearch,
    FaShieldAlt,
    FaStickyNote,
    FaTimes,
    FaUserCog,
    FaUserSlash,
    FaVolumeMute
} from 'react-icons/fa';
import { HousekeepingUserSection, isAuditEntryAboutUser, LocalizeText } from '../../../../api';
import { useHasPermission, useHousekeeping, useHousekeepingDangerConfirm, useRoomUserListSnapshot } from '../../../../hooks';
import { HousekeepingHistoryView } from '../common/HousekeepingHistoryView';
import { HousekeepingListChoice, HousekeepingListView } from '../common/HousekeepingListView';
import { HousekeepingButton, HousekeepingEmptyState } from '../common/HousekeepingParts';
import { HousekeepingSubTab, HousekeepingSubTabs } from '../common/HousekeepingSubTabs';
import { HousekeepingUserAccountView } from './HousekeepingUserAccountView';
import { HousekeepingUserNotesView } from './HousekeepingUserNotesView';
import { HousekeepingUserCard } from './HousekeepingUserCard';
import { HousekeepingUserEconomyView } from './HousekeepingUserEconomyView';
import { DEFAULT_SANCTION_DRAFT, HousekeepingSanctionDraft, HousekeepingUserSanctionsView, sanctionReason } from './HousekeepingUserSanctionsView';

const BULK_CONFIRM_THRESHOLD = 5;

const USER_ACTIVITY_LISTS: HousekeepingListChoice[] = [
    { key: 'user.chatlog', labelKey: 'housekeeping.list.user.chatlog' },
    { key: 'user.visits', labelKey: 'housekeeping.list.user.visits' }
];

const USER_SECURITY_LISTS: HousekeepingListChoice[] = [
    { key: 'user.sanctions', labelKey: 'housekeeping.list.user.sanctions' },
    { key: 'user.clones', labelKey: 'housekeeping.list.user.clones' },
    { key: 'user.names', labelKey: 'housekeeping.list.user.names' }
];

/**
 * The user page: search (with multi-select for bulk actions), the user card,
 * and the sub-pages Sanctions / Economy / Account / History.
 */
export const HousekeepingUsersTab: FC = () => {
    const {
        selectedUser,
        setSelectedUser,
        lookupUserByName,
        lookupUserById,
        isUserLoading,
        isActionPending,
        userSuggestions,
        requestUserSuggestions,
        recentLookups,
        selectedUserIds,
        toggleUserSelection,
        clearUserSelection,
        banUsersBulk,
        kickUsersBulk,
        muteUsersBulk,
        userSection,
        setUserSection,
        actionLog
    } = useHousekeeping();
    const confirmDanger = useHousekeepingDangerConfirm();
    const roomUsers = useRoomUserListSnapshot();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [draft, setDraft] = useState<HousekeepingSanctionDraft>(DEFAULT_SANCTION_DRAFT);
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
    // The live shortcuts act through the room session, so they only make sense
    // while the target stands in the room the operator is in.
    const isInCurrentRoom = !!selectedUser && roomUsers.some((entry) => entry.webID === selectedUser.id);
    const history = useMemo(() => (selectedUser ? actionLog.filter((entry) => isAuditEntryAboutUser(entry, selectedUser.id)) : []), [actionLog, selectedUser]);
    const reason = sanctionReason(draft);

    const runBulkWithGate = (actionLabel: string, runner: () => void) => {
        if (selectedUserIds.length === 0) return;

        if (selectedUserIds.length >= BULK_CONFIRM_THRESHOLD) {
            confirmDanger(
                LocalizeText('housekeeping.bulk.confirm', ['action', 'count'], [actionLabel, String(selectedUserIds.length)]),
                String(selectedUserIds.length),
                runner,
                actionLabel
            );

            return;
        }

        runner();
    };

    const canEconomy = useHasPermission('acc_hk_economy');
    const allSections: HousekeepingSubTab<HousekeepingUserSection>[] = [
        { id: HousekeepingUserSection.SANCTIONS, label: LocalizeText('housekeeping.user.section.sanctions'), icon: <FaGavel size={9} /> },
        { id: HousekeepingUserSection.ACTIVITY, label: LocalizeText('housekeeping.user.section.activity'), icon: <FaComments size={9} /> },
        { id: HousekeepingUserSection.SECURITY, label: LocalizeText('housekeeping.user.section.security'), icon: <FaShieldAlt size={9} /> },
        { id: HousekeepingUserSection.ACCOUNT, label: LocalizeText('housekeeping.user.section.account'), icon: <FaUserCog size={9} /> },
        { id: HousekeepingUserSection.NOTES, label: LocalizeText('housekeeping.user.section.notes'), icon: <FaStickyNote size={9} /> },
        { id: HousekeepingUserSection.HISTORY, label: LocalizeText('housekeeping.user.section.history'), icon: <FaHistory size={9} />, count: history.length }
    ];
    // The economy page needs its area permission; the server refuses the actions without it anyway.
    const sections = canEconomy
        ? [
              ...allSections.slice(0, 3),
              { id: HousekeepingUserSection.ECONOMY, label: LocalizeText('housekeeping.user.section.economy'), icon: <FaCoins size={9} /> },
              ...allSections.slice(3)
          ]
        : allSections;

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <div className="flex items-center gap-1.5">
                    <div className="flex grow items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 shadow-sm focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-300">
                        <FaSearch className="shrink-0 text-zinc-400" size={11} />
                        <input
                            className="grow bg-transparent text-sm outline-none placeholder:italic placeholder:text-zinc-500"
                            placeholder={LocalizeText('housekeeping.user.search.placeholder')}
                            value={query}
                            onBlur={() => {
                                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                                blurTimerRef.current = setTimeout(() => setIsFocused(false), 120);
                            }}
                            onChange={(event) => setQuery(event.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') submitLookup();
                                if (event.key === 'Escape') setIsFocused(false);
                            }}
                        />
                    </div>
                    <HousekeepingButton disabled={isUserLoading} gap={1} onClick={submitLookup}>
                        <FaSearch className={isUserLoading ? 'animate-pulse' : ''} size={10} />
                        <span>{LocalizeText('housekeeping.user.search.button')}</span>
                    </HousekeepingButton>
                </div>
                {showSuggestionPanel && (
                    <div className="octane-hk-popover absolute left-0 right-0 top-full z-30 mt-1 max-h-[200px] overflow-y-auto rounded border border-zinc-200 bg-white shadow-lg">
                        {userSuggestions.length > 0
                            ? userSuggestions.map((entry) => {
                                  const isChecked = selectedUserIds.includes(entry.id);

                                  return (
                                      <div
                                          key={entry.id}
                                          className="flex w-full items-center gap-2 border-b border-zinc-100 px-2 py-1 text-xs last:border-b-0 hover:bg-sky-50"
                                          onMouseDown={(event) => event.preventDefault()}
                                      >
                                          <input
                                              checked={isChecked}
                                              className="shrink-0"
                                              title={isChecked ? LocalizeText('housekeeping.bulk.clear') : LocalizeText('housekeeping.bulk.apply')}
                                              type="checkbox"
                                              onChange={() => toggleUserSelection(entry.id)}
                                          />
                                          <button
                                              className="flex grow items-center gap-2 text-left"
                                              onClick={() => {
                                                  setQuery(entry.username);
                                                  setIsFocused(false);
                                                  lookupUserById(entry.id);
                                              }}
                                          >
                                              <FaCircle className={entry.online ? 'text-emerald-500' : 'text-zinc-400'} size={6} />
                                              <span className="grow truncate font-medium">{entry.username}</span>
                                              <span className="shrink-0 text-[10px] text-zinc-500">
                                                  #{entry.id} · {entry.rank}
                                              </span>
                                          </button>
                                      </div>
                                  );
                              })
                            : recentUsers.map((entry) => (
                                  <button
                                      key={entry.id}
                                      className="flex w-full items-center gap-2 border-b border-zinc-100 px-2 py-1 text-left text-xs last:border-b-0 hover:bg-sky-50"
                                      onClick={() => {
                                          setQuery(entry.label);
                                          setIsFocused(false);
                                          lookupUserById(entry.id);
                                      }}
                                      onMouseDown={(event) => event.preventDefault()}
                                  >
                                      <span className="shrink-0 text-[10px] uppercase text-zinc-400">{LocalizeText('housekeeping.user.recent')}</span>
                                      <span className="grow truncate font-medium">{entry.label}</span>
                                      <span className="shrink-0 text-[10px] text-zinc-500">#{entry.id}</span>
                                  </button>
                              ))}
                    </div>
                )}
            </div>

            {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 rounded border border-sky-300 bg-sky-50 p-1.5">
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                        {LocalizeText('housekeeping.bulk.label', ['count'], [String(selectedUserIds.length)])}
                    </span>
                    <HousekeepingButton
                        disabled={isActionPending}
                        gap={1}
                        size="sm"
                        variant="danger"
                        onClick={() =>
                            runBulkWithGate(LocalizeText('housekeeping.action.ban_h', ['h'], [String(draft.banHours)]), () =>
                                banUsersBulk(selectedUserIds, reason, draft.banHours)
                            )
                        }
                    >
                        <FaBan size={10} />
                        <span>{LocalizeText('housekeeping.action.ban_h', ['h'], [String(draft.banHours)])}</span>
                    </HousekeepingButton>
                    <HousekeepingButton
                        disabled={isActionPending}
                        gap={1}
                        size="sm"
                        variant="warning"
                        onClick={() =>
                            runBulkWithGate(LocalizeText('housekeeping.action.mute_min', ['m'], [String(draft.muteMinutes)]), () =>
                                muteUsersBulk(selectedUserIds, reason, draft.muteMinutes)
                            )
                        }
                    >
                        <FaVolumeMute size={10} />
                        <span>{LocalizeText('housekeeping.action.mute_min', ['m'], [String(draft.muteMinutes)])}</span>
                    </HousekeepingButton>
                    <HousekeepingButton
                        disabled={isActionPending}
                        gap={1}
                        size="sm"
                        variant="warning"
                        onClick={() => runBulkWithGate(LocalizeText('housekeeping.action.kick'), () => kickUsersBulk(selectedUserIds, reason))}
                    >
                        <FaUserSlash size={10} />
                        <span>{LocalizeText('housekeeping.action.kick')}</span>
                    </HousekeepingButton>
                    <button
                        className="ml-auto px-1 text-zinc-500 hover:text-rose-600"
                        title={LocalizeText('housekeeping.bulk.clear')}
                        onClick={clearUserSelection}
                    >
                        <FaTimes size={10} />
                    </button>
                </div>
            )}

            {!selectedUser && <HousekeepingEmptyState icon={<FaUserSlash size={14} />}>{LocalizeText('housekeeping.user.none')}</HousekeepingEmptyState>}

            {selectedUser && (
                <>
                    <HousekeepingUserCard user={selectedUser} onClear={() => setSelectedUser(null)} />
                    <HousekeepingSubTabs<HousekeepingUserSection> active={userSection} tabs={sections} onChange={setUserSection} />
                    {userSection === HousekeepingUserSection.SANCTIONS && (
                        <HousekeepingUserSanctionsView draft={draft} isInCurrentRoom={isInCurrentRoom} setDraft={setDraft} user={selectedUser} />
                    )}
                    {userSection === HousekeepingUserSection.ACTIVITY && (
                        <HousekeepingListView key={`activity-${selectedUser.id}`} lists={USER_ACTIVITY_LISTS} targetId={selectedUser.id} />
                    )}
                    {userSection === HousekeepingUserSection.SECURITY && (
                        <HousekeepingListView key={`security-${selectedUser.id}`} lists={USER_SECURITY_LISTS} targetId={selectedUser.id} />
                    )}
                    {canEconomy && userSection === HousekeepingUserSection.ECONOMY && <HousekeepingUserEconomyView user={selectedUser} />}
                    {userSection === HousekeepingUserSection.ACCOUNT && <HousekeepingUserAccountView key={selectedUser.id} user={selectedUser} />}
                    {userSection === HousekeepingUserSection.NOTES && <HousekeepingUserNotesView key={selectedUser.id} user={selectedUser} />}
                    {userSection === HousekeepingUserSection.HISTORY && <HousekeepingHistoryView entries={history} />}
                </>
            )}
        </div>
    );
};
