import { FC, useState } from 'react';
import { IFastFoodRules, fastFoodPowerName, fastFoodPowerText, fft } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';
import tutorial1 from '../../assets/images/fastfood/ff-tutorial-1.png';
import tutorial2 from '../../assets/images/fastfood/ff-tutorial-2.png';
import tutorial3 from '../../assets/images/fastfood/ff-tutorial-3.png';
import { FASTFOOD_POWER_BUTTONS, Sprite } from './FastFoodScene';

/** The original's three instruction pictures, with their texts. */
const HOW: [string, string, string, string][] = [
    [ tutorial1, 'drop', 'Drop the plate', 'When the plate is ready, press the space bar (or the big button): it drops. Before the start, it is a false start: the plate falls empty and you wait longer for the next one.' ],
    [ tutorial2, 'chute', 'Open the parachute', 'Press again to open the parachute. The later you open it, the faster your plate is served; too late, it hits the table too hard and the food is lost. The diners show you how close it is!' ],
    [ tutorial3, 'powers', 'The power-ups', 'A plate served may bring a power-up: press E (or the small button) to use it. A missile bursts the parachute of the player in the lead.' ]
];

/** The game's rules (chosen by the host, read by the others), how to play and the power-ups, in three tabs. */
export const FastFoodRulesView: FC<{
    rules: IFastFoodRules;
    editable: boolean;
    mode: 'create' | 'edit' | 'read' | 'help';
    busy: boolean;
    onSave: (rules: IFastFoodRules) => void;
    onClose: () => void;
}> = ({ rules: initial, editable, mode, busy, onSave, onClose }) => {
    const [rules, setRules] = useState<IFastFoodRules>(initial);
    const [tab, setTab] = useState<'game' | 'how' | 'powers'>(mode === 'help' ? 'how' : 'game');
    const set = <K extends keyof IFastFoodRules>(key: K, value: IFastFoodRules[K]) => setRules((current) => ({ ...current, [key]: value }));
    const title = mode === 'create' ? fft('rules.create_title', 'Create a game') : mode === 'help' ? fft('rules.help_title', 'Fast Food: how to play') : fft('rules.title', 'Game rules');

    return (
        <OctaneCardView className="ff-rules" theme="primary-slim" uniqueKey="fastfood-rules">
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardTabsView>
                {mode !== 'help' && <OctaneCardTabsItemView isActive={tab === 'game'} onClick={() => setTab('game')}>{fft('rules.tab.game', 'The game')}</OctaneCardTabsItemView>}
                <OctaneCardTabsItemView isActive={tab === 'how'} onClick={() => setTab('how')}>{fft('rules.tab.how', 'How to play')}</OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={tab === 'powers'} onClick={() => setTab('powers')}>{fft('rules.tab.powers', 'Power-ups')}</OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView className="text-black ff-rules__content" gap={2}>
                {tab === 'game' && (
                    <>
                        <div className="ff-rules__row">
                            <span className="ff-rules__label">{fft('rules.tables', 'Tables')}</span>
                            <div className="ff-rules__choice">
                                {[ 2, 3 ].map((count) => <Button key={count} variant={count === rules.tables ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('tables', count)}>{String(count)}</Button>)}
                            </div>
                        </div>
                        <div className="ff-rules__row">
                            <span className="ff-rules__label">{fft('rules.plates', 'Plates to serve to win')}</span>
                            <div className="ff-rules__choice">
                                {[ 3, 4, 5, 6 ].map((count) => <Button key={count} variant={count === rules.plates ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('plates', count)}>{String(count)}</Button>)}
                            </div>
                        </div>
                        <label className="ff-rules__toggle">
                            <Checkbox checked={rules.powers} disabled={!editable} onCheckedChange={(checked) => set('powers', checked)} />
                            <span>
                                <strong>{fft('rules.powers', 'Power-ups')}</strong>
                                <span className="ff-rules__hint">{fft('rules.powers_hint', 'Missiles, shields and big parachutes, won with the plates served.')}</span>
                            </span>
                        </label>
                        <label className="ff-rules__toggle">
                            <Checkbox checked={rules.bots} disabled={!editable} onCheckedChange={(checked) => set('bots', checked)} />
                            <span>
                                <strong>{fft('rules.bots', 'Robots')}</strong>
                                <span className="ff-rules__hint">{fft('rules.bots_hint', 'The host can fill the free tables with robots.')}</span>
                            </span>
                        </label>
                    </>
                )}
                {tab === 'how' && (
                    <div className="ff-rules__how">
                        {HOW.map(([ image, key, heading, text ]) => (
                            <div key={key} className="ff-rules__step">
                                <img src={image} alt="" draggable={false} />
                                <span>
                                    <strong>{fft(`rules.how.${key}.title`, heading)}</strong>
                                    <p>{fft(`rules.how.${key}`, text)}</p>
                                </span>
                            </div>
                        ))}
                        <p className="ff-rules__goal">{fft('rules.how.goal', 'Each plate served safely is a star. The first to fill their stars wins; after five minutes, whoever has the most.')}</p>
                    </div>
                )}
                {tab === 'powers' && (
                    <div className="ff-rules__powerlist">
                        {[ 1, 2, 3 ].map((power) => (
                            <div key={power} className="ff-rules__powerinfo">
                                <span className="ff-rules__powericon"><Sprite name={FASTFOOD_POWER_BUTTONS[power]} x={0} y={0} corner /></span>
                                <span>
                                    <strong>{fastFoodPowerName(power)}</strong>
                                    <p>{fastFoodPowerText(power)}</p>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="ff-rules__actions">
                    {editable
                        ? <Button variant="success" disabled={busy} onClick={() => onSave(rules)}>{mode === 'create' ? fft('rules.create', 'Create the game') : fft('rules.save', 'Save')}</Button>
                        : <Button variant="secondary" onClick={onClose}>{fft('rules.close', 'Close')}</Button>}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
