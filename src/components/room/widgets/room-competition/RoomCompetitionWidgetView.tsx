import { FC } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { CreateLinkEvent, LocalizeText, localizeWithFallback } from '../../../../api';
import { Button, Flex, Text } from '../../../../common';
import { useRoomCompetition } from '../../../../hooks';
import { COMPETITION_RESULT_MISSING_FURNI, competitionAction, competitionName, competitionText, plainText } from './roomCompetition.helpers';

/**
 * The room competition banner, the strip the official client drops at the top of the room: an image,
 * the caption and its info line, and on the right one button with a line above it. It appears on room
 * entry, in submit shape for the owner of a room that could enter and in vote shape for a visitor of
 * a room taking part.
 */
export const RoomCompetitionWidgetView: FC<{}> = () => {
    const { competition, noOwnedRooms, dismissNoOwnedRooms, acceptRules, submitRoom, confirmSubmit, vote, findSubmittableRoom, hideForToday, close } =
        useRoomCompetition();

    if (noOwnedRooms) {
        return (
            <div className="octane-room-competition absolute top-2 left-1/2 -translate-x-1/2 pointer-events-auto rounded bg-[#1c1c20f2] px-4 py-3 [box-shadow:inset_0_5px_#22222799,inset_0_-4px_#12121599]">
                <Flex alignItems="center" gap={3}>
                    <Text variant="white">
                        {localizeWithFallback('roomcompetition.noroom.info', 'You need a room of your own before you can enter the competition.')}
                    </Text>
                    <Button variant="secondary" onClick={dismissNoOwnedRooms}>
                        {LocalizeText('generic.close')}
                    </Button>
                </Flex>
            </div>
        );
    }

    if (!competition) return null;

    const name = competitionName(competition);
    const caption = plainText(competitionText('roomcompetition.caption', competition, name));
    const info = plainText(competitionText('roomcompetition.info', competition, name));
    const buttonInfo = plainText(competitionText('roomcompetition.buttoninfo', competition, name));
    const buttonCaption = plainText(competitionText('roomcompetition.button', competition, name));
    const action = competitionAction(competition);

    const onAction = () => {
        switch (action) {
            case 'accept':
                return acceptRules();
            case 'submit':
                return submitRoom();
            case 'confirm':
                return confirmSubmit();
            case 'vote':
                return vote();
            case 'navigator':
                return findSubmittableRoom();
            default:
                return close();
        }
    };

    return (
        <div className="octane-room-competition absolute top-2 left-1/2 -translate-x-1/2 w-[448px] max-w-[calc(100%-16px)] pointer-events-auto rounded bg-[#1c1c20f2] [box-shadow:inset_0_5px_#22222799,inset_0_-4px_#12121599]">
            <Flex className="p-3" alignItems="start" gap={3}>
                <Flex column className="grow gap-1">
                    <Text bold variant="white">
                        {caption}
                    </Text>
                    {info.length > 0 && (
                        <Text
                            pointer={competition.result !== COMPETITION_RESULT_MISSING_FURNI}
                            variant="muted"
                            onClick={() =>
                                competition.result === COMPETITION_RESULT_MISSING_FURNI
                                    ? CreateLinkEvent('catalog/open')
                                    : CreateLinkEvent('navigator/goto/hotelview')
                            }
                        >
                            {info}
                        </Text>
                    )}
                    {competition.result === COMPETITION_RESULT_MISSING_FURNI && competition.requiredFurnis.length > 0 && (
                        <Flex className="octane-room-competition-furnis flex-wrap gap-2 pt-1">
                            {competition.requiredFurnis.map((furni) => (
                                <Flex key={furni} alignItems="center" gap={1}>
                                    {competition.missingFurnis.indexOf(furni) === -1 ? (
                                        <FaCheck className="fa-icon text-[#5dbe3f]" />
                                    ) : (
                                        <FaTimes className="fa-icon text-[#c44]" />
                                    )}
                                    <Text variant="white">{furni}</Text>
                                </Flex>
                            ))}
                        </Flex>
                    )}
                </Flex>
                <Flex column alignItems="center" className="shrink-0 gap-1 w-[150px]">
                    {buttonInfo.length > 0 && (
                        <Text center variant="muted">
                            {buttonInfo}
                        </Text>
                    )}
                    {action !== null && (
                        <Button className="w-full" variant="primary" onClick={onAction}>
                            {buttonCaption.length > 0 ? buttonCaption : LocalizeText('generic.close')}
                        </Button>
                    )}
                </Flex>
                <Text pointer variant="muted" onClick={close}>
                    <FaTimes className="fa-icon" />
                </Text>
            </Flex>
            <Flex alignItems="center" justifyContent="center" className="octane-room-competition-hide border-t border-[#ffffff1a] px-3 py-1">
                <Text pointer underline variant="muted" onClick={hideForToday}>
                    {LocalizeText('roomcompetition.dontshowagain.dontshow')}
                </Text>
            </Flex>
        </div>
    );
};
