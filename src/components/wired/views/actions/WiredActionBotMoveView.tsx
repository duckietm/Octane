import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotMoveView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [botSource, setBotSource] = useState<number>(100);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    const save = () => {
        setStringParam(botSource === 100 ? botName : '');
        setIntParams([furniSource, botSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);

        if (trigger.intData.length >= 1) setFurniSource(trigger.intData[0]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);

        setBotSource(
            trigger.intData.length >= 2 ? normalizeBotSource(trigger.intData[1], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />
                    <hr className="m-0 bg-dark" />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSource={botSource}
                        userSources={BOT_SOURCES}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                    />
                </div>
            }
        >
            {botSource === 100 && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
        </WiredActionBaseView>
    );
};
