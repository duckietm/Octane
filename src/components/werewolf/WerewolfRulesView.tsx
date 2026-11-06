import { FC, useState } from 'react';
import { IWerewolfRules, werewolfRoleName, wt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';
import { WerewolfRoleIcon } from './WerewolfRoleIcon';

const ROLES: (keyof IWerewolfRules & string)[] = [ 'seer', 'witch', 'hunter', 'cupid', 'guard' ];

/** The village's rules: chosen by the host (to create a village, or before the game), read by the others. */
export const WerewolfRulesView: FC<{
    rules: IWerewolfRules;
    editable: boolean;
    mode: 'create' | 'edit' | 'read';
    busy: boolean;
    onSave: (rules: IWerewolfRules) => void;
    onClose: () => void;
}> = ({ rules: initial, editable, mode, busy, onSave, onClose }) => {
    const [rules, setRules] = useState<IWerewolfRules>(initial);
    const set = <K extends keyof IWerewolfRules>(key: K, value: IWerewolfRules[K]) => setRules((current) => ({ ...current, [key]: value }));
    const wolves = rules.maxPlayers <= 5 ? 1 : rules.maxPlayers <= 8 ? 2 : 3;

    return (
        <OctaneCardView className="ww-rules" theme="primary-slim" uniqueKey="werewolf-rules">
            <OctaneCardHeaderView headerText={mode === 'create' ? wt('rules.create_title', 'Create a village') : wt('rules.title', 'Village rules')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black" gap={2}>
                <div className="ww-rules__row">
                    <span className="ww-rules__label">{wt('players', 'Players')}</span>
                    <div className="ww-rules__choice">
                        {[ 5, 6, 7, 8, 9, 10, 11, 12 ].map((count) => (
                            <Button key={count} variant={count === rules.maxPlayers ? 'success' : 'secondary'} disabled={!editable} onClick={() => set('maxPlayers', count)}>{String(count)}</Button>
                        ))}
                    </div>
                </div>
                <div className="ww-rules__wolves">
                    <WerewolfRoleIcon role="werewolf" zoom={2} />
                    <span>{wt('rules.wolves', '%count% werewolf(s) among the players', [ 'count' ], [ String(wolves) ])}</span>
                </div>
                <div className="ww-rules__roles">
                    {ROLES.map((role) => (
                        <label key={role} className="ww-rules__role">
                            <Checkbox checked={!!rules[role]} disabled={!editable} onCheckedChange={(checked) => set(role, !!checked as never)} />
                            <WerewolfRoleIcon role={role} zoom={2} />
                            <span>{werewolfRoleName(role)}</span>
                        </label>
                    ))}
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
                <div className="ww-rules__actions">
                    <Button variant="secondary" onClick={onClose}>{editable ? wt('cancel', 'Cancel') : wt('close_window', 'Close')}</Button>
                    {editable && <Button variant="success" disabled={busy} onClick={() => onSave(rules)}>{mode === 'create' ? wt('rules.open', 'Create the village') : wt('rules.save', 'Save')}</Button>}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
