import { FC } from 'react';
import { CreateLinkEvent, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Button, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { hasWiredAdvancedSources, WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/**
 * Official: no params, the usage info and a "view in menu" button to the variable overview, where
 * the failure reason (@event.transaction_failed.reason) is listed.
 */
export const WiredTriggerTransactionFailView: FC = () => {
    const { trigger = null } = useWired();

    return (
        <NativeTextTree>
            <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={null} footer={hasWiredAdvancedSources(trigger) ? <WiredAdvancedSourceRows /> : null}>
                <div className="flex flex-col gap-2">
                    <Text small>{localizeWithFallback('wiredfurni.params.transaction_failed.usage_info', 'Fires when a transaction of this room fails.')}</Text>
                    <div className="flex justify-center">
                        <Button variant="secondary" onClick={() => CreateLinkEvent('wiredmenu/open/variable_overview/@event.transaction_failed.reason')}>
                            {LocalizeText('wiredfurni.view_in_menu')}
                        </Button>
                    </div>
                </div>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
