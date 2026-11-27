import { GetAvatarRenderManager, GetSessionDataManager, HabboClubLevelEnum, RoomControllerLevel } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetClubMemberLevel, GetRoomSession, LocalizeText, MannequinUtilities } from '../../../../api';
import { Button, Column, LayoutAvatarImageView, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFurnitureMannequinWidget, useHasPermission } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BaseButton } from '../../../../common/BaseButton';
import '../../../../css/room/FurniWindowsAAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MODE_NONE: number = -1;
const MODE_CONTROLLER: number = 0;
const MODE_UPDATE: number = 1;
const MODE_PEER: number = 2;
const MODE_NO_CLUB: number = 3;
const MODE_WRONG_GENDER: number = 4;

export const FurnitureMannequinView: FC<{}> = (props) => {
    const [renderedFigure, setRenderedFigure] = useState<string>(null);
    const [mode, setMode] = useState(MODE_NONE);
    const {
        objectId = -1,
        figure = null,
        gender = null,
        clubLevel = HabboClubLevelEnum.NO_CLUB,
        name = null,
        setName = null,
        saveFigure = null,
        wearFigure = null,
        saveName = null,
        onClose = null
    } = useFurnitureMannequinWidget();
    const canManageAnyRoom = useHasPermission('acc_anyroomowner');

    useEffect(() => {
        if (objectId === -1) return;

        const roomSession = GetRoomSession();

        if (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST || canManageAnyRoom) {
            setMode(MODE_CONTROLLER);

            return;
        }

        if (GetSessionDataManager().gender.toLowerCase() !== gender.toLowerCase()) {
            setMode(MODE_WRONG_GENDER);

            return;
        }

        if (GetClubMemberLevel() < clubLevel) {
            setMode(MODE_NO_CLUB);

            return;
        }

        setMode(MODE_PEER);
    }, [objectId, gender, clubLevel, canManageAnyRoom]);

    useEffect(() => {
        switch (mode) {
            case MODE_CONTROLLER:
            case MODE_WRONG_GENDER: {
                const figureContainer = GetAvatarRenderManager().createFigureContainer(figure);

                MannequinUtilities.transformAsMannequinFigure(figureContainer);

                setRenderedFigure(figureContainer.getFigureString());
                break;
            }
            case MODE_UPDATE: {
                const figureContainer = GetAvatarRenderManager().createFigureContainer(GetSessionDataManager().figure);

                MannequinUtilities.transformAsMannequinFigure(figureContainer);

                setRenderedFigure(figureContainer.getFigureString());
                break;
            }
            case MODE_PEER:
            case MODE_NO_CLUB: {
                const figureContainer = MannequinUtilities.getMergedMannequinFigureContainer(GetSessionDataManager().figure, figure);

                setRenderedFigure(figureContainer.getFigureString());
                break;
            }
        }
    }, [mode, figure, clubLevel]);

    if (objectId === -1) return null;

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-mannequin no-resize" theme="primary-slim">
                <OctaneCardHeaderView headerText={LocalizeText('mannequin.widget.title')} onCloseClick={onClose} />
                <OctaneCardContentView center>
                    <div className="flex w-full gap-2 overflow-hidden">
                        <div className="flex flex-col">
                            <div className="relative mannequin-preview">
                                <LayoutAvatarImageView direction={2} figure={renderedFigure} position="absolute" />
                                {clubLevel > 0 && <LayoutCurrencyIcon className="absolute inset-e-2 bottom-2" type="hc" />}
                            </div>
                        </div>
                        <Column grow justifyContent="between" overflow="auto">
                            {mode === MODE_CONTROLLER && (
                                <>
                                    <OctaneInput className="octane-mannequin__name-input" type="text" value={name} onBlur={saveName} onChange={(event) => setName(event.target.value)} />
                                    <div className="flex flex-col gap-1">
                                        <Button variant="success" onClick={(event) => setMode(MODE_UPDATE)}>
                                            {LocalizeText('mannequin.widget.style')}
                                        </Button>
                                        <Button variant="success" onClick={wearFigure}>
                                            {LocalizeText('mannequin.widget.wear')}
                                        </Button>
                                    </div>
                                </>
                            )}
                            {mode === MODE_UPDATE && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <Text bold className="octane-mannequin__name">
                                            {name}
                                        </Text>
                                        <Text wrap className="octane-mannequin__text">
                                            {LocalizeText('mannequin.widget.savetext')}
                                        </Text>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Text component={BaseButton} type="button" pointer underline className="octane-mannequin__back" onClick={(event) => setMode(MODE_CONTROLLER)}>
                                            {LocalizeText('mannequin.widget.back')}
                                        </Text>
                                        <Button variant="success" onClick={saveFigure}>
                                            {LocalizeText('mannequin.widget.save')}
                                        </Button>
                                    </div>
                                </>
                            )}
                            {mode === MODE_PEER && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <Text italics className="octane-mannequin__name octane-mannequin__name--peer">
                                            {name}
                                        </Text>
                                        <Text className="octane-mannequin__text">{LocalizeText('mannequin.widget.weartext')}</Text>
                                    </div>
                                    <Button variant="success" onClick={wearFigure}>
                                        {LocalizeText('mannequin.widget.wear')}
                                    </Button>
                                </>
                            )}
                            {mode === MODE_NO_CLUB && (
                                <div className="flex justify-center items-center grow!">
                                    <Text className="octane-mannequin__notice">{LocalizeText('mannequin.widget.clubnotification')}</Text>
                                </div>
                            )}
                            {mode === MODE_WRONG_GENDER && <Text className="octane-mannequin__text">{LocalizeText('mannequin.widget.wronggender')}</Text>}
                        </Column>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
