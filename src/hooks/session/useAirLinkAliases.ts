import {
    AddLinkEventTracker,
    CreateLinkEvent,
    FindNewFriendsMessageComposer,
    GetExtendedProfileByNameMessageComposer,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { useEffect } from 'react';
import { DispatchUiEvent, SendMessageComposer } from '../../api';
import { getAirLinkAction, translateAirLink } from '../../api/links/AirLinkAliases';
import { RoomWidgetThumbnailEvent } from '../../events';

/**
 * Answers links written in the official client's spelling: each is raised again as the link this client handles, or
 * carried out directly when it is an action (see AirLinkAliases).
 */
export const useAirLinkAliases = () => {
    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const translated = translateAirLink(url, GetSessionDataManager()?.userId ?? 0);

                if (translated && translated !== url) {
                    CreateLinkEvent(translated);

                    return;
                }

                const action = getAirLinkAction(url);

                if (!action) return;

                switch (action.type) {
                    case 'roomThumbnail':
                        DispatchUiEvent(new RoomWidgetThumbnailEvent(RoomWidgetThumbnailEvent.SHOW_THUMBNAIL));
                        return;
                    case 'findFriends':
                        SendMessageComposer(new FindNewFriendsMessageComposer());
                        return;
                    case 'profileByName':
                        SendMessageComposer(new GetExtendedProfileByNameMessageComposer(action.name));
                        return;
                }
            },
            // Every link: the official spellings have no prefix in common.
            eventUrlPrefix: ''
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);
};
