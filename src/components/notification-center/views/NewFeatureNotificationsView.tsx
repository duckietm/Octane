import { CSSProperties, FC, useEffect, useState } from 'react';
import {
    getNewFeatureCountdownUnits,
    localizeWithFallback,
    NEW_FEATURE_BG_COLOR_NORMAL,
    NEW_FEATURE_TYPE_COUNTDOWN,
    NEW_FEATURE_TYPE_NORMAL,
    newFeatureColorToCss,
    newFeatureHexToUint
} from '../../../api';
import closeIcon from '../../../assets/images/notifications/new-feature/close-x.png';
import freeTrackIcon from '../../../assets/images/reward-track/free-track.png';
import premiumTrackIcon from '../../../assets/images/reward-track/premium-track.png';
import rewardTrackSmallIcon from '../../../assets/images/reward-track/small-icon.png';
import { BaseButton } from '../../../common/BaseButton';
import { NewFeatureNotificationEntry, useNewFeatureNotifications } from '../../../hooks/notification/useNewFeatureNotifications';

/** AIR asset names a hotel can put in notifications.new_feature.image.<key>, bundled here. */
const NEW_FEATURE_IMAGES: Record<string, string> = {
    reward_track_small_icon: rewardTrackSmallIcon,
    reward_track_free_track: freeTrackIcon,
    reward_track_premium_track: premiumTrackIcon
};

/** English fallbacks for the descriptions AIR's hotels ship (the Dutch ones are in ExternalTexts). */
const DESCRIPTION_FALLBACKS: Record<string, string> = {
    rewardtrack_intro: 'Start your Habbo Adventure!'
};

const COUNTDOWN_UNIT_FALLBACKS: Record<string, string> = {
    weeks: 'weeks',
    days: 'days',
    hours: 'hours',
    minutes: 'min.',
    seconds: 'sec.'
};

const resolveImage = (image: string): string => {
    if (!image) return null;

    if (NEW_FEATURE_IMAGES[image]) return NEW_FEATURE_IMAGES[image];

    return image.includes('/') ? image : null;
};

/** The countdown_widget (99x37, CountdownWidget with 3 counters): ticks every second from the server's seconds. */
const NewFeatureCountdownView: FC<{ seconds: number; receivedAt: number }> = ({ seconds, receivedAt }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(interval);
    }, []);

    const remaining = Math.max(0, seconds - Math.trunc((now - receivedAt) / 1000));

    return (
        <div className="octane-new-feature-notification__countdown">
            {getNewFeatureCountdownUnits(remaining).map((counter, index) => (
                <div key={counter.unit} className="octane-new-feature-notification__counter">
                    {index > 0 && <span className="octane-new-feature-notification__separator">:</span>}
                    <span className="octane-new-feature-notification__counter-box">
                        <span className="octane-new-feature-notification__counter-value">{counter.value}</span>
                        <span className="octane-new-feature-notification__counter-unit">
                            {localizeWithFallback(`countdown_clock_unit_${counter.unit}`, COUNTDOWN_UNIT_FALLBACKS[counter.unit])}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
};

/**
 * One new_feature_notification (192x92), new_feature_notification_promo (192x34) or
 * new_feature_notification_countdown (192x76), as AIR draws it in the toolbar extension area.
 */
const NewFeatureNotificationView: FC<{ entry: NewFeatureNotificationEntry; onOpen: () => void; onDismiss: () => void }> = ({ entry, onOpen, onDismiss }) => {
    const { config } = entry;
    const normal = config.type === NEW_FEATURE_TYPE_NORMAL;
    const borderColor = newFeatureHexToUint(config.color || NEW_FEATURE_BG_COLOR_NORMAL);
    const tinted = (borderColor & 0xffffff) !== newFeatureHexToUint(NEW_FEATURE_BG_COLOR_NORMAL);
    const image = resolveImage(config.image);
    const description = localizeWithFallback(`notifications.new_feature.${config.key}.desc`, DESCRIPTION_FALLBACKS[config.key] ?? '');
    const style = { '--octane-new-feature-color': newFeatureColorToCss(borderColor) } as CSSProperties;

    const cancel = entry.cancelVisible && (
        normal ? (
            <BaseButton type="button" className="octane-new-feature-notification__cancel-link" onClick={onDismiss}>
                {localizeWithFallback('notifications.button.cancel', 'Cancel')}
            </BaseButton>
        ) : (
            <BaseButton
                type="button"
                className="octane-new-feature-notification__cancel-region"
                aria-label={localizeWithFallback('notifications.button.cancel', 'Cancel')}
                onClick={(event) => {
                    event.stopPropagation();
                    onDismiss();
                }}
            >
                <img src={closeIcon} alt="" draggable={false} />
            </BaseButton>
        )
    );

    if (normal) {
        return (
            <div className="octane-new-feature-notification" data-type={config.type} data-key={config.key} style={style}>
                <div className="octane-new-feature-notification__border" data-tinted={tinted} />
                <div className="octane-new-feature-notification__image">{image && <img src={image} alt="" draggable={false} />}</div>
                <div className="octane-new-feature-notification__desc">{description}</div>
                <BaseButton type="button" className="octane-new-feature-notification__open" onClick={onOpen}>
                    {localizeWithFallback('notifications.button.view', 'View')}
                </BaseButton>
                {cancel}
            </div>
        );
    }

    return (
        <div className="octane-new-feature-notification" data-type={config.type} data-key={config.key} style={style}>
            <BaseButton type="button" className="octane-new-feature-notification__main-region" onClick={onOpen}>
                <span className="octane-new-feature-notification__border" data-tinted={tinted} />
                <span className="octane-new-feature-notification__image">{image && <img src={image} alt="" draggable={false} />}</span>
                <span className="octane-new-feature-notification__desc">{description}</span>
            </BaseButton>
            {config.type === NEW_FEATURE_TYPE_COUNTDOWN && <NewFeatureCountdownView seconds={entry.countdownSeconds} receivedAt={entry.countdownReceivedAt} />}
            {cancel}
        </div>
    );
};

/** AIR's toolbar "new_feature_<key>" extensions, above the other right-side notifications. */
export const NewFeatureNotificationsView: FC<{}> = () => {
    const { notifications = [], open = null, dismiss = null } = useNewFeatureNotifications();

    if (!notifications.length) return null;

    return (
        <>
            {notifications.map((entry) => (
                <NewFeatureNotificationView key={entry.config.key} entry={entry} onOpen={() => open(entry.config.key)} onDismiss={() => dismiss(entry.config.key)} />
            ))}
        </>
    );
};
