import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' }
];

const normalizeFurniSource = (value: number) => (FURNI_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);

export const WiredTriggerClickTileView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState(100);

    // Official: no int params; the furni source goes in the official source slot.
    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        setFurniSource(normalizeFurniSource(trigger?.furniSourceTypes?.[0] ?? 100));
    }, [trigger]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={false}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={FURNI_SOURCE_OPTIONS} onChangeFurni={setFurniSource} />}
        />
    );
};
