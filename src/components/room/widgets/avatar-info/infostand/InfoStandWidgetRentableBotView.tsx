import { BotRemoveComposer, GetRoomEngine, RoomObjectCategory, RoomObjectOperationType } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { AvatarInfoRentableBot, BotSkillsEnum, LocalizeText, SendMessageComposer } from '../../../../../api';
import { Button, Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, Text, UserProfileIconView } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useRoom } from '../../../../../hooks';
import { InfoStandHeaderView } from './InfoStandHeaderView';
import { InfoStandUnitIdView } from './InfoStandUnitIdView';

interface InfoStandWidgetRentableBotViewProps {
    avatarInfo: AvatarInfoRentableBot;
    onClose: () => void;
}

export const InfoStandWidgetRentableBotView: FC<InfoStandWidgetRentableBotViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;

    const canPickup = useMemo(() => {
        if (avatarInfo.botSkills.indexOf(BotSkillsEnum.NO_PICK_UP) >= 0) return false;

        if (!avatarInfo.amIOwner && !avatarInfo.amIAnyRoomController) return false;

        return true;
    }, [avatarInfo]);

    const { roomSession = null } = useRoom();

    // Official InfoStandRentableBotView: an owned bot is moved and turned like furni by whoever has rights in the
    // room, owns the bot or controls any room, and never in play-test mode.
    const canArrange =
        avatarInfo.ownerId > -1 &&
        !roomSession?.playTestMode &&
        (avatarInfo.roomControllerLevel >= 1 || avatarInfo.amIOwner || avatarInfo.amIAnyRoomController);

    const arrangeBot = (operation: string) => GetRoomEngine().processRoomObjectOperation(avatarInfo.roomIndex, RoomObjectCategory.UNIT, operation);

    const pickupBot = () => SendMessageComposer(new BotRemoveComposer(avatarInfo.webID));

    if (!avatarInfo) return;

    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <div className="flex flex-col octane-infostand rounded">
                    <div className="flex flex-col gap-1 overflow-visible container-fluid content-area">
                        <div className="flex flex-col gap-1">
                            <InfoStandHeaderView name={avatarInfo.name} onClose={onClose} />
                            <div className="octane-infostand__rule" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                                <Column fullWidth className="body-image bot">
                                    <LayoutAvatarImageView direction={4} figure={avatarInfo.figure} />
                                </Column>
                                <Column center grow gap={0}>
                                    {avatarInfo.badges.length > 0 &&
                                        avatarInfo.badges.map((result) => {
                                            return <LayoutBadgeImageView key={result} badgeCode={result} showInfo={true} />;
                                        })}
                                </Column>
                            </div>
                            <div className="octane-infostand__rule" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Flex alignItems="center" className="bg-light-dark rounded py-1 px-2">
                                <Text fullWidth small textBreak wrap className="min-h-[18px]" variant="white">
                                    {avatarInfo.motto}
                                </Text>
                            </Flex>
                            <div className="octane-infostand__rule" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                                <UserProfileIconView userId={avatarInfo.ownerId} />
                                <Text small wrap variant="white">
                                    {LocalizeText('infostand.text.botowner', ['name'], [avatarInfo.ownerName])}
                                </Text>
                            </div>
                            <InfoStandUnitIdView id={avatarInfo.webID} ownerId={avatarInfo.ownerId} />
                            {avatarInfo.carryItem > 0 && (
                                <>
                                    <div className="octane-infostand__rule" />
                                    <Text small wrap variant="white">
                                        {LocalizeText('infostand.text.handitem', ['item'], [LocalizeText('handitem' + avatarInfo.carryItem)])}
                                    </Text>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {(canArrange || canPickup) && (
                    <div className="flex justify-end gap-1">
                        {canArrange && (
                            <>
                                <Button variant="dark" onClick={() => arrangeBot(RoomObjectOperationType.OBJECT_MOVE)}>
                                    {LocalizeText('infostand.button.move')}
                                </Button>
                                <Button variant="dark" onClick={() => arrangeBot(RoomObjectOperationType.OBJECT_ROTATE_POSITIVE)}>
                                    {LocalizeText('infostand.button.rotate')}
                                </Button>
                            </>
                        )}
                        {canPickup && (
                            <Button variant="dark" onClick={pickupBot}>
                                {LocalizeText('infostand.button.pickup')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
