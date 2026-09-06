import { DesktopViewComposer } from '@octane/renderer';
import { SendMessageComposer } from '../SendMessageComposer';

export function GoToDesktop(): void {
    SendMessageComposer(new DesktopViewComposer());
}
