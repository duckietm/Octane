import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { DraggableWindow } from '../../../common/draggable-window';
import { HandheldSheetFrame, HandheldSheetTab } from '../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

/** Why the sheet is out of the way: a furni or user is picked in the room, or the room is just looked at. */
type HandheldWiredAside = 'pick' | 'look' | null;

export interface HandheldWiredSheetTools {
    /** Puts the sheet aside until something is tapped in the room (the inspection tab's "Pick in room"). */
    startPicking: () => void;
}

export interface HandheldWiredToolsViewProps {
    title: string;
    tabs: HandheldSheetTab[];
    activeTab: string;
    onTab: (id: string) => void;
    onClose: () => void;
    /** What the room has selected for the tools; when it changes while picking, the sheet comes back. */
    pickedKey: string;
    /** The bar's second line while picking: what to tap. */
    pickHint: string;
    children: (tools: HandheldWiredSheetTools) => ReactNode;
}

/**
 * The wired creator tools on a phone: a full-screen sheet in the shared frame (HandheldSheetFrame) with the tabs as
 * its pills, instead of the 520 px desktop window drawn smaller. The room the tools work on must stay reachable: the
 * eye in the header puts the sheet aside (a bar at the top brings it back), and "Pick in room" does the same until a
 * furni or user is tapped, then the sheet returns on its own with that pick inspected. While aside the sheet stays
 * mounted, so every field, page and scroll position is kept.
 */
export const HandheldWiredToolsView: FC<HandheldWiredToolsViewProps> = ({ title, tabs, activeTab, onTab, onClose, pickedKey, pickHint, children }) => {
    const [aside, setAside] = useState<HandheldWiredAside>(null);
    const pickStart = useRef(pickedKey);

    useEffect(() => {
        if (aside === 'pick' && pickedKey !== pickStart.current) setAside(null);
    }, [aside, pickedKey]);

    const startPicking = () => {
        pickStart.current = pickedKey;
        setAside('pick');
    };

    const showRoom = localizeWithFallback('octane.handheld.window.peek', 'Show the room');

    return (
        <NativeTextTree>
            <DraggableWindow
                handheldSheet
                handheldPeek={aside ? { label: title, hint: aside === 'pick' ? pickHint : undefined, forced: true, onReturn: () => setAside(null) } : undefined}
                uniqueKey="wired-creator-tools"
            >
                <HandheldSheetFrame
                    activeTab={activeTab}
                    className="octane-handheld-wired"
                    headerExtra={
                        <BaseButton
                            aria-label={showRoom}
                            className="octane-handheld-sheet__caption-button octane-handheld-wired__look"
                            data-testid="wired-show-room"
                            onClick={() => setAside('look')}
                        >
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M1.5 8 C3.5 4.5 5.6 3 8 3 C10.4 3 12.5 4.5 14.5 8 C12.5 11.5 10.4 13 8 13 C5.6 13 3.5 11.5 1.5 8 Z" />
                                <circle cx="8" cy="8" r="2.2" />
                            </svg>
                        </BaseButton>
                    }
                    icon="icon-wired-tools"
                    tabs={tabs}
                    tabsLabel={localizeWithFallback('octane.handheld.wired_tools.tabs', 'Wired tools')}
                    title={title}
                    onClose={onClose}
                    onTab={onTab}
                >
                    <div className="octane-handheld-wired__tab" data-tab={activeTab}>
                        {children({ startPicking })}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
