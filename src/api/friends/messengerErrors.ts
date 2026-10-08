// Follow failures, as the server's StalkErrorComposer sends them.
const FOLLOW_ERROR_TEXT_KEYS: Record<number, string> = {
    0: 'friendlist.followerror.notfriend',
    1: 'friendlist.followerror.offline',
    2: 'friendlist.followerror.hotelview',
    3: 'friendlist.followerror.prevented'
};

// Instant message failures, as Flash maps InstantMessageErrorMessageEvent codes.
const INSTANT_MESSAGE_ERROR_TEXT_KEYS: Record<number, string> = {
    3: 'messenger.error.receivermuted',
    4: 'messenger.error.sendermuted',
    5: 'messenger.error.offline',
    6: 'messenger.error.notfriend',
    7: 'messenger.error.busy',
    8: 'messenger.error.receiverhasnochat',
    9: 'messenger.error.senderhasnochat',
    10: 'messenger.error.offline_failed'
};

export const getFollowErrorTextKey = (errorCode: number): string => FOLLOW_ERROR_TEXT_KEYS[errorCode] ?? 'friendlist.followerror.hotelview';

/** Unknown codes still read as "failed to send", so the line never looks delivered. */
export const getInstantMessageErrorTextKey = (errorCode: number): string => INSTANT_MESSAGE_ERROR_TEXT_KEYS[errorCode] ?? 'messenger.error.offline_failed';
