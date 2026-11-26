# UI contract: WEB-17 states

Labels verbatim from `../docs/ui-pipeline/screens/WEB-17-profile-account-settings.md` §4 and §7.

| State | Trigger | UI |
|---|---|---|
| Loading | `['profile']` or `['sessions']` pending | `Spinner` in place of the sections (inferred; spec lists no loading state) |
| Default | Loaded | Title `Profile`; sections `Profile`, `Password`, `Google`, `Sessions`; `Save` and `Change password` disabled |
| Google-only account | `hasPassword === false` | `Password` section not rendered |
| Google not linked | `googleLinked === false` | `Google: Not linked` |
| Photo uploaded | `avatarUrl !== null` | 80px photo; `Remove photo` shown |
| Invalid photo | Wrong type / > 5 MB / 413 / 415 | "Choose a JPG, PNG or WebP image up to 5 MB." under `Upload photo` (`role="alert"`); avatar unchanged |
| Processing | A mutation pending | Spinner only in the pressed button; that section's fields disabled |
| Wrong current password | 400 `CURRENT_PASSWORD_INCORRECT` | "Current password is incorrect." under `Current password`, `aria-invalid`, red border |
| Same password | `newPassword === currentPassword`, or 400 `NEW_PASSWORD_SAME_AS_CURRENT` | "New password must be different from the current one." under `New password`, red border, button disabled |
| Too many attempts | 429 `CHANGE_PASSWORD_LOCKED`, or `changePasswordLockedUntil` later than now on load | "Too many attempts. Try again in 15 minutes." under `Current password`, red border, button disabled until the lock time (also after reload) |
| Header avatar | Any signed-in page | Account button shows photo or initials + name; updates right after name/photo changes |
| Password changed | 204 | Toast "Password updated"; both fields cleared; sessions refetched |
| Only session | One session | Only the `This device` row; no `Sign out`, no `Sign out of all other sessions` |
| Update failed | Unmapped error | Banner "Something went wrong. Try again." above the title (`role="alert"`); entries kept; no red borders |
| Session ended | 401 `SESSION_ENDED` on any request | Redirect to `/signin?notice=signed-out` |

Session row: `<device label>` · `Last active <relative time>` · `This device` badge or `Sign out` button. Unknown agent → "Unknown device" (proposed).
