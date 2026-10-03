import { FC } from 'react';
import {
    FaBan,
    FaCalendarAlt,
    FaCircle,
    FaClock,
    FaEnvelope,
    FaGlobe,
    FaIdBadge,
    FaLock,
    FaTimes,
    FaTrophy,
    FaUserFriends,
    FaUsers,
    FaVolumeMute
} from 'react-icons/fa';
import { formatHousekeepingDate, FriendlyTime, IHousekeepingUser, LocalizeText } from '../../../../api';
import { LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon } from '../../../../common';
import { HousekeepingFact, HousekeepingPill } from '../common/HousekeepingParts';
import { HousekeepingPrivateIpView } from './HousekeepingPrivateIpView';

const CURRENCIES: { type: number; key: string; field: 'creditsBalance' | 'ducketsBalance' | 'diamondsBalance'; tone: string }[] = [
    { type: -1, key: 'housekeeping.user.credits', field: 'creditsBalance', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
    { type: 0, key: 'housekeeping.user.duckets', field: 'ducketsBalance', tone: 'border-orange-200 bg-orange-50 text-orange-800' },
    { type: 5, key: 'housekeeping.user.diamonds', field: 'diamondsBalance', tone: 'border-sky-200 bg-sky-50 text-sky-800' }
];

const NEVER_BEFORE = 946_684_800;

/** Identity, status, balances and profile facts of the user being moderated. */
export const HousekeepingUserCard: FC<{ user: IHousekeepingUser; onClear: () => void }> = ({ user, onClear }) => {
    const profile = user.profile;
    // Accounts that never logged in carry a near-zero last_online; treat anything before 2000 as never.
    const secondsAway = user.lastOnlineAt && user.lastOnlineAt > NEVER_BEFORE ? Math.max(0, Math.floor(Date.now() / 1000) - user.lastOnlineAt) : -1;
    const lastSeen = user.online ? LocalizeText('housekeeping.user.online') : secondsAway >= 0 ? FriendlyTime.format(secondsAway, '.ago', 2) : '-';

    return (
        <div className="rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
                <div className="relative h-[84px] w-[56px] shrink-0 overflow-hidden rounded-md bg-sky-100/70 ring-1 ring-sky-200">
                    {user.figure ? (
                        <LayoutAvatarImageView direction={2} figure={user.figure} fit />
                    ) : (
                        <span className="octane-icon octane-icon-hk-hero icon-modtools absolute inset-0 m-auto" />
                    )}
                </div>
                <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-base font-bold">{user.username}</span>
                        <span className="text-[10px] tabular-nums text-zinc-500">#{user.id}</span>
                        <HousekeepingPill
                            icon={<FaCircle className={user.online ? 'animate-pulse' : ''} size={6} />}
                            tone={user.online ? 'success' : 'neutral'}
                        >
                            {LocalizeText(user.online ? 'housekeeping.user.online' : 'housekeeping.user.offline')}
                        </HousekeepingPill>
                        {user.rankName && (
                            <HousekeepingPill icon={<FaIdBadge size={8} />} tone="accent">
                                {user.rankName} · {user.rank}
                            </HousekeepingPill>
                        )}
                        {user.isBanned && (
                            <HousekeepingPill icon={<FaBan size={8} />} tone="danger">
                                {LocalizeText('housekeeping.user.banned')}
                            </HousekeepingPill>
                        )}
                        {user.isMuted && (
                            <HousekeepingPill icon={<FaVolumeMute size={8} />} tone="warning">
                                {LocalizeText('housekeeping.user.muted')}
                            </HousekeepingPill>
                        )}
                        {user.isTradeLocked && (
                            <HousekeepingPill icon={<FaLock size={8} />} tone="danger">
                                {LocalizeText('housekeeping.user.trade_locked')}
                            </HousekeepingPill>
                        )}
                    </div>
                    <div className="mt-0.5 truncate text-xs italic text-zinc-600">{user.motto || LocalizeText('housekeeping.user.no_motto')}</div>
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
                        {CURRENCIES.map((currency) => (
                            <div
                                key={currency.type}
                                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 ${currency.tone}`}
                                title={LocalizeText(currency.key)}
                            >
                                <LayoutCurrencyIcon type={currency.type} />
                                <span className="font-semibold tabular-nums">{user[currency.field].toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <button className="p-1 text-zinc-400 transition-colors hover:text-rose-600" title={LocalizeText('housekeeping.user.clear')} onClick={onClear}>
                    <FaTimes size={12} />
                </button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1">
                <HousekeepingFact
                    icon={<FaCalendarAlt size={8} />}
                    label={LocalizeText('housekeeping.user.fact.registered')}
                    value={formatHousekeepingDate(profile?.accountCreatedAt)}
                />
                <HousekeepingFact icon={<FaClock size={8} />} label={LocalizeText('housekeeping.user.fact.last_seen')} value={lastSeen} />
                <HousekeepingFact
                    icon={<FaTrophy size={8} />}
                    label={LocalizeText('housekeeping.user.fact.score')}
                    value={profile ? profile.achievementScore.toLocaleString() : '-'}
                />
                <HousekeepingFact
                    icon={<FaUserFriends size={8} />}
                    label={LocalizeText('housekeeping.user.fact.friends')}
                    value={profile ? profile.friendsCount : '-'}
                />
                <HousekeepingFact
                    icon={<FaUsers size={8} />}
                    label={LocalizeText('housekeeping.user.fact.groups')}
                    value={profile ? profile.groupsCount : '-'}
                />
                <HousekeepingFact
                    icon={<FaGlobe size={8} />}
                    label={LocalizeText('housekeeping.user.fact.ip')}
                    value={<HousekeepingPrivateIpView masked={user.ipLast} userId={user.id} />}
                />
            </div>

            {(user.email || !!profile?.wornBadges.length) && (
                <div className="mt-1.5 flex items-center gap-2">
                    {user.email && (
                        <span className="flex min-w-0 items-center gap-1 text-[10px] text-zinc-500" title={user.email}>
                            <FaEnvelope size={8} />
                            <span className="truncate">{user.email}</span>
                        </span>
                    )}
                    {!!profile?.wornBadges.length && (
                        <div className="ml-auto flex shrink-0 items-center gap-0.5" title={LocalizeText('housekeeping.user.fact.badges')}>
                            {profile.wornBadges.map((badge) => (
                                <div key={badge.slot} className="relative h-[40px] w-[40px] rounded border border-zinc-200 bg-white/80">
                                    <LayoutBadgeImageView badgeCode={badge.code} showInfo />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
