import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource, slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const normalizeBotSource = (value: number) => (BOT_SOURCES.some((option) => option.value === value) ? value : 100);

/**
 * Bot teleport / bot move to furni. Official: the bot name, always shown and sent, no int params; the
 * furni source and the bots (user slot 0) are the official source slots.
 */
export const WiredActionBotFurniView: FC<{}> = () => {
    const [botName, setBotName] = useState('');
    const [botSource, setBotSource] = useState<number>(100);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    const save = () => {
        setStringParam(botName);
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [botSource] });
    };

    useEffect(() => {
        if (!trigger) return;

        setBotName(trigger.stringData || '');
        setFurniSource(slotFurniSource(trigger));
        setBotSource(normalizeBotSource(slotUserSource(trigger, 0, 100)));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
                save={save}
                footer={
                    <div className="flex flex-col gap-2">
                        <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />
                        <hr className="m-0 bg-dark" />
                        <WiredSourcesSelector
                            showUsers={true}
                            userSource={botSource}
                            userSources={BOT_SOURCES}
                            usersTitle="wiredfurni.params.sources.users.title.bots"
                            onChangeUsers={(value) => setBotSource(normalizeBotSource(value))}
                        />
                    </div>
                }
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} title={LocalizeText('wiredfurni.tooltip.bot.name')} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
