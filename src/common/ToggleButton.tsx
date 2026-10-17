import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';

/**
 * Base UI Toggle: a native `<button>` with `aria-pressed` / `data-pressed`. Pass `pressed` to
 * control it and keep the existing `onClick`. Put several in a `ToggleButtonGroup` (give each a
 * `value`) for a pick-one set with roving focus and arrow keys.
 */
export const ToggleButton = Toggle;
export const ToggleButtonGroup = ToggleGroup;
