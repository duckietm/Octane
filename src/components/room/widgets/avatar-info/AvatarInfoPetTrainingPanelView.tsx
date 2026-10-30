import { IRoomUserData, PetTrainingMessageParser, PetTrainingPanelMessageEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { LayoutPetImageView } from '../../../../common';
import { DraggableWindow } from '../../../../common/draggable-window';
import { NativeText } from '../../../../common/native-text/NativeText';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useMessageEvent, useRoom, useSessionInfo } from '../../../../hooks';
import { Native3Button, Native3Frame } from '../../../mod-tools/native/NativeWindow3';

// The official pet_commands layout: a style-3 frame 195 wide coloured 0xff67a3bf, the pet in a 71x90 box at (5, 7) and its name at (76, 43) of the
// client area, and the commands from (6, 103) as 84x22 style-3 buttons, two a row (x 0 and 86, a row every 25px). PetCommandTool sizes the
// window to the commands plus 160px, and after a command it disables every button for 1100ms.
const FRAME_COLOR = 0x67a3bf;
const BODY_COLOR = 0xe9e9e1;
const WIDTH = 195;
const BUTTON_WIDTH = 84;
const BUTTON_HEIGHT = 22;
const COLUMN_X = 86;
const ROW_STEP = 25;
const COMMANDS_X = 6;
const COMMANDS_Y = 103;
const CHROME_HEIGHT = 160;
const DISABLED_MS = 1100;
const DEFAULT_LOCATION = { x: 100, y: 70 };

export const AvatarInfoPetTrainingPanelView: FC<{}> = (props) => {
    const [petData, setPetData] = useState<IRoomUserData>(null);
    const [petTrainInformation, setPetTrainInformation] = useState<PetTrainingMessageParser>(null);
    const [cooling, setCooling] = useState(false);
    const coolingTimer = useRef<number | null>(null);
    const { chatStyleId = 0 } = useSessionInfo();
    const { roomSession = null } = useRoom();

    useMessageEvent<PetTrainingPanelMessageEvent>(PetTrainingPanelMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const roomPetData = roomSession?.userDataManager?.getPetData(parser.petId);

        if (!roomPetData) return;

        setPetData(roomPetData);
        setPetTrainInformation(parser);
    });

    useEffect(() => () => {
        if (coolingTimer.current !== null) window.clearTimeout(coolingTimer.current);
    }, []);

    const processPetAction = (petName: string, commandName: string) => {
        if (!petName || !commandName) return;

        roomSession?.sendChatMessage(`${petName} ${commandName}`, chatStyleId);

        setCooling(true);

        if (coolingTimer.current !== null) window.clearTimeout(coolingTimer.current);

        coolingTimer.current = window.setTimeout(() => {
            coolingTimer.current = null;
            setCooling(false);
        }, DISABLED_MS);
    };

    if (!petData || !petTrainInformation) return null;

    const commands = petTrainInformation.commands ?? [];
    const rows = Math.ceil(commands.length / 2);
    const commandsHeight = rows > 0 ? (rows - 1) * ROW_STEP + BUTTON_HEIGHT : 0;
    const title = LocalizeText('widgets.pet.commands.title');

    return (
        <NativeTextTree>
            <DraggableWindow handleSelector=".native3-title" initialPosition={DEFAULT_LOCATION}>
                <Native3Frame color={FRAME_COLOR} height={commandsHeight + CHROME_HEIGHT} title={title} width={WIDTH} onClose={() => setPetTrainInformation(null)}>
                    <div style={{ position: 'absolute', left: 5, top: 7, width: 71, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <LayoutPetImageView direction={2} figure={petData.figure} posture="std" />
                    </div>
                    <div style={{ position: 'absolute', left: 76, top: 43 }}>
                        <NativeText background={BODY_COLOR} maxWidth={WIDTH - 12 - 76} text={petData.name} textStyle="u_regular" />
                    </div>
                    {commands.map((command, index) => {
                        const label = LocalizeText(`pet.command.${command}`);

                        return (
                            <Native3Button
                                key={command}
                                enabled={!cooling && petTrainInformation.enabledCommands.includes(command)}
                                label={label}
                                width={BUTTON_WIDTH}
                                x={COMMANDS_X + (index % 2 === 1 ? COLUMN_X : 0)}
                                y={COMMANDS_Y + Math.floor(index / 2) * ROW_STEP}
                                onClick={() => processPetAction(petData.name, label)}
                            />
                        );
                    })}
                </Native3Frame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
