import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Button, LayoutAvatarImageView, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotChangeFigureView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [figure, setFigure] = useState('');
    const [botSource, setBotSource] = useState<number>(100);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();

    const save = () => {
        // Official: "name\tfigure" (the name always), no int params; the bots are user slot 0.
        setStringParam(botName + WIRED_STRING_DELIMETER + figure);
        setIntParams([]);
        setSourceTypes({ furni: [], users: [botSource] });
    };

    useEffect(() => {
        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        // Official: an empty figure stays empty until one is captured.
        setBotName(nextBotName);
        setFigure(data.length > 1 ? data[1] : '');

        setBotSource(normalizeBotSource(trigger.userSourceTypes?.[0] ?? -1, true));
    }, [trigger]);

    return (
        <NativeTextTree>
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
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} title={LocalizeText('wiredfurni.tooltip.bot.name')} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
                <Text bold>{LocalizeText('wiredfurni.params.capture.figure')}</Text>
                <div className="flex items-center justify-center">
                    {figure && <LayoutAvatarImageView direction={4} figure={figure} />}
                    <Button onClick={(event) => setFigure(GetSessionDataManager().figure)}>{LocalizeText('wiredfurni.params.capture.figure')}</Button>
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
