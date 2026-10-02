# Messenger Phase 4 — Typing Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show "X sta scrivendo…" in a 1:1 conversation while the friend is typing, WhatsApp-style.

**Architecture:** Two ephemeral CUSTOM packets (never stored). Client→server `ConsoleTyping(peerId, isTyping)` is sent when the user starts/stops typing in a thread; the emulator relays it (friend + online only) to the peer as server→client `FriendTyping(senderId, isTyping)`. The recipient's client shows a typing indicator for that friend, auto-expiring after a few seconds.

**Tech Stack:** Arcturus (Java 21/Maven), Nitro_Render_V3 (TypeScript, Vitest), Nitro-V3 (React 19, Vitest). No DB.

---

## Branches & rules
All repos on `feat/messenger-groups-receipts`. Client commits use `git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com`. No Co-Authored-By / AI attribution. Emulator working tree has an UNRELATED modified `soundboard/SoundboardPlayEvent.java` + untracked jars — never stage those; `git add` only the listed files.

## Header IDs (custom, verified free in all 4 files)
| Packet | Direction | Renderer header | Emulator header | Value |
|---|---|---|---|---|
| ConsoleTyping | client→server | `OutgoingHeader.CONSOLE_TYPING` | `Incoming.ConsoleTypingEvent` | **4087** |
| FriendTyping | server→client | `IncomingHeader.FRIEND_TYPING` | `Outgoing.FriendTypingComposer` | **4088** |

Wire: ConsoleTyping = `int peerId`, `boolean isTyping`. FriendTyping = `int senderId`, `boolean isTyping`. (Booleans are supported in composers/parsers — e.g. `DeclineFriendMessageComposer` sends a boolean; `FriendParser` reads booleans.)

## File map
**Renderer (`Nitro_Render_V3/packages/communication/src/`):**
- Create `messages/outgoing/friendlist/ConsoleTypingComposer.ts`
- Create `messages/incoming/friendlist/FriendIsTypingEvent.ts`
- Create `messages/parser/friendlist/FriendIsTypingParser.ts`
- Create `messages/parser/friendlist/__tests__/FriendIsTypingParser.test.ts`
- Modify `messages/outgoing/OutgoingHeader.ts`, `messages/incoming/IncomingHeader.ts`, `NitroMessages.ts`, the 3 friendlist `index.ts`

**Emulator (`Arcturus-Morningstar-Extended/Emulator/src/main/java/com/eu/habbo/`):**
- Create `messages/incoming/friends/ConsoleTypingEvent.java`
- Create `messages/outgoing/friends/FriendTypingComposer.java`
- Modify `messages/incoming/Incoming.java`, `messages/outgoing/Outgoing.java`, `messages/PacketManager.java`

**Client (`Nitro-V3/src/`):**
- Modify `hooks/friends/useMessenger.ts` (incoming typing state + outgoing action)
- Modify `components/friends/views/messenger/FriendsMessengerView.tsx` (send typing + render indicator)
- Modify `public/configuration/UITexts.example` (`messenger.typing` key)
- Modify `src/css/friends/FriendsView.css` (`.messenger-typing-indicator`)

---

## Task P4-1: Renderer — typing packets + parser test

**Files:** see File map (renderer).

- [ ] **Step 1: Failing parser test**

Create `packages/communication/src/messages/parser/friendlist/__tests__/FriendIsTypingParser.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { BinaryReader, BinaryWriter } from '@nitrots/utils';
import { FriendIsTypingParser } from '../FriendIsTypingParser';

class TestWrapper
{
    constructor(private reader: BinaryReader) {}
    readByte() { return this.reader.readByte(); }
    readBoolean() { return this.reader.readByte() === 1; }
    readShort() { return this.reader.readShort(); }
    readInt() { return this.reader.readInt(); }
    readString() { const len = this.reader.readShort(); return this.reader.readBytes(len).toString(); }
    header = 0;
    get bytesAvailable() { return this.reader.remaining() > 0; }
}

describe('FriendIsTypingParser', () =>
{
    it('parses senderId + isTyping=true', () =>
    {
        const w = new BinaryWriter();
        w.writeInt(42); w.writeByte(1);
        const parser = new FriendIsTypingParser();
        parser.flush();
        parser.parse(new TestWrapper(new BinaryReader(w.getBuffer())) as any);
        expect(parser.senderId).toBe(42);
        expect(parser.isTyping).toBe(true);
    });

    it('parses isTyping=false', () =>
    {
        const w = new BinaryWriter();
        w.writeInt(42); w.writeByte(0);
        const parser = new FriendIsTypingParser();
        parser.flush();
        parser.parse(new TestWrapper(new BinaryReader(w.getBuffer())) as any);
        expect(parser.isTyping).toBe(false);
    });
});
```
Run `cd Nitro_Render_V3 && yarn test --run packages/communication/src/messages/parser/friendlist/__tests__/FriendIsTypingParser.test.ts` → FAIL.

(Confirm `BinaryWriter` has `writeByte`/`writeInt` — the category tests use `writeInt`/`writeString`; if `writeByte` is named differently, use the real method that writes a single byte, mirroring how the existing parser tests write a boolean/byte. If unsure, write the boolean as `w.writeInt(1)` and read with `readInt() === 1` in BOTH parser and test — but prefer a real 1-byte boolean to match the emulator's `appendBoolean`/`readBoolean`. Inspect an existing parser test that round-trips a boolean to copy the exact writer call.)

- [ ] **Step 2: Create the parser**

`packages/communication/src/messages/parser/friendlist/FriendIsTypingParser.ts`:
```typescript
import { IMessageDataWrapper, IMessageParser } from '@nitrots/api';

export class FriendIsTypingParser implements IMessageParser
{
    private _senderId: number;
    private _isTyping: boolean;

    public flush(): boolean
    {
        this._senderId = 0;
        this._isTyping = false;
        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._senderId = wrapper.readInt();
        this._isTyping = wrapper.readBoolean();

        return true;
    }

    public get senderId(): number
    {
        return this._senderId;
    }

    public get isTyping(): boolean
    {
        return this._isTyping;
    }
}
```
(Confirm `IMessageDataWrapper` has `readBoolean()` — `FriendParser` uses it. If not, use `wrapper.readInt() === 1`.)

- [ ] **Step 3: Create the incoming event**

`packages/communication/src/messages/incoming/friendlist/FriendIsTypingEvent.ts`:
```typescript
import { IMessageEvent } from '@nitrots/api';
import { MessageEvent } from '@nitrots/events';
import { FriendIsTypingParser } from '../../parser';

export class FriendIsTypingEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, FriendIsTypingParser);
    }

    public getParser(): FriendIsTypingParser
    {
        return this.parser as FriendIsTypingParser;
    }
}
```

- [ ] **Step 4: Create the outgoing composer**

`packages/communication/src/messages/outgoing/friendlist/ConsoleTypingComposer.ts`:
```typescript
import { IMessageComposer } from '@nitrots/api';

export class ConsoleTypingComposer implements IMessageComposer<ConstructorParameters<typeof ConsoleTypingComposer>>
{
    private _data: ConstructorParameters<typeof ConsoleTypingComposer>;

    constructor(peerId: number, isTyping: boolean)
    {
        this._data = [ peerId, isTyping ];
    }

    public getMessageArray()
    {
        return this._data;
    }

    public dispose(): void
    {
        return;
    }
}
```

- [ ] **Step 5: Header constants**
- `OutgoingHeader.ts`: `public static CONSOLE_TYPING = 4087;`
- `IncomingHeader.ts`: `public static FRIEND_TYPING = 4088;`

- [ ] **Step 6: Barrel exports**
- `messages/outgoing/friendlist/index.ts`: `export * from './ConsoleTypingComposer';`
- `messages/incoming/friendlist/index.ts`: `export * from './FriendIsTypingEvent';`
- `messages/parser/friendlist/index.ts`: `export * from './FriendIsTypingParser';`

- [ ] **Step 7: Register in NitroMessages**
Add the two classes to the friendlist imports, then:
- events: `this._events.set(IncomingHeader.FRIEND_TYPING, FriendIsTypingEvent);`
- composers: `this._composers.set(OutgoingHeader.CONSOLE_TYPING, ConsoleTypingComposer);`

- [ ] **Step 8: Compile + test**
Run: `cd Nitro_Render_V3 && yarn compile:fast && yarn test --run`
Expected: compile clean; all tests pass (143 prior + 2 new = 145).

- [ ] **Step 9: Commit**
```bash
cd Nitro_Render_V3
git add packages/communication/src/messages/ packages/communication/src/NitroMessages.ts
git commit -m "feat(messenger): typing packets (ConsoleTyping + FriendTyping)"
```

---

## Task P4-2: Emulator — typing relay

**Files:** see File map (emulator). No emulator unit tests; verify with `mvn package`.

- [ ] **Step 1: Header constants**
- `Incoming.java`: `public static final int ConsoleTypingEvent = 4087;`
- `Outgoing.java`: `public final static int FriendTypingComposer = 4088;`

- [ ] **Step 2: Outgoing composer**

`messages/outgoing/friends/FriendTypingComposer.java`:
```java
package com.eu.habbo.messages.outgoing.friends;

import com.eu.habbo.messages.ServerMessage;
import com.eu.habbo.messages.outgoing.MessageComposer;
import com.eu.habbo.messages.outgoing.Outgoing;

public class FriendTypingComposer extends MessageComposer {
    private final int senderId;
    private final boolean isTyping;

    public FriendTypingComposer(int senderId, boolean isTyping) {
        this.senderId = senderId;
        this.isTyping = isTyping;
    }

    @Override
    protected ServerMessage composeInternal() {
        this.response.init(Outgoing.FriendTypingComposer);
        this.response.appendInt(this.senderId);
        this.response.appendBoolean(this.isTyping);
        return this.response;
    }
}
```
(Confirm `ServerMessage.appendBoolean(boolean)` exists — `UpdateFriendComposer`/`MessengerBuddy.serialize` both use `appendBoolean`. It does.)

- [ ] **Step 3: Incoming handler**

`messages/incoming/friends/ConsoleTypingEvent.java`. Reads `peerId` + `isTyping`; relays to `peerId` if online AND a friend; ignores `peerId <= 0` (1:1 only). Ephemeral — no storage.
```java
package com.eu.habbo.messages.incoming.friends;

import com.eu.habbo.Emulator;
import com.eu.habbo.habbohotel.users.Habbo;
import com.eu.habbo.messages.incoming.MessageHandler;
import com.eu.habbo.messages.outgoing.friends.FriendTypingComposer;

public class ConsoleTypingEvent extends MessageHandler {
    @Override
    public void handle() throws Exception {
        int peerId = this.packet.readInt();
        boolean isTyping = this.packet.readBoolean();
        Habbo me = this.client.getHabbo();

        if (me == null || peerId <= 0) return;

        if (me.getMessenger().getFriend(peerId) == null) return;

        Habbo peer = Emulator.getGameServer().getGameClientManager().getHabbo(peerId);
        if (peer == null || peer.getClient() == null) return;

        peer.getClient().sendResponse(new FriendTypingComposer(me.getHabboInfo().getId(), isTyping));
    }
}
```
(Confirm `this.packet.readBoolean()` exists — `ClientMessage.readBoolean()` is used across handlers. It does.)

- [ ] **Step 4: Register handler**
In `PacketManager.registerFriends()`: `this.registerHandler(Incoming.ConsoleTypingEvent, ConsoleTypingEvent.class);`
(The `incoming.friends.*` wildcard import covers it — confirm with `grep -n "incoming.friends" PacketManager.java`.)

- [ ] **Step 5: Build**
Run: `cd Arcturus-Morningstar-Extended/Emulator && mvn -q clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit (only the 5 files)**
```bash
cd Arcturus-Morningstar-Extended
git add Emulator/src/main/java/com/eu/habbo/messages/incoming/friends/ConsoleTypingEvent.java Emulator/src/main/java/com/eu/habbo/messages/outgoing/friends/FriendTypingComposer.java Emulator/src/main/java/com/eu/habbo/messages/incoming/Incoming.java Emulator/src/main/java/com/eu/habbo/messages/outgoing/Outgoing.java Emulator/src/main/java/com/eu/habbo/messages/PacketManager.java
git commit -m "feat(messenger): relay typing status between friends"
```
`git show --stat HEAD` → exactly 5 files (no soundboard, no jars).

---

## Task P4-3: Client — typing state + action in useMessenger

**Files:** Modify `Nitro-V3/src/hooks/friends/useMessenger.ts`.

> No clean unit test here (timer + event-bus via the renderer mock). Verified by typecheck + the live test in P4-5. Keep the implementation tight.

- [ ] **Step 1: Imports**
Add `ConsoleTypingComposer` and `FriendIsTypingEvent` to the `@nitrots/nitro-renderer` import line. Ensure `useRef` is imported from 'react' (the file imports `useEffect, useMemo, useRef, useState` after Phase 3 — confirm `useRef` is present).

- [ ] **Step 2: Typing state + timers ref**
Inside `useMessengerState`, near the other `useState` calls, add:
```typescript
    const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
    const typingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
```

- [ ] **Step 3: Outgoing action**
Add (near `sendMessage` / other actions):
```typescript
    const sendTypingStatus = (peerId: number, isTyping: boolean) =>
    {
        if (!peerId || (peerId <= 0)) return;

        SendMessageComposer(new ConsoleTypingComposer(peerId, isTyping));
    };
```

- [ ] **Step 4: Incoming handler with auto-expire**
Add a new `useMessageEvent` (near the others). When a friend is typing, add their id and (re)arm a 6s expiry; when they stop, remove immediately.
```typescript
    useMessageEvent<FriendIsTypingEvent>(FriendIsTypingEvent, event =>
    {
        const parser = event.getParser();
        const senderId = parser.senderId;

        if (senderId <= 0) return;

        const timers = typingTimersRef.current;
        const existing = timers.get(senderId);

        if (existing)
        {
            clearTimeout(existing);
            timers.delete(senderId);
        }

        if (parser.isTyping)
        {
            setTypingUserIds(prev => (prev.indexOf(senderId) >= 0) ? prev : [...prev, senderId]);

            timers.set(senderId, setTimeout(() =>
            {
                typingTimersRef.current.delete(senderId);
                setTypingUserIds(prev => prev.filter(id => (id !== senderId)));
            }, 6000));
        }
        else
        {
            setTypingUserIds(prev => prev.filter(id => (id !== senderId)));
        }
    });
```

- [ ] **Step 5: Expose**
Add `typingUserIds` and `sendTypingStatus` to the `useMessengerState` return object (the bottom `return { ... }`).

- [ ] **Step 6: typecheck + tests + lint:hooks**
Run: `cd Nitro-V3 && yarn typecheck && yarn test --run && yarn lint:hooks`
Expected: typecheck only the pre-existing floorplan error; no new test failures; `lint:hooks` 0 errors.

- [ ] **Step 7: Commit**
```bash
cd Nitro-V3
git add src/hooks/friends/useMessenger.ts
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -m "feat(messenger): incoming typing state + outgoing typing action"
```

---

## Task P4-4: Client — send typing + render indicator

**Files:**
- Modify `Nitro-V3/src/components/friends/views/messenger/FriendsMessengerView.tsx`
- Modify `Nitro-V3/public/configuration/UITexts.example`
- Modify `Nitro-V3/src/css/friends/FriendsView.css`

- [ ] **Step 1: Pull the new hook members**
In `FriendsMessengerView.tsx`, the `useMessenger()` destructure currently grabs `visibleThreads, activeThread, getMessageThread, sendMessage, setActiveThreadId, closeThread`. Add `typingUserIds = [], sendTypingStatus = null`.

- [ ] **Step 2: Outgoing typing notifier (refs + idle timer)**
Add near the other refs/state at the top of the component:
```tsx
    const isTypingRef = useRef<boolean>(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const stopTyping = () =>
    {
        if(typingTimeoutRef.current)
        {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        if(isTypingRef.current && activeThread && activeThread.participant && (activeThread.participant.id > 0))
        {
            sendTypingStatus(activeThread.participant.id, false);
        }

        isTypingRef.current = false;
    };

    const handleInputChange = (value: string) =>
    {
        setMessageText(value);

        const peerId = (activeThread && activeThread.participant) ? activeThread.participant.id : 0;

        if(peerId <= 0) return;

        if(!value.length)
        {
            stopTyping();
            return;
        }

        if(!isTypingRef.current)
        {
            sendTypingStatus(peerId, true);
            isTypingRef.current = true;
        }

        if(typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => stopTyping(), 4000);
    };
```
`useRef` is already imported in this file.

- [ ] **Step 3: Wire the input + send**
- Change the input's `onChange` from `event => setMessageText(event.target.value)` to `event => handleInputChange(event.target.value)`.
- In `send()`, after each `setMessageText('')` (there are a few early returns — simplest: call `stopTyping()` once at the START of `send()` after the `if(!activeThread || !messageText.length) return;` guard, so any in-progress typing is cleared and a `false` is sent before the message). Add `stopTyping();` right after that guard line.

- [ ] **Step 4: Stop typing when switching away from / closing a thread**
The component already has an effect on `[ isVisible, activeThread, ... ]`. To avoid a stale typing flag when the active thread changes, add a small effect:
```tsx
    useEffect(() =>
    {
        // when the active conversation changes (or closes), clear local typing state
        return () =>
        {
            if(typingTimeoutRef.current)
            {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            isTypingRef.current = false;
        };
    }, [ activeThread ]);
```
(This clears the local flag/timer on thread switch; the peer's indicator auto-expires after 6s, so an explicit "false" on switch isn't required.)

- [ ] **Step 5: Render the indicator**
Between the `chat-messages` div and the `messenger-input-row`, add:
```tsx
                            { activeThread.participant && (activeThread.participant.id > 0) && (typingUserIds.indexOf(activeThread.participant.id) >= 0) &&
                                <div className="messenger-typing-indicator">
                                    { LocalizeText('messenger.typing', [ 'FRIEND_NAME' ], [ activeThread.participant.name ]) }
                                </div> }
```

- [ ] **Step 6: Localization key**
In `public/configuration/UITexts.example`, add (keep valid JSON):
```json
"messenger.typing": "%FRIEND_NAME% is typing...",
```

- [ ] **Step 7: CSS**
Append to `src/css/friends/FriendsView.css`:
```css
.messenger-typing-indicator {
    padding: 2px 8px;
    font-size: 11px;
    font-style: italic;
    opacity: 0.7;
}
```

- [ ] **Step 8: typecheck + tests**
Run: `cd Nitro-V3 && yarn typecheck && yarn test --run`
Expected: only the pre-existing floorplan typecheck error; no new test failures.

- [ ] **Step 9: Commit**
```bash
cd Nitro-V3
git add src/components/friends/views/messenger/FriendsMessengerView.tsx public/configuration/UITexts.example src/css/friends/FriendsView.css
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -m "feat(messenger): send typing status + show 'is typing' indicator"
```

---

## Task P4-5: Integration verification

**Files:** none (automated + manual; fix-ups only).

- [ ] **Step 1: Automated checks**
```
cd Nitro_Render_V3 && yarn compile:fast && yarn test --run
cd Nitro-V3 && yarn typecheck && yarn test --run && yarn lint:hooks
cd Arcturus-Morningstar-Extended/Emulator && mvn -q clean package -DskipTests
```
Expected: renderer 145 tests green; client typecheck only the pre-existing floorplan error, tests green except the 3 known floorplan failures, `lint:hooks` 0 errors; emulator BUILD SUCCESS.

- [ ] **Step 2: Live two-session manual test**

Run the new jar + `yarn start`. Accounts A and B (friends), both online, conversation open on both sides:
1. **Typing shows:** A starts typing in the thread with B → B sees "A is typing..." above the input.
2. **Stops on idle:** A stops typing → after ~4s (A's idle timer sends stop) B's indicator disappears; even if the stop packet is lost, B's indicator auto-expires after ~6s.
3. **Stops on send:** A types then sends → B's indicator disappears (stop sent at send time) and the message arrives.
4. **1:1 only:** typing in the Staff Chat / a group thread produces no errors and no indicator (server ignores `peerId <= 0` / non-friends).
5. **No regressions:** sending, receipts (Phase 3 ✓/✓✓), offline markers (Phase 2), and groups (Phase 1) all still work.

- [ ] **Step 3: Commit any fix-ups** (only if needed)
```bash
cd Nitro-V3
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -am "fix(messenger): typing indicator integration fixes"
```

---

## Scope boundaries
- **Ephemeral only:** typing status is never stored; relayed only between online friends.
- **1:1 only:** group/staff/bots produce no typing (server ignores `peerId <= 0` and non-friends; client only renders for `participant.id > 0`).
- **Throttling:** the client sends `true` once per typing burst and `false` on idle(4s)/send/empty; the recipient auto-expires the indicator after 6s as a safety net for lost stop packets.
- This completes the messenger initiative (Phases 1–4). Do NOT push/merge automatically; the branch carries all four phases + the user's own parallel commits.
