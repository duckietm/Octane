import { GetRoomEngine, GetSessionDataManager, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { FC, KeyboardEvent, ReactNode, useMemo, useState } from 'react';
import { GetRoomSession, giveableVariables, isWallTargetKind, parseInt32, profileToEntries, VariablesWebApiClient, WebApiVariable } from '../../api';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import { Button, LayoutAvatarImageView, LayoutPetImageView, LayoutRoomObjectImageView } from '../../common';
import { useVariablesExplorerProfile } from '../../hooks/variables-explorer/useVariablesExplorerProfile';
import { WiredVariableHolderPanelView } from '../wired-tools/WiredVariableHolderPanelView';
import { EXPLORER_VARIABLE_ELEMENTS, ExplorerHolderTarget, holderInfoLines, holderPanelTitle, resolvedEntityId } from './VariablesExplorer.helpers';

export interface VariablesExplorerHolderViewProps {
    client: VariablesWebApiClient;
    roomId: number;
    target: ExplorerHolderTarget;
    variables: WebApiVariable[];
    onClose: () => void;
}

const WARNING_TEXT: Record<ExplorerHolderTarget['scope'], string> = {
    user: 'Changes go through the Variables Web API and fire the room wired like any other variable change.',
    furni: 'Only furni placed in this room can hold furni variables.',
    global: 'Global variables are room-scoped. Values can be changed, not removed.'
};

interface LocalHolder {
    name: string;
    owner?: string;
    preview: ReactNode;
}

/** What the room you stand in knows about the holder: its name and picture. Null outside that room. */
const describeLocalHolder = (target: ExplorerHolderTarget, entityId: number | null, roomId: number): LocalHolder | null => {
    const session = GetRoomSession();

    if (target.scope === 'global' || entityId === null || !session || session.roomId !== roomId) return null;

    if (target.scope === 'furni') {
        const wall = isWallTargetKind(target.kind);
        const category = wall ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;
        const roomObject = GetRoomEngine().getRoomObject(roomId, entityId, category);

        if (!roomObject) return null;

        const typeId = roomObject.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const data = wall ? GetSessionDataManager().getWallItemData(typeId) : GetSessionDataManager().getFloorItemData(typeId);

        return {
            name: data?.name || data?.className || '',
            owner: roomObject.model?.getValue<string>(RoomObjectVariable.FURNITURE_OWNER_NAME) || '',
            preview: <LayoutRoomObjectImageView category={category} objectId={entityId} roomId={roomId} />
        };
    }

    const users = session.userDataManager;
    const userData =
        target.kind === 'pets'
            ? users.getPetData(entityId)
            : target.kind === 'bots'
              ? (users.getBotData(-entityId) ?? users.getRentableBotData(-entityId) ?? users.getBotData(entityId))
              : users.getUserData(entityId);

    if (!userData) return null;

    return {
        name: userData.name ?? '',
        owner: target.kind === 'users' ? '' : (userData.ownerName ?? ''),
        preview:
            target.kind === 'pets' ? (
                <LayoutPetImageView direction={2} figure={userData.figure} />
            ) : (
                <LayoutAvatarImageView direction={2} figure={userData.figure} />
            )
    };
};

/** The creator tools' holder window, fed from a Variables Web API profile. */
export const VariablesExplorerHolderView: FC<VariablesExplorerHolderViewProps> = ({ client, roomId, target, variables, onClose }) => {
    const { profile, status, setStatus, busy, reload, write } = useVariablesExplorerProfile(client, target);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [isGiveOpen, setIsGiveOpen] = useState(false);
    const [giveName, setGiveName] = useState('');
    const [giveValue, setGiveValue] = useState('0');
    const [addValue, setAddValue] = useState('1');
    const canWrite = client.hasWriteAccess;
    const entityId = resolvedEntityId(target, profile);

    const entries = useMemo(() => profileToEntries(profile, variables), [profile, variables]);
    const giveOptions = useMemo(() => (target.scope === 'global' ? [] : giveableVariables(variables, target.scope, entries)), [target, variables, entries]);
    const selectedEntry = entries.find((entry) => entry.name === selectedName) ?? entries[0] ?? null;
    const selectedGive = giveOptions.find((option) => option.name === giveName) ?? giveOptions[0] ?? null;
    const holderReady = target.scope === 'global' || entityId !== null;

    const setValues = (values: Record<string, number | null | true>) => {
        if (target.scope === 'global') {
            const numbers = Object.fromEntries(Object.entries(values).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));

            return write(() => client.patchGlobalProfile(numbers));
        }

        if (entityId === null) return Promise.resolve(false);

        return write(() => client.patchProfile(target.scope, target.kind, entityId, values));
    };

    const commitEdit = () => {
        if (!editingName) return;

        const value = parseInt32(editingValue);

        setEditingName(null);

        if (value === null) {
            setStatus('Enter a whole number.');
            return;
        }

        void setValues({ [editingName]: value });
    };

    const onEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();

        if (event.key === 'Enter' || event.key === 'NumpadEnter') {
            event.preventDefault();
            commitEdit();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setEditingName(null);
        }
    };

    const give = () => {
        if (!selectedGive) return;

        const value = selectedGive.hasValue ? parseInt32(giveValue) : null;

        if (selectedGive.hasValue && value === null) {
            setStatus('Enter a whole number.');
            return;
        }

        void setValues({ [selectedGive.name]: selectedGive.hasValue ? value : true }).then((ok) => {
            if (ok) {
                setIsGiveOpen(false);
                setSelectedName(selectedGive.name);
            }
        });
    };

    const addToSelected = () => {
        if (!selectedEntry?.hasValue) return;

        const amount = parseInt32(addValue);

        if (amount === null) {
            setStatus('Enter a whole number.');
            return;
        }

        if (target.scope === 'global') {
            void write(() => client.patchGlobal(selectedEntry.name, { add: amount }));
        } else if (entityId !== null) {
            void write(() => client.patchEntry(target.scope, selectedEntry.name, target.kind, entityId, { add: amount }));
        }
    };

    const icon = EXPLORER_VARIABLE_ELEMENTS.find((element) => element.key === target.scope)?.icon;
    const local = describeLocalHolder(target, entityId, roomId);

    return (
        <WiredVariableHolderPanelView
            title={holderPanelTitle(target)}
            warningText={WARNING_TEXT[target.scope]}
            onRefresh={() => void reload()}
            onClose={onClose}
            preview={
                local?.preview ?? (
                    <img
                        alt=""
                        className={
                            target.scope === 'global' ? 'max-w-full max-h-full object-contain p-3' : 'w-auto h-auto max-w-[48px] max-h-[48px] object-contain'
                        }
                        src={target.scope === 'global' ? wiredGlobalPlaceholderImage : icon}
                    />
                )
            }
            infoLines={holderInfoLines(target, profile, roomId, local?.name, local?.owner)}
            variablesTitle={target.scope === 'global' ? 'Room variables:' : 'Assigned variables:'}
            entries={entries.map((entry) => ({
                id: entry.name,
                name: entry.name,
                availability: 'Permanent',
                hasValue: entry.hasValue,
                value: entry.value
            }))}
            selectedId={selectedEntry?.name ?? null}
            onSelect={setSelectedName}
            canEdit={canWrite && holderReady && !busy}
            editingId={editingName}
            editingValue={editingValue}
            onBeginEdit={(entry) => {
                setSelectedName(entry.id);
                setEditingName(entry.id);
                setEditingValue(String(entry.value ?? 0));
            }}
            onEditingValueChange={setEditingValue}
            onEditBlur={() => setEditingName(null)}
            onEditKeyDown={onEditKeyDown}
            isGiveOpen={isGiveOpen}
            onToggleGive={() => setIsGiveOpen((value) => !value)}
            giveOptions={giveOptions.map((option) => ({ id: option.name, name: option.name, hasValue: option.hasValue }))}
            giveSelectedId={selectedGive?.name ?? ''}
            onGiveSelect={setGiveName}
            giveValue={giveValue}
            onGiveValueChange={setGiveValue}
            canGive={canWrite && holderReady && !busy && target.scope !== 'global' && !!giveOptions.length}
            onGive={give}
            canRemove={canWrite && holderReady && !busy && target.scope !== 'global' && !!selectedEntry}
            onRemove={() => selectedEntry && void setValues({ [selectedEntry.name]: null })}
            status={
                status ? (
                    <div className="rounded border border-[#d9a3a3] bg-[#fbeaea] px-2 py-1 text-[12px] text-[#8c2424]" role="alert">
                        {status}
                    </div>
                ) : null
            }
            extraActions={
                canWrite && selectedEntry?.hasValue ? (
                    <div className="flex items-center justify-end gap-2 text-[12px]">
                        <span>Add to {selectedEntry.name}:</span>
                        <input
                            aria-label="Amount to add"
                            className="w-[80px] rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                            type="number"
                            value={addValue}
                            onChange={(event) => setAddValue(event.target.value)}
                        />
                        <Button disabled={busy || !holderReady} variant="secondary" onClick={addToSelected}>
                            Add
                        </Button>
                    </div>
                ) : null
            }
            uniqueKey="variables-explorer-holder"
            offsetLeft={760}
            offsetTop={120}
        />
    );
};
