import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Button, LayoutAvatarImageView, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const DEFAULT_FIGURE: string = 'hd-180-1.ch-210-66.lg-270-82.sh-290-81';
const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotChangeFigureView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [figure, setFigure] = useState('');
    const [botSource, setBotSource] = useState<number>(100);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () => {
        setStringParam((botSource === 100 ? botName : '') + WIRED_STRING_DELIMETER + figure);
        setIntParams([botSource]);
    };

    useEffect(() => {
        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        if (data.length > 0) setBotName(nextBotName);
        if (data.length > 1) setFigure(data[1].length > 0 ? data[1] : DEFAULT_FIGURE);
        else setFigure(DEFAULT_FIGURE);

        setBotSource(
            trigger.intData.length > 0 ? normalizeBotSource(trigger.intData[0], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={botSource}
                    userSources={BOT_SOURCES}
                    usersTitle="wiredfurni.params.sources.users.title.bots"
                    onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                />
            }
        >
            {botSource === 100 && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
            <div className="flex items-center justify-center">
                <LayoutAvatarImageView direction={4} figure={figure} />
                <Button onClick={(event) => setFigure(GetSessionDataManager().figure)}>{LocalizeText('wiredfurni.params.capture.figure')}</Button>
            </div>
        </WiredActionBaseView>
    );
};
