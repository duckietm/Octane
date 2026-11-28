import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { Button, Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useRoom } from '../../../../../hooks';
import { HANDHELD_ENLARGE_FRAME_SCALE, HANDHELD_TOUCH_FRAME_SCALE } from '../../../../../api/handheld/handheldWindowFit';

interface EffectBoxConfirmViewProps {
    objectId: number;
    onClose: () => void;
}

export const EffectBoxConfirmView: FC<EffectBoxConfirmViewProps> = (props) => {
    const { objectId = -1, onClose = null } = props;
    const { roomSession = null } = useRoom();

    const useProduct = () => {
        roomSession.useMultistateItem(objectId);

        onClose();
    };

    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_TOUCH_FRAME_SCALE} handheldMaxScale={HANDHELD_ENLARGE_FRAME_SCALE} className="octane-use-product-confirmation">
                <OctaneCardHeaderView headerText={LocalizeText('effectbox.header.title')} onCloseClick={onClose} />
                <OctaneCardContentView center>
                    <div className="flex gap-2">
                        <Column justifyContent="between">
                            <Text>{LocalizeText('effectbox.header.description')}</Text>
                            <div className="flex items-center justify-between">
                                <Button variant="danger" onClick={onClose}>
                                    {LocalizeText('generic.cancel')}
                                </Button>
                                <Button variant="success" onClick={useProduct}>
                                    {LocalizeText('generic.ok')}
                                </Button>
                            </div>
                        </Column>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
