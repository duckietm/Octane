import {
    AddLinkEventTracker,
    BreedPetsMessageComposer,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    IPetBreedingResultData,
    RemoveLinkEventTracker,
    RoomObjectCategory,
    RoomObjectType,
    RoomSessionPetBreedingEvent,
    RoomSessionPetBreedingResultEvent,
} from "@octane/renderer";
import { FC, useEffect, useState } from "react";
import {
    LocalizeText,
    localizeWithFallback,
    SendMessageComposer,
} from "../../../../api";
import {
    Button,
    LayoutFurniImageView,
    LayoutPetImageView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardView,
    Text,
} from "../../../../common";
import { useOctaneEvent, useRoom } from "../../../../hooks";
import { ContextMenuHeaderView } from "../context-menu/ContextMenuHeaderView";
import { ContextMenuListItemView } from "../context-menu/ContextMenuListItemView";
import { ContextMenuView } from "../context-menu/ContextMenuView";

// Official RoomWidgetPetBreedingEvent states.
const STATE_OPEN = 0;
const STATE_CANCEL = 1;
const STATE_ACCEPT = 2;
const STATE_REQUEST = 3;

interface BreedTarget {
    roomIndex: number;
    name: string;
}

interface BreedPair {
    requestIndex: number;
    targetIndex: number;
}

const figureTypeId = (figure: string) =>
    parseInt((figure ?? "").split(" ")[0] ?? "-1", 10);

/* Official monster plant breeding (BreedPetView, BreedMonsterPlantsConfirmationView,
   BreedPetsResultView): "breed" on a grown plant marks the plants it can breed with, the owner
   of the other plant is asked when it is not yours, and both owners see the two seeds. */
export const MonsterPlantBreedingView: FC = () => {
    const [bubbles, setBubbles] = useState<{
        requestIndex: number;
        targets: BreedTarget[];
    }>(null);
    const [confirm, setConfirm] = useState<BreedPair & { requested: boolean }>(
        null,
    );
    const [waiting, setWaiting] = useState<BreedPair>(null);
    const [cancelled, setCancelled] = useState(false);
    const [result, setResult] = useState<{
        first: IPetBreedingResultData;
        second: IPetBreedingResultData;
    }>(null);
    const { roomSession = null } = useRoom();

    const userData = (roomIndex: number) =>
        roomSession?.userDataManager?.getUserDataByIndex(roomIndex) ?? null;
    const roomIndexOfPet = (webId: number) =>
        roomSession?.userDataManager?.getPetData(webId)?.roomIndex ?? -1;

    const send = (state: number, pair: BreedPair) => {
        const first = userData(pair.requestIndex);
        const second = userData(pair.targetIndex);

        if (!first || !second) return;

        SendMessageComposer(
            new BreedPetsMessageComposer(state, first.webID, second.webID),
        );
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split("/");

                if (parts[1] !== "request" || !roomSession) return;

                const requestIndex = parseInt(parts[2] ?? "", 10);
                const plant =
                    roomSession.userDataManager?.getUserDataByIndex(
                        requestIndex,
                    );

                if (!plant) return;

                const ownUserId = GetSessionDataManager().userId;
                const typeId = figureTypeId(plant.figure);
                const targets: BreedTarget[] = [];

                for (const roomObject of GetRoomEngine().getRoomObjects(
                    roomSession.roomId,
                    RoomObjectCategory.UNIT,
                )) {
                    const pet = roomSession.userDataManager.getUserDataByIndex(
                        roomObject.id,
                    );

                    if (
                        !pet ||
                        pet.type !== RoomObjectType.PET ||
                        !pet.canBreed
                    )
                        continue;
                    if (!pet.hasBreedingPermission && pet.ownerId !== ownUserId)
                        continue;
                    if (!roomSession.userDataManager.getUserData(pet.ownerId))
                        continue;
                    if (
                        figureTypeId(pet.figure) !== typeId ||
                        pet.roomIndex === requestIndex
                    )
                        continue;

                    targets.push({ roomIndex: pet.roomIndex, name: pet.name });
                }

                setConfirm(null);
                setBubbles(targets.length ? { requestIndex, targets } : null);
            },
            eventUrlPrefix: "monsterplant-breeding/",
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [roomSession]);

    useOctaneEvent<RoomSessionPetBreedingEvent>(
        RoomSessionPetBreedingEvent.PET_BREEDING,
        (event) => {
            const pair = {
                requestIndex: roomIndexOfPet(event.ownPetId),
                targetIndex: roomIndexOfPet(event.otherPetId),
            };

            switch (event.state) {
                case STATE_OPEN:
                case STATE_REQUEST:
                    if (pair.requestIndex < 0 || pair.targetIndex < 0) return;

                    setConfirm({
                        ...pair,
                        requested: event.state === STATE_REQUEST,
                    });
                    return;
                case STATE_CANCEL:
                    setConfirm(null);
                    setWaiting(null);
                    setCancelled(true);
                    return;
                case STATE_ACCEPT:
                    setConfirm(null);
                    setWaiting(null);
                    return;
            }
        },
    );

    useOctaneEvent<RoomSessionPetBreedingResultEvent>(
        RoomSessionPetBreedingResultEvent.PET_BREEDING_RESULT,
        (event) => {
            setWaiting(null);
            setResult({
                first: event.resultData,
                second: event.otherResultData,
            });
        },
    );

    const confirmFirst = confirm ? userData(confirm.requestIndex) : null;
    const confirmSecond = confirm ? userData(confirm.targetIndex) : null;

    const cancelConfirm = () => {
        if (confirm) send(BreedPetsMessageComposer.STATE_CANCEL, confirm);
        setConfirm(null);
    };

    const useConfirm = () => {
        if (!confirm || !confirmFirst || !confirmSecond) return;

        send(BreedPetsMessageComposer.STATE_START, confirm);

        // A plant of somebody else: wait for them to answer.
        if (confirmFirst.ownerId !== confirmSecond.ownerId)
            setWaiting({
                requestIndex: confirm.requestIndex,
                targetIndex: confirm.targetIndex,
            });

        setConfirm(null);
    };

    const acceptConfirm = () => {
        if (confirm) send(BreedPetsMessageComposer.STATE_ACCEPT, confirm);
        setConfirm(null);
    };

    const ownUserId = GetSessionDataManager().userId;

    return (
        <>
            {bubbles &&
                bubbles.targets.map((target) => (
                    <ContextMenuView
                        key={target.roomIndex}
                        category={RoomObjectCategory.UNIT}
                        collapsable={true}
                        objectId={target.roomIndex}
                        userType={RoomObjectType.PET}
                        onClose={() => setBubbles(null)}
                    >
                        <ContextMenuHeaderView>
                            {target.name}
                        </ContextMenuHeaderView>
                        <ContextMenuListItemView
                            onClick={() => {
                                setConfirm({
                                    requestIndex: bubbles.requestIndex,
                                    targetIndex: target.roomIndex,
                                    requested: false,
                                });
                                setBubbles(null);
                            }}
                        >
                            {LocalizeText("infostand.button.breed")}
                        </ContextMenuListItemView>
                    </ContextMenuView>
                ))}

            {confirm && confirmFirst && confirmSecond && (
                <OctaneCardView
                    className="octane-monsterplant-breeding"
                    theme="primary-slim"
                >
                    <OctaneCardHeaderView
                        headerText={LocalizeText(
                            "breedpets.widget.title",
                            ["name"],
                            [confirmFirst.name],
                        )}
                        onCloseClick={cancelConfirm}
                    />
                    <OctaneCardContentView gap={2}>
                        <Text small>
                            {confirm.requested
                                ? LocalizeText(
                                      "breedpets.widget.request",
                                      ["name"],
                                      [confirmSecond.ownerName],
                                  )
                                : LocalizeText("breedpets.widget.text")}
                        </Text>
                        <div className="flex gap-2">
                            {[confirmFirst, confirmSecond].map(
                                (plant, index) => (
                                    <div
                                        key={plant.roomIndex}
                                        className="octane-monsterplant-breeding__plant"
                                    >
                                        <div className="octane-monsterplant-breeding__preview">
                                            <LayoutPetImageView
                                                direction={2}
                                                figure={plant.figure}
                                            />
                                        </div>
                                        <Text bold truncate>
                                            {LocalizeText(
                                                `breedpets.widget.plant${index + 1}.name`,
                                                ["name"],
                                                [plant.name],
                                            )}
                                        </Text>
                                        <Text small>
                                            {LocalizeText(
                                                `breedpets.widget.plant${index + 1}.raritylevel`,
                                                ["level"],
                                                [String(plant.rarityLevel)],
                                            )}
                                        </Text>
                                        <Text small truncate variant="muted">
                                            {LocalizeText(
                                                `breedpets.widget.plant${index + 1}.description`,
                                                ["name"],
                                                [plant.ownerName],
                                            )}
                                        </Text>
                                    </div>
                                ),
                            )}
                        </div>
                        <Text small variant="muted">
                            {LocalizeText("breedpets.widget.info")}
                        </Text>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={cancelConfirm}>
                                {LocalizeText("breedpets.widget.cancel")}
                            </Button>
                            {confirm.requested ? (
                                <Button
                                    variant="success"
                                    onClick={acceptConfirm}
                                >
                                    {LocalizeText("breedpets.widget.accept")}
                                </Button>
                            ) : (
                                <Button variant="success" onClick={useConfirm}>
                                    {LocalizeText("breedpets.widget.use")}
                                </Button>
                            )}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {waiting && (
                <OctaneCardView
                    className="octane-monsterplant-breeding"
                    theme="primary-slim"
                >
                    <OctaneCardHeaderView
                        headerText={LocalizeText(
                            "breedpets.confirmation.notification.title",
                        )}
                        onCloseClick={() => setWaiting(null)}
                    />
                    <OctaneCardContentView center gap={2}>
                        <Text center>
                            {LocalizeText(
                                "breedpets.confirmation.notification.text",
                            )}
                        </Text>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                send(
                                    BreedPetsMessageComposer.STATE_CANCEL,
                                    waiting,
                                );
                                setWaiting(null);
                            }}
                        >
                            {LocalizeText("breedpets.widget.cancel")}
                        </Button>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {cancelled && (
                <OctaneCardView
                    className="octane-monsterplant-breeding"
                    theme="primary-slim"
                >
                    <OctaneCardHeaderView
                        headerText={LocalizeText(
                            "breedpets.cancel.notification.title",
                        )}
                        onCloseClick={() => setCancelled(false)}
                    />
                    <OctaneCardContentView center gap={2}>
                        <Text center>
                            {LocalizeText("breedpets.cancel.notification.text")}
                        </Text>
                        <Button onClick={() => setCancelled(false)}>
                            {localizeWithFallback("generic.ok", "OK")}
                        </Button>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {result && (
                <OctaneCardView
                    className="octane-monsterplant-breeding"
                    theme="primary-slim"
                >
                    <OctaneCardHeaderView
                        headerText={LocalizeText(
                            "breedpetsresult.widget.title",
                        )}
                        onCloseClick={() => setResult(null)}
                    />
                    <OctaneCardContentView gap={2}>
                        {result.first.userId === ownUserId ||
                        result.second.userId === ownUserId ? (
                            <Text small>
                                {LocalizeText("breedpetsresult.widget.text")}
                            </Text>
                        ) : (
                            <Text small>
                                {LocalizeText(
                                    "breedpetsresult.widget.text.sorry",
                                    ["name"],
                                    [
                                        result.first.userName ||
                                            result.second.userName ||
                                            "",
                                    ],
                                )}
                            </Text>
                        )}
                        <div className="flex gap-2">
                            {[result.first, result.second].map(
                                (seed, index) => {
                                    // An empty slot: no seed for that side (-1 officially, 0 from the emulator).
                                    if (!seed || seed.stuffId <= 0) return null;

                                    const furni =
                                        GetSessionDataManager().getFloorItemData(
                                            seed.classId,
                                        );

                                    return (
                                        <div
                                            key={index}
                                            className="octane-monsterplant-breeding__plant"
                                        >
                                            <div className="octane-monsterplant-breeding__preview">
                                                <LayoutFurniImageView
                                                    direction={2}
                                                    productClassId={
                                                        seed.classId
                                                    }
                                                    productType="s"
                                                />
                                            </div>
                                            <Text bold truncate>
                                                {LocalizeText(
                                                    `breedpetsresult.widget.seed${index + 1}.name`,
                                                    ["name"],
                                                    [furni?.name ?? ""],
                                                )}
                                            </Text>
                                            <Text small>
                                                {LocalizeText(
                                                    `breedpetsresult.widget.seed${index + 1}.raritylevel`,
                                                    ["level"],
                                                    [String(seed.rarityLevel)],
                                                )}
                                            </Text>
                                            <Text
                                                small
                                                truncate
                                                variant="muted"
                                            >
                                                {LocalizeText(
                                                    `breedpetsresult.widget.seed${index + 1}.description`,
                                                    ["name"],
                                                    [seed.userName],
                                                )}
                                            </Text>
                                            {seed.hasMutation && (
                                                <Text small>
                                                    {LocalizeText(
                                                        "breedpetsresult.widget.info.mutation",
                                                    )}
                                                </Text>
                                            )}
                                        </div>
                                    );
                                },
                            )}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setResult(null)}>
                                {LocalizeText("breedpetsresult.widget.close")}
                            </Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </>
    );
};
