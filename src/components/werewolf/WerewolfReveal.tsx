import { AvatarAction } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { werewolfCampName, werewolfRoleCamp, werewolfRoleDescription, werewolfRoleName, wt } from '../../api';
import { Button } from '../../common';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import { WerewolfRoleCard } from './WerewolfRoleCard';

/** A card shown big over the clearing: the player's role at the start, a death for everybody, a change of camp. */
export interface IWerewolfReveal {
    key: string;
    kind: 'role' | 'death' | 'side';
    /** The role on the card; empty for a card left on its back (the role of the dead is hidden). */
    role: string;
    title: string;
    subtitle?: string;
    text?: string;
    /** The dead player's look, drawn next to the card. */
    figure?: string;
    gender?: string;
    camp?: string;
}

const SHOW_MS = { role: 15000, death: 8000, side: 10000 };

const Dead: FC<{ figure: string; gender: string }> = ({ figure, gender }) => {
    const picture = useUnoAvatar(figure, gender, 2, AvatarAction.POSTURE_STAND);

    return picture ? <img className="ww-reveal__avatar" src={picture} alt="" draggable={false} /> : null;
};

export const WerewolfReveal: FC<{ reveal: IWerewolfReveal; onClose: () => void }> = ({ reveal, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, SHOW_MS[reveal.kind]);

        return () => clearTimeout(timer);
    }, [reveal.key, reveal.kind, onClose]);

    const camp = reveal.camp ?? (reveal.role ? werewolfRoleCamp(reveal.role) : '');

    return (
        <div className={`ww-reveal is-${reveal.kind}`} onClick={onClose} role="presentation">
            <div className="ww-reveal__box" onClick={(event) => event.stopPropagation()} role="presentation">
                <div className="ww-reveal__title" data-browser-text>{reveal.title}</div>
                {reveal.subtitle && <div className="ww-reveal__subtitle" data-browser-text>{reveal.subtitle}</div>}
                <div className="ww-reveal__stage">
                    {reveal.kind === 'death' && reveal.figure && <Dead figure={reveal.figure} gender={reveal.gender ?? 'M'} />}
                    <WerewolfRoleCard key={reveal.key} role={reveal.role} camp={camp || undefined} zoom={4} flip={!!reveal.role} className="ww-reveal__card" />
                </div>
                {reveal.role && (
                    <div className="ww-reveal__role" data-browser-text>
                        <strong>{werewolfRoleName(reveal.role)}</strong>
                        {camp && <span className={`ww-camp is-${camp}`}>{werewolfCampName(camp)}</span>}
                    </div>
                )}
                {(reveal.text ?? (reveal.kind === 'role' && reveal.role ? werewolfRoleDescription(reveal.role) : '')) && (
                    <div className="ww-reveal__text" data-browser-text>{reveal.text ?? werewolfRoleDescription(reveal.role)}</div>
                )}
                <Button variant="success" onClick={onClose}>{reveal.kind === 'role' ? wt('reveal.ok', 'Got it!') : wt('reveal.next', 'OK')}</Button>
            </div>
        </div>
    );
};
