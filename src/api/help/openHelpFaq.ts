import { CreateLinkEvent } from '../octane/CreateLinkEvent';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { isSafeExternalUrl } from '../utils/isSafeExternalUrl';

/** The internal page the FAQ link falls back to when the hotel configured no external one. */
export const FAQ_HABBOPAGE_LINK = 'habbopages/help';

/**
 * Where the "read the rules" link of the help window and of the sanction card goes. The official
 * client opens `cfh.faq.url` in the browser; a hotel that leaves it empty keeps the habbopage, which
 * is what this client has always done.
 */
export const openHelpFaq = (): void => {
    const url = GetConfigurationValue<string>('cfh.faq.url', '');

    if (isSafeExternalUrl(url)) {
        window.open(url.trim(), '_blank', 'noopener,noreferrer');
        return;
    }

    CreateLinkEvent(FAQ_HABBOPAGE_LINK);
};
