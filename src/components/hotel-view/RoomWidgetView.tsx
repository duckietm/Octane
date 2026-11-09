import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationRecord } from '../../api';
import { Base } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export interface RoomWidgetViewProps {}

export const RoomWidgetView: FC<RoomWidgetViewProps> = (props) => {
    const poolId = GetConfigurationRecord('hotelview')['room.pool'];
    const picnicId = GetConfigurationRecord('hotelview')['room.picnic'];
    const rooftopId = GetConfigurationRecord('hotelview')['room.rooftop'];
    const rooftopPoolId = GetConfigurationRecord('hotelview')['room.rooftop.pool'];
    const peacefulId = GetConfigurationRecord('hotelview')['room.peaceful'];
    const infobusId = GetConfigurationRecord('hotelview')['room.infobus'];
    const lobbyId = GetConfigurationRecord('hotelview')['room.lobby'];

    return (
        <NativeTextTree>
            <>
                <Base component={BaseButton} type="button" className="octane-hotel-view-rooftop position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + rooftopId)}>
                    <i className="arrow" />
                </Base>
                <Base component={BaseButton} type="button" className="octane-hotel-view-rooftop-pool position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + rooftopPoolId)}>
                    <i className="arrow" />
                </Base>
                <Base component={BaseButton} type="button" className="octane-hotel-view-picnic position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + picnicId)}>
                    <i className="arrow" />
                </Base>
                <Base component={BaseButton} type="button" className="octane-hotel-view-infobus position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + infobusId)}>
                    <i className="arrow-infobus" />
                </Base>
                <Base component={BaseButton} type="button" className="octane-hotel-view-pool position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + poolId)}>
                    <i className="arrow-pool" />
                </Base>
                <Base component={BaseButton} type="button" className="octane-hotel-view-lobby position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + lobbyId)}>
                    <i className="arrow" />
                </Base>
                <Base component={BaseButton} type="button" className="octane-hotel-view-peaceful position-absolute" onClick={(event) => CreateLinkEvent('navigator/goto/' + peacefulId)}>
                    <i className="arrow-peaceful" />
                </Base>
            </>
        </NativeTextTree>
    );
};
