import { FC, useState } from 'react';
import { BATTLEBALL_POWERS, IBattleBallRules, battleBallArenaName, battleBallPowerName, battleBallPowerText, bbt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';
import buttonsImage from '../../assets/images/battleball/bb-buttons.png';
import thumbsImage from '../../assets/images/battleball/bb-thumbs.png';

const HOW: [string, string, string][] = [
    [ 'goal', 'The goal', 'Two to four teams bounce on their balls across the arena. Every tile you bounce on takes your team\'s colour. When the time is up, the team whose tiles are worth the most wins.' ],
    [ 'tiles', 'The tiles', 'A grey tile takes three bounces of your team to be locked (four in Barebones Classic): it gets brighter each time. A tile of another colour that is not locked yet can be stolen by bouncing on it. A locked tile is yours until the end (only a bomb or a vacuum cleaner can clear it).' ],
    [ 'fill', 'Closing areas', 'Lock a ring of tiles round an area, against the walls if you like: the whole area inside is locked for your team at once!' ],
    [ 'points', 'The points', 'Each step of a tile brings points: 2, then 6, then 10, then 14 once locked, and 2 more for a stolen tile. A stolen tile takes its points away from the team it belonged to.' ],
    [ 'moving', 'Bouncing', 'Click a tile: your ball bounces there, a tile at a time. You cannot bounce through the other players.' ],
    [ 'powers', 'The power-ups', 'Power-ups appear on the floor now and then: bounce on one to pick it up, then use it with the button of the bar at the bottom, or the space bar. You only hold one at a time, for 15 seconds.' ]
];

const ThumbButton: FC<{ arena: number; selected: boolean; disabled: boolean; onClick: () => void }> = ({ arena, selected, disabled, onClick }) => (
    <button type="button" className={`bb-arena-choice ${selected ? 'is-selected' : ''}`} disabled={disabled} onClick={onClick}>
        <span className="bb-arena-choice__thumb" style={{ backgroundImage: `url(${thumbsImage})`, backgroundPosition: `${-(arena - 1) * 95.5}px 0` }} />
        <span className="bb-arena-choice__name">{battleBallArenaName(arena)}</span>
    </button>
);

const PowerIcon: FC<{ power: number }> = ({ power }) => <span className="bb-power-icon" style={{ backgroundImage: `url(${buttonsImage})`, backgroundPosition: `${-power * 47}px 0` }} />;

/** The game's rules (chosen by the host, read by the others), how to play and the power-ups, in three tabs. */
export const BattleBallRulesView: FC<{
    rules: IBattleBallRules;
    editable: boolean;
    mode: 'create' | 'edit' | 'read' | 'help';
    busy: boolean;
    onSave: (rules: IBattleBallRules) => void;
    onClose: () => void;
}> = ({ rules: initial, editable, mode, busy, onSave, onClose }) => {
    const [rules, setRules] = useState<IBattleBallRules>(initial);
    const [tab, setTab] = useState<'game' | 'how' | 'powers'>(mode === 'help' ? 'how' : 'game');
    const set = <K extends keyof IBattleBallRules>(key: K, value: IBattleBallRules[K]) => setRules((current) => ({ ...current, [key]: value }));
    const classic = rules.arena === 5;
    const title = mode === 'create' ? bbt('rules.create_title', 'Create a game') : mode === 'help' ? bbt('rules.help_title', 'BattleBall: the rules') : bbt('rules.title', 'Game rules');

    return (
        <OctaneCardView className="bb-rules" theme="primary-slim" uniqueKey="battleball-rules">
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardTabsView>
                {mode !== 'help' && <OctaneCardTabsItemView isActive={tab === 'game'} onClick={() => setTab('game')}>{bbt('rules.tab.game', 'The game')}</OctaneCardTabsItemView>}
                <OctaneCardTabsItemView isActive={tab === 'how'} onClick={() => setTab('how')}>{bbt('rules.tab.how', 'How to play')}</OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={tab === 'powers'} onClick={() => setTab('powers')}>{bbt('rules.tab.powers', 'Power-ups')}</OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView className="text-black bb-rules__content" gap={2}>
                {tab === 'game' && (
                    <>
                        <span className="bb-rules__label">{bbt('rules.arena', 'Choose the arena:')}</span>
                        <div className="bb-rules__arenas">
                            {[ 1, 2, 3, 4, 5 ].map((arena) => <ThumbButton key={arena} arena={arena} selected={rules.arena === arena} disabled={!editable} onClick={() => set('arena', arena)} />)}
                        </div>
                        <div className="bb-rules__row">
                            <span className="bb-rules__label">{bbt('rules.teams', 'Teams')}</span>
                            <div className="bb-rules__choice">
                                {[ 2, 3, 4 ].map((count) => <Button key={count} variant={count === rules.teams ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('teams', count)}>{String(count)}</Button>)}
                            </div>
                        </div>
                        <div className="bb-rules__row">
                            <span className="bb-rules__label">{bbt('rules.per_team', 'Players a team')}</span>
                            <div className="bb-rules__choice">
                                {[ 1, 2, 3 ].map((count) => <Button key={count} variant={count === rules.perTeam ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('perTeam', count)}>{String(count)}</Button>)}
                            </div>
                        </div>
                        <div className="bb-rules__row">
                            <span className="bb-rules__label">{bbt('rules.minutes', 'Length')}</span>
                            <div className="bb-rules__choice">
                                {[ 2, 3, 4, 5 ].map((count) => <Button key={count} variant={count === rules.minutes ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('minutes', count)}>{bbt('rules.minutes_n', '%n% min', [ 'n' ], [ String(count) ])}</Button>)}
                            </div>
                        </div>
                        <span className="bb-rules__label">{classic ? bbt('rules.classic', 'No power-up in Barebones Classic: the tiles take four bounces.') : bbt('rules.powers', 'Power-ups in the game:')}</span>
                        {!classic && (
                            <div className="bb-rules__powers">
                                {BATTLEBALL_POWERS.map((power) => (
                                    <label key={power} className="bb-rules__power" title={battleBallPowerText(power)}>
                                        <Checkbox checked={rules.powers.includes(power)} disabled={!editable} onCheckedChange={(checked) => set('powers', checked ? [ ...rules.powers.filter((p) => p !== power), power ] : rules.powers.filter((p) => p !== power))} />
                                        <PowerIcon power={power} />
                                        <span>{battleBallPowerName(power)}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <label className="bb-rules__toggle">
                            <Checkbox checked={rules.bots} disabled={!editable} onCheckedChange={(checked) => set('bots', !!checked)} />
                            <span>
                                <span className="bb-rules__label">{bbt('rules.bots', 'Robots')}</span>
                                <span className="bb-rules__hint" data-browser-text>{bbt('rules.bots.hint', 'The host can fill the teams with robots.')}</span>
                            </span>
                        </label>
                    </>
                )}
                {tab === 'how' && (
                    <div className="bb-rules__how" data-browser-text>
                        {HOW.map(([ key, heading, text ]) => (
                            <div key={key} className="bb-rules__section">
                                <strong>{bbt(`how.${key}.title`, heading)}</strong>
                                <p>{bbt(`how.${key}.text`, text)}</p>
                            </div>
                        ))}
                    </div>
                )}
                {tab === 'powers' && (
                    <div className="bb-rules__powerlist">
                        {[ ...BATTLEBALL_POWERS, 9 ].map((power) => (
                            <div key={power} className="bb-rules__powerinfo">
                                {power <= 8 ? <PowerIcon power={power} /> : <span className="bb-power-icon is-question">?</span>}
                                <span>
                                    <strong>{battleBallPowerName(power)}</strong>
                                    <span data-browser-text>{battleBallPowerText(power)}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="bb-rules__actions">
                    <Button variant="secondary" onClick={onClose}>{editable ? bbt('cancel', 'Cancel') : bbt('close_window', 'Close')}</Button>
                    {editable && <Button variant="success" disabled={busy} onClick={() => onSave(rules)}>{mode === 'create' ? bbt('rules.open', 'Create the game') : bbt('rules.save', 'Save')}</Button>}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
