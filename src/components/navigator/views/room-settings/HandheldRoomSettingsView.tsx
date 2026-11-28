import { FC, ReactNode } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { DraggableWindow } from '../../../../common/draggable-window';
import { HandheldSheetFrame, HandheldSheetTab } from '../../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { HandheldRsHelpButton } from './HandheldRoomSettingsParts';

/** Where the last change of the settings stands: nothing sent yet, on its way, taken by the server, or refused. */
export type RoomSettingsSaveState = 'idle' | 'saving' | 'saved' | 'error';

interface HandheldRoomSettingsViewProps {
    roomName: string;
    /** The tab keys, in the desktop's order (their text is the tab's label). */
    tabs: string[];
    activeTab: string;
    /** Null on a tab whose changes are not room settings (the rights). */
    saveState: RoomSettingsSaveState | null;
    onTab: (tab: string) => void;
    /** Given on the tab that has a help page (the chat settings). */
    onHelp?: () => void;
    onClose: () => void;
    children?: ReactNode;
}

const SAVE_TEXT: Record<RoomSettingsSaveState, [string, string]> = {
    idle: ['octane.handheld.room_settings.save.idle', 'Saves as you go'],
    saving: ['octane.handheld.room_settings.save.saving', 'Saving...'],
    saved: ['octane.handheld.room_settings.save.saved', 'Saved'],
    error: ['octane.handheld.room_settings.save.error', 'Not saved: check the field in red']
};

/**
 * The room settings on a phone: a full-screen sheet in the Octane handheld look (HandheldSheetFrame), the five tabs as
 * pills, a strip with the room's name and where the last change stands, and the tab's page under it. Every change is
 * sent as on the desktop the moment it is made; NavigatorRoomSettingsView keeps the data and the packets.
 */
export const HandheldRoomSettingsView: FC<HandheldRoomSettingsViewProps> = (props) => {
    const { roomName, tabs, activeTab, saveState, onTab, onHelp, onClose, children = null } = props;
    const sheetTabs: HandheldSheetTab[] = tabs.map((tab) => ({ id: tab, label: LocalizeText(tab) }));

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="octane-room-settings">
                <HandheldSheetFrame
                    activeTab={activeTab}
                    className="octane-handheld-rs"
                    headerExtra={onHelp ? <HandheldRsHelpButton onClick={onHelp} /> : null}
                    icon="icon-rooms"
                    tabs={sheetTabs}
                    tabsLabel={localizeWithFallback('octane.handheld.room_settings.tabs', 'Room settings sections')}
                    title={LocalizeText('navigator.roomsettings')}
                    onClose={onClose}
                    onTab={onTab}
                >
                    <div className="octane-handheld-rs__status" data-state={saveState ?? 'none'} data-testid="rs-status">
                        <span className="octane-handheld-rs__status-room">{roomName}</span>
                        {saveState && (
                            <span aria-live="polite" className="octane-handheld-rs__status-save">
                                <span aria-hidden="true" className="octane-handheld-rs__status-dot" />
                                {localizeWithFallback(SAVE_TEXT[saveState][0], SAVE_TEXT[saveState][1])}
                            </span>
                        )}
                    </div>
                    <div className="octane-handheld-rs__page" data-tab={tabs.indexOf(activeTab) + 1}>
                        {children}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
