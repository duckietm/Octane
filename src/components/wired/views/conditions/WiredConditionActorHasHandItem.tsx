import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

interface WiredConditionActorHasHandItemViewProps {
    negative?: boolean;
}

export const WiredConditionActorHasHandItemView: FC<WiredConditionActorHasHandItemViewProps> = ({ negative = false }) => {
    const [handItemId, setHandItemId] = useState(-1);
    const [quantifier, setQuantifier] = useState(0);
    // Official layout: [hand item (0 any), our quantifier], the users in the official source slot.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([handItemId, quantifier]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setQuantifier(trigger.intData[1] === 1 ? 1 : 0);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <Radio checked={quantifier === value} name="handItemQuantifier" onCheckedChange={() => setQuantifier(value)} />
                        <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                    </label>
                ))}
            </div>
            <WiredHandItemField handItemId={handItemId} onChange={setHandItemId} showCopyButton={true} />
        </WiredConditionBaseView>
    );
};
