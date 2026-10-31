import { FC, useMemo } from 'react';
import { buildTimezoneOptions, GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { Select } from '../../../../common/Select';
import { useRoom, useWiredTools } from '../../../../hooks';

/** The room's wired timezone (the settings tab), or the hotel's when the room has none. */
export const useWiredRoomTimezone = () => {
    const { roomSession = null } = useRoom();
    const { roomSettings = null } = useWiredTools();
    const hotelZone = roomSession?.hotelTimeZone || 'UTC';

    return { hotelZone, roomZone: roomSettings?.timezone || hotelZone };
};

interface WiredConditionTimezoneSectionProps {
    /** The box's zone; empty follows the room, as boxes saved before the dropdown do. */
    value: string;
    onChange: (zone: string) => void;
}

/** The zone the box is shown (and saved) with: its own, or the room's. */
export const resolveConditionTimezone = (value: string, roomZone: string) => (value || '').trim() || roomZone;

/**
 * AIR TimeMatches / DateMatches timezone section: a dropdown of the hotel's `wired.timezones` (the list the settings
 * tab offers), set to the room's zone for a box without one; hidden when there is one zone or fewer to pick.
 */
export const WiredConditionTimezoneSection: FC<WiredConditionTimezoneSectionProps> = ({ value, onChange }) => {
    const { hotelZone, roomZone } = useWiredRoomTimezone();
    const selected = resolveConditionTimezone(value, roomZone);
    const options = useMemo(() => buildTimezoneOptions(selected, hotelZone, GetConfigurationValue<string>('wired.timezones', '')), [hotelZone, selected]);

    if (options.length <= 1) return null;

    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.time.timezone_selection')}</Text>
                <Select
                    aria-label={localizeWithFallback('wiredfurni.tooltip.timezone', 'Timezone')}
                    className="form-select form-select-sm"
                    value={selected}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {options.map((zone) => (
                        <option key={zone} value={zone}>
                            {zone}
                        </option>
                    ))}
                </Select>
            </div>
        </NativeTextTree>
    );
};
