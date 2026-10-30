import { BotSkillSaveComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import {
    BotSkillsEnum,
    GetConfigurationValue,
    LocalizeText,
    localizeWithFallback,
    RoomWidgetUpdateRentableBotTextSkillEvent,
    SendMessageComposer
} from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { AvatarInfoBotSkillButtonsView, AvatarInfoBotSkillWindowView } from './AvatarInfoBotSkillWindowView';

interface AvatarInfoRentableBotTextSkillViewProps {
    skillEvent: RoomWidgetUpdateRentableBotTextSkillEvent;
    onClose(): void;
}

/** name_configuration_xml; the motto skill (Octane only) reuses the same window. */
export const AvatarInfoRentableBotTextSkillView: FC<AvatarInfoRentableBotTextSkillViewProps> = (props) => {
    const { skillEvent = null, onClose = null } = props;
    const [text, setText] = useState<string>(skillEvent.text ?? '');
    const isMotto = skillEvent.skillType === BotSkillsEnum.CHANGE_BOT_MOTTO;

    const save = () => {
        SendMessageComposer(new BotSkillSaveComposer(skillEvent.botId, skillEvent.skillType, text));

        onClose();
    };

    return (
        <NativeTextTree>
            <AvatarInfoBotSkillWindowView
                category={skillEvent.category}
                layout="name"
                objectId={skillEvent.objectId}
                title={
                    isMotto
                        ? localizeWithFallback('bot.skill.motto.configuration.title', localizeWithFallback('avatar.widget.change_bot_motto', 'Change motto'))
                        : LocalizeText('bot.skill.name.configuration.title')
                }
            >
                <div className="air-bot-skill-label air-bot-skill-label--name">
                    {isMotto ? localizeWithFallback('bot.skill.name.configuration.new.motto', 'Choose a motto:') : LocalizeText('bot.skill.name.configuration.new.name')}
                </div>
                <input
                    autoFocus
                    className="air-bot-skill-input air-bot-skill-name-input"
                    maxLength={isMotto ? GetConfigurationValue<number>('motto.max.length', 38) : GetConfigurationValue<number>('bot.name.max.length', 15)}
                    type="text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                />
                <AvatarInfoBotSkillButtonsView cancelLabel={LocalizeText('cancel')} saveLabel={LocalizeText('save')} onCancel={onClose} onSave={save} />
            </AvatarInfoBotSkillWindowView>
        </NativeTextTree>
    );
};
