import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { chooserSelectionVisualizer, LocalizeText } from '../../../../api';
import { useFurniChooserWidget, useRoom } from '../../../../hooks';
import { ChooserWidgetView } from './ChooserWidgetView';

export const FurniChooserWidgetView: FC<{}> = (props) => {
    const { items = null, onClose = null, selectItem = null, populateChooser = null } = useFurniChooserWidget();
    const { roomSession = null } = useRoom();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                populateChooser();
            },
            eventUrlPrefix: 'furni-chooser/'
        };

        AddLinkEventTracker(linkTracker);

        return () => {
            chooserSelectionVisualizer.clearAll();
            RemoveLinkEventTracker(linkTracker);
        };
    }, [populateChooser]);

    if (!items) return null;

    return (
        <ChooserWidgetView
            title={LocalizeText('widget.chooser.furni.title')}
            items={items}
            selectItem={selectItem}
            onClose={() => {
                chooserSelectionVisualizer.clearAll();
                onClose();
            }}
            pickallFurni={roomSession?.isRoomOwner}
            type="furni"
        />
    );
};
