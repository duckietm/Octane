import { GetTickerTime } from '@octane/renderer';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { CatalogType, FriendlyTime, GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useCatalogData, useCatalogUiState } from '../../../../hooks';

/**
 * AIR registers the duration, count and limit parameters of the header lines as `<font color="#ff8d00"><b>…</b></font>`.
 * The line is localized with a marker per value and each marker becomes that orange bold value.
 */
export const highlightBuilderValues = (text: string, values: string[]): ReactNode[] =>
    text.split(/\u0001(\d+)\u0001/).map((part, index) =>
        index % 2 ? (
            <span key={index} className="octane-catalog-builder-header-value">
                {values[Number(part)]}
            </span>
        ) : (
            part
        )
    );

const marker = (index: number) => `\u0001${index}\u0001`;

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

    const duration = FriendlyTime.format(remainingSeconds);
    const durationText = highlightBuilderValues(localizeOrDefault('builder.header.status.membership', `Days left: ${marker(0)}`, ['DURATION'], [marker(0)]), [
        duration
    ]);

    const limitText = highlightBuilderValues(
        localizeOrDefault('builder.header.status.limit', `Borrowed items: ${marker(0)}/${marker(1)}`, ['COUNT', 'LIMIT'], [marker(0), marker(1)]),
        [furniCount.toString(), furniLimit.toString()]
    );

    if (!buildersClubEnabled || currentType !== CatalogType.BUILDER) return null;

    return (
        <NativeTextTree>
            <>
                <div className="octane-catalog-standard-header-title">{title}</div>
                <div className="octane-catalog-standard-header-description is-builder-membership">{durationText}</div>
                <div className="octane-catalog-standard-header-description is-builder-limit">{limitText}</div>
            </>
        </NativeTextTree>
    );
};
