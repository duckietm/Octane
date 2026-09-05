import { FC } from 'react';
import { LocalizeText } from '../../../../api';

interface NavigatorEmptyStateViewProps {
    code: string;
}

export const NavigatorEmptyStateView: FC<NavigatorEmptyStateViewProps> = (props) => {
    const { code } = props;
    const messageKey = code === 'myworld_view' ? 'navigator.roomsettings.moderation.none' : 'navigator.search.returned.no.results';

    return <div className="octane-navigator-air__empty">{LocalizeText(messageKey)}</div>;
};
