import { GetTickerTime } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { CatalogType, FriendlyTime, GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../../../api';
import { useCatalogData, useCatalogUiState } from '../../../../hooks';

export const CatalogBuildersClubStatusView: FC = () => {
    const { furniCount = 0, furniLimit = 0, secondsLeft = 0, secondsLeftWithGrace = 0, updateTime = 0 } = useCatalogData();
    const { currentType = CatalogType.NORMAL } = useCatalogUiState();
    const [ticker, setTicker] = useState(() => GetTickerTime());
    const buildersClubEnabled = useMemo(
        () => GetConfigurationValue<boolean>('buildersclub.enabled', GetConfigurationValue<boolean>('toolbar.buildersclub.enabled', true)),
        []
    );

    useEffect(() => {
        if (currentType !== CatalogType.BUILDER) return;

        const interval = window.setInterval(() => setTicker(GetTickerTime()), 1000);

        return () => window.clearInterval(interval);
    }, [currentType]);

    const localizeOrDefault = (key: string, fallback: string, parameters: string[] = [], values: string[] = []) => {
        const localized = LocalizeText(key, parameters, values);

        return localized && localized !== key ? localized : fallback;
    };

    const remainingSeconds = useMemo(() => {
        const baseSeconds = secondsLeft > 0 ? secondsLeft : secondsLeftWithGrace;

        if (baseSeconds <= 0) return 0;

        const elapsed = updateTime > 0 ? Math.floor((ticker - updateTime) / 1000) : 0;

        return Math.max(0, baseSeconds - elapsed);
    }, [secondsLeft, secondsLeftWithGrace, ticker, updateTime]);

    const isFullMember = secondsLeft > 0;
    const membershipStatus = localizeOrDefault(
        isFullMember ? 'builder.header.status.member' : 'builder.header.status.trial',
        isFullMember ? localizeWithFallback('catalog.bc.member.full', 'Full Member') : localizeWithFallback('catalog.bc.member.trial', 'Free Trial')
    );

    const title = localizeOrDefault('builder.header.title', `Stato Builders' Club: ${membershipStatus}`, ['BCSTATUS'], [membershipStatus]);

    const durationText = localizeOrDefault(
        'builder.header.status.membership',
        `Tempo mancante: ${FriendlyTime.format(remainingSeconds)}`,
        ['DURATION'],
        [FriendlyTime.format(remainingSeconds)]
    );

    const limitText = localizeOrDefault(
        'builder.header.status.limit',
        `Furni usati: ${furniCount}/${furniLimit}`,
        ['COUNT', 'LIMIT'],
        [furniCount.toString(), furniLimit.toString()]
    );

    if (!buildersClubEnabled || currentType !== CatalogType.BUILDER) return null;

    return (
        <>
            <div className="octane-catalog-standard-header-title">{title}</div>
            <div className="octane-catalog-standard-header-description is-builder-membership">{durationText}</div>
            <div className="octane-catalog-standard-header-description is-builder-limit">{limitText}</div>
        </>
    );
};
