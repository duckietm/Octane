import { ChangeEmailComposer, ChangeEmailResultEvent, EmailStatusResultEvent, GetEmailStatusComposer } from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** `ChangeEmailResultParser.EMAIL_STATUS_OK`: every other code is an error with a text. */
export const EMAIL_RESULT_OK = 0;

export interface TalentEmailState {
    /** The account e-mail the server knows, shown in the field. */
    email: string;
    isVerified: boolean;
    /** Whether the server lets this account change its e-mail at all. */
    allowChange: boolean;
    /** The last `ChangeEmailResult` code, or null while no change has been answered. */
    result: number | null;
}

/**
 * The e-mail block of the talent-track task dialog
 * (`TalentTrackController.onEmailStatus` / `onChangeEmailResult`): the dialog asks for the
 * status when it opens on `ACH_EmailVerification1`, and the change button replaces the address.
 */
const useTalentEmailState = () => {
    const [state, setState] = useState<TalentEmailState>({ email: '', isVerified: false, allowChange: false, result: null });
    const pendingEmail = useRef<string>('');

    /** `_habboTalent.send(new GetEmailStatusMessageComposer())` when the dialog opens. */
    const requestEmailStatus = useCallback(() => {
        setState((prev) => ({ ...prev, result: null }));
        SendMessageComposer(new GetEmailStatusComposer());
    }, []);

    const changeEmail = useCallback((email: string) => {
        const value = (email ?? '').trim();

        if (!value) return;

        pendingEmail.current = value;
        SendMessageComposer(new ChangeEmailComposer(value));
    }, []);

    /** `onEmailTxt`: focusing the field clears the error again. */
    const clearEmailResult = useCallback(() => setState((prev) => (prev.result === null ? prev : { ...prev, result: null })), []);

    useMessageEvent<EmailStatusResultEvent>(EmailStatusResultEvent, (event) => {
        const parser = event.getParser();

        setState((prev) => ({ ...prev, email: parser.email ?? '', isVerified: !!parser.isVerified, allowChange: !!parser.allowChange }));
    });

    useMessageEvent<ChangeEmailResultEvent>(ChangeEmailResultEvent, (event) => {
        const result = event.getParser().result;

        setState((prev) => ({
            ...prev,
            result,
            email: result === EMAIL_RESULT_OK && pendingEmail.current ? pendingEmail.current : prev.email,
            isVerified: result === EMAIL_RESULT_OK ? false : prev.isVerified
        }));
    });

    return { ...state, requestEmailStatus, changeEmail, clearEmailResult };
};

export const useTalentEmail = () => useSharedHook(useTalentEmailState);

registerSharedHook(useTalentEmailState);
