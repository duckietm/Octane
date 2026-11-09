import { registerSharedHook } from '@/state/useSharedHook';
import { GuildEditFailedMessageEvent, GuildMemberMgmtFailedMessageEvent } from '@octane/renderer';
import { getGroupFailureFallback, getGroupFailureTextKey, getGroupFailureTitleKey, GroupFailureKind, localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/**
 * The server's group failures (edit, member management) were never shown: the action just did nothing.
 * Join failures are shown by GroupsView in the group alert window (reason 4 opens the Habbo Club required window).
 */
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
    useMessageEvent<GuildMemberMgmtFailedMessageEvent>(GuildMemberMgmtFailedMessageEvent, (event) => alertFailure('membermgmt', event.getParser().reason));

    return {};
};

registerSharedHook(useGroupFailureAlertsState);
