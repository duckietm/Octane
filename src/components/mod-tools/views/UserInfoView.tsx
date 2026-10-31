import { ModeratorInitData } from '@octane/renderer';
import { FC, useMemo } from 'react';
import userInfoXml from '../../../assets/mod-tools/xml/user_info.xml?raw';
import userInfoFrameXml from '../../../assets/mod-tools/xml/user_info_frame.xml?raw';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { nativeNumber, parseNativeLayout } from '../native/NativeLayout';
import { Native0Frame } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { UserInfoPanel } from './UserInfoPanel';

export interface UserInfoProps {
    userId: number;
    settings: ModeratorInitData;
    x: number;
    y: number;
    onClose: () => void;
    onOpenChatlog: () => void;
    onOpenSendMessage: (userName: string) => void;
    onOpenModAction: (userName: string) => void;
    onOpenRoomVisits: () => void;
}

// The frame's client area starts 25px down and keeps a 6px edge below it.
const CLIENT_TOP = 25;
const CLIENT_BOTTOM = 6;

// Classic v75 user info window (X5, user_info_frame): the frame captioned "User Info" around the user info panel. The frame grows to hold the panel's border: the
// user_info_frame layout is 225px high, but the border it receives is 202px, which needs 233px and was cut at the bottom.
export const UserInfoView: FC<UserInfoProps> = ({ userId, settings, x, y, onClose, onOpenChatlog, onOpenSendMessage, onOpenModAction, onOpenRoomVisits }) => {
    const root = useMemo(() => parseNativeLayout(userInfoFrameXml), []);
    const panelHeight = useMemo(() => nativeNumber(parseNativeLayout(userInfoXml), 'height'), []);
    const height = Math.max(nativeNumber(root, 'height'), CLIENT_TOP + panelHeight + CLIENT_BOTTOM);

    return (
        <NativeTextTree>
            <NativeWindowShell type="userInfo" windowKey={`${userId}`} x={x} y={y}>
                <Native0Frame caption="User Info" height={height} width={nativeNumber(root, 'width')} onClose={onClose}>
                    <UserInfoPanel settings={settings} userId={userId} onOpenChatlog={onOpenChatlog} onOpenModAction={onOpenModAction} onOpenRoomVisits={onOpenRoomVisits} onOpenSendMessage={onOpenSendMessage} />
                </Native0Frame>
            </NativeWindowShell>
        </NativeTextTree>
    );
};
