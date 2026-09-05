import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredHandItemField } from '../WiredHandItemField';
import { CLICKED_USER_SOURCE_VALUE, WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const USER_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const BOT_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const normalizeUserSource = (value: number) =>
    value === CLICKED_USER_SOURCE_VALUE || USER_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 0;
const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCE_OPTIONS.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotGiveHandItemView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [handItemId, setHandItemId] = useState(-1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(0);
    const [botSource, setBotSource] = useState<number>(100);

    const save = () => {
        setStringParam(botSource === 100 ? botName : '');
        setIntParams([handItemId, userSource, botSource]);
    };

    useEffect(() => {
        const nextBotName = trigger.stringData || '';

        setBotName(nextBotName);
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? normalizeUserSource(trigger.intData[1]) : 0);
        setBotSource(
            trigger.intData.length > 2 ? normalizeBotSource(trigger.intData[2], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredSourcesSelector showUsers={true} userSource={userSource} userSources={USER_SOURCE_OPTIONS} onChangeUsers={setUserSource} />
                    <hr className="m-0 bg-dark" />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSource={botSource}
                        userSources={BOT_SOURCE_OPTIONS}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        allowClickedUserSource={false}
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                    />
                </div>
            }
        >
            <div className="form-check">
                <input
                    checked={botSource === 100}
                    className="form-check-input"
                    id="botGiveHandItemUseNamedBot"
                    type="checkbox"
                    onChange={(event) => setBotSource(event.target.checked ? 100 : 0)}
                />
                <label className="form-check-label" htmlFor="botGiveHandItemUseNamedBot">
                    {LocalizeText('wiredfurni.params.bot.usage')}
                </label>
            </div>
            {botSource === 100 && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
            {/* Official BOT_GIVE_HAND_ITEM code list includes 1126/1127/1128 (§_-32b§.as DEFAULT_CODES);
                the condition/selector variants intentionally do NOT, so pass them per-view. */}
            <WiredHandItemField
                handItemId={handItemId}
                extraItemIds={[1126, 1127, 1128]}
                onChange={setHandItemId}
                showCopyButton={true}
            />
        </WiredActionBaseView>
    );
};
