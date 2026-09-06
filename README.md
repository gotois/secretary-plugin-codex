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

## Releases

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
