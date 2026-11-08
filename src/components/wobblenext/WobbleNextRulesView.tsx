import { FC, useState } from 'react';
import { IWobbleRules, wbt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';

/** The controls, as the keys show them: key, what it does (`wobble.key.<id>`). */
export const WOBBLE_KEYS: [string, string, string][] = [
    [ 'Q', 'lean_left', 'Lean left (hold)' ],
    [ 'E', 'lean_right', 'Lean right (hold)' ],
    [ 'A', 'push_left', 'Push to the left' ],
    [ 'D', 'push_right', 'Push to the right' ],
    [ 'N', 'step_left', 'Step left' ],
    [ 'M', 'step_right', 'Step right' ],
    [ 'Espace', 'stabilise', 'Stabilise' ]
];

const HOW: [string, string, string][] = [
    [ 'goal', 'The goal', 'Two fighters face each other on a beam over the rooftop pool. Knock your opponent into the water while keeping your own balance! Each fall gives the round to the other.' ],
    [ 'balance', 'Your balance', 'The needle of your dial shows your balance. It moves by itself, more and more the further it leans: hold Q to lean left and E to lean right, against the tilt. If the needle reaches the red end, you fall!' ],
    [ 'push', 'Pushing', 'Next to your opponent, A pushes them to the left and D to the right. Push them the way they already lean: that is when it hurts. A push in the air makes you lunge, and wobble.' ],
    [ 'move', 'Moving', 'N and M take a step left or right along the beam. Each step wobbles a little. You cannot walk past your opponent.' ],
    [ 'stabilise', 'Stabilising', 'Space makes you crouch for a second: your wobble calms down. But a push while you crouch hurts even more, and you must wait a few seconds before crouching again.' ],
    [ 'sudden', 'Sudden death', 'After 45 seconds, the beam wobbles much harder: someone will soon fall!' ]
];

/** The duel's rules (chosen by the host, read by the other) and how to play, in two tabs. */
export const WobbleNextRulesView: FC<{
    rules: IWobbleRules;
    editable: boolean;
    mode: 'create' | 'edit' | 'read' | 'help';
    busy: boolean;
    onSave: (rules: IWobbleRules) => void;
    onClose: () => void;
}> = ({ rules: initial, editable, mode, busy, onSave, onClose }) => {
    const [rules, setRules] = useState<IWobbleRules>(initial);
    const [tab, setTab] = useState<'duel' | 'how'>(mode === 'help' ? 'how' : 'duel');
    const set = <K extends keyof IWobbleRules>(key: K, value: IWobbleRules[K]) => setRules((current) => ({ ...current, [key]: value }));
    const title = mode === 'create' ? wbt('rules.create_title', 'New duel') : mode === 'help' ? wbt('rules.help_title', 'Wobble Squabble: the rules') : wbt('rules.title', 'Duel rules');

    return (
        <OctaneCardView className="wbn-rules" theme="primary-slim" uniqueKey="wobble-rules">
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardTabsView>
                {mode !== 'help' && <OctaneCardTabsItemView isActive={tab === 'duel'} onClick={() => setTab('duel')}>{wbt('rules.tab.duel', 'The duel')}</OctaneCardTabsItemView>}
                <OctaneCardTabsItemView isActive={tab === 'how'} onClick={() => setTab('how')}>{wbt('rules.tab.how', 'How to play')}</OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView className="text-black wbn-rules__content" gap={2}>
                {tab === 'duel' && (
                    <>
                        <div className="wbn-rules__row">
                            <span className="wbn-rules__label">{wbt('rules.rounds', 'Rounds to win')}</span>
                            <div className="wbn-rules__choice">
                                {[ 1, 2, 3 ].map((count) => (
                                    <Button key={count} variant={count === rules.roundsToWin ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('roundsToWin', count)}>{String(count)}</Button>
                                ))}
                            </div>
                        </div>
                        <label className="wbn-rules__toggle">
                            <Checkbox checked={rules.bots} disabled={!editable} onCheckedChange={(checked) => set('bots', !!checked)} />
                            <span>
                                <span className="wbn-rules__label">{wbt('rules.bots', 'Robots')}</span>
                                <span className="wbn-rules__hint" data-browser-text>{wbt('rules.bots.hint', 'Without an opponent, the host can call a robot onto the beam.')}</span>
                            </span>
                        </label>
                        <div className="wbn-rules__row">
                            <span className="wbn-rules__label">{wbt('rules.level', 'Robot')}</span>
                            <div className="wbn-rules__choice">
                                {[ 1, 2, 3 ].map((level) => (
                                    <Button key={level} variant={level === rules.botLevel ? 'success' : 'secondary'} disabled={!editable || !rules.bots} onClick={() => set('botLevel', level)}>
                                        {[ wbt('rules.easy', 'Easy'), wbt('rules.normal', 'Normal'), wbt('rules.hard', 'Hard') ][level - 1]}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                {tab === 'how' && (
                    <div className="wbn-rules__how" data-browser-text>
                        <div className="wbn-rules__keys">
                            {WOBBLE_KEYS.map(([ key, id, fallback ]) => (
                                <div key={id} className="wbn-rules__key">
                                    <span className={`wbn-key ${key.length > 1 ? 'is-wide' : ''}`}>{key}</span>
                                    <span>{wbt(`key.${id}`, fallback)}</span>
                                </div>
                            ))}
                        </div>
                        {HOW.map(([ key, heading, text ]) => (
                            <div key={key} className="wbn-rules__section">
                                <strong>{wbt(`how.${key}.title`, heading)}</strong>
                                <p>{wbt(`how.${key}.text`, text)}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="wbn-rules__actions">
                    <Button variant="secondary" onClick={onClose}>{editable ? wbt('cancel', 'Cancel') : wbt('close_window', 'Close')}</Button>
                    {editable && <Button variant="success" disabled={busy} onClick={() => onSave(rules)}>{mode === 'create' ? wbt('rules.open', 'Open the duel') : wbt('rules.save', 'Save')}</Button>}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
