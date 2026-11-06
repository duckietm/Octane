import { FC, useState } from 'react';
import { IWerewolfRules, WEREWOLF_SPECIALS, WerewolfCamp, WerewolfRoleCode, werewolfAutoWolves, werewolfCampName, werewolfRoleDescription, werewolfRoleName, werewolfRolePower, wt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';
import { WerewolfRoleCard } from './WerewolfRoleCard';
import { WerewolfRoleIcon } from './WerewolfRoleIcon';

export type WerewolfRulesTab = 'game' | 'how' | 'roles';

const CLASSIC: WerewolfRoleCode[] = [ 'seer', 'witch', 'hunter', 'cupid', 'little_girl' ];
const CAMPS: WerewolfCamp[] = [ 'village', 'wolves', 'alone' ];
const ALL_ROLES: WerewolfRoleCode[] = [ 'werewolf', 'villager', ...WEREWOLF_SPECIALS.village, ...WEREWOLF_SPECIALS.wolves, ...WEREWOLF_SPECIALS.alone ];

/** How to play, in sections: a title and its paragraphs (`werewolf.how.<key>.title` / `.text`). */
const HOW: [string, string, string][] = [
    [ 'goal', 'The goal', 'Werewolves hide among the villagers. The village must find them and eliminate them by vote; the werewolves must devour the village without being found. Some roles play alone and have their own way to win.' ],
    [ 'start', 'The start', 'When the game starts, everybody gets a role, in secret: your card shows it, with its power. Never show it: lie if you need to!' ],
    [ 'night', 'The night', 'At night the village sleeps and nobody can speak, but the werewolves whisper among themselves. The roles wake up one by one, in turn: Cupid and the first night\'s roles, the guard, the seer, the fox, the raven, then the werewolves choose a prey, then the witch, the piper... When it is your turn, your panel tells you what to do: click a player\'s name over their head to choose them.' ],
    [ 'day', 'The day', 'At dawn the narrator tells who died in the night, and their card is shown to everybody. Then the village debates in the chat: who is lying? Who was too quiet? When you are ready, click "Ready to vote".' ],
    [ 'vote', 'The vote', 'Each player votes against the one they suspect, by clicking their name. The player with the most votes is eliminated and their card is turned over. In a tie, nobody is eliminated (unless there is a scapegoat).' ],
    [ 'death', 'The dead', 'A dead player no longer speaks to the living: they watch the game and talk with the other dead. The hunter, when he dies, still fires one last shot.' ],
    [ 'win', 'Who wins?', 'The village wins when no werewolf is left. The werewolves win when only werewolves are left. Two lovers from different camps win if they are the last two. The white werewolf, the piper and the angel win alone, each in their own way.' ],
    [ 'tips', 'Tips', 'Speak up, but not too much. Watch the votes: the werewolves often vote together. A seer who reveals herself too early will not live long!' ]
];

const RoleRow: FC<{ role: WerewolfRoleCode; open: boolean; onToggle: () => void }> = ({ role, open, onToggle }) => (
    <div className={`ww-roleinfo ${open ? 'is-open' : ''}`}>
        <button type="button" className="ww-roleinfo__head" onClick={onToggle}>
            <WerewolfRoleIcon role={role} zoom={2} />
            <span className="ww-roleinfo__name">{werewolfRoleName(role)}</span>
            <span className="ww-roleinfo__power" data-browser-text>{werewolfRolePower(role)}</span>
        </button>
        {open && (
            <div className="ww-roleinfo__body">
                <WerewolfRoleCard role={role} zoom={2} />
                <div className="ww-roleinfo__text" data-browser-text>{werewolfRoleDescription(role)}</div>
            </div>
        )}
    </div>
);

/**
 * The village's rules, in three tabs: the game (chosen by the host to create a village or before the game, read by the
 * others), how to play, and every role with its full description.
 */
export const WerewolfRulesView: FC<{
    rules: IWerewolfRules;
    editable: boolean;
    mode: 'create' | 'edit' | 'read' | 'help';
    busy: boolean;
    tab?: WerewolfRulesTab;
    onSave: (rules: IWerewolfRules) => void;
    onClose: () => void;
}> = ({ rules: initial, editable, mode, busy, tab: firstTab, onSave, onClose }) => {
    const [rules, setRules] = useState<IWerewolfRules>(initial);
    const [tab, setTab] = useState<WerewolfRulesTab>(firstTab ?? (mode === 'help' ? 'how' : 'game'));
    const [openRole, setOpenRole] = useState<string>('');
    const set = <K extends keyof IWerewolfRules>(key: K, value: IWerewolfRules[K]) => setRules((current) => ({ ...current, [key]: value }));
    const toggle = (role: WerewolfRoleCode, on: boolean) => set('roles', on ? [ ...rules.roles.filter((code) => code !== role), role ] : rules.roles.filter((code) => code !== role));
    const auto = werewolfAutoWolves(rules.maxPlayers);
    const places = rules.maxPlayers - (rules.wolves || auto);
    const villageChosen = rules.roles.filter((role) => !WEREWOLF_SPECIALS.wolves.includes(role)).reduce((count, role) => count + (role === 'sister' ? 2 : 1), 0);
    const title = mode === 'create' ? wt('rules.create_title', 'Create a village') : mode === 'help' ? wt('rules.help_title', 'Werewolf: the rules') : wt('rules.title', 'Village rules');

    return (
        <OctaneCardView className="ww-rules" theme="primary-slim" uniqueKey="werewolf-rules">
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardTabsView>
                {mode !== 'help' && <OctaneCardTabsItemView isActive={tab === 'game'} onClick={() => setTab('game')}>{wt('rules.tab.game', 'The game')}</OctaneCardTabsItemView>}
                <OctaneCardTabsItemView isActive={tab === 'how'} onClick={() => setTab('how')}>{wt('rules.tab.how', 'How to play')}</OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={tab === 'roles'} onClick={() => setTab('roles')}>{wt('rules.tab.roles', 'The roles')}</OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView className="text-black ww-rules__content" gap={2}>
                {tab === 'game' && (
                    <>
                        <div className="ww-rules__row">
                            <span className="ww-rules__label">{wt('players', 'Players')}</span>
                            <div className="ww-rules__choice">
                                {[ 5, 6, 7, 8, 9, 10, 11, 12 ].map((count) => (
                                    <Button key={count} variant={count === rules.maxPlayers ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('maxPlayers', count)}>{String(count)}</Button>
                                ))}
                            </div>
                        </div>
                        <div className="ww-rules__row">
                            <span className="ww-rules__label ww-rules__label--icon"><WerewolfRoleIcon role="werewolf" zoom={1} />{wt('rules.wolves_count', 'Werewolves')}</span>
                            <div className="ww-rules__choice">
                                <Button variant={rules.wolves === 0 ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('wolves', 0)}>{wt('rules.auto', 'Auto (%n%)', [ 'n' ], [ String(auto) ])}</Button>
                                {[ 1, 2, 3, 4 ].map((count) => (
                                    <Button key={count} variant={count === rules.wolves ? 'success' : 'secondary'} disabled={!editable || count > Math.max(1, Math.floor((rules.maxPlayers - 1) / 2))} onClick={() => set('wolves', count)}>{String(count)}</Button>
                                ))}
                            </div>
                        </div>
                        <div className="ww-rules__roles-head">
                            <span className="ww-rules__label">{wt('rules.roles', 'Roles in the village')}</span>
                            {editable && (
                                <span className="ww-rules__choice">
                                    <Button variant="secondary" onClick={() => set('roles', CLASSIC)}>{wt('rules.classic', 'Classic')}</Button>
                                    <Button variant="secondary" onClick={() => set('roles', [ ...WEREWOLF_SPECIALS.village, ...WEREWOLF_SPECIALS.wolves, ...WEREWOLF_SPECIALS.alone ])}>{wt('rules.all', 'All')}</Button>
                                    <Button variant="secondary" onClick={() => set('roles', [])}>{wt('rules.none', 'None')}</Button>
                                </span>
                            )}
                        </div>
                        {CAMPS.map((camp) => (
                            <div key={camp} className="ww-rules__camp">
                                <span className={`ww-camp is-${camp}`}>{werewolfCampName(camp)}</span>
                                <div className="ww-rules__roles">
                                    {WEREWOLF_SPECIALS[camp].map((role) => (
                                        <label key={role} className="ww-rules__role" title={werewolfRolePower(role)}>
                                            <Checkbox checked={rules.roles.includes(role)} disabled={!editable} onCheckedChange={(checked) => toggle(role, !!checked)} />
                                            <WerewolfRoleIcon role={role} zoom={2} />
                                            <span>{werewolfRoleName(role)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="ww-rules__hint" data-browser-text>
                            {villageChosen > places
                                ? wt('rules.draw', '%n% places for %count% roles chosen: the roles of each game are drawn among them. The special werewolves take the place of werewolves.', [ 'n', 'count' ], [ String(places), String(villageChosen) ])
                                : wt('rules.fill', 'The places left are villagers. The special werewolves take the place of werewolves.')}
                        </div>
                        <div className="ww-rules__row">
                            <span className="ww-rules__label">{wt('rules.speed', 'Pace')}</span>
                            <div className="ww-rules__choice">
                                {[ 1, 2, 3 ].map((speed) => (
                                    <Button key={speed} variant={speed === rules.speed ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('speed', speed)}>
                                        {[ wt('rules.fast', 'Fast'), wt('rules.normal', 'Normal'), wt('rules.slow', 'Slow') ][speed - 1]}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <label className="ww-rules__toggle">
                            <Checkbox checked={rules.bots} disabled={!editable} onCheckedChange={(checked) => set('bots', !!checked)} />
                            <span>
                                <span className="ww-rules__toggle-label">{wt('rules.bots', 'Robots')}</span>
                                <span className="ww-rules__hint" data-browser-text>{wt('rules.bots.hint', 'The host can fill the empty stumps with robots.')}</span>
                            </span>
                        </label>
                        <label className="ww-rules__toggle">
                            <Checkbox checked={rules.revealRoles} disabled={!editable} onCheckedChange={(checked) => set('revealRoles', !!checked)} />
                            <span>
                                <span className="ww-rules__toggle-label">{wt('rules.reveal', 'Show the role of the dead')}</span>
                                <span className="ww-rules__hint" data-browser-text>{wt('rules.reveal.hint', 'When a player dies, everybody learns their role.')}</span>
                            </span>
                        </label>
                    </>
                )}
                {tab === 'how' && (
                    <div className="ww-rules__how" data-browser-text>
                        {HOW.map(([ key, heading, text ]) => (
                            <div key={key} className="ww-rules__section">
                                <strong>{wt(`how.${key}.title`, heading)}</strong>
                                <p>{wt(`how.${key}.text`, text)}</p>
                            </div>
                        ))}
                    </div>
                )}
                {tab === 'roles' && (
                    <div className="ww-rules__rolelist">
                        <div className="ww-rules__hint" data-browser-text>{wt('rules.roles_hint', 'Click a role to see its card and everything it can do.')}</div>
                        {ALL_ROLES.map((role) => <RoleRow key={role} role={role} open={openRole === role} onToggle={() => setOpenRole(openRole === role ? '' : role)} />)}
                    </div>
                )}
                <div className="ww-rules__actions">
                    <Button variant="secondary" onClick={onClose}>{editable ? wt('cancel', 'Cancel') : wt('close_window', 'Close')}</Button>
                    {editable && <Button variant="success" disabled={busy} onClick={() => onSave(rules)}>{mode === 'create' ? wt('rules.open', 'Create the village') : wt('rules.save', 'Save')}</Button>}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
