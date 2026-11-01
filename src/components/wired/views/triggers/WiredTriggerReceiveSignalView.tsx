import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];

const normalizeFurniSource = (value: number) => (FURNI_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);

export const WiredTriggerReceiveSignalView: FC<{}> = () => {
    const [senderCount, setSenderCount] = useState(0);
    const [channel, setChannel] = useState(0);
    const [furniSource, setFurniSource] = useState(100);

    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    // Ours: [channel]; the antenna source in the official source slot.
    const save = () => {
        setIntParams([channel]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        if (!trigger) return;

        const p = trigger.intData;
        if (p.length >= 1) setChannel(p[0]);
        if (p.length >= 2) setSenderCount(p[1]);
        setFurniSource(normalizeFurniSource(trigger.furniSourceTypes?.[0] ?? 100));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredTriggerBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={FURNI_SOURCE_OPTIONS} onChangeFurni={setFurniSource} />}
            >
                {/* The section's bold rule makes bold text 100% wide: the count keeps its own width, so the label is not squeezed onto two lines. */}
                <div className="flex items-baseline justify-between gap-2">
                    <Text small>{localizeWithFallback('wiredfurni.params.signal.senders_connected', 'Senders connected')}</Text>
                    <Text bold small className="shrink-0" style={{ width: 'auto' }}>
                        {senderCount}
                    </Text>
                </div>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
