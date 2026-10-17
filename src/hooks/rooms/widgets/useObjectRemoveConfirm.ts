import { FurniturePickupComposer, ObjectRemoveConfirmEvent } from '@octane/renderer';
import { LocalizeText, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../events';
import { useNotification } from '../../notification';

/**
 * Official ObjectRemoveConfirm: the server asks before a pick-up that deletes data (a permanent or shared variable).
 * On OK the pick-up is sent again with its confirmation.
 */
export const useObjectRemoveConfirm = () => {
    const { showConfirm = null } = useNotification();

    useMessageEvent<ObjectRemoveConfirmEvent>(ObjectRemoveConfirmEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !showConfirm) return;

        const { category, id } = parser;

        showConfirm(
            LocalizeText(parser.confirmBody),
            () => SendMessageComposer(new FurniturePickupComposer(category, id, true)),
            null,
            null,
            null,
            LocalizeText(parser.confirmTitle)
        );
    });
};
