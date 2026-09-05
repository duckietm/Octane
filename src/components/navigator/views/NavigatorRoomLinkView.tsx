import { FC, useMemo, useState } from 'react';
import { FaCheck, FaCopy } from 'react-icons/fa';
import { CopyToClipboard, GetConfigurationValue, LocalizeText } from '../../../api';
import { Button, LayoutRoomThumbnailView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useNavigatorData } from '../../../hooks';

export class NavigatorRoomLinkViewProps {
    onCloseClick: () => void;
}

export const NavigatorRoomLinkView: FC<NavigatorRoomLinkViewProps> = (props) => {
    const { onCloseClick = null } = props;
    const { navigatorData } = useNavigatorData();
    const [copied, setCopied] = useState(false);

    const roomLink = useMemo(() => {
        if (!navigatorData.enteredGuestRoom) return '';

        return LocalizeText('navigator.embed.src', ['roomId'], [navigatorData.enteredGuestRoom.roomId.toString()]).replace(
            '${url.prefix}',
            GetConfigurationValue<string>('url.prefix', '')
        );
    }, [navigatorData.enteredGuestRoom]);

    if (!navigatorData.enteredGuestRoom) return null;

    return (
        <OctaneCardView
            className="octane-room-link min-w-0 w-[min(430px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
        >
            <OctaneCardHeaderView headerText={LocalizeText('navigator.embed.title')} onCloseClick={onCloseClick} />
            <OctaneCardContentView className="text-black flex items-center max-h-[calc(100vh-72px)]" overflow="auto">
                <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                    <LayoutRoomThumbnailView customUrl={navigatorData.enteredGuestRoom.officialRoomPicRef} roomId={navigatorData.enteredGuestRoom.roomId} />
                    <div className="flex flex-col min-w-0">
                        <Text bold fontSize={5}>
                            {LocalizeText('navigator.embed.headline')}
                        </Text>
                        <Text>{LocalizeText('navigator.embed.info')}</Text>
                        <div className="octane-navigator-air__link-field">
                            <input
                                readOnly
                                className="form-control form-control-sm w-full min-w-0"
                                type="text"
                                value={roomLink}
                                onFocus={(event) => event.target.select()}
                            />
                            <Button
                                title={LocalizeText('generic.copy')}
                                aria-label={LocalizeText('generic.copy')}
                                onClick={() => void CopyToClipboard(roomLink).then(setCopied)}
                            >
                                {copied ? <FaCheck className="fa-icon" /> : <FaCopy className="fa-icon" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
