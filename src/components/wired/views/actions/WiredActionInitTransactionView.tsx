import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { hasWiredAdvancedSources, WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionInitTransactionView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const save = () => setIntParams([]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={hasWiredAdvancedSources(trigger, [2], [1]) ? <WiredAdvancedSourceRows skipFurni={[2]} skipUsers={[1]} /> : null}
            footerCollapsible={false}
        >
            <Text small>
                Pick the Contract furni above to execute, and the chests they pay into and out of. Their terms are
                checked and applied atomically: on success the "Transaction Completed" triggers fire, otherwise
                "Transaction Failed". With no contract selected it simply fires "Transaction Completed".
            </Text>
        </WiredActionBaseView>
    );
};
