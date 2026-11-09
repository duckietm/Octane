import { BotSkillSaveComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { BotSkillsEnum, GetConfigurationValue, LocalizeText, OpenUrl, RoomWidgetUpdateRentableBotChatEvent, SendMessageComposer } from '../../../../api';
import { AvatarInfoBotSkillButtonsView, AvatarInfoBotSkillWindowView } from './AvatarInfoBotSkillWindowView';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface AvatarInfoRentableBotChatViewProps {
    chatEvent: RoomWidgetUpdateRentableBotChatEvent;
    onClose(): void;
}

const CHAT_TEXT_MAX_CHARS = 1000;

export const AvatarInfoRentableBotChatView: FC<AvatarInfoRentableBotChatViewProps> = (props) => {
    const { chatEvent = null, onClose = null } = props;

    const [newText, setNewText] = useState<string>(chatEvent.chat === '${bot.skill.chatter.configuration.text.placeholder}' ? '' : chatEvent.chat);
    const [automaticChat, setAutomaticChat] = useState<boolean>(chatEvent.automaticChat);
    const [mixSentences, setMixSentences] = useState<boolean>(chatEvent.mixSentences);
    const [chatDelay, setChatDelay] = useState<string>(String(chatEvent.chatDelay));
    const helpUrl = GetConfigurationValue<string>('link.format.bots.help', '');

    const formatChatString = (value: string) => value.replace(/;#;/g, ' ').replace(/\r\n|\r|\n/g, '\r');

    const save = () => {
        const delay = parseInt(chatDelay, 10) || 0;
        const chatConfiguration = formatChatString(newText) + ';#;' + automaticChat + ';#;' + delay + ';#;' + mixSentences;

        SendMessageComposer(new BotSkillSaveComposer(chatEvent.botId, BotSkillsEnum.SETUP_CHAT, chatConfiguration));

        onClose();
    };

    return (
        <NativeTextTree>
            <AvatarInfoBotSkillWindowView
                category={chatEvent.category}
                layout="chatter"
                objectId={chatEvent.objectId}
                title={LocalizeText('bot.skill.chatter.configuration.title')}
            >
                <div className="air-bot-skill-label">{LocalizeText('bot.skill.chatter.configuration.chat.text')}</div>
                <textarea
                    className="air-bot-skill-input air-bot-skill-chat-text"
                    maxLength={CHAT_TEXT_MAX_CHARS}
                    placeholder={LocalizeText('bot.skill.chatter.configuration.text.placeholder')}
                    value={newText}
                    onChange={(event) => setNewText(event.target.value)}
                />
                <label className="air-bot-skill-row">
                    <span className="air-bot-skill-label">{LocalizeText('bot.skill.chatter.configuration.automatic.chat')}</span>
                    <Checkbox checked={automaticChat} className="air-bot-skill-checkbox" onCheckedChange={ nextChecked => setAutomaticChat(nextChecked) } />
                </label>
                <label className="air-bot-skill-row">
                    <span className="air-bot-skill-label">{LocalizeText('bot.skill.chatter.configuration.markov')}</span>
                    <Checkbox checked={mixSentences} className="air-bot-skill-checkbox" onCheckedChange={ nextChecked => setMixSentences(nextChecked) } />
                </label>
                <label className="air-bot-skill-row">
                    <span className="air-bot-skill-label">{LocalizeText('bot.skill.chatter.configuration.chat.delay')}</span>
                    <input
                        className="air-bot-skill-input air-bot-skill-chat-delay"
                        inputMode="numeric"
                        type="text"
                        value={chatDelay}
                        onChange={(event) => setChatDelay(event.target.value.replace(/[^0-9]/g, ''))}
                    />
                </label>
                <BaseButton
                    className="air-bot-skill-help-link"
                    disabled={!helpUrl}
                    type="button"
                    onClick={() => OpenUrl(helpUrl)}
                >
                    {LocalizeText('bot.skill.chatter.configuration.help.link')}
                </BaseButton>
                <AvatarInfoBotSkillButtonsView cancelLabel={LocalizeText('cancel')} saveLabel={LocalizeText('save')} onCancel={onClose} onSave={save} />
            </AvatarInfoBotSkillWindowView>
        </NativeTextTree>
    );
};
