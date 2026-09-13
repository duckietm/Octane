import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/** A stored per-game limit of zero lets the box award score as often as it is triggered. */
const UNLIMITED_TIMES_IN_GAME = 0;
const MAXIMUM_TIMES_IN_GAME = 10;

/** The slider carries one position past the maximum; it reads as unlimited and saves as zero. */
const UNLIMITED_SLIDER_POSITION = MAXIMUM_TIMES_IN_GAME + 1;

const sliderPositionFor = (storedTimesInGame: number): number =>
    storedTimesInGame === UNLIMITED_TIMES_IN_GAME ? UNLIMITED_SLIDER_POSITION : Math.min(storedTimesInGame, MAXIMUM_TIMES_IN_GAME);

export const WiredActionGiveScoreView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [operation, setOperation] = useState(0);
    const [timesInGame, setTimesInGame] = useState(UNLIMITED_SLIDER_POSITION);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return 0;
    });

    const save = () =>
        setIntParams([
            points,
            operation,
            userSource,
            timesInGame === UNLIMITED_SLIDER_POSITION ? UNLIMITED_TIMES_IN_GAME : timesInGame
        ]);

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setPoints(trigger.intData[0]);
            setOperation(trigger.intData[1]);
        } else {
            setPoints(1);
            setOperation(0);
        }

        setUserSource(trigger.intData.length > 2 ? trigger.intData[2] : 0);
        setTimesInGame(trigger.intData.length > 3 ? sliderPositionFor(trigger.intData[3]) : UNLIMITED_SLIDER_POSITION);
    }, [trigger]);

    const timesLabel = timesInGame === UNLIMITED_SLIDER_POSITION ? '∞' : timesInGame.toString();

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.setpoints2', LocalizeText('wiredfurni.params.setpoints', ['points'], [points.toString()]), ['points'], [points.toString()])}</Text>
                <Slider max={1000} min={1} value={points} onChange={(event) => setPoints(event)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.settimesingame', `Times per game: ${timesLabel}`, ['times'], [timesLabel])}</Text>
                <Slider max={UNLIMITED_SLIDER_POSITION} min={1} value={timesInGame} onChange={(event) => setTimesInGame(event)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.points_operation')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input
                            checked={operation === value}
                            className="form-check-input"
                            name="pointsOperation"
                            type="radio"
                            onChange={() => setOperation(value)}
                        />
                        <Text>{LocalizeText(`wiredfurni.params.points_operation.${value}`)}</Text>
                    </label>
                ))}
            </div>
        </WiredActionBaseView>
    );
};
