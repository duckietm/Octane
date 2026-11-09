import { useEffect, useRef, useState } from 'react';
import { explorerErrorMessage, VariablesWebApiClient, WebApiProfile } from '../../api';
import type { ExplorerHolderTarget } from '../../components/variables-explorer/VariablesExplorer.helpers';

const fetchProfile = (client: VariablesWebApiClient, target: ExplorerHolderTarget): Promise<WebApiProfile> => {
    if (target.scope === 'global') return client.getGlobalProfile();
    if ('username' in target) return client.getUserProfileByName(target.username);

    return client.getProfile(target.scope, target.kind, target.entityId);
};

/** The variables of one holder (user, pet, bot, furni or the room) and a way to write them. */
export const useVariablesExplorerProfile = (client: VariablesWebApiClient, target: ExplorerHolderTarget) => {
    const [profile, setProfile] = useState<WebApiProfile | null>(null);
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const requestId = useRef(0);

    const reload = async () => {
        const id = ++requestId.current;

        try {
            const result = await fetchProfile(client, target);

            if (id !== requestId.current) return;

            setProfile(result ?? null);
            setStatus('');
        } catch (error) {
            if (id !== requestId.current) return;

            setStatus(explorerErrorMessage(error));
        }
    };

    useEffect(() => {
        setProfile(null);
        void reload();
    }, [client, target]);

    /** Runs a write; a returned profile replaces the shown one, otherwise the profile is read again. */
    const write = async (action: () => Promise<WebApiProfile | unknown>): Promise<boolean> => {
        if (busy) return false;

        setBusy(true);

        try {
            const result = await action();

            if (result && typeof result === 'object' && 'variables' in result) {
                requestId.current++;
                setProfile(result as WebApiProfile);
            } else {
                await reload();
            }

            setStatus('');

            return true;
        } catch (error) {
            setStatus(explorerErrorMessage(error));

            return false;
        } finally {
            setBusy(false);
        }
    };

    return { profile, status, setStatus, busy, reload, write };
};
