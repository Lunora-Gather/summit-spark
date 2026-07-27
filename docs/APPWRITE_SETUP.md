# Appwrite cloud saves

The public client uses the vendored Appwrite Web SDK `26.2.0` against the
`summit-spark` project. The matching upstream license is kept in `public/vendor/`.

## Provisioned resources

- Endpoint: `https://fra.cloud.appwrite.io/v1`
- Project: `summit-spark`
- Database: `summit-spark`
- Table: `saves`
- Web platforms: `localhost`, `127.0.0.1`, `lunora-gather.github.io`
- Enabled auth: email/password and email OTP

Only Account, Databases/TablesDB, and REST are needed by the public client.
Unused project services, GraphQL, WebSocket, JWT, anonymous, phone, magic-link,
and invite authentication are disabled. The live project also enforces:

- 30-day maximum session duration
- 5 concurrent sessions per account
- the last 3 passwords cannot be reused
- common-password and personal-data password checks
- email alerts for new sessions

`node tools/check-appwrite-contract.js` locks these settings in the repository.
After changing them, use Appwrite CLI 23.1.0 or newer and verify the live
`session-duration`, `session-limit`, `password-history`, and `session-alert`
policies individually. Older CLI releases can report a successful settings push
while leaving some project policies unchanged.

The table has row security enabled. Authenticated users can create rows, and each
save row uses the Appwrite user ID as its row ID with read, update, and delete
permissions restricted to that user.

## Save format

Each row stores:

- `build`: public build identifier
- `archive`: the existing `summit-spark-save` JSON archive

The archive contains settings, profile, room PBs, route paths, Focus/Drill data,
best run time, and best Flow. It does not contain passwords, OTP values, or
Appwrite session secrets.

On first login, an empty cloud slot is populated from the browser. If both local
and remote progress exist and differ, the UI requires an explicit choice before
automatic sync begins. Later writes are debounced and uploaded automatically.

## CLI

`appwrite.config.json` binds this repository to the provisioned project. It only
contains public organization/project identifiers and the `fra` endpoint; login
sessions remain in the developer's Appwrite CLI profile and must never be
committed.

The browser accepts save archives up to 1 MB. The live `archive` column is
`longtext` (off-page storage), so a complete ten-room route history can be
uploaded without colliding with the table's 64 KB inline-row budget.
