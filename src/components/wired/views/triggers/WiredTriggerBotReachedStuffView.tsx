import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' }
];

const BOT_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' }
];

const normalizeFurniSource = (value: number) => (FURNI_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);
const normalizeBotSource = (value: number) => (BOT_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);

export const WiredTriggerBotReachedStuffView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [furniSource, setFurniSource] = useState(100);
    const [botSource, setBotSource] = useState(100);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();

    const save = () => {
        // Official: the bot name, no int params; the furni and bot sources in the official slots.
        setStringParam(botName);
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [botSource] });
    };

    useEffect(() => {
        setBotName(trigger?.stringData ?? '');
        setFurniSource(normalizeFurniSource(trigger?.furniSourceTypes?.[0] ?? 100));
        setBotSource(normalizeBotSource(trigger?.userSourceTypes?.[0] ?? 100));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredTriggerBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
                save={save}
                footer={
                    <WiredSourcesSelector
                        showFurni={true}
                        showUsers={true}
                        furniSource={furniSource}
                        userSource={botSource}
                        furniSources={FURNI_SOURCE_OPTIONS}
                        userSources={BOT_SOURCE_OPTIONS}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeFurni={setFurniSource}
                        onChangeUsers={setBotSource}
                    />
                }
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} title={LocalizeText('wiredfurni.tooltip.botname')} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
