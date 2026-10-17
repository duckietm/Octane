import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

export const WiredConditionFurniHasNotFurniOnView: FC<{}> = (props) => {
    const [requireAll, setRequireAll] = useState(-1);
    // Official layout: param 0 "all", the furni in the official source slot.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));

    const save = () => {
        setIntParams([requireAll]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        setRequireAll(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.not_requireall')}</Text>
                {[0, 1].map((value) => {
                    return (
                        <div key={value} className="flex items-center gap-1">
                            <Radio checked={requireAll === value} id={`requireAll${value}`} name="requireAll" onCheckedChange={() => setRequireAll(value)} />
                            <Text>{LocalizeText(`wiredfurni.params.not_requireall.${value}`)}</Text>
                        </div>
                    );
                })}
            </div>
        </WiredConditionBaseView>
    );
};
