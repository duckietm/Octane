/**
 * Official HabboGroupsManager.onJoinFailed / onGuildEditFailed: one failure
 * reason on each packet opens the "HC required" popup (club_required layout)
 * instead of the generic alert.
 */

/** HabboGroupJoinFailedMessageParser.INSUFFICIENT_SUBSCRIPTION_LEVEL */
export const GROUP_JOIN_FAIL_HC_REQUIRED = 4;

/** GuildEditFailedMessageParser.INSUFFICIENT_SUBSCRIPTION_LEVEL */
export const GROUP_EDIT_FAIL_HC_REQUIRED = 2;

export type GroupHcRequiredMode = 'join' | 'manage';

export interface GroupFailureOutcome {
    /** Open the HC required popup with this info text, or null for a plain alert. */
    hcRequired: GroupHcRequiredMode | null;
    /** Alert body key (`group.joinfail.N` / `group.edit.fail.N`) when no popup applies. */
    messageKey: string;
    titleKey: string;
}

export const resolveGroupJoinFailure = (reason: number): GroupFailureOutcome => ({
    hcRequired: reason === GROUP_JOIN_FAIL_HC_REQUIRED ? 'join' : null,
    messageKey: `group.joinfail.${reason}`,
    titleKey: 'group.joinfail.title'
});

export const resolveGroupEditFailure = (reason: number): GroupFailureOutcome => ({
    hcRequired: reason === GROUP_EDIT_FAIL_HC_REQUIRED ? 'manage' : null,
    messageKey: `group.edit.fail.${reason}`,
    titleKey: 'group.edit.fail.title'
});

/** HcRequiredWindowCtrl.show(manage): the info line depends on what was refused. */
export const getGroupHcRequiredInfoKey = (mode: GroupHcRequiredMode): string =>
    mode === 'manage' ? 'group.hcrequired.info.manage' : 'group.hcrequired.info.join';
