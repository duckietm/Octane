import {
    CreateLinkEvent,
    GetModeratorUserInfoMessageComposer,
    ModeratorActionResultMessageEvent,
    ModeratorUserInfoData,
    ModeratorUserInfoEvent
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaBan, FaCommentDots, FaDoorOpen, FaEnvelope, FaExchangeAlt, FaExclamationTriangle, FaExternalLinkAlt, FaGavel, FaSync } from 'react-icons/fa';
import { FriendlyTime, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent, useModTools, useRoomUserListSnapshot } from '../../../../hooks';
import {
    HK_HABBO_INFO_TOOL_URL,
    HK_IDENTITY_INFORMATION_URL,
    HK_MODERATOR_ACTION_LOG_URL,
    hasHousekeepingUrl,
    openHousekeepingPage
} from '../../common/ModToolsHousekeepingLinks';
import { getSanctionAgeColor, getUserInfoButtonState, NO_IDENTITY_EMAIL } from './ModToolsUserInfoFormat';
import { ModToolsUserModActionView } from './ModToolsUserModActionView';
import { ModToolsUserRoomVisitsView } from './ModToolsUserRoomVisitsView';
import { ModToolsUserSendMessageView } from './ModToolsUserSendMessageView';

interface ModToolsUserViewProps {
    userId: number;
    onCloseClick: () => void;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    tone?: 'neutral' | 'warn' | 'danger';
    /** Opens the housekeeping page behind the counter; only offered once the counter is above zero, as in the official client. */
    onView?: () => void;
    viewTitle?: string;
}

const StatCard: FC<StatCardProps> = ({ icon, label, value, tone = 'neutral', onView = null, viewTitle = '' }) => {
    const numericValue = typeof value === 'number' ? value : parseInt(value as string, 10);
    const isElevated = !Number.isNaN(numericValue) && numericValue > 0;
    const toneClasses = (() => {
        if (tone === 'danger' && isElevated) return 'bg-rose-50 border-rose-200 text-rose-700';
        if (tone === 'warn' && isElevated) return 'bg-amber-50 border-amber-200 text-amber-700';
        return 'bg-zinc-50 border-zinc-200 text-zinc-700';
    })();
    const canView = isElevated && !!onView;

    return (
        <div className={`flex flex-col items-center justify-center px-2 py-1.5 rounded border ${toneClasses} grow min-w-0`}>
            <div className="flex items-center gap-1.5 text-[.7rem] uppercase tracking-wide opacity-70">
                <span className="shrink-0">{icon}</span>
                <span className="truncate">{label}</span>
            </div>
            {canView ? (
                <button
                    className="text-lg font-semibold tabular-nums leading-tight underline decoration-dotted underline-offset-2 hover:opacity-80 inline-flex items-center gap-1"
                    title={viewTitle}
                    type="button"
                    onClick={onView}
                >
                    {value} <FaExternalLinkAlt className="opacity-60" size={9} />
                </button>
            ) : (
                <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
            )}
        </div>
    );
};

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="flex flex-col gap-1">
        <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 mb-0.5">{title}</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[.8rem] m-0">{children}</dl>
    </div>
);

const Field: FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <>
        <dt className="opacity-60 whitespace-nowrap">{label}</dt>
        <dd className="m-0 break-words font-medium">{value || value === 0 ? value : <span className="opacity-40">-</span>}</dd>
    </>
);

export const ModToolsUserView: FC<ModToolsUserViewProps> = (props) => {
    const { onCloseClick = null, userId = null } = props;
    const [userInfo, setUserInfo] = useState<ModeratorUserInfoData>(null);
    const [sendMessageVisible, setSendMessageVisible] = useState(false);
    const [modActionVisible, setModActionVisible] = useState(false);
    const [roomVisitsVisible, setRoomVisitsVisible] = useState(false);
    const { settings = null } = useModTools();
    // Reactive presence: if the target user is currently in the room
    // we're observing, they're online — irrespective of what the
    // one-shot ModeratorUserInfoData.online said when the panel opened.
    const roomUserList = useRoomUserListSnapshot();
    const isPresentInCurrentRoom = useMemo(() => roomUserList.some((user) => user && user.webID === userId), [roomUserList, userId]);
    const isOnline = isPresentInCurrentRoom || !!(userInfo && userInfo.online);
    const presenceLabel = isPresentInCurrentRoom
        ? LocalizeText('modtools.userinfo.presence.in_room')
        : isOnline
          ? LocalizeText('modtools.userinfo.presence.online')
          : LocalizeText('modtools.userinfo.presence.offline');
    const presenceTitle = isPresentInCurrentRoom
        ? LocalizeText('modtools.userinfo.presence.in_room.title')
        : isOnline
          ? LocalizeText('modtools.userinfo.presence.online.title')
          : LocalizeText('modtools.userinfo.presence.offline.title');
    const presencePillClass = isPresentInCurrentRoom
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : isOnline
          ? 'bg-sky-100 text-sky-700 border-sky-200'
          : 'bg-zinc-100 text-zinc-600 border-zinc-200';
    const presenceDotClass = isPresentInCurrentRoom ? 'bg-emerald-500' : isOnline ? 'bg-sky-500' : 'bg-zinc-400';

    const refresh = () => SendMessageComposer(new GetModeratorUserInfoMessageComposer(userId));

    useMessageEvent<ModeratorUserInfoEvent>(ModeratorUserInfoEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.data.userId !== userId) return;

        setUserInfo(parser.data);
    });

    // Refresh counters (cfhCount / banCount / cautionCount /
    // lastSanctionTime) after the moderator applies a sanction on THIS
    // user — otherwise the table stays frozen on the values at panel
    // open. Parser carries userId so we can filter precisely.
    useMessageEvent<ModeratorActionResultMessageEvent>(ModeratorActionResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !parser.success || parser.userId !== userId) return;

        refresh();
    });

    useEffect(() => {
        SendMessageComposer(new GetModeratorUserInfoMessageComposer(userId));
    }, [userId]);

    if (!userInfo) return null;

    // The counters link to the housekeeping pages the official client opens: the moderator
    // log is keyed by user name, the identity tool by identity id, so the substitutions
    // follow `UserInfoCtrl` rather than always passing the user id.
    const buttons = getUserInfoButtonState(settings, userInfo.primaryEmailAddress);
    const hasModeratorLog = hasHousekeepingUrl(HK_MODERATOR_ACTION_LOG_URL);
    const hasIdentityTool = hasHousekeepingUrl(HK_IDENTITY_INFORMATION_URL);
    const hasHabboInfoTool = hasHousekeepingUrl(HK_HABBO_INFO_TOOL_URL);
    const openModeratorLog = hasModeratorLog ? () => openHousekeepingPage(HK_MODERATOR_ACTION_LOG_URL, userInfo.userName) : null;
    const viewLogTitle = localizeWithFallback('modtools.userinfo.link.moderator_log', 'View in the moderator action log');
    const sanctionColor = getSanctionAgeColor(userInfo.sanctionAgeHours);
    const noPermissionHint = localizeWithFallback('modtools.userinfo.button.no_permission', 'You do not have the right to use this tool');
    const noIdentityHint = localizeWithFallback('modtools.userinfo.button.no_identity', 'This account has no identity and cannot be sanctioned');
    const modActionHint = !buttons.modAction ? (userInfo.primaryEmailAddress === NO_IDENTITY_EMAIL ? noIdentityHint : noPermissionHint) : undefined;

    return (
        <>
            <OctaneCardView
                className="octane-mod-tools-user min-w-0 w-[min(480px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                theme="primary-slim"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
            >
                <OctaneCardHeaderView
                    headerText={LocalizeText('modtools.userinfo.title', ['username'], [userInfo.userName])}
                    onCloseClick={() => onCloseClick()}
                />
                <OctaneCardContentView className="text-black" gap={2}>
                    {/* Identity header: name + presence pill + manual refresh */}
                    <div className="flex items-center gap-2 bg-gradient-to-r from-sky-50 to-transparent rounded p-2 border border-sky-100">
                        <div className="flex flex-col grow min-w-0">
                            <Text bold className="truncate text-base leading-tight">
                                {userInfo.userName}
                            </Text>
                            <Text className="opacity-60 text-xs truncate">
                                ID #{userInfo.userId}
                                {userInfo.userClassification ? ` · ${userInfo.userClassification}` : ''}
                            </Text>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${presencePillClass}`}
                            title={presenceTitle}
                        >
                            <span className={`inline-block w-2 h-2 rounded-full ${presenceDotClass}`} />
                            {presenceLabel}
                        </span>
                        {hasHabboInfoTool && (
                            <button
                                className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-sky-700 hover:bg-sky-100 transition-colors shrink-0"
                                title={localizeWithFallback('modtools.userinfo.button.habbo_info_tool', 'Open in the Habbo info tool')}
                                type="button"
                                onClick={() => openHousekeepingPage(HK_HABBO_INFO_TOOL_URL, userInfo.userName)}
                            >
                                <FaExternalLinkAlt size={12} />
                            </button>
                        )}
                        <button
                            className="inline-flex items-center justify-center w-7 h-7 rounded text-zinc-500 hover:text-sky-700 hover:bg-sky-100 transition-colors shrink-0"
                            onClick={refresh}
                            title={LocalizeText('modtools.userinfo.refresh')}
                        >
                            <FaSync size={12} />
                        </button>
                    </div>

                    {/* Moderation stat strip */}
                    <div className="flex gap-1.5">
                        <StatCard
                            icon={<FaExclamationTriangle size={10} />}
                            label={LocalizeText('modtools.userinfo.stat.cfh')}
                            tone="warn"
                            value={userInfo.cfhCount}
                        />
                        <StatCard
                            icon={<FaGavel size={10} />}
                            label={LocalizeText('modtools.userinfo.stat.cautions')}
                            tone="warn"
                            value={userInfo.cautionCount}
                            viewTitle={viewLogTitle}
                            onView={openModeratorLog}
                        />
                        <StatCard
                            icon={<FaBan size={10} />}
                            label={LocalizeText('modtools.userinfo.stat.bans')}
                            tone="danger"
                            value={userInfo.banCount}
                            viewTitle={viewLogTitle}
                            onView={openModeratorLog}
                        />
                        <StatCard
                            icon={<FaExchangeAlt size={10} />}
                            label={LocalizeText('modtools.userinfo.stat.trade.locks')}
                            tone="danger"
                            value={userInfo.tradingLockCount}
                            viewTitle={viewLogTitle}
                            onView={openModeratorLog}
                        />
                    </div>

                    {/* Body sections */}
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-auto pr-1">
                        <Section title={LocalizeText('modtools.userinfo.section.account')}>
                            <Field label={LocalizeText('modtools.userinfo.primaryEmailAddress')} value={userInfo.primaryEmailAddress} />
                            <Field
                                label={LocalizeText('modtools.userinfo.registrationAgeInMinutes')}
                                value={FriendlyTime.format(userInfo.registrationAgeInMinutes * 60, '.ago', 2)}
                            />
                            <Field label={LocalizeText('modtools.userinfo.userClassification')} value={userInfo.userClassification} />
                        </Section>
                        <Section title={LocalizeText('modtools.userinfo.section.activity')}>
                            <Field
                                label={LocalizeText('modtools.userinfo.minutesSinceLastLogin')}
                                value={FriendlyTime.format(userInfo.minutesSinceLastLogin * 60, '.ago', 2)}
                            />
                            <Field label={LocalizeText('modtools.userinfo.lastPurchaseDate')} value={userInfo.lastPurchaseDate} />
                        </Section>
                        <Section title={LocalizeText('modtools.userinfo.section.sanctions')}>
                            <Field label={LocalizeText('modtools.userinfo.abusiveCfhCount')} value={userInfo.abusiveCfhCount} />
                            <Field
                                label={LocalizeText('modtools.userinfo.lastSanctionTime')}
                                value={
                                    userInfo.lastSanctionTime ? (
                                        <span
                                            data-testid="last-sanction-time"
                                            style={sanctionColor ? { color: sanctionColor } : undefined}
                                            title={
                                                sanctionColor
                                                    ? localizeWithFallback(
                                                          'modtools.userinfo.lastSanctionTime.recent',
                                                          'Sanctioned %hours% hours ago',
                                                          ['hours'],
                                                          [String(userInfo.sanctionAgeHours)]
                                                      )
                                                    : undefined
                                            }
                                        >
                                            {userInfo.lastSanctionTime}
                                        </span>
                                    ) : null
                                }
                            />
                            <Field
                                label={LocalizeText('modtools.userinfo.identityRelatedBanCount')}
                                value={
                                    hasIdentityTool && userInfo.identityRelatedBanCount > 0 ? (
                                        <button
                                            className="underline decoration-dotted underline-offset-2 hover:text-sky-700 inline-flex items-center gap-1"
                                            title={localizeWithFallback('modtools.userinfo.link.identity', 'View identity information')}
                                            type="button"
                                            onClick={() => openHousekeepingPage(HK_IDENTITY_INFORMATION_URL, userInfo.identityId)}
                                        >
                                            {userInfo.identityRelatedBanCount} <FaExternalLinkAlt className="opacity-60" size={8} />
                                        </button>
                                    ) : (
                                        userInfo.identityRelatedBanCount
                                    )
                                }
                            />
                        </Section>
                        <Section title={LocalizeText('modtools.userinfo.section.trading')}>
                            <Field label={LocalizeText('modtools.userinfo.tradingExpiryDate')} value={userInfo.tradingExpiryDate} />
                        </Section>
                    </div>

                    {/* Action bar */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-200">
                        <Button disabled={!buttons.chatlog} title={!buttons.chatlog ? noPermissionHint : undefined} gap={1} variant="primary" classNames={['mod-tools-action-button']} onClick={() => CreateLinkEvent(`mod-tools/open-user-chatlog/${userId}`)}>
                            <FaCommentDots size={12} /> {LocalizeText('modtools.userinfo.button.room.chat')}
                        </Button>
                        <Button disabled={!buttons.message} title={!buttons.message ? noPermissionHint : undefined} gap={1} variant="primary" classNames={['mod-tools-action-button']} onClick={() => setSendMessageVisible((prev) => !prev)}>
                            <FaEnvelope size={12} /> {LocalizeText('modtools.userinfo.button.send.message')}
                        </Button>
                        <Button gap={1} variant="primary" classNames={['mod-tools-action-button']} onClick={() => setRoomVisitsVisible((prev) => !prev)}>
                            <FaDoorOpen size={12} /> {LocalizeText('modtools.userinfo.button.room.visits')}
                        </Button>
                        <Button disabled={!buttons.modAction} title={modActionHint} gap={1} variant="danger" classNames={['mod-tools-danger-button']} onClick={() => setModActionVisible((prev) => !prev)}>
                            <FaGavel size={12} /> {LocalizeText('modtools.userinfo.button.mod.action')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
            {sendMessageVisible && (
                <ModToolsUserSendMessageView user={{ userId: userId, username: userInfo.userName }} onCloseClick={() => setSendMessageVisible(false)} />
            )}
            {modActionVisible && (
                <ModToolsUserModActionView user={{ userId: userId, username: userInfo.userName }} onCloseClick={() => setModActionVisible(false)} />
            )}
            {roomVisitsVisible && <ModToolsUserRoomVisitsView userId={userId} onCloseClick={() => setRoomVisitsVisible(false)} />}
        </>
    );
};
