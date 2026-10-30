import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface WiredConditionFurniHasAvatarOnViewProps {
    negative?: boolean;
}

export const WiredConditionFurniHasAvatarOnView: FC<WiredConditionFurniHasAvatarOnViewProps> = ({ negative = false }) => {
    // Official layout: param 0 "all", the furni in the official source slot. AIR FurnisHaveAvatars lists 0 (.2, one
    // furni) then 1 (.3, every furni); FurnisHaveNoAvatars lists 1 (.2, one furni is free) then 0 (.3, none has one).
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const options = negative ? [1, 0] : [0, 1];
    const [requireAll, setRequireAll] = useState(options[0]);
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));

    useEffect(() => {
        if (!trigger) return;

        const stored = trigger.intData?.[0];

        setRequireAll(stored === 0 || stored === 1 ? stored : options[0]);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([requireAll]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={requiresFurni}
                save={save}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.requireall')}</Text>
                    {options.map((value, index) => (
                        <label key={value} className="flex items-center gap-1">
                            <Radio checked={requireAll === value} name="furniHasAvatarRequireAll" onCheckedChange={() => setRequireAll(value)} />
                            <Text>{LocalizeText(`wiredfurni.params.${negative ? 'not_requireall' : 'requireall'}.${index + 2}`)}</Text>
                        </label>
                    ))}
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
