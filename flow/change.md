# Master Password Change – Implementation Plan and Milestones

This document tracks the end‑to‑end plan for safely implementing master password rotation (change) in Whisperrauth with zero data loss and zero downtime. It is designed to be executed incrementally with strong guarantees: no plaintext exposure, no irreversible states, and fully atomic recovery paths.

## Current Model (as‑is)
- Key derivation: PBKDF2(SHA‑256, iterations=200k) from master password with salt = SHA‑256(userId) (logic.ts: deriveKey + unlock path)
- Working master key: AES‑GCM 256 CryptoKey, held only in memory; extractable (for passkey wrap)
- Data encryption: AES‑GCM with IV=16 bytes; base64(iv+ciphertext). Fields encrypted in `credentials` and `totpSecrets`. Decrypts on the client before use.
- Integrity check: `user.check` stores an encrypted sentinel (JSON.stringify(userId)) with the current master key. Used to validate passwords in unlock.
- No server‑side knowledge of password or key. Vault lock state is in sessionStorage only.

Implications: Since all encryption is client‑side with a single master key, rotating the master password requires re‑deriving a new key and re‑wrapping all encrypted data and the `check` value. This must be done entirely client‑side and atomically from the user’s perspective.

## High‑level Strategy
Perform an online, resumable, client‑side re‑encryption (aka key rotation) using a dual‑key staging window:
1) Authenticate and unlock with old master password (have oldKey in memory).
2) Derive new master key from new master password deterministically (same salt strategy).
3) Create a rotation session (client‑side state + server flag) to mark rekey in progress.
4) Rewrap all encrypted fields from oldKey to newKey in batches with idempotent updates.
5) Update `user.check` with newKey.
6) Atomically flip the server flag to “complete”.
7) Lock and require re‑unlock with new password.

This preserves data, allows resumability, and avoids partial corrupt states by maintaining an explicit progress cursor and idempotent writes.

## Milestones

### M1 – Readiness and Safety Primitives
- Add a rotation capability bit in client (no server schema changes required beyond using `user.check`); progress tracked in a user‑scoped document/metadata field (if a generic metadata field exists) or via per‑doc markers. If not available, store progress locally and re‑validate using decrypt‑ability.
- Add a dedicated “RekeySession” client object to hold:
  - oldKey, newKey (in memory only)
  - progress cursor: last processed document IDs per collection
  - batch size configuration and backoff
  - integrity counters (success/fail)
- Add rigorous invariants and abort conditions; enforce read‑verify‑write patterns.

Success criteria: No writes happen until verification of both keys; ability to simulate dry‑run (decrypt then encrypt but discard write) for N docs.

### M2 – API Surfaces (UI + Hooks)
- Settings UI: “Change Master Password” flow with steps: verify current password -> enter new password (+ confirm + strength) -> optional dry‑run -> rekey progress with pause/resume -> completion.
- Hook/services:
  - deriveNewKey(newPassword)
  - scanEncryptedDocs(userId, paging)
  - rewrapDoc(collection, doc, oldKey, newKey)
  - updateUserCheck(newKey)
  - resumeFromCursor(cursor)
  - abortAndRollbackSafety (see Risks)

Success criteria: UI can run a no‑write dry‑run over first K documents and report decrypt‑ability rate with oldKey and re‑encrypt‑ability with newKey.

### M3 – Core Re‑encryption Engine
- For each collection with encrypted fields (`credentials`, `totpSecrets`):
  - List documents by userId in bounded pages.
  - For each doc:
    - Decrypt each encrypted field with oldKey.
    - Immediately re‑encrypt each plaintext with newKey in memory.
    - Write an idempotent update containing only changed encrypted fields.
    - Store progress cursor after successful write.
- Ensure write path is the same as normal app path (uses encryptField/decryptField with injected key), but the engine must bypass global `masterPassCrypto.masterKey` to avoid concurrent unlock timer interference; use explicit key parameters.
- Update `user.check` to the newKey only after all docs succeed. If any failure, don’t change `check`.

Success criteria: 100% of candidate docs rewrapped and verified; in case of failure, the vault remains fully unlockable with old password and consistent.

### M4 – Atomic Flip + Lock
- After all docs rewrapped and verified, update `user.check` atomically with newKey.
- Purge oldKey from memory, lock vault, and require user to unlock with new password.

Success criteria: Post‑flip, old password fails to unlock; new password unlocks and decrypts sample docs.

### M5 – Resumability and Edge Cases
- If a session interrupts mid‑way (tab closed, network error):
  - On next start, detect partial progress via cursor and verify decryptability with the currently valid key (based on `check`).
  - If `check` still bound to oldKey: continue rekey from cursor.
  - If `check` already flipped: treat as completed.
- Bypass corrupted entries safely: skip with logging, never delete. Leave unmodified docs decryptable by oldKey until completion; do not flip `check` until all required docs are converted.

Success criteria: Killing the browser mid‑rotation and resuming does not lose data or leave the user locked out.

## Risks and Mitigations
- Wrong new password typed (human error): derive newKey and verify by test encrypt/decrypt on memory‑only sentinel before any writes.
- Partial writes / network failures: use cursor after each successful update; idempotent updates (rewriting same cipher is safe).
- Data previously stored in plaintext/legacy: engine treats non‑base64 or short strings as plaintext; encrypt with newKey without attempting to decrypt with oldKey.
- Mixed IV/key versions: engine reads iv+ciphertext envelope and re‑encrypts with current parameters; keep AES‑GCM 16B IV for consistency; avoid format changes.
- Concurrency: block concurrent writes by UI during rotation via app‑wide maintenance guard; warn user and provide pause.
- Passkey flows: since master key can be imported, rotation must re‑export newKey as needed for passkey rewrap; verify passkey unlock post‑rotation.
- Privacy: no key or password leaves the device; all operations client‑side.

## Success Metrics
- 0% data loss; 0% irreversible corruption in simulated failure cases.
- 100% decrypt‑and‑rewrap success for encrypted docs or safe fallback for legacy/plain docs.
- Post‑rotation, unlock succeeds with new password, fails with old, and all user docs decrypt normally.

## Implementation Notes (Code‑oriented)
- Do NOT change crypto primitives or parameters for this feature. Only rewrap ciphertext under a new key derived with the same salt strategy. Maintain AES‑GCM + base64(iv|ct) envelope exactly.
- Extend `MasterPassCrypto` with:
  - deriveKeyFromPassword(password, userId): Promise<CryptoKey>
  - decryptWithKey(encrypted, key): Promise<string>
  - encryptWithKey(plaintext, key): Promise<string>
  - rewrapEncryptedField(encryptedOrPlain, oldKey, newKey): Promise<string>
  - rewrapDocument(doc, fields[], oldKey, newKey): Promise<docUpdate>
- Add a `RekeyService` in settings scope to orchestrate scanning listDocuments(userId, paging) and updating.
- Never modify `types/appwrite.d.ts` or server schema. Use existing collections.

## Rollout Plan
- Ship behind a feature flag visible only on Settings for beta users (env‑gated).
- Add verbose client‑side logging gated by DEBUG flag.
- Provide a one‑click dry‑run report.
- Provide a final confirmation gate with explicit risks and recovery steps.

## Recovery Steps (User‑visible)
- If rotation fails: nothing flips; keep using old password. Retry later; progress is preserved.
- If user forgot new password mid‑process: cancel; still on old password until final flip.
- As a last resort, “Reset Master Password” remains available (data wipe) – clearly separated and not part of rotation.

## Milestone Checklist
- [ ] M1 Safety primitives and rekey session scaffolding
- [ ] M2 UI flow, validations, dry‑run
- [ ] M3 Engine: scan, rewrap, idempotent updates, cursors
- [ ] M4 Atomic check flip + lock
- [ ] M5 Resume + edge cases, passkey re‑wrap validation
