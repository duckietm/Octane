import {
    BotCommandConfigurationEvent,
    BotRemoveComposer,
    BotSkillSaveComposer,
    CreateLinkEvent,
    RequestBotCommandConfigurationComposer,
    RoomObjectCategory,
    RoomObjectType
} from '@octane/renderer';
import { FC } from 'react';
import {
    AvatarInfoRentableBot,
    BotSkillsEnum,
    DispatchUiEvent,
    getRentableBotCommandButtons,
    LocalizeText,
    localizeWithFallback,
    RoomWidgetUpdateRentableBotChatEvent,
    RoomWidgetUpdateRentableBotTextSkillEvent,
    SendMessageComposer
} from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../../../../hooks';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetRentableBotViewProps {
    avatarInfo: AvatarInfoRentableBot;
    onClose: () => void;
}

export const AvatarInfoWidgetRentableBotView: FC<AvatarInfoWidgetRentableBotViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;

    useMessageEvent<BotCommandConfigurationEvent>(BotCommandConfigurationEvent, (event) => {
        const parser = event.getParser();

        if (parser.botId !== avatarInfo.webID) return;

        switch (parser.commandId) {
            case BotSkillsEnum.CHANGE_BOT_NAME:
            case BotSkillsEnum.CHANGE_BOT_MOTTO:
                DispatchUiEvent(
                    new RoomWidgetUpdateRentableBotTextSkillEvent(avatarInfo.roomIndex, RoomObjectCategory.UNIT, avatarInfo.webID, parser.commandId, parser.data)
                );

                onClose();
                return;
            case BotSkillsEnum.SETUP_CHAT: {
                const data = parser.data;
                const pieces = data.split(data.indexOf(';#;') === -1 ? ';' : ';#;');

                if (pieces.length === 3 || pieces.length === 4) {
                    DispatchUiEvent(
                        new RoomWidgetUpdateRentableBotChatEvent(
                            avatarInfo.roomIndex,
                            RoomObjectCategory.UNIT,
                            avatarInfo.webID,
                            pieces[0],
                            pieces[1].toLowerCase() === 'true' || pieces[1] === '1',
                            parseInt(pieces[2]),
                            pieces[3] ? pieces[3].toLowerCase() === 'true' || pieces[3] === '1' : false
                        )
                    );

                    onClose();
                }

                return;
            }
        }
    });

    const requestBotCommandConfiguration = (skillType: number) => SendMessageComposer(new RequestBotCommandConfigurationComposer(avatarInfo.webID, skillType));

    const processAction = (name: string) => {
        let hideMenu = true;

        if (name) {
            switch (name) {
                case 'donate_to_all':
                    requestBotCommandConfiguration(BotSkillsEnum.DONATE_TO_ALL);
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.DONATE_TO_ALL, ''));
                    break;
                case 'donate_to_user':
                    requestBotCommandConfiguration(BotSkillsEnum.DONATE_TO_USER);
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.DONATE_TO_USER, ''));
                    break;
                case 'change_bot_name':
                    requestBotCommandConfiguration(BotSkillsEnum.CHANGE_BOT_NAME);
                    hideMenu = false;
                    break;
                case 'change_bot_motto':
                    requestBotCommandConfiguration(BotSkillsEnum.CHANGE_BOT_MOTTO);
                    hideMenu = false;
                    break;
                case 'dress_up':
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.DRESS_UP, ''));
                    break;
                case 'random_walk':
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.RANDOM_WALK, ''));
                    break;
                case 'setup_chat':
                    requestBotCommandConfiguration(BotSkillsEnum.SETUP_CHAT);
                    hideMenu = false;
                    break;
                case 'dance':
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.DANCE, ''));
                    break;
                case 'rotate':
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.ROTATE, ''));
                    hideMenu = false;
                    break;
                case 'nux_take_tour':
                    CreateLinkEvent('help/tour');
                    SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.NUX_TAKE_TOUR, ''));
                    break;
                case 'pick':
                    SendMessageComposer(new BotRemoveComposer(avatarInfo.webID));
                    break;
                default:
                    break;
            }
        }

        if (hideMenu) onClose();
    };

    const canControl = avatarInfo.amIOwner || avatarInfo.amIAnyRoomController;
    const commandButtons = getRentableBotCommandButtons(avatarInfo.botSkillsWithCommands ?? []);

    // AIR RentableBotMenuView: in-client link and navigator search buttons open their link, a NUX proceed
    // button answers the bot with its step; every one of them closes the menu.
    const processCommandButton = (link: string | undefined, proceedStep: string | undefined) => {
        if (link) CreateLinkEvent(link);
        else if (proceedStep !== undefined) SendMessageComposer(new BotSkillSaveComposer(avatarInfo.webID, BotSkillsEnum.NUX_PROCEED, proceedStep));

        onClose();
    };

    return (
        <NativeTextTree>
            <ContextMenuView
                category={RoomObjectCategory.UNIT}
                classNames={['octane-avatar-action-menu', 'octane-avatar-action-menu--own', 'octane-avatar-action-menu--widget']}
                collapsable={true}
                freezePositionOnHover={true}
                objectId={avatarInfo.roomIndex}
                showCaretIcon={false}
                userType={RoomObjectType.RENTABLE_BOT}
                onClose={onClose}
            >
                <ContextMenuHeaderView>{avatarInfo.name}</ContextMenuHeaderView>
                <div className="air-avatar-menu-buttons">
                    {canControl && (
                        <>
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.DONATE_TO_ALL) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('donate_to_all')}>
                                    {localizeWithFallback('avatar.widget.donate_to_all', 'Serve everyone')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.DONATE_TO_USER) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('donate_to_user')}>
                                    {localizeWithFallback('avatar.widget.donate_to_user', 'Serve me')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.CHANGE_BOT_NAME) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('change_bot_name')}>
                                    {LocalizeText('avatar.widget.change_bot_name')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.CHANGE_BOT_MOTTO) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('change_bot_motto')}>
                                    {localizeWithFallback('avatar.widget.change_bot_motto', 'Change motto')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.DRESS_UP) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('dress_up')}>
                                    {LocalizeText('avatar.widget.dress_up')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.RANDOM_WALK) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('random_walk')}>
                                    {LocalizeText('avatar.widget.random_walk')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.SETUP_CHAT) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('setup_chat')}>
                                    {LocalizeText('avatar.widget.setup_chat')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.DANCE) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('dance')}>{LocalizeText('avatar.widget.dance')}</ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.ROTATE) >= 0 && (
                                <ContextMenuListItemView onClick={(event) => processAction('rotate')}>
                                    {LocalizeText('tooltip.roombuilding.rotate')}
                                </ContextMenuListItemView>
                            )}
                            {avatarInfo.botSkills.indexOf(BotSkillsEnum.NO_PICK_UP) === -1 && (
                                <ContextMenuListItemView onClick={(event) => processAction('pick')}>{LocalizeText('avatar.widget.pick_up')}</ContextMenuListItemView>
                            )}
                        </>
                    )}
                    {commandButtons.map((button) => (
                        <ContextMenuListItemView key={button.key} onClick={(event) => processCommandButton(button.link, button.proceedStep)}>
                            {button.label ?? localizeWithFallback('avatar.widget.nux.proceed', 'Proceed')}
                        </ContextMenuListItemView>
                    ))}
                </div>
            </ContextMenuView>
        </NativeTextTree>
    );
};
