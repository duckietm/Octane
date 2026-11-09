import { FC, ReactNode, useMemo } from 'react';
import { GetBotSkillWindowPosition, GetRoomObjectBounds, GetRoomSession } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { Hint } from '../../../../common/Tooltip';

export const BOT_SKILL_WINDOW_SIZES = {
    chatter: { width: 278, height: 369 },
    name: { width: 209, height: 119 }
} as const;

export type BotSkillWindowLayout = keyof typeof BOT_SKILL_WINDOW_SIZES;

interface AvatarInfoBotSkillWindowViewProps {
    layout: BotSkillWindowLayout;
    objectId: number;
    category: number;
    title: string;
    children?: ReactNode;
}

interface AvatarInfoBotSkillButtonsViewProps {
    saveLabel: string;
    cancelLabel: string;
    onSave: () => void;
    onCancel: () => void;
}

const getBotBounds = (objectId: number, category: number) => {
    const roomSession = GetRoomSession();

    if (!roomSession) return null;

    return GetRoomObjectBounds(roomSession.roomId, objectId, category, 1);
};

/** The bubble window of chatter_configuration_xml / name_configuration_xml, opened where the bot menu was. */
export const AvatarInfoBotSkillWindowView: FC<AvatarInfoBotSkillWindowViewProps> = (props) => {
    const { layout, objectId, category, title, children = null } = props;
    const { width, height } = BOT_SKILL_WINDOW_SIZES[layout];

    const initialPosition = useMemo(
        () => GetBotSkillWindowPosition(getBotBounds(objectId, category), width, height, window.innerWidth, window.innerHeight),
        [objectId, category, width, height]
    );

    return (
        <NativeTextTree>
            <DraggableWindow handleSelector=".air-bot-skill-window-title" initialPosition={initialPosition} windowPosition={DraggableWindowPosition.NOTHING}>
                <div className={`air-bot-skill-window air-bot-skill-window--${layout}`}>
                    <div className="air-bot-skill-window-title">
                        <span>{title}</span>
                    </div>
                    <div className="air-bot-skill-window-items">{children}</div>
                </div>
            </DraggableWindow>
        </NativeTextTree>
    );
};

/** The right-aligned cancel (style 3) / save (style 5, green) button_thick pair of both layouts. */
export const AvatarInfoBotSkillButtonsView: FC<AvatarInfoBotSkillButtonsViewProps> = (props) => {
    const { saveLabel, cancelLabel, onSave, onCancel } = props;

    return (
        <NativeTextTree>
            <div className="air-bot-skill-buttons">
                <Hint content={cancelLabel}>
                    <BaseButton className="air-bot-skill-button" type="button" onClick={onCancel}>
                        <span>{cancelLabel}</span>
                    </BaseButton>
                </Hint>
                <Hint content={saveLabel}>
                    <BaseButton className="air-bot-skill-button air-bot-skill-button--save" type="button" onClick={onSave}>
                        <span>{saveLabel}</span>
                    </BaseButton>
                </Hint>
            </div>
        </NativeTextTree>
    );
};
