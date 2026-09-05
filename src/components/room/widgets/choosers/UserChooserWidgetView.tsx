import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { chooserSelectionVisualizer, LocalizeText } from '../../../../api';
import { useUserChooserWidget } from '../../../../hooks';
import { ChooserWidgetView } from './ChooserWidgetView';

export const UserChooserWidgetView: FC<{}> = (props) => {
    const { items = null, onClose = null, selectItem = null, populateChooser = null } = useUserChooserWidget();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                populateChooser();
            },
            eventUrlPrefix: 'user-chooser/'
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
            title={LocalizeText('widget.chooser.user.title')}
            items={items}
            selectItem={selectItem}
            onClose={() => {
                chooserSelectionVisualizer.clearAll();
                onClose();
            }}
            pickallFurni={false}
            type="users"
        />
    );
};
