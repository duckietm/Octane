import { FC } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** Official room initialized (28): no params, only the usage info. */
export const WiredTriggerRoomInitializedView: FC = () => (
    <NativeTextTree>
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={null} widthModifier={1.5}>
            <Text small className="whitespace-pre-line">
                {localizeWithFallback(
                    'wiredfurni.params.room_initialized.usage_info',
                    'Fires once when the room is initialized, before any other trigger.\n\nA room is initialized when someone enters after it was empty for more than 30 seconds, or when it is reloaded (:reload).'
                ).replace(/\\n/g, '\n')}
            </Text>
        </WiredTriggerBaseView>
    </NativeTextTree>
);
