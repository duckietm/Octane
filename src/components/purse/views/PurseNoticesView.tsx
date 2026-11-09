import {
    AccountSafetyLockStatusChangeMessageEvent,
    ClubGiftInfoEvent,
    ClubGiftNotificationEvent,
    CreateLinkEvent,
    GetClubGiftInfo,
    GetSessionDataManager,
    UserInfoEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, GetOptionalConfigurationValue, localizeWithFallback, OpenUrl, SendMessageComposer } from '../../../api';
import hcIcon from '../../../assets/images/purse-swf/icons/1801_hc_icon_png$2f8b554609e9c5cbbdc46bcbe5764be5-210881771.png';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../../hooks';

/** AIR SafetyLockStatus: 1 is unlocked. */
const SAFETY_LOCK_UNLOCKED = 1;

/**
 * The AIR notices that hang under the purse (SingularNotificationController):
 * - ClubGiftNotification (club_gift_notification_xml, 192 x 82): when the server says HC gifts are waiting. "Choose
 *   your gift" opens the club gifts page, "Not now" hides it for the session.
 * - SafetyLockedNotification (safety_locked_notification_xml, 192 x 80): when the login data says the account is
 *   safety locked, with the unlock link (`link.format.safetylock_unlock`); it goes when the lock is lifted.
 */
export const PurseNoticesView: FC<{}> = () => {
    const [clubGiftVisible, setClubGiftVisible] = useState(false);
    const [clubGiftCancelled, setClubGiftCancelled] = useState(false);
    // The login data may have come before this view: start from the session's copy.
    const [safetyLocked, setSafetyLocked] = useState(() => !!GetSessionDataManager()?.isSafetyLocked);

    useMessageEvent<ClubGiftNotificationEvent>(ClubGiftNotificationEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.numGifts < 1 || clubGiftCancelled) return;

        setClubGiftVisible(true);
    });

    // The login notification can come before this view; the gift info says the same and follows every claim.
    useEffect(() => {
        SendMessageComposer(new GetClubGiftInfo());
    }, []);

    useMessageEvent<ClubGiftInfoEvent>(ClubGiftInfoEvent, (event) => {
        const giftsAvailable = event.getParser()?.giftsAvailable ?? 0;

        if (giftsAvailable < 1) setClubGiftVisible(false);
        else if (!clubGiftCancelled) setClubGiftVisible(true);
    });

    useMessageEvent<UserInfoEvent>(UserInfoEvent, (event) => {
        if (event.getParser()?.userInfo?.safetyLocked) setSafetyLocked(true);
    });

    useMessageEvent<AccountSafetyLockStatusChangeMessageEvent>(AccountSafetyLockStatusChangeMessageEvent, (event) => {
        if (event.getParser()?.status === SAFETY_LOCK_UNLOCKED) setSafetyLocked(false);
    });

    const openClubGifts = () => {
        const page = GetConfigurationValue<Record<string, string>>('catalog.links', {})?.['hc.hc_gifts'] || 'club_gifts';

        CreateLinkEvent(`catalog/open/${page}`);
        setClubGiftVisible(false);
    };

    const unlockUrl = GetOptionalConfigurationValue<string>('link.format.safetylock_unlock', '');

    return (
        <NativeTextTree>
            <>
                {clubGiftVisible && (
                    <div className="octane-purse-notice octane-purse-notice--club-gift" role="status">
                        <img src={hcIcon} alt="" className="octane-purse-notice__icon" />
                        <div className="octane-purse-notice__text octane-purse-notice__text--with-icon">
                            {localizeWithFallback('notifications.text.club_gift', "It's time to pick your monthly Habbo Club gift!")}
                        </div>
                        <BaseButton
                            type="button"
                            className="octane-purse-notice__link"
                            onClick={() => {
                                setClubGiftCancelled(true);
                                setClubGiftVisible(false);
                            }}
                        >
                            {localizeWithFallback('notifications.button.later', 'Not now')}
                        </BaseButton>
                        <BaseButton type="button" className="octane-purse-notice__button" onClick={openClubGifts}>
                            {localizeWithFallback('notifications.button.show_gift_list', 'Choose your gift')}
                        </BaseButton>
                    </div>
                )}
                {safetyLocked && (
                    <div className="octane-purse-notice octane-purse-notice--safety" role="status">
                        <div className="octane-purse-notice__text">
                            {localizeWithFallback(
                                'notifications.text.safety_locked',
                                'The safety lock of this account is on! Some features are disabled. Go to the website to unlock it.'
                            )}
                        </div>
                        {unlockUrl && (
                            <BaseButton type="button" className="octane-purse-notice__link" onClick={() => OpenUrl(unlockUrl)}>
                                {localizeWithFallback('notifications.button.safety_locked_unlock', 'Unlock')}
                            </BaseButton>
                        )}
                    </div>
                )}
            </>
        </NativeTextTree>
    );
};
