import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useRaidProtection } from '../../../../hooks';
import {
    IRaidProtectionEditable,
    RAID_ACTION_KICK,
    RAID_ACTION_TEMPORARY_BAN,
    RAID_BAN_DURATIONS,
    RAID_GUARD_DURATIONS,
    RAID_SENSITIVITY_HIGH,
    RAID_SENSITIVITY_LOW,
    RAID_SENSITIVITY_MEDIUM,
    raidProtectionHasEdits
} from '../../../../hooks/navigator/raidProtectionStore';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';

const SENSITIVITIES: { value: number; key: string }[] = [
    { value: RAID_SENSITIVITY_LOW, key: 'raid.protection.settings.sensitivity.low' },
    { value: RAID_SENSITIVITY_MEDIUM, key: 'raid.protection.settings.sensitivity.medium' },
    { value: RAID_SENSITIVITY_HIGH, key: 'raid.protection.settings.sensitivity.high' }
];

const ACTIONS: { value: number; key: string }[] = [
    { value: RAID_ACTION_KICK, key: 'raid.protection.settings.action.kick' },
    { value: RAID_ACTION_TEMPORARY_BAN, key: 'raid.protection.settings.action.temporary_ban' }
];

export const NavigatorRoomSettingsRaidProtectionTabView: FC<{}> = () => {
    const { settings, saving, pendingConfirmation, requestSettings, save, confirm, cancelConfirmation } =
        useRaidProtection();
    const [edited, setEdited] = useState<IRaidProtectionEditable>(null);

    useEffect(() => {
        requestSettings();
    }, [requestSettings]);

    // The panel follows the server: every stored update replaces what is on screen.
    useEffect(() => {
        if (!settings) return;

        setEdited({
            enabled: settings.enabled,
            detectionSensitivity: settings.detectionSensitivity,
            actionType: settings.actionType,
            banDurationSeconds: settings.banDurationSeconds,
            guardEnabled: settings.guardEnabled,
            guardDurationSeconds: settings.guardDurationSeconds,
            guardSensitivity: settings.guardSensitivity
        });
    }, [settings]);

    const dirty = useMemo(() => raidProtectionHasEdits(settings, edited), [settings, edited]);

    const update = (field: keyof IRaidProtectionEditable, value: boolean | number) =>
        setEdited((previous) => (previous ? { ...previous, [field]: value } : previous));

    if (!settings || !edited) return <Text>{LocalizeText('generic.loading')}</Text>;

    const lastRaid = settings.lastRaidAtEpochSeconds;

    return (
        <Column gap={2}>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.raidprotection')} gap={1}>
                <Flex alignItems="center" gap={1}>
                    <input
                        checked={edited.enabled}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => update('enabled', event.target.checked)}
                    />
                    <Text>{LocalizeText('navigator.roomsettings.raidprotection.enabled')}</Text>
                </Flex>
                <Text small variant="muted">
                    {settings.incidentActive
                        ? LocalizeText('raid.protection.settings.status.active')
                        : lastRaid > 0
                          ? LocalizeText(
                                'raid.protection.settings.status.inactive.last',
                                ['timestamp'],
                                [new Date(lastRaid * 1000).toLocaleString()]
                            )
                          : LocalizeText('raid.protection.settings.status.inactive')}
                </Text>
            </NavigatorRoomSettingsSectionView>

            <NavigatorRoomSettingsSectionView
                title={LocalizeText('navigator.roomsettings.raidprotection.detection')}
                gap={1}
            >
                <Text small>{LocalizeText('navigator.roomsettings.raidprotection.sensitivity')}</Text>
                <select
                    className="form-select form-select-sm"
                    disabled={!edited.enabled}
                    value={edited.detectionSensitivity}
                    onChange={(event) => update('detectionSensitivity', parseInt(event.target.value, 10))}
                >
                    {SENSITIVITIES.map((option) => (
                        <option key={option.value} value={option.value}>
                            {LocalizeText(option.key)}
                        </option>
                    ))}
                </select>

                <Text small>{LocalizeText('navigator.roomsettings.raidprotection.action')}</Text>
                <select
                    className="form-select form-select-sm"
                    disabled={!edited.enabled}
                    value={edited.actionType}
                    onChange={(event) => update('actionType', parseInt(event.target.value, 10))}
                >
                    {ACTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {LocalizeText(option.key)}
                        </option>
                    ))}
                </select>

                <Text small>{LocalizeText('navigator.roomsettings.raidprotection.banduration')}</Text>
                <select
                    className="form-select form-select-sm"
                    disabled={!edited.enabled || edited.actionType !== RAID_ACTION_TEMPORARY_BAN}
                    value={edited.banDurationSeconds}
                    onChange={(event) => update('banDurationSeconds', parseInt(event.target.value, 10))}
                >
                    {RAID_BAN_DURATIONS.map((seconds) => (
                        <option key={seconds} value={seconds}>
                            {LocalizeText(`raid.protection.settings.duration.${seconds}`)}
                        </option>
                    ))}
                </select>
            </NavigatorRoomSettingsSectionView>

            <NavigatorRoomSettingsSectionView
                title={LocalizeText('navigator.roomsettings.raidprotection.guard')}
                gap={1}
            >
                <Flex alignItems="center" gap={1}>
                    <input
                        checked={edited.guardEnabled}
                        className="form-check-input"
                        disabled={!edited.enabled}
                        type="checkbox"
                        onChange={(event) => update('guardEnabled', event.target.checked)}
                    />
                    <Text>{LocalizeText('navigator.roomsettings.raidprotection.guard.enabled')}</Text>
                </Flex>

                <select
                    className="form-select form-select-sm"
                    disabled={!edited.enabled || !edited.guardEnabled}
                    value={edited.guardDurationSeconds}
                    onChange={(event) => update('guardDurationSeconds', parseInt(event.target.value, 10))}
                >
                    {RAID_GUARD_DURATIONS.map((seconds) => (
                        <option key={seconds} value={seconds}>
                            {LocalizeText(`raid.protection.settings.duration.${seconds}`)}
                        </option>
                    ))}
                </select>

                <select
                    className="form-select form-select-sm"
                    disabled={!edited.enabled || !edited.guardEnabled}
                    value={edited.guardSensitivity}
                    onChange={(event) => update('guardSensitivity', parseInt(event.target.value, 10))}
                >
                    {SENSITIVITIES.map((option) => (
                        <option key={option.value} value={option.value}>
                            {LocalizeText(option.key)}
                        </option>
                    ))}
                </select>
            </NavigatorRoomSettingsSectionView>

            {pendingConfirmation && (
                <NavigatorRoomSettingsSectionView
                    title={LocalizeText('raid.protection.settings.confirm.title')}
                    gap={1}
                >
                    <Text small>
                        {LocalizeText(
                            settings.incidentActive
                                ? 'raid.protection.settings.confirm.active'
                                : 'raid.protection.settings.confirm.inactive'
                        )}
                    </Text>
                    <Flex gap={1}>
                        <Button variant="primary" onClick={confirm}>
                            {LocalizeText('generic.ok')}
                        </Button>
                        <Button variant="secondary" onClick={cancelConfirmation}>
                            {LocalizeText('generic.cancel')}
                        </Button>
                    </Flex>
                </NavigatorRoomSettingsSectionView>
            )}

            <Flex justifyContent="end">
                <Button disabled={!dirty || saving || !!pendingConfirmation} variant="primary" onClick={() => save(edited)}>
                    {LocalizeText('save')}
                </Button>
            </Flex>
        </Column>
    );
};
