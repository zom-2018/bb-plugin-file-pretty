# Examples

Sample files for trying the plugin in the file viewer. Each valid file opens in
the Formatted view; the two `broken-*` files show the error banner with the
file as written. `src/examples.test.ts` checks these files, so they stay in
step with the formatter.

| File | Format | What to look for |
| --- | --- | --- |
| `config.json` | JSON | A `//` comment and a trailing comma are kept; the file is re-indented |
| `events.jsonl` | JSON Lines | Three records, each expanded; the blank line is skipped |
| `deploy.yaml` | YAML | Comments and the `&defaults` anchor and `<<:` merge key are kept; flow lists stay inline (`[ 80, 443 ]`) |
| `settings.toml` | TOML | The inline table `pool = {…}` becomes `[database.pool]`; the top comment is gone (TOML is re-stringified) |
| `feed.xml` | XML | One line of XML, expanded and indented |
| `broken-config.json` | JSON | Error at line 3, column 3: a comma is missing after `"demo-service"` |
| `broken-feed.xml` | XML | Error at line 5: `</feeds>` does not close `<feed>` |

Use the Raw toggle to compare with the file as written, and the Indent select
to switch between 2 and 4 spaces.

BB's built-in editor also opens json, yaml, toml, and xml. Pretty opens these
by default, because its plugin id (`file-pretty`) sorts before `monaco-editor`.
To open one in the built-in editor, use "Open with", or set it under Settings
→ Files.
