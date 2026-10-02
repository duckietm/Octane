# Messenger Phase 3 — Read Receipts (✓ / ✓✓) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WhatsApp-style 2-state read receipts on your own sent messages — `✓` sent, `✓✓` read — driven by a live relay (no persistence).

**Architecture:** Two new CUSTOM packets. Client→server `MarkConsoleRead(peerId)` is sent when you focus/read a conversation. The emulator relays it to the peer (if online and a friend) as server→client `ConsoleReadReceipt(readerId)`. The recipient's client marks its own messages in that conversation as READ and renders `✓✓`.

**Design note — no DB, live-relay only (refinement of the spec):** the spec proposed a `messenger_read_state` table + a login-time receipt batch. The Nitro client does NOT persist per-message history across sessions, so a persisted receipt would have no message to update on next login. Persistence is therefore omitted; receipts are a live in-session relay. This keeps Phase 3 simpler with no loss of user-visible behavior. (If cross-session receipts are ever wanted, they'd require persisting client-side message history first — out of scope.)

**Tech Stack:** Arcturus (Java 21/Maven), Nitro_Render_V3 (TypeScript, Vitest), Nitro-V3 (React 19, Vitest).

---

## Branches & rules
All repos on `feat/messenger-groups-receipts`. Client commits use `git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com`. No Co-Authored-By / AI attribution. Emulator working tree has an UNRELATED modified `soundboard/SoundboardPlayEvent.java` + untracked jars — never stage those; `git add` only the listed files.

## Header IDs (custom, verified free in all 4 files)
| Packet | Direction | Renderer header | Emulator header | Value |
|---|---|---|---|---|
| MarkConsoleRead | client→server | `OutgoingHeader.MARK_CONSOLE_READ` | `Incoming.MarkConsoleReadEvent` | **4085** |
| ConsoleReadReceipt | server→client | `IncomingHeader.CONSOLE_READ_RECEIPT` | `Outgoing.ConsoleReadReceiptComposer` | **4086** |

(Renderer Outgoing N == Emulator Incoming N; Renderer Incoming N == Emulator Outgoing N — the verified convention.)

## File map
**Renderer (`Nitro_Render_V3/packages/communication/src/`):**
- Modify `messages/outgoing/OutgoingHeader.ts`, `messages/incoming/IncomingHeader.ts`, `NitroMessages.ts`, the 3 friendlist `index.ts` barrels.
- Create `messages/outgoing/friendlist/MarkConsoleReadComposer.ts`
- Create `messages/incoming/friendlist/ConsoleReadReceiptEvent.ts`
- Create `messages/parser/friendlist/ConsoleReadReceiptParser.ts`
- Create `messages/parser/friendlist/__tests__/ConsoleReadReceiptParser.test.ts`

**Emulator (`Arcturus-Morningstar-Extended/Emulator/src/main/java/com/eu/habbo/`):**
- Modify `messages/incoming/Incoming.java`, `messages/outgoing/Outgoing.java`, `messages/PacketManager.java`
- Create `messages/incoming/friends/MarkConsoleReadEvent.java`
- Create `messages/outgoing/friends/ConsoleReadReceiptComposer.java`

**Client (`Nitro-V3/src/`):**
- Modify `api/friends/MessengerThreadChat.ts` (+ test) and `api/friends/MessengerThread.ts` (+ test)
- Modify `hooks/friends/useMessenger.ts`
- Modify `components/friends/views/messenger/messenger-thread/FriendsMessengerThreadGroup.tsx`
- Modify `src/css/friends/FriendsView.css`

---

## Task P3-1: Renderer — packets + registration + parser test

**Files:** see File map (renderer).

- [ ] **Step 1: Write the failing parser test**

Create `packages/communication/src/messages/parser/friendlist/__tests__/ConsoleReadReceiptParser.test.ts` (mirror the existing `__tests__/FriendCategoryComposers.test.ts` parser test style with a `TestWrapper` over `BinaryReader`/`BinaryWriter`):
```typescript
import { describe, expect, it } from 'vitest';
import { BinaryReader, BinaryWriter } from '@nitrots/utils';
import { ConsoleReadReceiptParser } from '../ConsoleReadReceiptParser';

class TestWrapper
{
    constructor(private reader: BinaryReader) {}
    readByte() { return this.reader.readByte(); }
    readShort() { return this.reader.readShort(); }
    readInt() { return this.reader.readInt(); }
    readString() { const len = this.reader.readShort(); return this.reader.readBytes(len).toString(); }
    header = 0;
    get bytesAvailable() { return this.reader.remaining() > 0; }
}

describe('ConsoleReadReceiptParser', () =>
{
    it('parses the reader id', () =>
    {
        const w = new BinaryWriter();
        w.writeInt(42);
        const parser = new ConsoleReadReceiptParser();
        parser.flush();
        parser.parse(new TestWrapper(new BinaryReader(w.getBuffer())) as any);
        expect(parser.readerId).toBe(42);
    });
});
```

- [ ] **Step 2: Run it, confirm FAIL**

Run: `cd Nitro_Render_V3 && yarn test --run packages/communication/src/messages/parser/friendlist/__tests__/ConsoleReadReceiptParser.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the parser**

`packages/communication/src/messages/parser/friendlist/ConsoleReadReceiptParser.ts` (mirror `NewConsoleMessageParser`):
```typescript
import { IMessageDataWrapper, IMessageParser } from '@nitrots/api';

export class ConsoleReadReceiptParser implements IMessageParser
{
    private _readerId: number;

    public flush(): boolean
    {
        this._readerId = 0;
        return true;
    }

    public parse(wrapper: IMessageDataWrapper): boolean
    {
        if(!wrapper) return false;

        this._readerId = wrapper.readInt();

        return true;
    }

    public get readerId(): number
    {
        return this._readerId;
    }
}
```

- [ ] **Step 4: Create the incoming event**

`packages/communication/src/messages/incoming/friendlist/ConsoleReadReceiptEvent.ts` (mirror `NewConsoleMessageEvent`):
```typescript
import { IMessageEvent } from '@nitrots/api';
import { MessageEvent } from '@nitrots/events';
import { ConsoleReadReceiptParser } from '../../parser';

export class ConsoleReadReceiptEvent extends MessageEvent implements IMessageEvent
{
    constructor(callBack: Function)
    {
        super(callBack, ConsoleReadReceiptParser);
    }

    public getParser(): ConsoleReadReceiptParser
    {
        return this.parser as ConsoleReadReceiptParser;
    }
}
```

- [ ] **Step 5: Create the outgoing composer**

`packages/communication/src/messages/outgoing/friendlist/MarkConsoleReadComposer.ts` (mirror `SetRelationshipStatusComposer`):
```typescript
import { IMessageComposer } from '@nitrots/api';

export class MarkConsoleReadComposer implements IMessageComposer<ConstructorParameters<typeof MarkConsoleReadComposer>>
{
    private _data: ConstructorParameters<typeof MarkConsoleReadComposer>;

    constructor(peerId: number)
    {
        this._data = [ peerId ];
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

- [ ] **Step 6: Add header constants**

In `OutgoingHeader.ts` (near the friend headers): `public static MARK_CONSOLE_READ = 4085;`
In `IncomingHeader.ts` (near the messenger headers): `public static CONSOLE_READ_RECEIPT = 4086;`

- [ ] **Step 7: Barrel exports**

- `messages/outgoing/friendlist/index.ts`: `export * from './MarkConsoleReadComposer';`
- `messages/incoming/friendlist/index.ts`: `export * from './ConsoleReadReceiptEvent';`
- `messages/parser/friendlist/index.ts`: `export * from './ConsoleReadReceiptParser';`

- [ ] **Step 8: Register in NitroMessages**

In `NitroMessages.ts`: add the two classes to the existing friendlist imports, then:
- in the events block (next to `this._events.set(IncomingHeader.MESSENGER_CHAT, NewConsoleMessageEvent);`): `this._events.set(IncomingHeader.CONSOLE_READ_RECEIPT, ConsoleReadReceiptEvent);`
- in the composers block (next to `this._composers.set(OutgoingHeader.MESSENGER_CHAT, SendMessageComposer);`): `this._composers.set(OutgoingHeader.MARK_CONSOLE_READ, MarkConsoleReadComposer);`

- [ ] **Step 9: Compile + test**

Run: `cd Nitro_Render_V3 && yarn compile:fast && yarn test --run`
Expected: compile clean; all tests pass (142 prior + 1 new = 143).

- [ ] **Step 10: Commit**
```bash
cd Nitro_Render_V3
git add packages/communication/src/messages/ packages/communication/src/NitroMessages.ts
git commit -m "feat(messenger): read-receipt packets (MarkConsoleRead + ConsoleReadReceipt)"
```

---

## Task P3-2: Emulator — handler + composer + registration

**Files:** see File map (emulator).

> No emulator unit tests; verify with `mvn package`.

- [ ] **Step 1: Header constants**

In `Incoming.java` (near the friend constants): `public static final int MarkConsoleReadEvent = 4085;`
In `Outgoing.java` (near the friend composers): `public final static int ConsoleReadReceiptComposer = 4086;`

- [ ] **Step 2: Create the outgoing composer**

`messages/outgoing/friends/ConsoleReadReceiptComposer.java`:
```java
package com.eu.habbo.messages.outgoing.friends;

import com.eu.habbo.messages.ServerMessage;
import com.eu.habbo.messages.outgoing.MessageComposer;
import com.eu.habbo.messages.outgoing.Outgoing;

public class ConsoleReadReceiptComposer extends MessageComposer {
    private final int readerId;

    public ConsoleReadReceiptComposer(int readerId) {
        this.readerId = readerId;
    }

    @Override
    protected ServerMessage composeInternal() {
        this.response.init(Outgoing.ConsoleReadReceiptComposer);
        this.response.appendInt(this.readerId);
        return this.response;
    }
}
```

- [ ] **Step 3: Create the incoming handler**

`messages/incoming/friends/MarkConsoleReadEvent.java`. The reader (me) tells the server it read `peerId`'s messages; the server relays a receipt to `peerId` IF `peerId` is online AND a friend (anti-spoof). 1:1 only — `peerId <= 0` (e.g. StaffChat = -1) is ignored.
```java
package com.eu.habbo.messages.incoming.friends;

import com.eu.habbo.Emulator;
import com.eu.habbo.habbohotel.users.Habbo;
import com.eu.habbo.messages.incoming.MessageHandler;
import com.eu.habbo.messages.outgoing.friends.ConsoleReadReceiptComposer;

public class MarkConsoleReadEvent extends MessageHandler {
    @Override
    public void handle() throws Exception {
        int peerId = this.packet.readInt();
        Habbo me = this.client.getHabbo();

        if (me == null || peerId <= 0) return;

        if (me.getMessenger().getFriend(peerId) == null) return;

        Habbo peer = Emulator.getGameServer().getGameClientManager().getHabbo(peerId);
        if (peer == null || peer.getClient() == null) return;

        peer.getClient().sendResponse(new ConsoleReadReceiptComposer(me.getHabboInfo().getId()));
    }
}
```
Before writing, confirm `me.getMessenger().getFriend(int)` exists (it's used in `FriendPrivateMessageEvent`) and `Emulator.getGameServer().getGameClientManager().getHabbo(int)` (used in `MessengerBuddy.onMessageReceived`). Adapt + report if a signature differs.

- [ ] **Step 4: Register the handler**

In `PacketManager.registerFriends()`: `this.registerHandler(Incoming.MarkConsoleReadEvent, MarkConsoleReadEvent.class);`
(`registerFriends` uses a wildcard `import com.eu.habbo.messages.incoming.friends.*;` — confirm with `grep -n "incoming.friends" PacketManager.java`; if explicit imports are used instead, add `import ...MarkConsoleReadEvent;`.)

- [ ] **Step 5: Build**

Run: `cd Arcturus-Morningstar-Extended/Emulator && mvn -q clean package -DskipTests`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit (only the 4 files)**
```bash
cd Arcturus-Morningstar-Extended
git add Emulator/src/main/java/com/eu/habbo/messages/incoming/friends/MarkConsoleReadEvent.java Emulator/src/main/java/com/eu/habbo/messages/outgoing/friends/ConsoleReadReceiptComposer.java Emulator/src/main/java/com/eu/habbo/messages/incoming/Incoming.java Emulator/src/main/java/com/eu/habbo/messages/outgoing/Outgoing.java Emulator/src/main/java/com/eu/habbo/messages/PacketManager.java
git commit -m "feat(messenger): relay read receipts between friends"
```
`git show --stat HEAD` → exactly 5 files (no soundboard, no jars).

---

## Task P3-3: Client — message status model (TDD)

**Files:**
- Modify: `Nitro-V3/src/api/friends/MessengerThreadChat.ts` + Test `MessengerThreadChat.test.ts` (extend the existing test file from Phase 2)
- Modify: `Nitro-V3/src/api/friends/MessengerThread.ts` + Test `Nitro-V3/src/api/friends/MessengerThread.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the existing `src/api/friends/MessengerThreadChat.test.ts`:
```typescript
describe('MessengerThreadChat status', () =>
{
    it('defaults to SENT', () =>
    {
        const chat = new MessengerThreadChat(5, 'hi', 0, null, MessengerThreadChat.CHAT);
        expect(chat.status).toBe(MessengerThreadChat.SENT);
    });

    it('can be set to READ', () =>
    {
        const chat = new MessengerThreadChat(5, 'hi', 0, null, MessengerThreadChat.CHAT);
        chat.setStatus(MessengerThreadChat.READ);
        expect(chat.status).toBe(MessengerThreadChat.READ);
    });
});
```

Create `src/api/friends/MessengerThread.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { MessengerFriend } from './MessengerFriend';
import { MessengerThread } from './MessengerThread';
import { MessengerThreadChat } from './MessengerThreadChat';

const makeThread = (participantId: number): MessengerThread =>
{
    const friend = new MessengerFriend();
    friend.id = participantId;
    return new MessengerThread(friend);
};

describe('MessengerThread.setMessagesReadFromUser', () =>
{
    it('marks only the given user\'s messages as READ', () =>
    {
        const thread = makeThread(7);
        const mine = thread.addMessage(100, 'a', 0, null, MessengerThreadChat.CHAT);   // my message
        const theirs = thread.addMessage(7, 'b', 0, null, MessengerThreadChat.CHAT);   // their message

        thread.setMessagesReadFromUser(100);

        expect(mine.status).toBe(MessengerThreadChat.READ);
        expect(theirs.status).toBe(MessengerThreadChat.SENT);
    });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd Nitro-V3 && yarn test --run src/api/friends/MessengerThreadChat.test.ts src/api/friends/MessengerThread.test.ts`
Expected: FAIL (SENT/READ/status/setStatus/setMessagesReadFromUser missing).

- [ ] **Step 3: Add status to MessengerThreadChat**

In `MessengerThreadChat.ts`, add the constants next to the existing `CHAT`/`ROOM_INVITE` statics:
```typescript
    public static SENT: number = 0;
    public static READ: number = 1;
```
Add the field next to the other private fields:
```typescript
    private _status: number = MessengerThreadChat.SENT;
```
Add getter + setter (next to the `offlineDelivered` getter):
```typescript
    public get status(): number
    {
        return this._status;
    }

    public setStatus(status: number): void
    {
        this._status = status;
    }
```

- [ ] **Step 4: Add the marking method to MessengerThread**

In `MessengerThread.ts`, add (e.g. after `setRead()`):
```typescript
    public setMessagesReadFromUser(userId: number): void
    {
        for(const group of this._groups)
        {
            if(group.userId !== userId) continue;

            for(const chat of group.chats) chat.setStatus(MessengerThreadChat.READ);
        }
    }
```
(`MessengerThreadChat` is already imported in this file.)

- [ ] **Step 5: Run, confirm PASS** (Chat: 6 cases now; Thread: 1 case).

- [ ] **Step 6: typecheck + full suite**

Run: `cd Nitro-V3 && yarn typecheck && yarn test --run`
Expected: only the known pre-existing `FloorplanCanvasSVG.tsx(143,20): TS2503`; no new failures (3 known floorplan failures remain).

- [ ] **Step 7: Commit**
```bash
cd Nitro-V3
git add src/api/friends/MessengerThreadChat.ts src/api/friends/MessengerThreadChat.test.ts src/api/friends/MessengerThread.ts src/api/friends/MessengerThread.test.ts
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -m "feat(messenger): SENT/READ status on thread chats + mark-read helper"
```

---

## Task P3-4: Client — wire receipts into useMessenger

**Files:**
- Modify: `Nitro-V3/src/hooks/friends/useMessenger.ts`

- [ ] **Step 1: Import the packets**

In the top `@nitrots/nitro-renderer` import of `useMessenger.ts`, add `ConsoleReadReceiptEvent` and `MarkConsoleReadComposer` (alongside `NewConsoleMessageEvent`, `SendMessageComposer as SendMessageComposerPacket`). `GetSessionDataManager` is already imported.

- [ ] **Step 2: Send MarkConsoleRead when a conversation is focused**

The existing `useEffect([activeThreadId])` marks the active thread read locally. Extend it to also tell the peer. Replace that effect's body so that, after computing the active thread, it sends the composer for a real 1:1 participant:
```typescript
    useEffect(() =>
    {
        if (activeThreadId <= 0) return;

        let participantId = 0;

        setMessageThreads(prevValue =>
        {
            const newValue = [...prevValue];
            const index = newValue.findIndex(newThread => (newThread.threadId === activeThreadId));

            if (index >= 0)
            {
                newValue[index] = CloneObject(newValue[index]);
                newValue[index].setRead();
                participantId = newValue[index].participant?.id ?? 0;
            }

            return newValue;
        });

        if (participantId > 0) SendMessageComposer(new MarkConsoleReadComposer(participantId));
    }, [activeThreadId]);
```

- [ ] **Step 3: Also mark-read when a message arrives in the already-active thread**

In the `NewConsoleMessageEvent` handler, after `sendMessage(...)`, notify the peer if this thread is the one currently open:
```typescript
    useMessageEvent<NewConsoleMessageEvent>(NewConsoleMessageEvent, event =>
    {
        const parser = event.getParser();
        const thread = getMessageThread(parser.senderId);

        if (!thread) return;

        sendMessage(thread, parser.senderId, parser.messageText, parser.secondsSinceSent, parser.extraData);

        if ((thread.threadId === activeThreadId) && (parser.senderId > 0)) SendMessageComposer(new MarkConsoleReadComposer(parser.senderId));
    });
```

- [ ] **Step 4: Handle the incoming receipt — mark own messages READ**

Add a new event subscription (near the other `useMessageEvent` calls). `parser.readerId` is the friend who read MY messages; find the thread with that participant and mark my own messages READ:
```typescript
    useMessageEvent<ConsoleReadReceiptEvent>(ConsoleReadReceiptEvent, event =>
    {
        const parser = event.getParser();
        const ownUserId = GetSessionDataManager().userId;

        setMessageThreads(prevValue =>
        {
            const index = prevValue.findIndex(thread => (thread.participant && (thread.participant.id === parser.readerId)));

            if (index === -1) return prevValue;

            const newValue = [...prevValue];

            newValue[index] = CloneObject(newValue[index]);
            newValue[index].setMessagesReadFromUser(ownUserId);

            return newValue;
        });
    });
```

- [ ] **Step 5: typecheck + full suite**

Run: `cd Nitro-V3 && yarn typecheck && yarn test --run`
Expected: only the pre-existing typecheck error; no new test failures.

- [ ] **Step 6: Commit**
```bash
cd Nitro-V3
git add src/hooks/friends/useMessenger.ts
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -m "feat(messenger): send mark-read on focus, mark own messages read on receipt"
```

---

## Task P3-5: Client — render ✓ / ✓✓ + CSS

**Files:**
- Modify: `Nitro-V3/src/components/friends/views/messenger/messenger-thread/FriendsMessengerThreadGroup.tsx`
- Modify: `Nitro-V3/src/css/friends/FriendsView.css`

- [ ] **Step 1: Render the status indicator on own private-chat bubbles**

In `FriendsMessengerThreadGroup.tsx`, the final `return (...)` renders the message row; the own-message avatar is gated by `isOwnChat`. `MessengerThreadChat` and `MessengerGroupType` are already imported. After the `.messenger-message-time` `<Base>` (inside `.messenger-message-body`), add a status indicator shown only for own 1:1 CHAT groups. Compute the last chat once and render:
```tsx
                <Base className="messenger-message-time">{ group.chats[0].date.toLocaleTimeString() }</Base>
                { isOwnChat && (group.type === MessengerGroupType.PRIVATE_CHAT) && (group.chats[group.chats.length - 1].type === MessengerThreadChat.CHAT) &&
                    <Base className={ 'messenger-message-status ' + ((group.chats[group.chats.length - 1].status === MessengerThreadChat.READ) ? 'read' : '') }>
                        { (group.chats[group.chats.length - 1].status === MessengerThreadChat.READ) ? '✓✓' : '✓' }
                    </Base> }
```
(Insert this block immediately after the existing `messenger-message-time` line, still inside the `.messenger-message-body` `<Base>`.)

- [ ] **Step 2: Add CSS**

Append to `src/css/friends/FriendsView.css`:
```css
.messenger-message-status {
    margin-top: 1px;
    font-size: 10px;
    line-height: 10px;
    text-align: right;
    opacity: 0.6;
}
.messenger-message-status.read {
    color: #4fc3f7;
    opacity: 1;
}
```

- [ ] **Step 3: typecheck + full suite**

Run: `cd Nitro-V3 && yarn typecheck && yarn test --run`
Expected: only the pre-existing typecheck error; no new test failures.

- [ ] **Step 4: Commit**
```bash
cd Nitro-V3
git add src/components/friends/views/messenger/messenger-thread/FriendsMessengerThreadGroup.tsx src/css/friends/FriendsView.css
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -m "feat(messenger): render sent/read checkmarks on own messages"
```

---

## Task P3-6: Integration verification

**Files:** none (automated + manual; fix-ups only).

- [ ] **Step 1: Automated checks**
```
cd Nitro_Render_V3 && yarn compile:fast && yarn test --run
cd Nitro-V3 && yarn typecheck && yarn test --run
cd Arcturus-Morningstar-Extended/Emulator && mvn -q clean package -DskipTests
```
Expected: renderer tests green (143); client typecheck shows only the pre-existing `FloorplanCanvasSVG.tsx(143,20): TS2503`, tests green except the 3 known floorplan failures (+ the new model cases pass); emulator BUILD SUCCESS.

- [ ] **Step 2: Live two-session manual test**

Run the new jar + `yarn start`. Accounts A and B (friends), both online:
1. **Sent (✓):** A sends B a message while B's messenger thread with A is NOT focused → on A's side the message shows a single `✓`.
2. **Read (✓✓):** B opens/focuses the conversation with A → A's message flips to `✓✓` (blue) live.
3. **New message after read:** A sends another message → shows `✓` again; when B (thread still focused) receives it, A flips to `✓✓` (the active-thread mark-read path).
4. **Offline interplay (Phase 2):** A messages B while B offline → A shows `✓`; B logs in and opens the thread → A (if still online) sees `✓✓`.
5. **No receipts for non-1:1:** opening the Staff Chat / a group chat thread does not produce errors and shows no checkmarks on those messages.
6. **Privacy/abuse:** a receipt only arrives for actual friends (the handler ignores non-friends and `peerId <= 0`).
7. **No regressions:** sending, receiving, offline markers (Phase 2), and groups (Phase 1) all still work.

- [ ] **Step 3: Commit any fix-ups** (only if needed)
```bash
cd Nitro-V3
git -c user.name=simoleo89 -c user.email=simoleo89@users.noreply.github.com commit -am "fix(messenger): read-receipt integration fixes"
```

---

## Scope boundaries
- **No persistence / no login batch** (see Design note): receipts are live-relay only; ✓✓ applies within the session the sender is online for.
- **2-state only:** `✓` (sent) and `✓✓` (read). No separate "delivered" state.
- **1:1 only:** group chat, staff chat, and bots never produce receipts (`peerId <= 0` and non-friends are ignored server-side; the client only renders checks on `PRIVATE_CHAT` CHAT groups).
- **Receipt marks ALL current own messages in the thread read** (not a per-message timestamp diff) — correct for the 2-state model since a focus/read means everything visible is read; messages sent afterward start at `✓` again.
- No renderer/client message-history persistence is added.
- Do NOT push/merge automatically; the branch carries Phases 1–2 + the user's own parallel commits.
