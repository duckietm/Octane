import { GetOptionalConfigurationValue } from '../octane';

/**
 * Whether the hotel offers the Builders Club (toolbar button, catalog, infostand, furni pick-up). `buildersclub.enabled`
 * decides; `toolbar.buildersclub.enabled` is its old name, still read for a hotel that only set that one.
 */
export const isBuildersClubEnabled = (): boolean =>
    GetOptionalConfigurationValue<boolean>('buildersclub.enabled', GetOptionalConfigurationValue<boolean>('toolbar.buildersclub.enabled', true)) !== false;
