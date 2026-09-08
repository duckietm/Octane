import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredActionBaseView } from './WiredActionBaseView';

const PLAYBACK_OPTIONS = [
    { value: 1, key: 'wiredfurni.params.youtube.play', label: 'Play video' },
    { value: 0, key: 'wiredfurni.params.youtube.stop', label: 'Stop / clear video' }
];

export const WiredActionPlayYoutubeView: FC<{}> = (props) => {
    const [videoId, setVideoId] = useState<string>('');
    const [autoStart, setAutoStart] = useState<number>(1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setVideoId(trigger.stringData ?? '');
        setAutoStart((trigger.intData?.length ?? 0) > 0 ? (trigger.intData[0] === 0 ? 0 : 1) : 1);
    }, [trigger]);

    const save = () => {
        setStringParam(videoId);
        setIntParams([autoStart]);
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>YouTube video id / url</Text>
                <Text small>The room must have YouTube enabled. Empty value (or "Stop") clears the video.</Text>
                <OctaneInput maxLength={100} type="text" value={videoId} onChange={(event) => setVideoId(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>Action</Text>
                <select
                    className="form-select form-select-sm"
                    value={autoStart}
                    onChange={(event) => setAutoStart(parseInt(event.target.value, 10) === 0 ? 0 : 1)}
                >
                    {PLAYBACK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(option.key, option.label)}
                        </option>
                    ))}
                </select>
            </div>
        </WiredActionBaseView>
    );
};
