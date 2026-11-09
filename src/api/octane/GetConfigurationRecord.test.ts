import { readFileSync } from 'node:fs';
import { GetConfiguration } from '@octane/renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetConfigurationRecord } from './GetConfigurationValue';

const config: Record<string, unknown> = {};

describe('GetConfigurationRecord', () => {
    beforeEach(() => {
        for (const key of Object.keys(config)) delete config[key];
        vi.mocked(GetConfiguration).mockReturnValue({
            getValue: (key: string, fallback: unknown) => (key in config ? config[key] : fallback)
        } as never);
    });

    it('reads a field of a settings object', () => {
        config['hc.center'] = { 'payday.info': true };

        expect(GetConfigurationRecord('hc.center')['payday.info']).toBe(true);
    });

    it('answers an empty object for a missing key, a null or something that is not an object', () => {
        config['catalog.links'] = null;
        config['respect.options'] = 'yes';
        config.hotelview = [1, 2];

        expect(GetConfigurationRecord('hc.center')['payday.info']).toBeUndefined();
        expect(GetConfigurationRecord('catalog.links')['pets.buy_food']).toBeUndefined();
        expect(GetConfigurationRecord('respect.options').enabled).toBeUndefined();
        expect(GetConfigurationRecord('hotelview')['room.pool']).toBeUndefined();
    });

    it('is what the views read settings objects through', () => {
        const files = [
            'src/components/hc-center/HcCenterView.tsx',
            'src/components/hotel-view/RoomWidgetView.tsx',
            'src/hooks/rooms/widgets/useChatWidget.ts',
            'src/components/room/widgets/avatar-info/infostand/InfoStandWidgetPetView.tsx',
            'src/components/room/widgets/avatar-info/menu/AvatarInfoWidgetOwnPetView.tsx'
        ];

        for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/GetConfigurationValue(<[^>]*>)?\('[^']+'\)\[/);
    });
});
