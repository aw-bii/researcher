# File/Image Attachments — Design Spec

**Date:** 2026-06-19
**Status:** Approved

---

## Overview

Adds file and image attachment support to BII Agent Harness. Users can attach PDFs, Word docs, Excel sheets, CSVs, plain text, Markdown, and images to any message. Files are persisted to disk alongside conversations and remain viewable in history. A hybrid routing strategy passes files to backends via native CLI flags where supported, falling back to content injection otherwise.

---

## Architecture

```text
Renderer                         Main Process
--------                         ------------
InputBar  ──attachment:ingest──► AttachmentService
          ◄── Attachment[]  ────   (copy to disk, extract text, store metadata)
          ──chat:send──────────► IPC handler
                                   (looks up attachments by messageId)
                                   ──► ClaudeAdapter.send(..., attachments)
                                         → --file flags (native)
                                   ──► GeminiAdapter.send(..., attachments)
                                         → content injection
                                   ──► OpencodeAdapter.send(..., attachments)
                                         → content injection
```

---

## Data Model

### New table

```sql
CREATE TABLE attachments (
  id              TEXT PRIMARY KEY,
  message_id      TEXT REFERENCES messages(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  stored_path     TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  extracted_text  TEXT,
  created_at      INTEGER
);
```

- `stored_path` — absolute path in `{userData}/attachments/{message_id}/`
- `extracted_text` — populated at ingest time for text-based types; null for images
- Cascade delete: when a message is deleted, its attachment DB rows and files on disk are removed

No changes to `messages` or `conversations` tables.

### Migration

Added as a migration in `src/main/store/migrations/` following the existing runner pattern.

---

## AttachmentService

**File:** `src/main/attachments/service.ts`

```typescript
interface Attachment {
  id: string
  originalName: string
  storedPath: string
  mimeType: string
  sizeBytes: number
  extractedText?: string
  extractionError?: boolean
}

const AttachmentService = {
  ingest(filePaths: string[], messageId: string): Promise<Attachment[]>
  getContent(attachment: Attachment): string   // extractedText or base64 data URI
  listForMessage(messageId: string): Attachment[]
  purge(messageId: string): Promise<void>
}
```

**Content extraction by MIME type:**

| Type | Extraction |
| --- | --- |
| `text/*`, `.md`, `.csv` | Read as UTF-8, store in `extracted_text` |
| `application/pdf` | Extract via `pdf-parse`, store in `extracted_text` |
| `.docx` | Extract via `mammoth`, store in `extracted_text` |
| `.xlsx` | Extract via `xlsx`, store in `extracted_text` |
| `image/*` | No extraction; `getContent()` returns base64 data URI |

**File size limit:** files over 20 MB are rejected by `ingest()` before any disk write.

**Extraction failure:** if extraction throws, the attachment is saved with `extracted_text: null` and `extractionError: true`. Adapters fall back to passing just the filename as context rather than failing the send.

---

## Adapter Changes

`BackendAdapter` interface in `src/shared/types.ts` gains an optional parameter:

```typescript
interface BackendAdapter {
  id: string
  isAvailable(): Promise<boolean>
  send(message: string, persona?: string, attachments?: Attachment[]): AsyncIterable<MessageChunk>
  abort(): void
}
```

### Hybrid routing

**ClaudeAdapter** — passes each attachment as a `--file <storedPath>` flag. Claude CLI supports PDFs, images, and text files natively. For any type the CLI rejects, falls back to content injection.

**GeminiAdapter** — full content injection for all types until native Gemini CLI file support is confirmed stable.

**OpencodeAdapter** — full content injection for all types.

**Content injection format** (appended to the user message string before sending):

```text
[Attachment: filename.pdf]
<extractedText or base64 data URI>
[/Attachment]
```

Each adapter applies this format directly — no shared utility needed.

---

## IPC Channels

Added to `src/shared/ipc.ts`:

| Channel | Direction | Payload |
| --- | --- | --- |
| `attachment:ingest` | Renderer → Main | `{ filePaths: string[], messageId: string }` |
| `attachment:list` | Renderer → Main | `{ messageId: string }` |

All existing channels unchanged.

**Send flow:**

1. Renderer pre-generates a UUID for the user message before sending.
2. Renderer calls `attachment:ingest` with that UUID as `messageId` → main copies files, extracts content, writes DB rows, returns `Attachment[]`.
3. Renderer holds the returned `Attachment[]` in component state (for chip display only — not written to DB by the renderer).
4. Renderer calls `chat:send` with the same pre-generated `messageId`.
5. Main's `chat:send` handler fetches the already-stored attachments from DB by `messageId` and passes them to the adapter.

---

## UI

### Input bar

- Paperclip icon button left of the textarea — opens native file dialog filtered to supported types.
- Drag and drop anywhere on the chat area also accepted.
- Selected files appear as chips above the textarea: filename + × remove button.
- Send button disabled while ingestion is in progress.
- Files over 20 MB or unsupported types show an inline error chip ("File too large" / "Unsupported file type") and are not queued.

**Supported types filter:** `image/*`, `.pdf`, `.txt`, `.md`, `.csv`, `.docx`, `.xlsx`

### Message history

- Sent messages with attachments show an attachment row below the bubble: file icon, original filename, file size.
- Images additionally render as a thumbnail (max 200px wide) inline above the message text.
- Clicking a non-image attachment is a no-op in v1.

---

## Error Handling

| Scenario | Behaviour |
| --- | --- |
| File > 20 MB | Rejected at input; error chip shown; nothing written |
| Unsupported MIME type | Rejected at input; error chip shown |
| Extraction failure | Attachment saved with `extractionError: true`; adapter uses filename only |
| File missing at send time | Adapter skips missing file, logs warning; message sends with remaining attachments |

---

## Testing

- **`AttachmentService` unit tests** (`src/main/attachments/service.test.ts`): mock filesystem; verify copy + extraction per MIME type; verify `getContent()` output format; verify `purge()` removes file and DB row; verify 20 MB rejection.
- **Adapter unit tests**: verify `--file` flag used by Claude for supported types; verify content injection format for Gemini and Opencode; verify graceful skip for missing files.
- **`ConvStore` tests**: attachment CRUD assertions.

---

## Dependencies

Three new npm packages (main process only):

- `pdf-parse` — PDF text extraction
- `mammoth` — `.docx` extraction
- `xlsx` — `.xlsx` extraction

---

## Out of Scope (v1)

- Opening/downloading attachments from history.
- Attachment support in pipeline steps (attachments apply to the first step only — pipeline routing is a v2 concern).
- Cloud storage or syncing of attachment files.
- Video or audio files.
