import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Select } from '../../../../common/Select';

/**
 * Habbo's "write to logs" (`wf_act_log`, and `wf_act_neg_log` for when the conditions fail): a
 * message written into the room's wired log at a level, where the room log window lists it.
 * Server: WiredEffectLog. Int params `[level]`, string param the message, the user source in its slot.
 */

/** Habbo's four levels, in the order the room log window numbers them. */
export const WRITE_TO_LOGS_LEVELS: Array<{ fallback: string; value: number }> = [
    { fallback: 'Debug', value: 0 },
    { fallback: 'Info', value: 1 },
    { fallback: 'Warning', value: 2 },
    { fallback: 'Error', value: 3 }
];

export const WRITE_TO_LOGS_MESSAGE_MAX_LENGTH = 400;
const DEFAULT_LEVEL = 0;

const normalizeLevel = (value: number): number => (Number.isInteger(value) && value >= 0 && value <= 3 ? value : DEFAULT_LEVEL);

/** Official: [level], the message as typed (one line, 400 characters); the user source is the official slot. */
export const WiredActionWriteToLogsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [message, setMessage] = useState('');
    const [level, setLevel] = useState(DEFAULT_LEVEL);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setMessage(trigger.stringData ?? '');
        setLevel(normalizeLevel(trigger.intData?.[0]));
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    const save = () => {
        setStringParam(message);
        setIntParams([level]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <WiredActionBaseView
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.write_to_logs.log_level.title', 'Log level')}</Text>
                <Select className="form-select form-select-sm" value={level} onChange={(event) => setLevel(normalizeLevel(parseInt(event.target.value, 10)))}>
                    {WRITE_TO_LOGS_LEVELS.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                            {localizeWithFallback(`wiredfurni.params.write_to_logs.log_level.${entry.value}`, entry.fallback)}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.write_to_logs.log_message.title', 'Message')}</Text>
                <input
                    className="form-control form-control-sm"
                    maxLength={WRITE_TO_LOGS_MESSAGE_MAX_LENGTH}
                    type="text"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
            </div>
        </WiredActionBaseView>
    );
};
