import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { WiredExtraVariableView } from './WiredExtraUserVariableView';

export const WiredExtraFurniVariableView: FC<{}> = () => {
    return (
        <NativeTextTree>
            <WiredExtraVariableView
                availabilityRadioName="wiredFurniVariableAvailability"
                availabilityRoomText={localizeWithFallback('wiredfurni.params.variables.availability.1', 'While the room is active')}
                availabilityRoomValue={1}
            />
        </NativeTextTree>
    );
};
