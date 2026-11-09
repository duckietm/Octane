/**
 * Re-export of zustand's `create` under a project-local name.
 *
 * Convention: each domain owns one store file. Either:
 *   - `src/state/<domain>.ts` for cross-feature stores
 *   - `src/components/<area>/<feature>Store.ts` for feature-local stores
 *
 * Components subscribe to specific slices only:
 *
 *   const isCreating = useNavigatorRoomCreatorStore(s => s.isCreating);
 *
 * Do NOT pull the whole store (`const all = useStore()`) — that
 * subscribes to every change and defeats the point.
 */
export { create as createOctaneStore } from 'zustand';
