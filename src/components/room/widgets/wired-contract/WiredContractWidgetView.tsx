import { FC, useEffect } from 'react';
import { LocalizeText, NotificationAlertType } from '../../../../api';
import { useNotification } from '../../../../hooks';
import { saveWiredContract, useWiredContractEvents, useWiredContractStore } from '../../../../hooks/rooms/widgets/useWiredContractState';
import { useWiredToolsState } from '../../../../hooks/wired-tools';
import { WiredContractEditorView } from './WiredContractEditorView';
import { WiredContractElementEditorView } from './WiredContractElementEditorView';

/**
 * The official contract editor (AIR WiredContractController): the server opens it when a payment, trade or reward
 * contract is used; it fetches the contract, edits it in its own window and saves it with its own packet.
 */
export const WiredContractWidgetView: FC<{}> = () =>
{
    useWiredContractEvents();

    const contents = useWiredContractStore(state => state.contents);
    const generation = useWiredContractStore(state => state.generation);
    const saving = useWiredContractStore(state => state.saving);
    const errorKey = useWiredContractStore(state => state.errorKey);
    const close = useWiredContractStore(state => state.close);
    // AIR footerPreset.saveButtonDisabled = !wiredMenu.hasWritePermission.
    const { roomSettings } = useWiredToolsState();
    const canWrite = !!roomSettings?.canModify;
    const { simpleAlert } = useNotification();

    // AIR shows a refused save (and a refused element) as an alert titled ${wiredfurni.error.title}.
    useEffect(() =>
    {
        if(!errorKey) return;

        useWiredContractStore.getState().clearError();
        simpleAlert(LocalizeText(errorKey), NotificationAlertType.DEFAULT, null, null, LocalizeText('wiredfurni.error.title'));
    }, [ errorKey, simpleAlert ]);

    if(!contents) return null;

    return (
        <WiredContractEditorView
            key={ `${ contents.contractId }:${ generation }` }
            contents={ contents }
            canWrite={ canWrite }
            saving={ saving }
            onClose={ close }
            onSave={ draft => canWrite && saveWiredContract(draft) }
            renderElementEditor={ (target, initial, apply, closeElement) =>
                <WiredContractElementEditorView
                    key={ `${ target.side }:${ target.rule }:${ target.node }` }
                    initial={ initial }
                    canWrite={ canWrite && !saving }
                    onSave={ apply }
                    onClose={ closeElement }
                    onInvalid={ message => simpleAlert(message, NotificationAlertType.DEFAULT, null, null, LocalizeText('wiredfurni.error.title')) } /> } />
    );
};
