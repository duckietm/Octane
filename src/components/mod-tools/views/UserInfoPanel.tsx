import { GetConfiguration, GetModeratorUserInfoMessageComposer, ModeratorInitData, ModeratorUserInfoData, ModeratorUserInfoEvent } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, OpenUrl, SendMessageComposer } from '../../../api';
import { useMessageEvent, useRoomUserListSnapshot } from '../../../hooks';
import userInfoXml from '../../../assets/mod-tools/xml/user_info.xml?raw';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Border, Native0Button, Native0Text } from '../native/NativeWindow0';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const SHADE = 0xa2d6ea;

// Classic UserInfoCtrl (og) time format: seconds below two minutes, minutes below two hours, hours below two days, days below two years, then years.
const formatTime = (seconds: number): string => {
    if (seconds < 120) return `${seconds} secs ago`;
    if (seconds < 7200) return `${Math.round(seconds / 60)} mins ago`;
    if (seconds < 172800) return `${Math.round(seconds / 3600)} hours ago`;
    if (seconds < 63072000) return `${Math.round(seconds / 86400)} days ago`;

    return `${Math.round(seconds / 31536000)} years ago`;
};

export interface UserInfoPanelProps {
    userId: number;
    settings: ModeratorInitData;
    onOpenChatlog: () => void;
    onOpenSendMessage: (userName: string) => void;
    onOpenModAction: (userName: string) => void;
    onOpenRoomVisits: () => void;
}

// Classic v75 UserInfoCtrl (og): the user_info border with its fields and buttons. It is the content of the user info window (X5) and of the caller / reported panels of the issue handler: GetModeratorUserInfo(userId) goes out when the window opens, the fields stay hidden behind "Loading..."
// until the answer for this user arrives; the sanction counts show a "view" link when they are above zero. Kept from the earlier user info: "Online" also says when the
// user is in the moderator's room, and the free space under the buttons holds a refresh button.
export const UserInfoPanel: FC<UserInfoPanelProps> = ({ userId, settings, onOpenChatlog, onOpenSendMessage, onOpenModAction, onOpenRoomVisits }) => {
    const frame = useMemo(() => parseNativeLayout(userInfoXml), []);
    const fields = useMemo(() => findNativeNode(frame, 'fields'), [frame]);
    const buttons = useMemo(() => findNativeNode(frame, 'buttons'), [frame]);
    const [data, setData] = useState<ModeratorUserInfoData>(null);
    const requestedRef = useRef(false);
    const roomUserList = useRoomUserListSnapshot();
    const roomUser = useMemo(() => roomUserList.find((user) => user && user.webID === userId) ?? null, [roomUserList, userId]);
    const refresh = () => SendMessageComposer(new GetModeratorUserInfoMessageComposer(userId));

    useEffect(() => {
        // one request per opened window (a development double effect run must not send it twice)
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(new GetModeratorUserInfoMessageComposer(userId));
    }, [userId]);

    useMessageEvent<ModeratorUserInfoEvent>(ModeratorUserInfoEvent, (event) => {
        const parser = event.getParser();

        if (parser?.data?.userId === userId) setData(parser.data);
    });

    const box = rectOf(frame);
    const fieldsAt = rectOf(fields);
    const text = (node: NativeNode) => nativeCaption(node);
    const button = (name: string) => rectOf(findNativeNode(buttons, name));
    const caption = (name: string) => text(findNativeNode(fields, name));
    const at = (name: string) => rectOf(findNativeNode(fields, name));
    // Sanction age: the last sanction time turns red for forty-eight hours, fading with the age.
    const sanctionColor = data && data.sanctionAgeHours <= 48 ? Math.trunc((255 * (48 - data.sanctionAgeHours)) / 48) << 16 : 0;
    const canMessage = settings.alertPermission;
    const canModAction = (settings.alertPermission || settings.kickPermission || settings.banPermission) && data?.primaryEmailAddress !== 'No identity';
    const countRow = (name: string, value: number, linkName?: string, onLink?: () => void, linkBackground = SHADE) => (
        <>
            <Native0Text text={`${value}`} width={at(name).width} x={at(name).x} y={at(name).y} />
            {linkName && value > 0 && <Native0Text background={linkBackground} bold text="view" underline width={30} height={13} x={at(linkName).x} y={at(linkName).y} onClick={onLink} />}
        </>
    );

    return (
        <NativeTextTree>
                <Native0Border {...box} x={0} y={0}>
                    {!data && <Native0Text background={0xffffff} bold text={nativeCaption(findNativeNode(frame, 'loading_txt'))} width={70} x={120} y={45} />}
                    {data && (
                        <div style={{ position: 'absolute', left: fieldsAt.x, top: fieldsAt.y, width: fieldsAt.width, height: fieldsAt.height, overflow: 'hidden' }}>
                            {[0, 26, 52, 78, 104, 130, 156, 182].map((top) => (
                                <div key={top} style={{ position: 'absolute', left: 0, top, width: 187, height: 13, backgroundColor: `#${SHADE.toString(16)}` }} />
                            ))}
                            {fields.children
                                .filter((node) => node.tag === 'text' && !node.attrs.name)
                                .map((node, index) => (
                                    <Native0Text key={index} text={text(node)} width={rectOf(node).width} x={rectOf(node).x} y={rectOf(node).y} />
                                ))}
                            <Native0Text text={data.userName} width={at('name_txt').width} x={at('name_txt').x} y={at('name_txt').y} />
                            <Native0Text text={formatTime(data.registrationAgeInMinutes * 60)} width={at('registered_txt').width} x={at('registered_txt').x} y={at('registered_txt').y} />
                            {countRow('cfh_count_txt', data.cfhCount)}
                            {countRow('abusive_cfh_count_txt', data.abusiveCfhCount)}
                            {countRow('caution_count_txt', data.cautionCount, 'view_caution_count_txt', () => OpenModeratorActionLog(data.userName), 0xffffff)}
                            {countRow('ban_count_txt', data.banCount, 'view_ban_count_txt', () => OpenModeratorActionLog(data.userName))}
                            <Native0Text color={sanctionColor} text={data.lastSanctionTime} width={at('last_sanction_time_txt').width} x={at('last_sanction_time_txt').x} y={at('last_sanction_time_txt').y} />
                            {countRow('trading_lock_count_txt', data.tradingLockCount, 'view_trading_lock_count_txt', () => OpenModeratorActionLog(data.userName))}
                            <Native0Text text={data.tradingExpiryDate || caption('trading_lock_expiry_txt')} width={at('trading_lock_expiry_txt').width} x={at('trading_lock_expiry_txt').x} y={at('trading_lock_expiry_txt').y} />
                            <Native0Text text={formatTime(data.minutesSinceLastLogin * 60)} width={at('last_login_txt').width} x={at('last_login_txt').x} y={at('last_login_txt').y} />
                            <Native0Text text={roomUser ? 'Yes (in room)' : data.online ? 'Yes' : 'No'} width={at('online_txt').width + 30} x={at('online_txt').x} y={at('online_txt').y} />
                            <Native0Text text={data.lastPurchaseDate || 'No purchases'} width={at('last_purchase_txt').width} x={at('last_purchase_txt').x} y={at('last_purchase_txt').y} />
                            <Native0Text text={data.primaryEmailAddress || 'No email found'} width={at('email_address_txt').width} x={at('email_address_txt').x} y={at('email_address_txt').y} />
                            <Native0Text text={`${data.identityRelatedBanCount}`} width={at('id_bans_txt').width} x={at('id_bans_txt').x} y={at('id_bans_txt').y} />
                            <Native0Text background={SHADE} bold text="view" underline width={30} height={13} x={at('view_id_bans_txt').x} y={at('view_id_bans_txt').y} onClick={() => OpenIdentityInformation(data.identityId)} />
                            <Native0Text text={data.userClassification || '-'} width={at('user_class_txt').width} x={at('user_class_txt').x} y={at('user_class_txt').y} />
                            <div style={{ position: 'absolute', left: rectOf(buttons).x, top: rectOf(buttons).y, width: rectOf(buttons).width, height: rectOf(buttons).height }}>
                                <Native0Button enabled={settings.chatlogsPermission} height={21} label={text(findNativeNode(buttons, 'chatlog_but'))} width={80} x={button('chatlog_but').x} y={button('chatlog_but').y} onClick={onOpenChatlog} />
                                <Native0Button enabled={canMessage} height={21} label={text(findNativeNode(buttons, 'message_but'))} width={80} x={button('message_but').x} y={button('message_but').y} onClick={() => onOpenSendMessage(data.userName)} />
                                <Native0Button height={21} label={text(findNativeNode(buttons, 'roomvisits_but'))} width={80} x={button('roomvisits_but').x} y={button('roomvisits_but').y} onClick={onOpenRoomVisits} />
                                <Native0Button
                                    height={21}
                                    label={text(findNativeNode(buttons, 'habboinfotool_but'))}
                                    width={80}
                                    x={button('habboinfotool_but').x}
                                    y={button('habboinfotool_but').y}
                                    onClick={() => OpenModeratorTool('habboinfotool.url', data.userName)}
                                />
                                <Native0Button enabled={canModAction} height={21} label={text(findNativeNode(buttons, 'modaction_but'))} width={80} x={button('modaction_but').x} y={button('modaction_but').y} onClick={() => onOpenModAction(data.userName)} />
                                <Native0Button height={21} label={localizeWithFallback('modtools.native.refresh', 'Refresh')} width={80} x={button('modaction_but').x} y={button('modaction_but').y + 22} onClick={refresh} />
                            </div>
                        </div>
                    )}
                </Native0Border>
        </NativeTextTree>
    );
};

// ModerationManager._r23c6b981b6860a: the page is the configured property followed by the value, opened as the "housekeeping" page.
const OpenModeratorTool = (key: string, value: string) => {
    const prefix = GetConfiguration().getValue<string>(key, '');

    if (prefix) OpenUrl(`${prefix}${value}`);
};

const OpenModeratorActionLog = (userName: string) => OpenModeratorTool('moderatoractionlog.url', userName);
const OpenIdentityInformation = (identityId: number) => OpenModeratorTool('identityinformationtool.url', `${identityId}`);
