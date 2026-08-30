import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const TEAM_OPTIONS = [1, 2, 3, 4];
const COMPARISON_OPTIONS = [0, 1, 2];
const MIN_SCORE = 0;
const MAX_SCORE = 999;
/** What the server's normalizeScore lets through. A credit threshold is useless capped at 999. */
const MAX_AMOUNT = 1_000_000;
const SCORE_PATTERN = /^\d*$/;

const clampScore = (value: number, max: number) => {
    if (isNaN(value)) return MIN_SCORE;

    return Math.max(MIN_SCORE, Math.min(max, Math.floor(value)));
};

interface WiredConditionTeamHasScoreViewProps {
    /**
     * The item-count and currency conditions share this dialog for its amount, user source and
     * quantifier, but their predicate is fixed in the server — no team, no comparison operator. They
     * pass false, and the two dead controls stay out of the window.
     */
    scoped?: boolean;
}

export const WiredConditionTeamHasScoreView: FC<WiredConditionTeamHasScoreViewProps> = ({ scoped = true }) => {
    const { trigger = null, setIntParams = null } = useWired();
    const ceiling = scoped ? MAX_SCORE : MAX_AMOUNT;
    const [team, setTeam] = useState(1);
    const [comparison, setComparison] = useState(1);
    const [score, setScore] = useState(0);
    const [scoreInput, setScoreInput] = useState('0');
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextTeam = trigger.intData.length > 0 ? trigger.intData[0] : 1;
        const nextComparison = trigger.intData.length > 1 ? trigger.intData[1] : 1;
        const nextScore = clampScore(trigger.intData.length > 2 ? trigger.intData[2] : 0, ceiling);
        const nextUserSource = trigger.intData.length > 3 ? trigger.intData[3] : 0;
        const nextQuantifier = trigger.intData.length > 4 ? trigger.intData[4] : 0;

        setTeam(TEAM_OPTIONS.includes(nextTeam) ? nextTeam : 1);
        setComparison(COMPARISON_OPTIONS.includes(nextComparison) ? nextComparison : 1);
        setScore(nextScore);
        setScoreInput(nextScore.toString());
        setUserSource(nextUserSource);
        setQuantifier(nextQuantifier === 1 ? 1 : 0);
        setShowAdvanced(nextUserSource !== 0 || nextQuantifier !== 0);
    }, [ceiling, trigger]);

    const updateScore = (value: number) => {
        const nextValue = clampScore(value, ceiling);

        setScore(nextValue);
        setScoreInput(nextValue.toString());
    };

    const updateScoreInput = (value: string) => {
        if (!SCORE_PATTERN.test(value)) return;

        setScoreInput(value);

        if (!value.length) {
            setScore(0);
            return;
        }

        updateScore(parseInt(value));
    };

    const save = () => {
        setIntParams([team, comparison, clampScore(score, ceiling), userSource, quantifier]);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <input
                                                checked={quantifier === value}
                                                className="form-check-input"
                                                id={`teamScoreQuantifier${value}`}
                                                name="teamScoreQuantifier"
                                                type="radio"
                                                onChange={() => setQuantifier(value)}
                                            />
                                            <Text>{LocalizeText(`wiredfurni.params.quantifier.users.${value}`)}</Text>
                                        </div>
                                    );
                                })}
                            </div>
                            <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                        </>
                    )}
                </div>
            }
        >
            {scoped && (
                <>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.team')}</Text>
                    {TEAM_OPTIONS.map((value) => {
                        return (
                            <div key={value} className="flex items-center gap-1">
                                <input
                                    checked={team === value}
                                    className="form-check-input"
                                    id={`teamHasScore${value}`}
                                    name="teamHasScore"
                                    type="radio"
                                    onChange={() => setTeam(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.team.${value}`)}</Text>
                            </div>
                        );
                    })}
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.comparison_selection')}</Text>
                    {COMPARISON_OPTIONS.map((value) => {
                        return (
                            <div key={value} className="flex items-center gap-1">
                                <input
                                    checked={comparison === value}
                                    className="form-check-input"
                                    id={`teamScoreComparison${value}`}
                                    name="teamScoreComparison"
                                    type="radio"
                                    onChange={() => setComparison(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.comparison.${value}`)}</Text>
                            </div>
                        );
                    })}
                </div>
                </>
            )}
            <div className="flex flex-col gap-1">
                <Text bold>
                    {scoped
                        ? LocalizeText('wiredfurni.params.setscore2')
                        : localizeWithFallback('wiredfurni.params.user_amount', 'Amount:')}
                </Text>
                <input
                    className="form-control form-control-sm"
                    inputMode="numeric"
                    type="text"
                    value={scoreInput}
                    onBlur={() => setScoreInput(clampScore(score, ceiling).toString())}
                    onChange={(event) => updateScoreInput(event.target.value)}
                />
            </div>
            {scoped && (
                <div className="flex flex-col gap-1">
                    <Slider max={MAX_SCORE} min={MIN_SCORE} step={1} value={score} onChange={(event) => updateScore(event as number)} />
                    <Text small>{score}</Text>
                </div>
            )}
        </WiredConditionBaseView>
    );
};
