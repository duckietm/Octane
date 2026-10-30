import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersOnFurniView: FC<{}> = () => {
    // Official layout: no int params, the furni in the official source slot, filter / invert in the official fields.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <NativeTextTree>
            <WiredSelectorBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                hideDelay={true}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
            >
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
