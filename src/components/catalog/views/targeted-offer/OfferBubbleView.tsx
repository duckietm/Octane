import { TargetedOfferData } from '@octane/renderer';
import { FriendlyTime, GetConfigurationValue } from '../../../../api';
import { LayoutNotificationBubbleView, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const OfferBubbleView = (props: { offer: TargetedOfferData; secondsLeft: number | null; onOpen: () => void }) => {
    const { offer = null, secondsLeft = null, onOpen = null } = props;

    if (!offer) return null;

    return (
        <NativeTextTree>
            <LayoutNotificationBubbleView fadesOut={false} closeOnClick={false} gap={2} onClick={() => onOpen()} onClose={null}>
                <div className="octane-targeted-offer-icon" style={{ backgroundImage: `url(${GetConfigurationValue('image.library.url') + offer.iconImageUrl})` }} />
                <div className="flex flex-col">
                    <Text className="ubuntu-bold" variant="light">
                        {offer.title}
                    </Text>
                    {secondsLeft !== null && (
                        <Text small variant="light">
                            {FriendlyTime.format(secondsLeft)}
                        </Text>
                    )}
                </div>
            </LayoutNotificationBubbleView>
        </NativeTextTree>
    );
};
