import { ComponentType, FC, lazy, Suspense } from 'react';
import { loadEmojiMartData } from '../api/utils/emojiData';

type EmojiPickerProps = Record<string, unknown>;

/**
 * The emoji data is large (see `api/utils/emojiData`) and was pulled into the
 * initial app bundle by three always-mounted views that import it statically.
 * The picker itself opens rarely, so we load both the data and the `<Picker>`
 * component on demand via a dynamic import — deferring that payload out of
 * first paint. Drop-in for `<Picker data={data} … />` (the `data` prop is
 * injected here; forward every other prop unchanged).
 */
const PickerWithData = lazy(async () => {
    const [data, pickerModule] = await Promise.all([loadEmojiMartData(), import('@emoji-mart/react')]);

    const Picker = (pickerModule as { default: ComponentType<EmojiPickerProps> }).default;

    const Wrapped: ComponentType<EmojiPickerProps> = (props) => <Picker data={data} {...props} />;

    return { default: Wrapped };
});

export const LazyEmojiPicker: FC<EmojiPickerProps> = (props) => (
    <Suspense fallback={<div className="px-2 py-1 text-[11px] text-white/60">…</div>}>
        <PickerWithData {...props} />
    </Suspense>
);
