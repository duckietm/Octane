import { FC } from 'react';
import { LocalizeText } from '../../api';
import { Base, Column, Text } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { getDisconnectReasonKey, getReconnectPresentation, useConnectionState } from '../../hooks';

/** English when the hotel texts lack the key. */
const DISCONNECT_FALLBACKS: Record<string, { title: string, info: string }> = {
    maintenance: { title: 'Maintenance break!', info: 'The hotel is being worked on. Please come back in a little while.' },
    logged_out: { title: 'Logged out!', info: 'You have been logged out.' },
    just_banned: { title: 'You were banned!', info: 'Your account has been banned from the hotel.' },
    still_banned: { title: "You've been banned!", info: 'Your account is still banned from the hotel.' },
    concurrent_login: { title: "You've logged in elsewhere!", info: 'This session was closed because you logged in somewhere else.' },
    hotel_closed: { title: 'Hotel is closed!', info: 'The hotel is closed right now. Please come back later.' },
    incorrect_password: { title: 'Incorrect password!', info: 'Please log in again.' },
    idle: { title: 'Idle disconnection!', info: 'You were away for too long, so the hotel closed your session.' },
    incompatible_client_version: { title: 'Old version. Please update!', info: 'Please reload the page to get the latest version.' },
    generic: { title: 'Disconnected', info: 'You have been disconnected. Please try again.' }
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
                                {localizeOr('disconnected.back_to_hotel', 'Back to Hotel')}
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
                                Connection lost
                            </Text>
                            <Text fontSizeCustom={14} variant="white" className="text-center opacity-70">
                                Reconnecting to server... (attempt {attempt}/{maxAttempts})
                            </Text>
                            <Base className="w-full h-[4px] rounded-full bg-white/10 overflow-hidden mt-1">
                                <Base
                                    className="h-full bg-[#4dabf7] rounded-full transition-all duration-300"
                                    style={{ width: `${maxAttempts > 0 ? (attempt / maxAttempts) * 100 : 0}%` }}
                                />
                            </Base>
                            <Text fontSizeCustom={12} variant="white" className="text-center opacity-50">
                                Please wait, your session will be restored automatically
                            </Text>
                        </>
                    )}

                    {hasFailed && (
                        <>
                            <Text fontSizeCustom={36} className="text-center text-red-500">
                                &#9888;
                            </Text>
                            <Text fontSizeCustom={18} variant="white" className="text-center font-semibold">
                                Session expired
                            </Text>
                            <Text fontSizeCustom={14} variant="white" className="text-center opacity-70">
                                Your session has expired. Please log in again to enter the hotel.
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
