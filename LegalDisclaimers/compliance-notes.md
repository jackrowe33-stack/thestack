# Compliance implementation notes — data rights

> Practical checklist of what the app must actually *do* (not just say) to back up the Privacy Policy. Not legal advice.

## Account deletion (required)

The Privacy Policy promises in-app account deletion. This must be a real, working feature before publish. It needs to:

1. Delete the user's Firestore data: `users/{uid}/core/current`, all `users/{uid}/journal/*`, all `users/{uid}/completions/*`, and the `users/{uid}` doc itself.
2. Delete the Firebase Auth user record (so the email can be reused / is truly gone).
3. Clear the local device cache (`localStorage['stack_v1']` and Firestore's IndexedDB cache).
4. Purge KV backup snapshots within the stated window ([30] days) — the Worker currently writes `snap:{timestamp}` entries with a 30-day TTL, which already satisfies auto-expiry, but confirm no `db` key retains deleted data.

**Note:** deleting the Auth user from the client may require recent re-authentication (Firebase security). Plan for a "confirm your password / re-sign-in to delete" step.

## Data export (required)

The Privacy Policy promises export. The app already has an **Export backup** feature (JSON download) — confirm it captures the full dataset now that data lives in Firestore (journal + completions included), not just what was in localStorage. This likely satisfies the access/portability obligation, but verify completeness.

## Consent for sensitive/health information

The onboarding collects skin concerns, health-adjacent notes, and (via antihistamine-type context) potentially health information. Best practice:

- Show the medical disclaimer + a link to the Privacy Policy during onboarding, before collecting sensitive fields.
- Make sensitive fields clearly optional.

## AI data flow transparency

Users should understand, before first use of the assistant, that their messages + routine context + recent journal entries are sent to a third-party processor. A one-time notice on first AI use (with the persistent short disclaimer beneath the input thereafter) covers this.

## Where to surface the documents

- **Privacy Policy + Terms:** linked from the auth gate (the footer already references them — wire the links), and from Settings.
- **Medical disclaimer:** persistent short version beneath the AI input and in onboarding; full version linked from Settings.
- **Account deletion + export:** in Settings → Account.

## Before public launch — minimum bar

- [ ] Working account deletion (data + auth record + local cache)
- [ ] Verified-complete data export
- [ ] Privacy Policy + Terms hosted and linked (auth gate + Settings)
- [ ] Persistent medical disclaimer on AI + onboarding
- [ ] First-use AI data notice
- [ ] All [BRACKETED] placeholders filled with real details
- [ ] Documents reviewed by a qualified lawyer
