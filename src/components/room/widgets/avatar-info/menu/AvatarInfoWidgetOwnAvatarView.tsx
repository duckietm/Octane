import {
    AvatarAction,
    AvatarExpressionEnum,
    CreateLinkEvent,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectVariable,
    RoomUnitDropHandItemComposer
} from '@octane/renderer';
import { Dispatch, FC, ReactNode, SetStateAction, useState } from 'react';
import {
    AvatarInfoUser,
    DispatchUiEvent,
    GetCanStandUp,
    GetConfigurationValue,
    GetOwnPosture,
    GetOwnRoomObject,
    GetUserProfile,
    HasHabboClub,
    HasHabboVip,
    IsRidingHorse,
    LocalizeText,
    localizeWithFallback,
    PostureTypeEnum,
    SendMessageComposer
} from '../../../../../api';
import { HelpNameChangeEvent } from '../../../../../events';
import { useRoom, useWiredTools } from '../../../../../hooks';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetOwnAvatarViewProps {
    avatarInfo: AvatarInfoUser;
    isDancing: boolean;
    setIsDecorating: Dispatch<SetStateAction<boolean>>;
    onClose: () => void;
}

interface AirMenuLabelProps {
    children: ReactNode;
    direction?: 'left' | 'right';
}

interface AirSign {
    id: number;
    label?: string;
    icon?: string;
}

const MODE_NORMAL = 0;
const MODE_CLUB_DANCES = 1;
const MODE_EXPRESSIONS = 3;
const MODE_SIGNS = 4;

const AIR_SIGNS: AirSign[] = [
    { id: 1, label: '1' },
    { id: 2, label: '2' },
    { id: 3, label: '3' },
    { id: 4, label: '4' },
    { id: 5, label: '5' },
    { id: 6, label: '6' },
    { id: 7, label: '7' },
    { id: 8, label: '8' },
    { id: 9, label: '9' },
    { id: 10, label: '10' },
    { id: 11, icon: 'heart' },
    { id: 12, icon: 'skull' },
    { id: 0, label: '0' },
    { id: 13, icon: 'exclamation' },
    { id: 15, icon: 'smile' },
    { id: 14, icon: 'soccer' },
    { id: 17, icon: 'yellow' },
    { id: 16, icon: 'red' }
];

const AirMenuLabel: FC<AirMenuLabelProps> = ({ children, direction = null }) => (
    <span className="air-avatar-menu-label">
        {direction === 'left' && <i className="air-avatar-menu-arrow air-avatar-menu-arrow--left" aria-hidden="true" />}
        {children}
        {direction === 'right' && <i className="air-avatar-menu-arrow air-avatar-menu-arrow--right" aria-hidden="true" />}
    </span>
);

export const AvatarInfoWidgetOwnAvatarView: FC<AvatarInfoWidgetOwnAvatarViewProps> = (props) =>
{
    const { avatarInfo = null, isDancing = false, setIsDecorating = null, onClose = null } = props;
    const hasClub = HasHabboClub();
    const hasVip = HasHabboVip();
    const ownPosture = GetOwnPosture();
    const ownRoomObject = GetOwnRoomObject();
    const activeEffectId = ownRoomObject?.model.getValue<number>(RoomObjectVariable.FIGURE_EFFECT) ?? 0;
    const hasActiveEffect = activeEffectId > 0;
    const isRidingHorse = IsRidingHorse();
    const isSwimming = ownPosture === AvatarAction.POSTURE_SWIM;
    const [mode, setMode] = useState(isDancing && hasClub && !hasActiveEffect ? MODE_CLUB_DANCES : MODE_NORMAL);
    const { roomSession = null } = useRoom();
    const { openInspectionForUser, showInspectButton } = useWiredTools();

    const expressionsMenuEnabled = GetConfigurationValue('avatar.expressions_menu.enabled', true);
    const signsEnabled = GetConfigurationValue('avatar.signs.enabled', true);
    const effectsEnabled = !GetConfigurationValue('memenu.effects.widget.disabled', false);
    const handItemDropEnabled = GetConfigurationValue('handitem.drop.enabled', true);
    const sittingEnabled = GetConfigurationValue('avatar.sitting.enabled', true);
    const expression67Enabled = GetConfigurationValue('avatar.expression.67.enabled', false);

    const processAction = (name: string) =>
    {
        let hideMenu = true;

        if (name)
        {
            if (!hasVip && ['blow', 'expression_67', 'laugh'].includes(name))
            {
                CreateLinkEvent('habboUI/open/hccenter');
                hideMenu = false;
            }
            else if (name.startsWith('sign_'))
            {
                const sign = parseInt(name.split('_')[1]);

                roomSession.sendSignMessage(sign);
            }
            else
            {
                switch (name)
                {
                    case 'decorate':
                        setIsDecorating(true);
                        break;
                    case 'change_name':
                        DispatchUiEvent(new HelpNameChangeEvent(HelpNameChangeEvent.INIT));
                        break;
                    case 'change_looks':
                        CreateLinkEvent('avatar-editor/show');
                        break;
                    case 'avatar_effect':
                        CreateLinkEvent('avatar-effects/show');
                        break;
                    case 'customize_nick':
                        CreateLinkEvent('customize/show');
                        break;
                    case 'badge_leaderboard':
                        CreateLinkEvent('badge-leaderboard/show');
                        break;
                    case 'expressions':
                        hideMenu = false;
                        setMode(MODE_EXPRESSIONS);
                        break;
                    case 'sit':
                        roomSession.sendPostureMessage(PostureTypeEnum.POSTURE_SIT);
                        break;
                    case 'stand':
                        roomSession.sendPostureMessage(PostureTypeEnum.POSTURE_STAND);
                        break;
                    case 'wave':
                        roomSession.sendExpressionMessage(AvatarExpressionEnum.WAVE.ordinal);
                        break;
                    case 'blow':
                        roomSession.sendExpressionMessage(AvatarExpressionEnum.BLOW.ordinal);
                        break;
                    case 'expression_67':
                        roomSession.sendExpressionMessage(67);
                        break;
                    case 'laugh':
                        roomSession.sendExpressionMessage(AvatarExpressionEnum.LAUGH.ordinal);
                        break;
                    case 'idle':
                        roomSession.sendExpressionMessage(AvatarExpressionEnum.IDLE.ordinal);
                        break;
                    case 'dance_menu':
                        hideMenu = false;
                        setMode(MODE_CLUB_DANCES);
                        break;
                    case 'dance':
                        roomSession.sendDanceMessage(1);
                        break;
                    case 'dance_stop':
                        roomSession.sendDanceMessage(0);
                        break;
                    case 'dance_1':
                    case 'dance_2':
                    case 'dance_3':
                    case 'dance_4':
                        roomSession.sendDanceMessage(parseInt(name.charAt(name.length - 1)));
                        break;
                    case 'signs':
                        hideMenu = false;
                        setMode(MODE_SIGNS);
                        break;
                    case 'back':
                        hideMenu = false;
                        setMode(MODE_NORMAL);
                        break;
                    case 'drop_carry_item':
                        SendMessageComposer(new RoomUnitDropHandItemComposer());
                        break;
                    case 'inspect':
                        openInspectionForUser(avatarInfo.roomIndex);
                        break;
                    case 'customize_nick':
                        CreateLinkEvent('customize/show');
                        break;
                    case 'badge_leaderboard':
                        CreateLinkEvent('badge-leaderboard/show');
                        break;
                }
            }
        }

        if (hideMenu) onClose();
    };

    const isShowDecorate = () =>
        hasClub && (avatarInfo.amIOwner || avatarInfo.amIAnyRoomController || avatarInfo.roomControllerLevel > RoomControllerLevel.GUEST);
    const canUsePremiumExpression = !hasActiveEffect && !isSwimming;
    const premiumExpressionClassNames = hasVip ? [] : ['air-avatar-menu-item--locked'];

    return (
        <ContextMenuView
            category={RoomObjectCategory.UNIT}
            classNames={['octane-avatar-action-menu', 'octane-avatar-action-menu--own']}
            collapsable={true}
            freezePositionOnHover={true}
            maximumVerticalLeadRatio={0.05}
            objectId={avatarInfo.roomIndex}
            repositionKey={mode}
            showCaretIcon={false}
            tallAvatarOffset={25}
            userType={avatarInfo.userType}
            onClose={onClose}
        >
            <ContextMenuHeaderView className="cursor-pointer" onClick={() => GetUserProfile(avatarInfo.webID)}>
                {avatarInfo.name}
            </ContextMenuHeaderView>
            <div className="air-avatar-menu-buttons">
                {mode === MODE_NORMAL && (
                    <>
                        {avatarInfo.allowNameChange && (
                            <ContextMenuListItemView classNames={['air-avatar-menu-item--link']} onClick={() => processAction('change_name')}>
                                {LocalizeText('widget.avatar.change_name')}
                            </ContextMenuListItemView>
                        )}
                        {isShowDecorate() && (
                            <ContextMenuListItemView onClick={() => processAction('decorate')}>
                                {LocalizeText('widget.avatar.decorate')}
                            </ContextMenuListItemView>
                        )}
                        <ContextMenuListItemView classNames={['air-avatar-menu-item--link']} onClick={() => processAction('change_looks')}>
                            {LocalizeText('widget.memenu.myclothes')}
                        </ContextMenuListItemView>
                        {expressionsMenuEnabled ? (
                            <ContextMenuListItemView onClick={() => processAction('expressions')}>
                                <AirMenuLabel direction="right">{LocalizeText('infostand.link.expressions')}</AirMenuLabel>
                            </ContextMenuListItemView>
                        ) : (
                            <ContextMenuListItemView onClick={() => processAction('wave')}>{LocalizeText('widget.memenu.wave')}</ContextMenuListItemView>
                        )}
                        {hasClub && !isRidingHorse && (
                            <ContextMenuListItemView disabled={hasActiveEffect} onClick={() => processAction('dance_menu')}>
                                <AirMenuLabel direction="right">{LocalizeText('widget.memenu.dance')}</AirMenuLabel>
                            </ContextMenuListItemView>
                        )}
                        {!isDancing && !hasClub && !isRidingHorse && (
                            <ContextMenuListItemView disabled={hasActiveEffect} onClick={() => processAction('dance')}>
                                {LocalizeText('widget.memenu.dance')}
                            </ContextMenuListItemView>
                        )}
                        {isDancing && !hasClub && !isRidingHorse && (
                            <ContextMenuListItemView onClick={() => processAction('dance_stop')}>
                                {LocalizeText('widget.memenu.dance.stop')}
                            </ContextMenuListItemView>
                        )}
                        {signsEnabled && (
                            <ContextMenuListItemView onClick={() => processAction('signs')}>
                                <AirMenuLabel direction="right">{LocalizeText('infostand.show.signs')}</AirMenuLabel>
                            </ContextMenuListItemView>
                        )}
                        {avatarInfo.carryItem > 0 && avatarInfo.carryItem < 999999 && handItemDropEnabled && (
                            <ContextMenuListItemView onClick={() => processAction('drop_carry_item')}>
                                {LocalizeText('avatar.widget.drop_hand_item')}
                            </ContextMenuListItemView>
                        )}
                        {effectsEnabled && !isRidingHorse && (
                            <ContextMenuListItemView classNames={['air-avatar-menu-item--link']} onClick={() => processAction('avatar_effect')}>
                                {LocalizeText('widget.memenu.effects')}
                            </ContextMenuListItemView>
                        )}
                        {showInspectButton && (
                            <ContextMenuListItemView onClick={() => processAction('inspect')}>
                                {LocalizeText('infostand.button.wired_inspect')}
                            </ContextMenuListItemView>
                        )}

                        {/* Polaris-only actions are appended after the official AIR rows. */}
                        <ContextMenuListItemView onClick={() => processAction('customize_nick')}>
                            <span className="air-avatar-menu-extra-label">
                                {localizeWithFallback('widget.memenu.customize_nick', 'Custom nickname')}
                            </span>
                        </ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('badge_leaderboard')}>
                            <span className="air-avatar-menu-extra-label">
                                {localizeWithFallback('badge_leaderboard.title.total_badges', 'Badge leaderboard')}
                            </span>
                        </ContextMenuListItemView>
                    </>
                )}
                {mode === MODE_CLUB_DANCES && (
                    <>
                        <ContextMenuListItemView disabled={!isDancing} onClick={() => processAction('dance_stop')}>
                            {LocalizeText('widget.memenu.dance.stop')}
                        </ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('dance_1')}>{LocalizeText('widget.memenu.dance1')}</ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('dance_2')}>{LocalizeText('widget.memenu.dance2')}</ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('dance_3')}>{LocalizeText('widget.memenu.dance3')}</ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('dance_4')}>{LocalizeText('widget.memenu.dance4')}</ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('back')}>
                            <AirMenuLabel direction="left">{LocalizeText('generic.back')}</AirMenuLabel>
                        </ContextMenuListItemView>
                    </>
                )}
                {mode === MODE_EXPRESSIONS && (
                    <>
                        {sittingEnabled && !isSwimming && !isRidingHorse && ownPosture === AvatarAction.POSTURE_STAND && (
                            <ContextMenuListItemView onClick={() => processAction('sit')}>{LocalizeText('widget.memenu.sit')}</ContextMenuListItemView>
                        )}
                        {sittingEnabled && !isSwimming && !isRidingHorse && GetCanStandUp() && (
                            <ContextMenuListItemView onClick={() => processAction('stand')}>{LocalizeText('widget.memenu.stand')}</ContextMenuListItemView>
                        )}
                        <ContextMenuListItemView disabled={isSwimming} onClick={() => processAction('wave')}>
                            {LocalizeText('widget.memenu.wave')}
                        </ContextMenuListItemView>
                        <ContextMenuListItemView
                            classNames={premiumExpressionClassNames}
                            disabled={hasVip && !canUsePremiumExpression}
                            onClick={() => processAction('blow')}
                        >
                            {!hasVip && <i className="air-avatar-menu-vip" aria-hidden="true" />}
                            {LocalizeText('widget.memenu.blow')}
                        </ContextMenuListItemView>
                        {expression67Enabled && (
                            <ContextMenuListItemView
                                classNames={premiumExpressionClassNames}
                                disabled={hasVip && !canUsePremiumExpression}
                                onClick={() => processAction('expression_67')}
                            >
                                {!hasVip && <i className="air-avatar-menu-vip" aria-hidden="true" />}
                                {LocalizeText('widget.memenu.expression_67')}
                            </ContextMenuListItemView>
                        )}
                        <ContextMenuListItemView
                            classNames={premiumExpressionClassNames}
                            disabled={hasVip && !canUsePremiumExpression}
                            onClick={() => processAction('laugh')}
                        >
                            {!hasVip && <i className="air-avatar-menu-vip" aria-hidden="true" />}
                            {LocalizeText('widget.memenu.laugh')}
                        </ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('idle')}>{LocalizeText('widget.memenu.idle')}</ContextMenuListItemView>
                        <ContextMenuListItemView onClick={() => processAction('back')}>
                            <AirMenuLabel direction="left">{LocalizeText('generic.back')}</AirMenuLabel>
                        </ContextMenuListItemView>
                    </>
                )}
                {mode === MODE_SIGNS && (
                    <>
                        <div className="air-avatar-menu-signs-grid">
                            {AIR_SIGNS.map((sign) => (
                                <ContextMenuListItemView
                                    key={sign.id}
                                    classNames={['air-avatar-menu-sign-cell']}
                                    onClick={() => processAction(`sign_${sign.id}`)}
                                >
                                    {sign.label}
                                    {sign.icon && <i className={`air-avatar-menu-sign-icon air-avatar-menu-sign-icon--${sign.icon}`} aria-hidden="true" />}
                                </ContextMenuListItemView>
                            ))}
                        </div>
                        <ContextMenuListItemView onClick={() => processAction('back')}>
                            <AirMenuLabel direction="left">{LocalizeText('generic.back')}</AirMenuLabel>
                        </ContextMenuListItemView>
                    </>
                )}
            </div>
        </ContextMenuView>
    );
};
