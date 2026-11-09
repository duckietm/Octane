import { GetRoomEngine, GoToBreedingNestFailureEvent, GoToBreedingNestFailureParser, PetLevelNotificationEvent, PetReceivedMessageEvent, Vector3d } from '@octane/renderer';
import { GetConfigurationValue, LocalizeText, NotificationAlertType, NotificationBubbleType } from '../../api';
import { useMessageEvent } from '../events';

type SimpleAlert = (message: string, type?: string, clickUrl?: string, clickUrlText?: string, title?: string) => void;
type ShowSingleBubble = (message: string, type: string, imageUrl?: string) => void;

/** The alerts and bubbles about breeding, a pet that was received and a pet that levelled up. */
export const usePetNotifications = (simpleAlert: SimpleAlert, showSingleBubble: ShowSingleBubble) => {
    useMessageEvent<GoToBreedingNestFailureEvent>(GoToBreedingNestFailureEvent, (event) => {
        const reason = event.getParser().reason;
        const needsFood = reason === GoToBreedingNestFailureParser.PET_TOO_TIRED_TO_BREED;
        const page = GetConfigurationValue<string>(`gotobreedingnestfailure.catalogpage.${needsFood ? 'food' : 'nests'}`, '');

        simpleAlert(
            LocalizeText(`gotobreedingnestfailure.message.${reason}`),
            NotificationAlertType.DEFAULT,
            page ? `catalog/open/${page}` : null,
            page ? LocalizeText(`gotobreedingnestfailure.${needsFood ? 'getfood' : 'getnest'}`) : null,
            LocalizeText('gotobreedingnestfailure.caption')
        );
    });

    useMessageEvent<PetReceivedMessageEvent>(PetReceivedMessageEvent, async (event) => {
        const parser = event.getParser();

        const text = LocalizeText('notifications.text.' + (parser.boughtAsGift ? 'petbought' : 'petreceived'));

        let imageUrl: string = null;

        const imageResult = GetRoomEngine().getRoomObjectPetImage(
            parser.pet.typeId,
            parser.pet.paletteId,
            parseInt(parser.pet.color, 16),
            new Vector3d(45 * 3),
            64,
            null,
            true
        );

        if (imageResult) imageUrl = (await imageResult.getImage())?.src;

        showSingleBubble(text, NotificationBubbleType.PETLEVEL, imageUrl);
    });

    useMessageEvent<PetLevelNotificationEvent>(PetLevelNotificationEvent, async (event) => {
        const parser = event.getParser();

        let imageUrl: string = null;

        const imageResult = GetRoomEngine().getRoomObjectPetImage(
            parser.figureData.typeId,
            parser.figureData.paletteId,
            parseInt(parser.figureData.color, 16),
            new Vector3d(45 * 3),
            64,
            null,
            true
        );

        if (imageResult) imageUrl = (await imageResult.getImage())?.src;

        showSingleBubble(
            LocalizeText('notifications.text.petlevel', ['pet_name', 'level'], [parser.petName, parser.level.toString()]),
            NotificationBubbleType.PETLEVEL,
            imageUrl
        );
    });
};
