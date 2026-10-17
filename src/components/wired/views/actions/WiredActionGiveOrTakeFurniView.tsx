import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';
import { NumberInput } from '../../../../common/NumberInput';

const MODE_GIVE = 0;
const MODE_TAKE = 1;

export const WiredActionGiveOrTakeFurniView: FC<{}> = props =>
{
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [ baseItemId, setBaseItemId ] = useState<number>(0);
    const [ quantity, setQuantity ] = useState<number>(1);
    const [ giveOrTake, setGiveOrTake ] = useState<number>(MODE_GIVE);
    const [ userSource, setUserSource ] = useState<number>(0);

    useEffect(() =>
    {
        if(!trigger) return;

        setBaseItemId((trigger.intData?.length ?? 0) > 0 ? trigger.intData[0] : 0);
        setQuantity((trigger.intData?.length ?? 0) > 1 ? trigger.intData[1] : 1);
        setGiveOrTake((trigger.intData?.length ?? 0) > 2 ? trigger.intData[2] : MODE_GIVE);
        setUserSource(slotUserSource(trigger));
    }, [ trigger ]);

    // Ours: [base item, quantity, give or take]; the user source is the official source slot.
    const save = () => {
        setIntParams([ baseItemId, quantity, giveOrTake ]);
        setSourceTypes({ furni: [], users: [ userSource ] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={ true }
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE }
            save={ save }
            footer={ <WiredSourcesSelector showUsers={ true } userSource={ userSource } onChangeUsers={ setUserSource } /> }>
            <div className="flex flex-col gap-1">
                <Text bold>{ localizeWithFallback('wiredfurni.params.base_item_id', 'Base item ID') }</Text>
                <NumberInput className="form-control form-control-sm" min={ 1 } value={ baseItemId } onChange={ event => setBaseItemId(parseInt(event.target.value, 10) || 0) } />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{ localizeWithFallback('wiredfurni.params.count', 'Quantity', [ 'count' ], [ quantity.toString() ]) }</Text>
                <NumberInput className="form-control form-control-sm" min={ 1 } max={ 100 } value={ quantity } onChange={ event => setQuantity(parseInt(event.target.value, 10) || 0) } />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <Radio name="giveOrTake" checked={ giveOrTake === MODE_GIVE } onCheckedChange={() => setGiveOrTake(MODE_GIVE)} />
                    <Text>{ localizeWithFallback('wiredfurni.params.give', 'Give') }</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio name="giveOrTake" checked={ giveOrTake === MODE_TAKE } onCheckedChange={() => setGiveOrTake(MODE_TAKE)} />
                    <Text>{ localizeWithFallback('wiredfurni.params.take', 'Take') }</Text>
                </div>
            </div>
        </WiredActionBaseView>
    );
};
