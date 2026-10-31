import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredHandItemField } from '../WiredHandItemField';
import { CLICKED_USER_SOURCE_VALUE, REACHED_USER_SOURCE_VALUE, WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

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
    value === CLICKED_USER_SOURCE_VALUE || value === REACHED_USER_SOURCE_VALUE || USER_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 0;
const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCE_OPTIONS.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

const BOT_EXTRA_HAND_ITEM_IDS = [1126, 1127, 1128];

export const WiredActionBotGiveHandItemView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [handItemId, setHandItemId] = useState(-1);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(0);
    const [botSource, setBotSource] = useState<number>(100);
    // Official: "use the bot name" is checked when a name is stored, and only then is it sent.
    const [useBotName, setUseBotName] = useState(false);

    const save = () => {
        // Official: the name (empty without "use the named bot"), ints [hand item]; the bots are user
        // slot 0, ours the receivers in slot 1.
        setStringParam(useBotName ? botName : '');
        setIntParams([Math.max(0, handItemId)]);
        setSourceTypes({ furni: [], users: [botSource, userSource] });
    };

    useEffect(() => {
        const nextBotName = trigger.stringData || '';

        setBotName(nextBotName);
        setUseBotName(nextBotName !== '');
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(normalizeUserSource(slotUserSource(trigger, 1)));
        setBotSource(normalizeBotSource(trigger.userSourceTypes?.[0] ?? -1, nextBotName.length > 0));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={
                    <div className="flex flex-col gap-2">
                        <WiredSourcesSelector showUsers={true} userSlot={1} userSource={userSource} userSources={USER_SOURCE_OPTIONS} onChangeUsers={setUserSource} />
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
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox
                            checked={useBotName}
                            id="botGiveHandItemUseNamedBot"
                            onCheckedChange={(nextChecked) => {
                                setUseBotName(nextChecked);
                                // Ours: the named bot is bot source 100.
                                if (nextChecked) setBotSource(100);
                                else if (botSource === 100) setBotSource(0);
                            }}
                        />
                        <Text>{LocalizeText('wiredfurni.params.bot.usage')}</Text>
                    </label>
                    {useBotName && (
                        <OctaneInput
                            aria-label={LocalizeText('wiredfurni.params.bot.name')}
                            maxLength={32}
                            title={LocalizeText('wiredfurni.tooltip.bot.name')}
                            type="text"
                            value={botName}
                            onChange={(event) => setBotName(event.target.value)}
                        />
                    )}
                </div>
                {/* Official BOT_GIVE_HAND_ITEM code list includes 1126/1127/1128 (§_-32b§.as DEFAULT_CODES);
                    the condition/selector variants intentionally do NOT, so pass them per-view. */}
                <WiredHandItemField
                    handItemId={handItemId}
                    extraItemIds={BOT_EXTRA_HAND_ITEM_IDS}
                    tooltipKey="wiredfurni.tooltip.bot.handitem"
                    onChange={setHandItemId}
                    showCopyButton={true}
                />
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
