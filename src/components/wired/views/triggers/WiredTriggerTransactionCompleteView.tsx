import { FC } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { hasWiredAdvancedSources, WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** Official: no params, only the usage info; the contract comes with the transaction. */
export const WiredTriggerTransactionCompleteView: FC = () => {
    const { trigger = null } = useWired();

    return (
        <NativeTextTree>
            <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={null} footer={hasWiredAdvancedSources(trigger) ? <WiredAdvancedSourceRows /> : null}>
                <Text small>{localizeWithFallback('wiredfurni.params.transaction_complete.usage_info', 'Fires when a transaction of this room completes.')}</Text>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
