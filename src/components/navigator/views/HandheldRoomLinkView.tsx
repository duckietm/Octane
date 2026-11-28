import { FC } from 'react';
import { FaCheck, FaCopy } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { LayoutRoomThumbnailView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { HandheldCenterCard } from '../../../common/handheld/HandheldCenterCard';

interface HandheldRoomLinkViewProps {
    roomId: number;
    customUrl: string;
    roomLink: string;
    copied: boolean;
    onCopy: () => void;
    onClose: () => void;
}

/**
 * The link of the room on a phone: a centred card with the room's picture and the desktop's texts, the link in a 16 px
 * field that selects itself and a 44 px copy button. NavigatorRoomLinkView builds the link and copies it.
 */
export const HandheldRoomLinkView: FC<HandheldRoomLinkViewProps> = ({ roomId, customUrl, roomLink, copied, onCopy, onClose }) => (
    <HandheldCenterCard
        className="octane-handheld-rx-link"
        icon={<span aria-hidden="true" className="octane-handheld-rx-card__icon octane-icon icon-room-link" />}
        testId="handheld-room-link"
        title={LocalizeText('navigator.embed.title')}
        onClose={onClose}
    >
        <div className="octane-handheld-rx-link__hero">
            <LayoutRoomThumbnailView className="octane-handheld-rx-link__thumb" customUrl={customUrl} roomId={roomId} />
            <div className="octane-handheld-rx-link__texts">
                <span className="octane-handheld-rx-link__headline">{LocalizeText('navigator.embed.headline')}</span>
                <span className="octane-handheld-rx__text">{LocalizeText('navigator.embed.info')}</span>
            </div>
        </div>
        <div className="octane-handheld-rx-link__field">
            <input
                readOnly
                aria-label={LocalizeText('navigator.embed.title')}
                className="octane-handheld-rx__input"
                type="text"
                value={roomLink}
                onFocus={(event) => event.target.select()}
            />
            <BaseButton aria-label={LocalizeText('generic.copy')} className={`octane-handheld-rx-link__copy${copied ? ' is-copied' : ''}`} onClick={onCopy}>
                {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
            </BaseButton>
        </div>
    </HandheldCenterCard>
);
