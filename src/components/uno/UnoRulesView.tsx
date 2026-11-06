import { FC, useState } from 'react';
import { IUnoRules, ut } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';

const TOGGLES: { key: keyof IUnoRules; label: string; hint: string }[] = [
    { key: 'stackTwo', label: 'Stack the +2', hint: 'A +2 goes on a +2: the next player draws them all.' },
    { key: 'stackFour', label: '+4 on a +2', hint: 'A +4 goes on a +2 or a +4, and the cards add up.' },
    { key: 'jumpIn', label: 'Jump in', hint: 'The very same card as the pile can be played out of turn.' },
    { key: 'noSpecialFinish', label: 'No special last card', hint: 'You cannot win with a +2, +4, skip, reverse or wild.' },
    { key: 'drawUntilPlayable', label: 'Draw until it fits', hint: 'You draw until you get a card you can play.' },
    { key: 'unoPenalty', label: 'Counter-UNO', hint: 'Forgetting to say UNO costs 2 cards if someone catches you.' },
    { key: 'bots', label: 'Robots', hint: 'The host can fill the empty chairs with robots.' }
];

const Choice: FC<{ value: number; options: number[]; suffix?: string; disabled: boolean; onChange: (value: number) => void }> = ({ value, options, suffix = '', disabled, onChange }) => (
    <div className="uno-rules__choice">
        {options.map((option) => (
            <Button key={option} variant={option === value ? 'success' : 'secondary'} disabled={disabled} onClick={() => onChange(option)}>
                {`${option}${suffix}`}
            </Button>
        ))}
    </div>
);

/** The table's rules: chosen by the host (to open a table, or before the game), read by the other players. */
export const UnoRulesView: FC<{
    rules: IUnoRules;
    editable: boolean;
    seated?: number;
    mode: 'create' | 'edit' | 'read';
    busy: boolean;
    onSave: (rules: IUnoRules) => void;
    onClose: () => void;
}> = ({ rules: initial, editable, seated = 1, mode, busy, onSave, onClose }) => {
    const [rules, setRules] = useState<IUnoRules>(initial);
    const set = <K extends keyof IUnoRules>(key: K, value: IUnoRules[K]) => setRules((current) => ({ ...current, [key]: value }));

    return (
        <OctaneCardView className="uno-rules" theme="primary-slim" uniqueKey="uno-rules">
            <OctaneCardHeaderView headerText={mode === 'create' ? ut('rules.create_title', 'Open a table') : ut('rules.title', 'Table rules')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black" gap={2}>
                <div className="uno-rules__row">
                    <span className="uno-rules__label">{ut('players', 'Players')}</span>
                    <Choice value={rules.maxPlayers} options={[ 2, 3, 4, 5, 6 ]} disabled={!editable} onChange={(value) => set('maxPlayers', Math.max(value, mode === 'edit' ? 2 : value))} />
                </div>
                <div className="uno-rules__row">
                    <span className="uno-rules__label">{ut('rules.hand', 'Cards dealt')}</span>
                    <Choice value={rules.handSize} options={[ 5, 7, 10 ]} disabled={!editable} onChange={(value) => set('handSize', value)} />
                </div>
                <div className="uno-rules__row">
                    <span className="uno-rules__label">{ut('rules.turn', 'Time per turn')}</span>
                    <Choice value={rules.turnSeconds} options={[ 15, 25, 40 ]} suffix=" s" disabled={!editable} onChange={(value) => set('turnSeconds', value)} />
                </div>
                <div className="uno-rules__toggles">
                    {TOGGLES.map((toggle) => (
                        <label key={toggle.key} className="uno-rules__toggle">
                            <Checkbox checked={!!rules[toggle.key]} disabled={!editable} onCheckedChange={(checked) => set(toggle.key, !!checked as never)} />
                            <span>
                                <span className="uno-rules__toggle-label">{ut(`rules.${toggle.key}`, toggle.label)}</span>
                                <span className="uno-rules__hint" data-browser-text>{ut(`rules.${toggle.key}.hint`, toggle.hint)}</span>
                            </span>
                        </label>
                    ))}
                </div>
                {mode === 'edit' && rules.maxPlayers < seated && <div className="uno-rules__warning" data-browser-text>{ut('rules.too_many', 'Fewer chairs than players seated: robots and the last ones will be asked to leave.')}</div>}
                <div className="uno-rules__actions">
                    <Button variant="secondary" onClick={onClose}>{editable ? ut('cancel', 'Cancel') : ut('close', 'Close')}</Button>
                    {editable && (
                        <Button variant="success" disabled={busy} onClick={() => onSave(rules)}>
                            {mode === 'create' ? ut('rules.open', 'Open the table') : ut('rules.save', 'Save')}
                        </Button>
                    )}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
