import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { HandheldCenterCard } from '../../../common/handheld/HandheldCenterCard';

export type HandheldDoorMode = 'doorbell' | 'waiting' | 'no-answer' | 'password' | 'wrong-password';

interface HandheldDoorStateViewProps {
    mode: HandheldDoorMode;
    roomName: string;
    password: string;
    onPassword: (value: string) => void;
    onRing: () => void;
    onTry: () => void;
    onClose: () => void;
}

const INFO_KEYS: Record<HandheldDoorMode, string> = {
    doorbell: 'navigator.doorbell.info',
    waiting: 'navigator.doorbell.waiting',
    'no-answer': 'navigator.doorbell.no.answer',
    password: 'navigator.password.info',
    'wrong-password': 'navigator.password.retryinfo'
};

/**
 * The locked door of a room on a phone (doorbell or password): a centred card with the room's name, the desktop's text,
 * a 16 px password field and 44 px Cancel / Ring / Try buttons. NavigatorDoorStateView keeps the state and the packets.
 */
export const HandheldDoorStateView: FC<HandheldDoorStateViewProps> = (props) => {
    const { mode, roomName, password, onPassword, onRing, onTry, onClose } = props;
    const isDoorbell = mode === 'doorbell' || mode === 'waiting' || mode === 'no-answer';
    const cancel = (
        <BaseButton className="octane-handheld-rx__button" onClick={onClose}>
            {LocalizeText('generic.cancel')}
        </BaseButton>
    );

    return (
        <HandheldCenterCard
            actions={
                isDoorbell ? (
                    <>
                        {cancel}
                        {mode === 'doorbell' && (
                            <BaseButton className="octane-handheld-rx__button is-primary" onClick={onRing}>
                                {LocalizeText('navigator.doorbell.button.ring')}
                            </BaseButton>
                        )}
                    </>
                ) : (
                    <>
                        {cancel}
                        <BaseButton className="octane-handheld-rx__button is-primary" disabled={!password.length} onClick={onTry}>
                            {LocalizeText('navigator.password.button.try')}
                        </BaseButton>
                    </>
                )
            }
            className="octane-handheld-rx-door"
            icon={
                <span
                    aria-hidden="true"
                    className={`octane-handheld-rx-card__icon octane-icon ${isDoorbell ? 'icon-navigator-room-locked' : 'icon-navigator-room-password'}`}
                />
            }
            testId="handheld-door-state"
            title={LocalizeText(isDoorbell ? 'navigator.doorbell.title' : 'navigator.password.title')}
            onClose={onClose}
        >
            <div className="octane-handheld-rx-door__room">{roomName}</div>
            <p className={`octane-handheld-rx__text${mode === 'wrong-password' ? ' is-error' : ''}`}>{LocalizeText(INFO_KEYS[mode])}</p>
            {mode === 'waiting' && (
                <span aria-hidden="true" className="octane-handheld-rx-door__dots">
                    <i />
                    <i />
                    <i />
                </span>
            )}
            {!isDoorbell && (
                <label className="octane-handheld-rx__field">
                    <span className="octane-handheld-rx__field-label">{LocalizeText('navigator.password.enter')}</span>
                    <input
                        autoFocus
                        autoComplete="off"
                        className="octane-handheld-rx__input"
                        enterKeyHint="go"
                        type="password"
                        value={password}
                        onChange={(event) => onPassword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && password.length) onTry();
                        }}
                    />
                </label>
            )}
        </HandheldCenterCard>
    );
};
