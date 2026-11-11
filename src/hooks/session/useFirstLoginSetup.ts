import { FirstLoginSetupChooseComposer, FirstLoginSetupEvent } from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { FirstLoginSetupTemplate, firstLoginAnswer, usableFirstLoginTemplates } from '../../api/user/FirstLoginSetup';
import { useMessageEvent } from '../events';

/**
 * The first-login setup of an account that was not made on Octane's register screen (a CMS account): the server sends
 * the offer with its starter rooms at login, the window shows it, and one answer ends it. Shared and registered so
 * the listener exists before the login messages arrive.
 */
const useFirstLoginSetupState = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [templates, setTemplates] = useState<FirstLoginSetupTemplate[]>([]);
    const templatesRef = useRef<FirstLoginSetupTemplate[]>([]);
    // One answer per offer: the server takes the first only, and a second would be noise.
    const answeredRef = useRef(false);

    useMessageEvent<FirstLoginSetupEvent>(
        FirstLoginSetupEvent,
        useCallback((event) => {
            const usable = usableFirstLoginTemplates(event.getParser()?.templates);

            templatesRef.current = usable;
            answeredRef.current = false;
            setTemplates(usable);
            setIsVisible(true);
        }, [])
    );

    /** Closing without an answer: the offer comes back at the next login. */
    const dismiss = useCallback(() => setIsVisible(false), []);

    /** The answer: the chosen starter room, or null for none. */
    const finish = useCallback((selectedTemplateId: number | null) => {
        setIsVisible(false);

        if (answeredRef.current) return;

        answeredRef.current = true;
        SendMessageComposer(new FirstLoginSetupChooseComposer(firstLoginAnswer(selectedTemplateId, templatesRef.current)));
    }, []);

    return { isVisible, templates, dismiss, finish };
};

export const useFirstLoginSetup = () => useSharedHook(useFirstLoginSetupState);

registerSharedHook(useFirstLoginSetupState);
