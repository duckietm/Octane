import { PluginChannelMessageEvent } from '@octane/renderer';
import { FC, useCallback } from 'react';
import { publishPluginChannel } from '../../api';
import { useMessageEvent } from '../../hooks';

/**
 * The one listener for the generic plugin channel: every message a server plugin sends is handed, by channel, to the
 * panels and external plugin scripts listening on it. It draws nothing.
 */
export const PluginChannelListener: FC<{}> = () => {
    useMessageEvent<PluginChannelMessageEvent>(
        PluginChannelMessageEvent,
        useCallback((event: PluginChannelMessageEvent) => {
            const parser = event.getParser();

            if (!parser) return;

            publishPluginChannel(parser.channel, parser.getData(), parser.payload);
        }, [])
    );

    return null;
};
