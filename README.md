# Pretty

Shows JSON, JSON Lines, YAML, TOML, and XML files formatted in the file
viewer. The Formatted view re-indents the file, and the Raw view shows it as
written. Copy copies whichever view is on screen.

- **Formats:** `.json`, `.jsonc` (comments and trailing commas are accepted),
  `.jsonl` / `.ndjson`, `.yaml` / `.yml`, `.toml`, `.xml`, `.plist`, `.csproj`,
  `.xsd`.
- **Errors:** a file that does not parse shows its error with the line and
  column, and the file as written, in both views. A file that cannot be read
  shows the reason it could not be read.
- **Large files:** above 5 million characters a file opens in Raw; switch to
  Formatted to format it.
- **Default opener:** BB's built-in editor also opens json, yaml, toml, and
  xml. BB picks the first opener in plugin-id order, and this plugin's id
  (`file-pretty`) sorts before the built-in `monaco-editor`, so Pretty opens
  these by default. To open a file in BB's editor instead, use "Open with", or
  set it under Settings → Files.

TOML is re-stringified, so comments in a TOML file do not appear in the
Formatted view.

Sample files for each format, including two broken ones, are in `examples/`.

The formatting runs in the browser. The backend reads the file through
`bb.sdk.files`, using the opener's workspace, thread-storage, or host source,
and refuses paths that leave their root.

Build with `bb plugin build`; install with `bb plugin install .`.
