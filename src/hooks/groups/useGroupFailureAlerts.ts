import { registerSharedHook } from '@/state/useSharedHook';
import { GuildEditFailedMessageEvent, GuildMemberMgmtFailedMessageEvent, HabboGroupJoinFailedMessageEvent } from '@octane/renderer';
import { getGroupFailureFallback, getGroupFailureTextKey, getGroupFailureTitleKey, GroupFailureKind, localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** The server's group failures (edit, join, member management) were never shown: the action just did nothing. */
const useGroupFailureAlertsState = () => {
    const { simpleAlert = null } = useNotification();

    const alertFailure = (kind: GroupFailureKind, reason: number) =>
        simpleAlert(
            localizeWithFallback(getGroupFailureTextKey(kind, reason), getGroupFailureFallback(kind, reason)),
            null,
            null,
            null,
            localizeWithFallback(getGroupFailureTitleKey(kind), 'Group')
        );

    useMessageEvent<GuildEditFailedMessageEvent>(GuildEditFailedMessageEvent, (event) => alertFailure('edit', event.getParser().reason));
    useMessageEvent<HabboGroupJoinFailedMessageEvent>(HabboGroupJoinFailedMessageEvent, (event) => alertFailure('join', event.getParser().reason));
    useMessageEvent<GuildMemberMgmtFailedMessageEvent>(GuildMemberMgmtFailedMessageEvent, (event) => alertFailure('membermgmt', event.getParser().reason));

    return {};
};

registerSharedHook(useGroupFailureAlertsState);
