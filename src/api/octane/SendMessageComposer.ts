import { GetCommunication, IMessageComposer } from '@octane/renderer';

export const SendMessageComposer = (event: IMessageComposer<unknown[]>) => GetCommunication().connection.send(event);
