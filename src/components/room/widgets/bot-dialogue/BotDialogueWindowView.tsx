import { BotDialogueWindowChooseComposer, BotDialogueWindowEvent, IBotDialogueWindowItem } from '@octane/renderer';
import { FC, useState } from 'react';
import { GetConfigurationValue, GetRoomSession, localizeWithFallback, SendMessageComposer } from '../../../../api';
import {
    LayoutAvatarImageView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardTabsItemView,
    OctaneCardTabsView,
    OctaneCardView
} from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../../../hooks';
import '../../../../css/room/BotDialogueWindow.css';

/** A bot dialogue window as the server sent it; the server matches a choice against its nonce. */
interface BotDialogueWindowData {
    botId: number;
    nonce: number;
    title: string;
    text: string;
    action: string;
    tabs: string[];
    items: IBotDialogueWindowItem[];
    footer: string[];
}

/** The icon of a furni class name, through the hotel's furni icon address; empty when there is none. */
export const botDialogueIconUrl = (icon: string): string => {
    const url = GetConfigurationValue<string>('furni.asset.icon.url', '');

    if (!icon || !url) return '';

    return url.replace('%libname%', icon).replace('%param%', '');
};

/**
 * A bot dialogue in a window of its own: what the bot says beside its face, tabs, a grid of items with their furni
 * icon and price, and a bar to take the selected item, with an amount when the item allows more than one. Taking an
 * item sends the window's code; the server answers with the next window, and nothing is sent again meanwhile.
 */
export const BotDialogueWindowView: FC = () => {
    const [dialogue, setDialogue] = useState<BotDialogueWindowData>(null);
    const [tab, setTab] = useState(0);
    const [selected, setSelected] = useState(0);
    const [amount, setAmount] = useState(1);
    const [waiting, setWaiting] = useState(false);

    useMessageEvent<BotDialogueWindowEvent>(BotDialogueWindowEvent, (event) => {
        const parser = event.getParser();
        const sameBot = !!dialogue && dialogue.botId === parser.botId;

        setWaiting(false);
        setAmount(1);

        if (parser.closed) {
            if (sameBot) setDialogue(null);

            return;
        }

        // Another bot's window starts over; the same bot's next window keeps the tab and the item in view.
        if (!sameBot) {
            setTab(0);
            setSelected(0);
        }

        setDialogue({
            botId: parser.botId,
            nonce: parser.nonce,
            title: parser.title,
            text: parser.text,
            action: parser.action,
            tabs: [...parser.tabs],
            items: parser.items.map((item) => ({ ...item })),
            footer: [...parser.footer]
        });
    });

    if (!dialogue) return null;

    const shown = dialogue.items.map((item, index) => ({ item, index })).filter(({ item }) => !dialogue.tabs.length || item.tab < 0 || item.tab === tab);
    const current = dialogue.items[selected] ?? null;
    const maxAmount = current ? Math.max(1, current.maxAmount) : 1;
    const taken = Math.min(amount, maxAmount);
    const figure = GetRoomSession()?.userDataManager?.getRentableBotData(dialogue.botId)?.figure ?? '';

    const take = () => {
        if (!current || waiting) return;

        setWaiting(true);
        SendMessageComposer(new BotDialogueWindowChooseComposer(dialogue.botId, dialogue.nonce, selected, taken));
    };

    const selectTab = (index: number) => {
        setTab(index);

        const first = dialogue.items.findIndex((item) => item.tab < 0 || item.tab === index);

        if (first >= 0) setSelected(first);

        setAmount(1);
    };

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-bot-dialogue-window" theme="primary-slim" uniqueKey="bot-dialogue-window">
                <OctaneCardHeaderView headerText={dialogue.title} onCloseClick={() => setDialogue(null)} />
                <div className="octane-bot-dialogue-speech">
                    <div className="octane-bot-dialogue-face">{figure && <LayoutAvatarImageView direction={2} figure={figure} headOnly={true} />}</div>
                    <div className="octane-bot-dialogue-text">{dialogue.text}</div>
                </div>
                {dialogue.tabs.length > 0 && (
                    <OctaneCardTabsView>
                        {dialogue.tabs.map((name, index) => (
                            <OctaneCardTabsItemView key={index} isActive={tab === index} onClick={() => selectTab(index)}>
                                {name}
                            </OctaneCardTabsItemView>
                        ))}
                    </OctaneCardTabsView>
                )}
                <OctaneCardContentView overflow="auto">
                    <div className="octane-bot-dialogue-grid">
                        {shown.map(({ item, index }) => (
                            <BaseButton
                                key={index}
                                aria-pressed={index === selected}
                                className={`octane-bot-dialogue-item${index === selected ? ' is-selected' : ''}`}
                                type="button"
                                onClick={() => {
                                    setSelected(index);
                                    setAmount(1);
                                }}
                            >
                                {item.icon && <img alt="" className="octane-bot-dialogue-icon" draggable={false} src={botDialogueIconUrl(item.icon)} />}
                                <span className="octane-bot-dialogue-label">{item.label}</span>
                                {item.price > 0 && <span className="octane-bot-dialogue-price">{item.price}</span>}
                            </BaseButton>
                        ))}
                    </div>
                </OctaneCardContentView>
                {current && (
                    <div className="octane-bot-dialogue-bar">
                        <div className="octane-bot-dialogue-preview">
                            {current.icon && <img alt="" draggable={false} src={botDialogueIconUrl(current.icon)} />}
                        </div>
                        <div className="octane-bot-dialogue-chosen">
                            <span className="octane-bot-dialogue-chosen-name">{current.label}</span>
                            {current.detail && <span>{current.detail}</span>}
                        </div>
                        {maxAmount > 1 && (
                            <div className="octane-bot-dialogue-amount">
                                <BaseButton
                                    aria-label={localizeWithFallback('octane.bot.dialogue.less', 'Less')}
                                    type="button"
                                    onClick={() => setAmount(Math.max(1, taken - 1))}
                                >
                                    -
                                </BaseButton>
                                <span aria-live="polite">{taken}</span>
                                <BaseButton
                                    aria-label={localizeWithFallback('octane.bot.dialogue.more', 'More')}
                                    type="button"
                                    onClick={() => setAmount(Math.min(maxAmount, taken + 1))}
                                >
                                    +
                                </BaseButton>
                            </div>
                        )}
                        <div className="octane-bot-dialogue-footer">
                            {dialogue.footer.map((line, index) => (
                                <span key={index}>{line}</span>
                            ))}
                        </div>
                        <BaseButton className="octane-bot-dialogue-take" disabled={waiting} type="button" onClick={take}>
                            {dialogue.action || localizeWithFallback('octane.bot.dialogue.take', 'Take')}
                            {current.price > 0 && ` · ${current.price * taken}`}
                        </BaseButton>
                    </div>
                )}
            </OctaneCardView>
        </NativeTextTree>
    );
};
