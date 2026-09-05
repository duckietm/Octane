import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionToggleToRandomStateView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    useEffect(() => {
        if (!trigger) return;

        if (trigger.intData.length >= 1) setFurniSource(trigger.intData[0]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => setIntParams([furniSource]);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        />
    );
};
