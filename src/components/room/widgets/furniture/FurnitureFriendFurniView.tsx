import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, DraggableWindow, LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurnitureFriendFurniWidget } from '../../../../hooks';

const formatEngravingDate = (value: string) => {
    if (!value) return value;

    const parts = value.split(/[-/.]/).map((part) => parseInt(part, 10));

    if (parts.length !== 3 || parts.some(Number.isNaN)) return value;

    const [day, month, year] = parts;

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

const getEngravingCaption = (type: number) => {
    switch (type) {
        case 3:
            return LocalizeText('wildwest.engraving.caption');
        case 4:
            return LocalizeText('habboween.engraving.caption');
        default:
            return LocalizeText('lovelock.engraving.caption');
    }
};

export const FurnitureFriendFurniView: FC<{}> = (props) => {
    const { objectId = -1, type = 0, stage = 0, partnerConfirmed = false, usernames = [], figures = [], date = null, onClose = null, cancelLock = null, respond = null } = useFurnitureFriendFurniWidget();

    if (objectId === -1) return null;

    if (stage > 0) {
        const lockStage = partnerConfirmed ? 2 : stage;

        return (
            <OctaneCardView className="octane-engraving-lock" theme="primary-slim">
                <OctaneCardHeaderView headerText={LocalizeText('friend.furniture.confirm.lock.caption')} onCloseClick={cancelLock ?? onClose} />
                <OctaneCardContentView>
                    <h5 className="text-black text-center font-bold mt-2 mb-2">{LocalizeText('friend.furniture.confirm.lock.subtitle')}</h5>
                    <div className="flex justify-center mb-2">
                        <div className={`engraving-lock-stage-${lockStage}`} />
                    </div>
                    {(stage === 2 || partnerConfirmed) && (
                        <div className="text-small text-black text-center mb-2">{LocalizeText('friend.furniture.confirm.lock.other.locked')}</div>
                    )}
                    <div className="flex gap-1">
                        <Button fullWidth onClick={() => (cancelLock ?? onClose)()}>
                            {LocalizeText('friend.furniture.confirm.lock.button.cancel')}
                        </Button>
                        <Button fullWidth variant="success" onClick={() => respond(true)}>
                            {LocalizeText('friend.furniture.confirm.lock.button.confirm')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    if (usernames.length > 0) {
        const engravingTypeClass = type === 3 || type === 4 ? `engraving-lock-${type}` : '';

        return (
            <DraggableWindow handleSelector=".octane-engraving-lock-view">
                <div className={`octane-engraving-lock-view ${engravingTypeClass}`.trim()}>
                    <button type="button" className="engraving-lock-close" onClick={onClose} aria-label="Close" />
                    <div className="engraving-lock-avatar engraving-lock-avatar--left">
                        <LayoutAvatarImageView direction={2} figure={figures[0]} />
                    </div>
                    <div className="engraving-lock-avatar engraving-lock-avatar--right">
                        <LayoutAvatarImageView direction={4} figure={figures[1]} />
                    </div>
                    <div className="engraving-lock-header">{getEngravingCaption(type)}</div>
                    <div className="engraving-lock-date">{formatEngravingDate(date)}</div>
                    <div className="engraving-lock-name engraving-lock-name--left">{usernames[0]}</div>
                    <div className="engraving-lock-name engraving-lock-name--right">{usernames[1]}</div>
                </div>
            </DraggableWindow>
        );
    }

    return null;
};
