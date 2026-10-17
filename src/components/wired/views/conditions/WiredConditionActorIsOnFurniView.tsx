import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

interface WiredConditionActorIsOnFurniViewProps {
    negative?: boolean;
}

export const WiredConditionActorIsOnFurniView: FC<WiredConditionActorIsOnFurniViewProps> = ({ negative = false }) => {
    // Official layout: the furni and users in the official source slots; our quantifier (0 all, 1 any) is param 0.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);
    const [quantifier, setQuantifier] = useState<number>(() => (trigger?.intData?.[0] === 1 ? 1 : 0));

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setQuantifier(trigger.intData?.[0] === 1 ? 1 : 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([quantifier]);
        setSourceTypes({ furni: [furniSource], users: [userSource] });
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                        {[0, 1].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={quantifier === value} name="triggerOnFurniQuantifier" onCheckedChange={() => setQuantifier(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                    <WiredSourcesSelector
                        showFurni={true}
                        showUsers={true}
                        furniSource={furniSource}
                        userSource={userSource}
                        onChangeFurni={onChangeFurniSource}
                        onChangeUsers={setUserSource}
                    />
                </div>
            }
        />
    );
};
