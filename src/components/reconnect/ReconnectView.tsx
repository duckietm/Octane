import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../api';
import { Base, Column, Text } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { getDisconnectReasonKey, getReconnectPresentation, useConnectionState } from '../../hooks';

/** English when the hotel texts lack the key. */
const DISCONNECT_FALLBACKS: Record<string, { title: string, info: string }> = {
    maintenance: { get title() { return localizeWithFallback('octane.reconnect.maintenance_break', 'Maintenance break!'); }, get info() { return localizeWithFallback('octane.reconnect.the_hotel_is_being_worked_on', 'The hotel is being worked on. Please come back in a little while.'); } },
    logged_out: { get title() { return localizeWithFallback('octane.reconnect.logged_out', 'Logged out!'); }, get info() { return localizeWithFallback('octane.reconnect.you_have_been_logged_out', 'You have been logged out.'); } },
    just_banned: { get title() { return localizeWithFallback('octane.reconnect.you_were_banned', 'You were banned!'); }, get info() { return localizeWithFallback('octane.reconnect.your_account_has_been_banned_from', 'Your account has been banned from the hotel.'); } },
    still_banned: { get title() { return localizeWithFallback('octane.reconnect.you_ve_been_banned', 'You\'ve been banned!'); }, get info() { return localizeWithFallback('octane.reconnect.your_account_is_still_banned_from', 'Your account is still banned from the hotel.'); } },
    concurrent_login: { get title() { return localizeWithFallback('octane.reconnect.you_ve_logged_in_elsewhere', 'You\'ve logged in elsewhere!'); }, get info() { return localizeWithFallback('octane.reconnect.this_session_was_closed_because_you', 'This session was closed because you logged in somewhere else.'); } },
    hotel_closed: { get title() { return localizeWithFallback('octane.reconnect.hotel_is_closed', 'Hotel is closed!'); }, get info() { return localizeWithFallback('octane.reconnect.the_hotel_is_closed_right_now', 'The hotel is closed right now. Please come back later.'); } },
    incorrect_password: { get title() { return localizeWithFallback('octane.reconnect.incorrect_password', 'Incorrect password!'); }, get info() { return localizeWithFallback('octane.reconnect.please_log_in_again', 'Please log in again.'); } },
    idle: { get title() { return localizeWithFallback('octane.reconnect.idle_disconnection', 'Idle disconnection!'); }, get info() { return localizeWithFallback('octane.reconnect.you_were_away_for_too_long', 'You were away for too long, so the hotel closed your session.'); } },
    incompatible_client_version: { get title() { return localizeWithFallback('octane.reconnect.old_version_please_update', 'Old version. Please update!'); }, get info() { return localizeWithFallback('octane.reconnect.please_reload_the_page_to_get', 'Please reload the page to get the latest version.'); } },
    generic: { title: 'Disconnected', get info() { return localizeWithFallback('octane.reconnect.you_have_been_disconnected_please_try', 'You have been disconnected. Please try again.'); } }
};

const localizeOr = (key: string, fallback: string): string => {
    const value = LocalizeText(key);

    return (!value || (value === key)) ? fallback : value;
};

export const ReconnectView: FC<{}> = () => {
    const connectionState = useConnectionState();
    const { isReconnecting, hasFailed, attempt, maxAttempts } = getReconnectPresentation(connectionState);
    const disconnectReason = connectionState.disconnectReason;
    const wasKicked = (connectionState.phase === 'disconnected') && (disconnectReason !== undefined) && (disconnectReason !== null);

    if (wasKicked) {
        const key = getDisconnectReasonKey(disconnectReason);
        const fallback = DISCONNECT_FALLBACKS[key] ?? DISCONNECT_FALLBACKS.generic;

        return (
            <NativeTextTree>
                <Column fullHeight position="fixed" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <Column alignItems="center" gap={3} className="p-6 rounded-xl bg-[#1a1a2e]/90 border border-white/10 shadow-2xl max-w-[400px]">
                        <Text fontSizeCustom={36} className="text-center text-red-500">
                            &#9888;
                        </Text>
                        <Text fontSizeCustom={18} variant="white" className="text-center font-semibold">
                            {localizeOr('disconnected.' + key, fallback.title)}
                        </Text>
                        <Text fontSizeCustom={14} variant="white" className="text-center opacity-70">
                            {localizeOr('disconnected.info.' + key, fallback.info)}
                        </Text>
                        <Base className="mt-2 flex gap-3">
                            <a
                                href={window.location.origin + '/'}
                                className="px-6 py-2 rounded-lg bg-[#3b82f6] text-white font-semibold cursor-pointer hover:bg-[#2563eb] transition-colors no-underline"
                            >
                                {localizeOr('disconnected.back_to_hotel', localizeWithFallback('octane.reconnect.back_to_hotel', 'Back to Hotel'))}
                            </a>
                        </Base>
                    </Column>
                </Column>
            </NativeTextTree>
        );
    }

    if (!isReconnecting && !hasFailed) return null;

    return (
        <NativeTextTree>
            <Column fullHeight position="fixed" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <Column alignItems="center" gap={3} className="p-6 rounded-xl bg-[#1a1a2e]/90 border border-white/10 shadow-2xl max-w-[400px]">
                    {isReconnecting && (
                        <>
                            <Base className="w-[48px] h-[48px] border-4 border-white/20 border-t-[#4dabf7] rounded-full animate-spin" />
                            <Text fontSizeCustom={18} variant="white" className="text-center font-semibold">
                                {localizeWithFallback('octane.reconnect.connection_lost', 'Connection lost')}
                            </Text>
                            <Text fontSizeCustom={14} variant="white" className="text-center opacity-70">
                                {localizeWithFallback('octane.reconnect.reconnecting_attempt', 'Reconnecting to server... (attempt %attempt%/%max%)', ['attempt', 'max'], [String(attempt), String(maxAttempts)])}
                            </Text>
                            <Base className="w-full h-[4px] rounded-full bg-white/10 overflow-hidden mt-1">
                                <Base
                                    className="h-full bg-[#4dabf7] rounded-full transition-all duration-300"
                                    style={{ width: `${maxAttempts > 0 ? (attempt / maxAttempts) * 100 : 0}%` }}
                                />
                            </Base>
                            <Text fontSizeCustom={12} variant="white" className="text-center opacity-50">
                                {localizeWithFallback('octane.reconnect.please_wait_your_session_will_be', 'Please wait, your session will be restored automatically')}
                            </Text>
                        </>
                    )}

                    {hasFailed && (
                        <>
                            <Text fontSizeCustom={36} className="text-center text-red-500">
                                &#9888;
                            </Text>
                            <Text fontSizeCustom={18} variant="white" className="text-center font-semibold">
                                {localizeWithFallback('octane.reconnect.session_expired', 'Session expired')}
                            </Text>
                            <Text fontSizeCustom={14} variant="white" className="text-center opacity-70">
                                {localizeWithFallback('octane.reconnect.your_session_has_expired_please_log', 'Your session has expired. Please log in again to enter the hotel.')}
                            </Text>
                            <Base className="mt-2 flex gap-3">
                                <a
                                    href={window.location.origin + '/'}
                                    className="px-6 py-2 rounded-lg bg-[#3b82f6] text-white font-semibold cursor-pointer hover:bg-[#2563eb] transition-colors no-underline"
                                >
                                    Back to Hotel
                                </a>
                            </Base>
                        </>
                    )}
                </Column>
            </Column>
        </NativeTextTree>
    );
};
