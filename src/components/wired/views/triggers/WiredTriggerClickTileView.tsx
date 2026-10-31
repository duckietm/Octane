import { FC, useEffect, useMemo, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { clickTriggerFurniSources, normalizeClickTriggerFurniSource } from './clickTriggerSources';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WiredTriggerClickTileView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState(100);
    const [storedSource, setStoredSource] = useState(100);
    const furniSources = useMemo(() => clickTriggerFurniSources(storedSource), [storedSource]);

    // Official: no int params; the furni source goes in the official source slot.
    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        const stored = normalizeClickTriggerFurniSource(trigger?.furniSourceTypes?.[0] ?? trigger?.inputSourcesConf?.furniDefaults?.[0] ?? 100);

        setStoredSource(stored);
        setFurniSource(stored);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredTriggerBaseView
                hasSpecialInput={false}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={furniSources} onChangeFurni={setFurniSource} />}
            />
        </NativeTextTree>
    );
};
