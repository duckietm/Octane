import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue } from '../../api';
import { nextSafetyBookletPage, previousSafetyBookletPage, SAFETY_BOOKLET_START_PAGE } from './safetyBooklet';

/**
 * The official safety booklet window (SafetyBookletController): opened from
 * the help index "Safety Policy" link, read page by page, closed by the OK
 * button or handed over to the safety quiz.
 */
const useSafetyBookletState = () => {
    const [safetyBookletVisible, setSafetyBookletVisible] = useState(false);
    const [safetyBookletPage, setSafetyBookletPage] = useState(SAFETY_BOOKLET_START_PAGE);

    /** HabboHelp.safetyQuizDisabled: `safety_quiz.disabled` hides the quiz offer. */
    const safetyQuizDisabled = !!GetConfigurationValue<boolean>('safety_quiz.disabled', false);

    const showSafetyBooklet = useCallback(() => {
        setSafetyBookletPage(SAFETY_BOOKLET_START_PAGE);
        setSafetyBookletVisible(true);
    }, []);

    const closeSafetyBooklet = useCallback(() => setSafetyBookletVisible(false), []);

    const nextSafetyBooklet = useCallback(() => setSafetyBookletPage((page) => nextSafetyBookletPage(page)), []);

    const previousSafetyBooklet = useCallback(() => setSafetyBookletPage((page) => previousSafetyBookletPage(page)), []);

    return { safetyBookletVisible, safetyBookletPage, safetyQuizDisabled, showSafetyBooklet, closeSafetyBooklet, nextSafetyBooklet, previousSafetyBooklet };
};

export const useSafetyBooklet = () => useSharedHook(useSafetyBookletState);

registerSharedHook(useSafetyBookletState);
