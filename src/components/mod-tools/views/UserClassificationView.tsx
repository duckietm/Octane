import { FC, useMemo, useState } from 'react';
import userClassificationXml from '../../../assets/mod-tools/xml/userclassification_frame.xml?raw';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Frame, Native0Rows, Native0Scrollbar, Native0Text } from '../native/NativeWindow0';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const SHADE = 0xa2d6ea;

export interface UserClassificationEntry {
    userId: number;
    userName: string;
    classType: string;
}

export interface UserClassificationProps {
    entries: UserClassificationEntry[];
    x: number;
    y: number;
    width: number;
    height: number;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
    onOpenUserInfo: (userId: number) => void;
}

// AIR moderation `UserClassificationCtrl` (userclassification_frame): the window opens when the room user classification message arrives and carries no caption at all
// (the controller blanks it). One 14px row per classified user, the first one shaded: the user's name (opens the user info), the class and a "Visit" link. The rows alternate with
// white and the list gives 17px to the scroller only while the rows do not fit. "Visit" is the native `VisitUser` write, which the server does not implement, so it is drawn and held.
export const UserClassificationView: FC<UserClassificationProps> = ({ entries, x, y, width, height, onClose, onResize, onOpenUserInfo }) => {
    const root = useMemo(() => parseNativeLayout(userClassificationXml), []);
    const row = rectOf(findNativeNode(root, 'classificationrow'));
    const userName = rectOf(findNativeNode(root, 'user_name_txt'));
    const classType = rectOf(findNativeNode(root, 'user_classification_txt'));
    const visit = rectOf(findNativeNode(root, 'visit_room_txt'));
    const visitCaption = nativeCaption(findNativeNode(root, 'visit_room_txt'));
    const [offset, setOffset] = useState(0);

    const clientWidth = width - 12;
    const viewHeight = height - 32;
    const contentHeight = entries.length * row.height;
    const overflow = contentHeight > viewHeight;
    const listWidth = clientWidth - (overflow ? 17 : 0);
    const rowColors = entries.map((_, index) => (index % 2 === 0 ? SHADE : 0xffffff));
    const clamped = Math.max(0, Math.min(Math.max(0, contentHeight - viewHeight), offset));

    return (
        <NativeTextTree>
            <NativeWindowShell type="userClassification" windowKey="1" x={x} y={y}>
                <Native0Frame caption="" height={height} width={width} onClose={onClose} onResize={onResize}>
                    <div className="native0-list" style={{ left: 0, top: 0, width: listWidth, height: viewHeight }} onWheel={(event) => setOffset(Math.max(0, Math.min(Math.max(0, contentHeight - viewHeight), clamped + event.deltaY * 0.75)))}>
                        <div style={{ position: 'absolute', left: 0, top: -clamped, width: listWidth, height: contentHeight }}>
                            <Native0Rows colors={rowColors} height={contentHeight} rowHeight={row.height} width={listWidth} />
                            {entries.map((entry, index) => (
                                <div key={entry.userId} style={{ position: 'absolute', left: 0, top: index * row.height, width: listWidth, height: row.height }}>
                                    <Native0Text bold clip height={row.height} text={entry.userName} underline width={userName.width} x={userName.x} y={0} onClick={() => onOpenUserInfo(entry.userId)} />
                                    <Native0Text clip height={row.height} text={entry.classType} width={classType.width} x={classType.x} y={0} />
                                    <Native0Text bold height={row.height} text={visitCaption} underline width={visit.width} x={visit.x} y={0} />
                                </div>
                            ))}
                        </div>
                    </div>
                    {overflow && <Native0Scrollbar contentHeight={contentHeight} height={viewHeight} offset={clamped} viewHeight={viewHeight} x={clientWidth - 17} y={0} onOffset={setOffset} />}
                </Native0Frame>
            </NativeWindowShell>
        </NativeTextTree>
    );
};
