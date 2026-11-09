import { WiredSelectorLayoutCode } from '../../../../api';
import { WiredActionFurniAreaView } from './WiredActionFurniAreaView';
import { WiredSelectorFurniAltitudeView } from './WiredSelectorFurniAltitudeView';
import { WiredSelectorFurniByTypeView } from './WiredSelectorFurniByTypeView';
import { WiredSelectorFurniNeighborhoodView } from './WiredSelectorFurniNeighborhoodView';
import { WiredSelectorFurniOnFurniView } from './WiredSelectorFurniOnFurniView';
import { WiredSelectorFurniPicksView } from './WiredSelectorFurniPicksView';
import { WiredSelectorFurniSignalView } from './WiredSelectorFurniSignalView';
import { WiredSelectorFurniWithVariableView } from './WiredSelectorFurniWithVariableView';
import { WiredSelectorRemoteView } from './WiredSelectorRemoteView';
import { WiredSelectorUsersAreaView } from './WiredSelectorUsersAreaView';
import { WiredSelectorUsersByActionView } from './WiredSelectorUsersByActionView';
import { WiredSelectorUsersByNameView } from './WiredSelectorUsersByNameView';
import { WiredSelectorUsersByTypeView } from './WiredSelectorUsersByTypeView';
import { WiredSelectorUsersGroupView } from './WiredSelectorUsersGroupView';
import { WiredSelectorUsersHandItemView } from './WiredSelectorUsersHandItemView';
import { WiredSelectorUsersNeighborhoodView } from './WiredSelectorUsersNeighborhoodView';
import { WiredSelectorUsersOnFurniView } from './WiredSelectorUsersOnFurniView';
import { WiredSelectorUsersSignalView } from './WiredSelectorUsersSignalView';
import { WiredSelectorUsersTeamView } from './WiredSelectorUsersTeamView';
import { WiredSelectorUsersWithVariableView } from './WiredSelectorUsersWithVariableView';

/** The editor of a selector, by its official selector code. */
export const WiredSelectorLayoutView = (code: number) =>
{
    switch(code)
    {
        case WiredSelectorLayoutCode.FURNI_BY_TYPE:
            return <WiredSelectorFurniByTypeView />;
        case WiredSelectorLayoutCode.FURNI_PICKS:
            return <WiredSelectorFurniPicksView />;
        case WiredSelectorLayoutCode.USERS_BY_TYPE:
            return <WiredSelectorUsersByTypeView />;
        case WiredSelectorLayoutCode.USERS_IN_TEAM:
            return <WiredSelectorUsersTeamView />;
        case WiredSelectorLayoutCode.FURNI_ON_FURNI:
            return <WiredSelectorFurniOnFurniView />;
        case WiredSelectorLayoutCode.FURNI_FROM_SIGNAL:
            return <WiredSelectorFurniSignalView />;
        case WiredSelectorLayoutCode.FURNI_NEIGHBORHOOD:
            return <WiredSelectorFurniNeighborhoodView />;
        case WiredSelectorLayoutCode.FURNI_IN_AREA:
            return <WiredActionFurniAreaView />;
        case WiredSelectorLayoutCode.USERS_ON_FURNI:
            return <WiredSelectorUsersOnFurniView />;
        case WiredSelectorLayoutCode.USERS_PERFORMING_ACTION:
            return <WiredSelectorUsersByActionView />;
        case WiredSelectorLayoutCode.USERS_FROM_SIGNAL:
            return <WiredSelectorUsersSignalView />;
        case WiredSelectorLayoutCode.USERS_BY_NAME:
            return <WiredSelectorUsersByNameView />;
        case WiredSelectorLayoutCode.USERS_IN_NEIGHBORHOOD:
            return <WiredSelectorUsersNeighborhoodView />;
        case WiredSelectorLayoutCode.USERS_IN_AREA:
            return <WiredSelectorUsersAreaView />;
        case WiredSelectorLayoutCode.USERS_WITH_HANDITEM:
            return <WiredSelectorUsersHandItemView />;
        case WiredSelectorLayoutCode.USERS_IN_GROUP:
            return <WiredSelectorUsersGroupView />;
        case WiredSelectorLayoutCode.FURNI_WITH_ALTITUDE:
            return <WiredSelectorFurniAltitudeView />;
        case WiredSelectorLayoutCode.FURNI_WITH_VARIABLE:
            return <WiredSelectorFurniWithVariableView />;
        case WiredSelectorLayoutCode.USERS_WITH_VARIABLE:
            return <WiredSelectorUsersWithVariableView />;
        case WiredSelectorLayoutCode.REMOTE_SELECTOR:
            return <WiredSelectorRemoteView />;
    }

    return null;
};
