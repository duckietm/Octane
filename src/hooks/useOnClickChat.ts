import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { HabboWebTools } from '@octane/renderer';
import { useEffect } from 'react';
import { isSafeExternalUrl, LocalizeText } from '../api';
import { useNotification } from './notification';

type ShowConfirm = ReturnType<typeof useNotification>['showConfirm'];

const confirmOpenUrl = (showConfirm: ShowConfirm, url: string, open: () => void) =>
    showConfirm(LocalizeText('chat.confirm.openurl', ['url'], [url]), open, null, null, null, LocalizeText('generic.alert.title'), null);

const useOnClickChatState = () => {
    const { showConfirm = null } = useNotification();

    // Links other users chose in the room (billboards) ask first, like chat links.
    useEffect(() => {
        if (!showConfirm) return;

        HabboWebTools.setExternalUrlConfirm((url, open) => confirmOpenUrl(showConfirm, url, open));

        return () => HabboWebTools.setExternalUrlConfirm(null);
    }, [showConfirm]);

    const onClickChat = (event: React.MouseEvent<HTMLElement>) => {
        if (!(event.target instanceof HTMLAnchorElement) || !event.target.href) return;

        event.stopPropagation();
        event.preventDefault();

        const url = event.target.href;

        // Never open a URL that came from chat unless it is a plain web link —
        // a javascript:/data: href would otherwise run in our origin.
        if (!isSafeExternalUrl(url)) return;

        confirmOpenUrl(showConfirm, url, () => window.open(url, '_blank', 'noopener,noreferrer'));
    };

    return { onClickChat };
};

export const useOnClickChat = () => useSharedHook(useOnClickChatState);

registerSharedHook(useOnClickChatState);
