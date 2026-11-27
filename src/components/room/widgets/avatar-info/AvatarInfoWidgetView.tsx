import {
    AddLinkEventTracker,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomEngineObjectEvent,
    RoomEnterEffect,
    RoomSessionDanceEvent
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import {
    AvatarInfoFurni,
    AvatarInfoPet,
    AvatarInfoRentableBot,
    AvatarInfoUser,
    GetConfigurationValue,
    IAvatarInfo,
    RoomWidgetUpdateRentableBotChatEvent,
    RoomWidgetUpdateRentableBotTextSkillEvent
} from '../../../../api';
import { Column, LayoutFurniIconImageView } from '../../../../common';
import { useAvatarInfoWidget, useFurniPickupGuard, useIsHandheld, useOctaneEvent, useRoom, useUiEvent } from '../../../../hooks';
import { AvatarInfoPetTrainingPanelView } from './AvatarInfoPetTrainingPanelView';
import { AvatarInfoRentableBotChatView } from './AvatarInfoRentableBotChatView';
import { AvatarInfoRentableBotTextSkillView } from './AvatarInfoRentableBotTextSkillView';
import { AvatarInfoUseProductConfirmView } from './AvatarInfoUseProductConfirmView';
import { AvatarInfoUseProductView } from './AvatarInfoUseProductView';
import { HandheldUnitDrawerView } from './infostand/HandheldUnitDrawerView';
import { InfoStandWidgetBotView } from './infostand/InfoStandWidgetBotView';
import { InfoStandWidgetFurniView } from './infostand/InfoStandWidgetFurniView';
import { InfoStandWidgetPetView } from './infostand/InfoStandWidgetPetView';
import { InfoStandWidgetRentableBotView } from './infostand/InfoStandWidgetRentableBotView';
import { InfoStandWidgetUserView } from './infostand/InfoStandWidgetUserView';
import { AvatarInfoNewUserHelpView } from './menu/AvatarInfoNewUserHelpView';
import { AvatarInfoWidgetAvatarView } from './menu/AvatarInfoWidgetAvatarView';
import { AvatarInfoWidgetDecorateView } from './menu/AvatarInfoWidgetDecorateView';
import { AvatarInfoWidgetNameView } from './menu/AvatarInfoWidgetNameView';
import { AvatarInfoWidgetOwnAvatarView } from './menu/AvatarInfoWidgetOwnAvatarView';
import { AvatarInfoWidgetOwnPetView } from './menu/AvatarInfoWidgetOwnPetView';
import { AvatarInfoWidgetPetView } from './menu/AvatarInfoWidgetPetView';
import { AvatarInfoWidgetRentableBotView } from './menu/AvatarInfoWidgetRentableBotView';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const AvatarInfoWidgetView: FC<{}> = (props) => {
    const BLOCK_MENU_WINDOW_MS = 500;
    const BLOCK_ROTATE_WINDOW_MS = 500;
    const [isGameMode, setGameMode] = useState(false);
    const { pickupRoomObject } = useFurniPickupGuard();
    const [isDancing, setIsDancing] = useState(false);
    const [isTouchLayout, setIsTouchLayout] = useState(false);
    const [mobileFurniDetailsOpen, setMobileFurniDetailsOpen] = useState(false);
    const [mobileUserDetailsOpen, setMobileUserDetailsOpen] = useState(false);
    // Phone drawer: peeking (false) or open (true). It survives a swap to another object and folds again once nothing is selected.
    const [drawerExpanded, setDrawerExpanded] = useState(false);
    // Phone drawer: the pet or bot whose sub-page (commands, name, speech) is open, so its back button can return to it.
    const subPageOriginRef = useRef<IAvatarInfo>(null);
    const [rentableBotChatEvent, setRentableBotChatEvent] = useState<RoomWidgetUpdateRentableBotChatEvent>(null);
    const [rentableBotTextSkillEvent, setRentableBotTextSkillEvent] = useState<RoomWidgetUpdateRentableBotTextSkillEvent>(null);
    const {
        avatarInfo = null,
        setAvatarInfo = null,
        activeNameBubble = null,
        setActiveNameBubble = null,
        nameBubbles = [],
        removeNameBubble = null,
        productBubbles = [],
        confirmingProduct = null,
        updateConfirmingProduct = null,
        removeProductBubble = null,
        isDecorating = false,
        setIsDecorating = null
    } = useAvatarInfoWidget();
    const { roomSession = null } = useRoom();
    const isHandheld = useIsHandheld();

    const updateAvatarClickControl = (updates: { suppressMenuUntil?: number; suppressRotateUntil?: number }) => {
        const globalScope = globalThis as any;

        if (!globalScope.__octaneAvatarClickControl) {
            globalScope.__octaneAvatarClickControl = {
                suppressMenuUntil: 0,
                suppressRotateUntil: 0
            };
        }

        Object.assign(globalScope.__octaneAvatarClickControl, updates);
    };

    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.NORMAL_MODE, (event) => {
        if (isGameMode) setGameMode(false);
    });

    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.GAME_MODE, (event) => {
        if (!isGameMode) setGameMode(true);
    });

    useEffect(() => {
        const query = window.matchMedia('(pointer: coarse), (hover: none)');
        const updateTouchLayout = () => setIsTouchLayout(query.matches);

        updateTouchLayout();
        query.addEventListener('change', updateTouchLayout);

        return () => query.removeEventListener('change', updateTouchLayout);
    }, []);

    useOctaneEvent<RoomSessionDanceEvent>(RoomSessionDanceEvent.RSDE_DANCE, (event) => {
        if (event.roomIndex !== roomSession.ownRoomIndex) return;

        setIsDancing(event.danceId !== 0);
    });

    useUiEvent<RoomWidgetUpdateRentableBotChatEvent>(RoomWidgetUpdateRentableBotChatEvent.UPDATE_CHAT, (event) => setRentableBotChatEvent(event));

    useUiEvent<RoomWidgetUpdateRentableBotTextSkillEvent>(RoomWidgetUpdateRentableBotTextSkillEvent.UPDATE_TEXT_SKILL, (event) =>
        setRentableBotTextSkillEvent(event)
    );

    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.REQUEST_PICKUP, (event) => pickupRoomObject(event.objectId, event.category));

    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.REQUEST_MANIPULATION, (event) => {
        if (!(avatarInfo instanceof AvatarInfoFurni)) return;
        if (event.category !== avatarInfo.category || event.objectId !== avatarInfo.id) return;

        setMobileFurniDetailsOpen(false);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'hide':
                        setAvatarInfo(null);
                        setActiveNameBubble(null);

                        if (roomSession) GetRoomEngine().clearSelectedAvatar(roomSession.roomId);
                        return;
                    case 'block-menu':
                        updateAvatarClickControl({ suppressMenuUntil: Date.now() + BLOCK_MENU_WINDOW_MS });
                        setAvatarInfo(null);
                        setActiveNameBubble(null);
                        return;
                    case 'block-rotate':
                        updateAvatarClickControl({ suppressRotateUntil: Date.now() + BLOCK_ROTATE_WINDOW_MS });
                        return;
                    // Phone layout: a long press on an avatar selected it and asks for its action menu.
                    case 'handheld-actions':
                        setMobileUserDetailsOpen(true);
                        setDrawerExpanded(true);
                        return;
                }
            },
            eventUrlPrefix: 'avatar-info/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [roomSession, setActiveNameBubble, setAvatarInfo]);

    useEffect(() => {
        if (avatarInfo?.type !== AvatarInfoFurni.FURNI) {
            setMobileFurniDetailsOpen(false);
        }

        if (avatarInfo?.type !== AvatarInfoUser.OWN_USER && avatarInfo?.type !== AvatarInfoUser.PEER) {
            setMobileUserDetailsOpen(false);
        }

        if (!avatarInfo) setDrawerExpanded(false);
        else if (avatarInfo.type === AvatarInfoPet.PET_INFO || avatarInfo.type === AvatarInfoRentableBot.RENTABLE_BOT) subPageOriginRef.current = avatarInfo;
    }, [avatarInfo]);

    /** The menu of the selected avatar: the bubble over it on the desktop, the action buttons of the drawer on a phone. */
    const getMenuView = (forDrawer: boolean = false) => {
        if (!roomSession || isGameMode) return null;

        if (activeNameBubble && !forDrawer) return <AvatarInfoWidgetNameView nameInfo={activeNameBubble} onClose={() => setActiveNameBubble(null)} />;

        // On a phone the drawer shows the menu; only the name bubble floats over the room.
        if (isHandheld && !forDrawer) return null;

        if (avatarInfo) {
            switch (avatarInfo.type) {
                // AIR has no bubble over furni: move, rotate and pick up stay in the infostand.
                case AvatarInfoFurni.FURNI:
                    return null;
                case AvatarInfoUser.OWN_USER:
                case AvatarInfoUser.PEER: {
                    const info = avatarInfo as AvatarInfoUser;

                    if (isTouchLayout && !mobileUserDetailsOpen && !forDrawer) return null;

                    if (GetConfigurationValue('user.tags.enabled')) GetSessionDataManager().getUserTags(info.roomIndex);

                    if (info.isSpectatorMode) return null;

                    if (info.isOwnUser) {
                        if (RoomEnterEffect.isRunning()) return forDrawer ? null : <AvatarInfoNewUserHelpView avatarInfo={info} onClose={() => setAvatarInfo(null)} />;

                        return (
                            <NativeTextTree>
                                <AvatarInfoWidgetOwnAvatarView
                                    avatarInfo={info}
                                    isDancing={isDancing}
                                    setIsDecorating={setIsDecorating}
                                    onClose={() => setAvatarInfo(null)}
                                />
                            </NativeTextTree>
                        );
                    }

                    return <AvatarInfoWidgetAvatarView avatarInfo={info} onClose={() => setAvatarInfo(null)} />;
                }
                case AvatarInfoPet.PET_INFO: {
                    const info = avatarInfo as AvatarInfoPet;

                    if (info.isOwner) return <AvatarInfoWidgetOwnPetView avatarInfo={info} onClose={() => setAvatarInfo(null)} />;

                    return <AvatarInfoWidgetPetView avatarInfo={info} onClose={() => setAvatarInfo(null)} />;
                }
                case AvatarInfoRentableBot.RENTABLE_BOT: {
                    return <AvatarInfoWidgetRentableBotView avatarInfo={avatarInfo as AvatarInfoRentableBot} onClose={() => setAvatarInfo(null)} />;
                }
            }
        }

        return null;
    };

    const getInfostandView = () => {
        if (!avatarInfo) return null;

        switch (avatarInfo.type) {
            case AvatarInfoFurni.FURNI:
                // The phone layout shows the full infostand in its sheet straight away.
                if (isTouchLayout && !isHandheld && !isDecorating) {
                    const info = avatarInfo as AvatarInfoFurni;

                    if (!mobileFurniDetailsOpen) {
                        return (
                            <NativeTextTree>
                                <BaseButton className="octane-mobile-furni-infostand-trigger" type="button" onClick={() => setMobileFurniDetailsOpen(true)}>
                                    <LayoutFurniIconImageView productType={info.productType} productClassId={info.spriteId} />
                                </BaseButton>
                            </NativeTextTree>
                        );
                    }
                }

                return <InfoStandWidgetFurniView avatarInfo={avatarInfo as AvatarInfoFurni} onClose={() => setAvatarInfo(null)} />;
            case AvatarInfoUser.OWN_USER:
            case AvatarInfoUser.PEER:
                return <InfoStandWidgetUserView avatarInfo={avatarInfo as AvatarInfoUser} setAvatarInfo={setAvatarInfo} onClose={() => setAvatarInfo(null)} />;
            case AvatarInfoUser.BOT:
                return <InfoStandWidgetBotView avatarInfo={avatarInfo as AvatarInfoUser} onClose={() => setAvatarInfo(null)} />;
            case AvatarInfoRentableBot.RENTABLE_BOT:
                return <InfoStandWidgetRentableBotView avatarInfo={avatarInfo as AvatarInfoRentableBot} onClose={() => setAvatarInfo(null)} />;
            case AvatarInfoPet.PET_INFO:
                return <InfoStandWidgetPetView avatarInfo={avatarInfo as AvatarInfoPet} onClose={() => setAvatarInfo(null)} />;
        }
    };

    const closeDrawer = () => setAvatarInfo(null);

    /** Phone layout: one drawer for whatever is selected. A furni's infostand builds its own drawer content. */
    const getHandheldDrawer = () => {
        if (avatarInfo.type === AvatarInfoFurni.FURNI)
            return <InfoStandWidgetFurniView avatarInfo={avatarInfo as AvatarInfoFurni} handheld={{ expanded: drawerExpanded, onExpandedChange: setDrawerExpanded }} onClose={closeDrawer} />;

        return (
            <HandheldUnitDrawerView
                avatarInfo={avatarInfo}
                details={getInfostandView()}
                expanded={drawerExpanded}
                menu={getMenuView(true)}
                onClose={closeDrawer}
                onExpandedChange={setDrawerExpanded}
            />
        );
    };

    /** Phone layout: the back button of a pet's or bot's sub-page shows that pet or bot again. */
    const backToOrigin = isHandheld
        ? () => {
              if (subPageOriginRef.current) setAvatarInfo(subPageOriginRef.current);
          }
        : undefined;

    return (
        <NativeTextTree>
            <>
                {isDecorating && (
                    <AvatarInfoWidgetDecorateView
                        roomIndex={roomSession.ownRoomIndex}
                        setIsDecorating={setIsDecorating}
                        userId={GetSessionDataManager().userId}
                        userName={GetSessionDataManager().userName}
                    />
                )}
                {getMenuView()}
                {avatarInfo && isHandheld && getHandheldDrawer()}
                {avatarInfo && !isHandheld && (
                    <Column alignItems="end" className="octane-infostand-area absolute right-[10px] bottom-[65px] pointer-events-none z-30 text-white">
                        {getInfostandView()}
                    </Column>
                )}
                {nameBubbles.length > 0 &&
                    nameBubbles.map((name) => (
                        // Keyed by the avatar, not the position: removing one bubble made the next take over its faded instance.
                        <AvatarInfoWidgetNameView key={name.roomIndex} nameInfo={name} onClose={() => removeNameBubble(nameBubbles.indexOf(name))} />
                    ))}
                {productBubbles.length > 0 &&
                    productBubbles.map((item, index) => {
                        return (
                            <AvatarInfoUseProductView
                                key={item.id}
                                item={item}
                                updateConfirmingProduct={updateConfirmingProduct}
                                onClose={() => removeProductBubble(index)}
                            />
                        );
                    })}
                {rentableBotChatEvent && (
                    <AvatarInfoRentableBotChatView
                        chatEvent={rentableBotChatEvent}
                        onBack={backToOrigin && (() => (setRentableBotChatEvent(null), backToOrigin()))}
                        onClose={() => setRentableBotChatEvent(null)}
                    />
                )}
                {rentableBotTextSkillEvent && (
                    <AvatarInfoRentableBotTextSkillView
                        key={`${rentableBotTextSkillEvent.botId}:${rentableBotTextSkillEvent.skillType}:${rentableBotTextSkillEvent.text}`}
                        skillEvent={rentableBotTextSkillEvent}
                        onBack={backToOrigin && (() => (setRentableBotTextSkillEvent(null), backToOrigin()))}
                        onClose={() => setRentableBotTextSkillEvent(null)}
                    />
                )}
                {confirmingProduct && <AvatarInfoUseProductConfirmView item={confirmingProduct} onClose={() => updateConfirmingProduct(null)} />}
                <AvatarInfoPetTrainingPanelView onBack={backToOrigin} />
            </>
        </NativeTextTree>
    );
};
