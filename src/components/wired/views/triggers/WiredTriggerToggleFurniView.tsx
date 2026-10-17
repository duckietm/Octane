import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Radio } from '../../../../common/Radio';

const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];

const normalizeFurniSource = (value: number) => (FURNI_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);

interface WiredTriggerToggleFurniViewProps {
    /** The state-change box: it also fires when a wired effect sets the state, not only on a click. */
    includesWiredChanges?: boolean;
}

export const WiredTriggerToggleFurniView: FC<WiredTriggerToggleFurniViewProps> = ({ includesWiredChanges = false }) => {
    const [triggerMode, setTriggerMode] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    // Official: [mode]; the furni source in the official source slot.
    const save = () => {
        setIntParams([triggerMode]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        setTriggerMode(trigger?.intData?.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(normalizeFurniSource(trigger?.furniSourceTypes?.[0] ?? 100));
    }, [trigger]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={FURNI_SOURCE_OPTIONS} onChangeFurni={setFurniSource} />}
        >
            {includesWiredChanges && (
                <Text small>{localizeWithFallback('wiredfurni.params.state_change.info', 'Fires on every state change of the furni, including changes made by wired.')}</Text>
            )}
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText(includesWiredChanges ? 'wiredfurni.params.select_options' : 'wiredfurni.params.condition.state')}</Text>
                <div className="flex items-center gap-1">
                    <Radio checked={triggerMode === 1} id="stateTrigger1" name="stateTrigger" onCheckedChange={() => setTriggerMode(1)} />
                    <Text>{LocalizeText('wiredfurni.params.state_trigger.1')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio checked={triggerMode === 0} id="stateTrigger0" name="stateTrigger" onCheckedChange={() => setTriggerMode(0)} />
                    <Text>{LocalizeText('wiredfurni.params.state_trigger.0')}</Text>
                </div>
            </div>
        </WiredTriggerBaseView>
    );
};
