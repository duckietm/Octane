import { MouseEventType } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import addFriendsIcon from '../../../../assets/images/friends/swf/add_friends_icon.png';
import { GetUserProfile, LocalizeText, MessengerRequest } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { useFriends } from '../../../../hooks';
import { resolveAvatarFigure } from '../friends-list/resolveAvatarFigure';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * The friend requests tab of the friend bar, as AIR HabboFriendBarView: one request gets the requester's own tab
 * (NewFriendRequestTab, friend_request_tab_xml) whose bubble offers accept, profile and decline; more requests get one
 * tab with the add-friends icon and a counter (FriendRequestsTab, friend_requests_tab_xml) whose bubble lists them all
 * with accept and decline each, then accept all and decline all.
 */
export const FriendBarRequestsView: FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);
    const {
        requests = [],
        requestResponse = null,
        requestResponseAll = null,
        isFriendListFull = null,
        showFriendListFullAlert = null
    } = useFriends();

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const element = elementRef.current;

            if (element && !element.contains(event.target as Node)) setIsOpen(false);
        };

        document.addEventListener(MouseEventType.MOUSE_CLICK, onClick);

        return () => document.removeEventListener(MouseEventType.MOUSE_CLICK, onClick);
    }, []);

    useEffect(() => {
        if (!requests.length) setIsOpen(false);
    }, [requests.length]);

    if (!requests.length) return null;

    const accept = (request: MessengerRequest) => {
        if (isFriendListFull?.()) {
            showFriendListFullAlert?.();
            return;
        }

        requestResponse(request.id, true);
    };

    const acceptAll = () => {
        if (isFriendListFull?.(requests.length)) {
            showFriendListFullAlert?.();
            return;
        }

        requestResponseAll(true);
    };

    const head = (request: MessengerRequest, size: number) => (
        <LayoutAvatarImageView figure={resolveAvatarFigure(request.figureString, 0)} headOnly compactHead compactHeadSize={size} compactHeadPadding={0} direction={2} />
    );

    const single = requests.length === 1 ? requests[0] : null;

    return (
        <NativeTextTree>
            <div ref={elementRef} className={`friend-bar-requests${isOpen ? ' is-selected' : ''}`}>
                <BaseButton
                    type="button"
                    className={`friend-bar-item friend-bar-request find-friends-active${single ? ' is-single' : ''}`}
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((value) => !value)}
                >
                    {single ? (
                        <span className="friend-bar-requests-head">{head(single, 30)}</span>
                    ) : (
                        <img className="friend-bar-requests-icon" src={addFriendsIcon} alt="" />
                    )}
                    <span className="friend-bar-text">{single ? single.name : LocalizeText('friendbar.requests.title')}</span>
                    {!single && <span className="friend-bar-requests-counter">{requests.length}</span>}
                </BaseButton>
                {isOpen && single && (
                    <div className="friend-bar-requests-bubble is-single">
                        <div className="friend-bar-requests-title">{LocalizeText('friendbar.request.title')}</div>
                        <BaseButton type="button" aria-label={LocalizeText('generic.close')} className="friend-bar-requests-close" onClick={() => setIsOpen(false)} />
                        <BaseButton type="button" className="friend-bar-requests-shiny" onClick={() => accept(single)}>
                            <span aria-hidden="true" className="friend-bar-requests-accept-icon" />
                            {LocalizeText('friendbar.request.accept')}
                        </BaseButton>
                        <BaseButton type="button" className="friend-bar-requests-shiny" onClick={() => GetUserProfile(single.requesterUserId)}>
                            <span aria-hidden="true" className="friend-bar-requests-profile-icon" />
                            {LocalizeText('friendbar.request.profile')}
                        </BaseButton>
                        <BaseButton type="button" className="friend-bar-requests-link" onClick={() => requestResponse(single.id, false)}>
                            {LocalizeText('friendbar.request.decline')}
                        </BaseButton>
                    </div>
                )}
                {isOpen && !single && (
                    <div className="friend-bar-requests-bubble is-list">
                        <div className="friend-bar-requests-title">{LocalizeText('friendbar.requests.title')}</div>
                        <BaseButton type="button" aria-label={LocalizeText('generic.close')} className="friend-bar-requests-close" onClick={() => setIsOpen(false)} />
                        <div className="friend-bar-requests-list">
                            {requests.map((request) => (
                                <div key={request.id} className="friend-bar-requests-row">
                                    <BaseButton
                                        type="button"
                                        aria-label={LocalizeText('infostand.profile.link.tooltip')}
                                        className="friend-bar-requests-row-head"
                                        onClick={() => GetUserProfile(request.requesterUserId)}
                                    >
                                        {head(request, 39)}
                                    </BaseButton>
                                    <BaseButton type="button" className="friend-bar-requests-row-name" onClick={() => GetUserProfile(request.requesterUserId)}>
                                        {request.name}
                                    </BaseButton>
                                    <BaseButton type="button" className="friend-bar-requests-link" onClick={() => requestResponse(request.id, false)}>
                                        {LocalizeText('friendbar.request.decline')}
                                    </BaseButton>
                                    <BaseButton type="button" className="friend-bar-requests-shiny is-small" onClick={() => accept(request)}>
                                        {LocalizeText('friendbar.request.accept')}
                                    </BaseButton>
                                </div>
                            ))}
                        </div>
                        <div className="friend-bar-requests-footer">
                            <BaseButton type="button" className="friend-bar-requests-link" onClick={() => requestResponseAll(false)}>
                                {LocalizeText('friendbar.requests.discard')}
                            </BaseButton>
                            <BaseButton type="button" className="friend-bar-requests-accept-all" onClick={acceptAll}>
                                {LocalizeText('friendbar.requests.accept')}
                            </BaseButton>
                        </div>
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
