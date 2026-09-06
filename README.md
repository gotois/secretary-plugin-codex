# Secretary plugin for Codex

`secretary-plugin-codex` is the standalone repository for the `secretary-codex`
marketplace and its `secretary` plugin. It packages planning skills and a remote
Secretary MCP connection for Codex.

## Repository layout

- `.agents/plugins/marketplace.json` — marketplace catalog.
- `plugins/secretary/.codex-plugin/plugin.json` — plugin manifest.
- `plugins/secretary/.mcp.json` — remote Secretary MCP connection.
- `plugins/secretary/skills` — bundled Secretary skills.
- `tests/plugin.test.mjs` — standalone package checks using Node.js built-ins.

Codex loads the workflows from the installed plugin. The remote MCP server
provides live data, authorization, validation, and task actions; its code and
the calendar UI are maintained in the Secretary server and app repositories.

## Install from Git

After this directory is published as its own repository:

```sh
codex plugin marketplace add <owner>/secretary-plugin-codex
codex plugin add secretary@secretary-codex
```

Replace `<owner>` with the GitHub repository owner. The repository name and
marketplace identifier are intentionally different.

Open a new Codex task after installation to load the plugin's skills and tools.
Connect the Secretary MCP server through the host's authentication flow using
your own Secretary account. The server advertises OAuth scopes `openid`,
`profile`, and `offline_access`; tokens belong in the host's credential storage.

The default endpoint is `https://api.gotointeractive.com/mcp`. To use your own
Secretary deployment, change `url` in `plugins/secretary/.mcp.json` in your fork
before installation. The package does not require a personal registered App ID
or contain credentials. Do not add access tokens, authorization headers, or
personal `.app.json` files to the repository.

The host must support MCP Apps to display the task confirmation form. New tasks
are saved only after confirmation in that UI. If the host cannot display it,
finish creation in the Secretary UI. ChatGPT distribution and registered
connections require separate setup; installing this Git marketplace does not
publish a ChatGPT plugin.

## Checks

With Node.js 22 or newer, run from this repository's root; no `npm install` is
required:

```sh
node --test tests/plugin.test.mjs
```

GitHub Actions runs the same checks on a clean checkout. They validate package
paths, release metadata, MCP configuration, and bundled skill references, not
live authentication or model behavior.

Before a release, install from a clean clone and use a test account to check:

- Read today's availability, including the user's timezone.
- Prepare a new task: cancelling must save nothing; confirming must save one task.
- Move an existing task: its ID, status, and duration must remain unchanged;
  no new task should appear. Renaming it must not require a new free time slot.
- Try ambiguous task names, conflicts, and an unavailable MCP server: the plugin
  must explain the limitation without substituting task creation for an edit.

## Releases and limitations

Use Git tags for marketplace releases and keep the version in
`plugins/secretary/.codex-plugin/plugin.json` in sync (for example, `0.0.1` and
`v0.0.1`). Keep local `+codex.<timestamp>` cachebusters out of release commits.

Life balance analysis is available in conversation. Persisting structured life
areas, tags, and score history requires server support that is not implemented
in the current Secretary backend. The skill must report that limitation and
must not claim to have saved those values.

The plugin is licensed under the Apache License, Version 2.0. See
[LICENSE](LICENSE).

## Use from the Secretary monorepo

The intended submodule path in the Secretary monorepo is:

```text
plugin-codex
```

The directory is currently tracked as ordinary files in the monorepo. Publish
its contents as the root of `secretary-plugin-codex` first; conversion to a
submodule requires that repository's URL and an existing commit. Do not publish
the parent monorepo's `.git` directory or unrelated history with the plugin.
