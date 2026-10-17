import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Select } from '../../../../common/Select';

/** What a click on another avatar does, as the server and the renderer number it. */
const USER_OPTIONS = [
    { value: 0, key: 'wiredfurni.params.click_settings.user.0', fallback: 'Default' },
    { value: 1, key: 'wiredfurni.params.click_settings.user.1', fallback: 'Click and walk behind the avatar' },
    { value: 2, key: 'wiredfurni.params.click_settings.user.2', fallback: 'Pass through: the click lands behind the avatar' }
];

/** What a click on a furni does. */
const FURNI_OPTIONS = [
    { value: 0, key: 'wiredfurni.params.click_settings.furni.0', fallback: 'Default' },
    { value: 1, key: 'wiredfurni.params.click_settings.furni.1', fallback: 'Pass through: the click lands on the tile under the furni' }
];

const normalize = (value: number, options: { value: number }[]) => (options.some((option) => option.value === value) ? value : 0);

/**
 * The official click-settings action: two dropdowns, what a click on a user does and what a click
 * on a furni does, sent to the selected users' clients.
 */
export const WiredActionClickSettingsView: FC<{}> = () => {
    const [userOption, setUserOption] = useState(0);
    const [furniOption, setFurniOption] = useState(0);
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    // Official layout: [user option, furni option]; the user source is the official source slot.
    const save = () => {
        setIntParams([userOption, furniOption]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setUserOption(normalize(trigger?.intData?.length > 0 ? trigger.intData[0] : 0, USER_OPTIONS));
        setFurniOption(normalize(trigger?.intData?.length > 1 ? trigger.intData[1] : 0, FURNI_OPTIONS));
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.click_settings.user', 'Clicking a user')}</Text>
                <Select className="form-select form-select-sm" value={userOption} onChange={(event) => setUserOption(Number(event.target.value))}>
                    {USER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(option.key, option.fallback)}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.click_settings.furni', 'Clicking a furni')}</Text>
                <Select className="form-select form-select-sm" value={furniOption} onChange={(event) => setFurniOption(Number(event.target.value))}>
                    {FURNI_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(option.key, option.fallback)}
                        </option>
                    ))}
                </Select>
            </div>
        </WiredActionBaseView>
    );
};
