/** True for a POSIX or Windows absolute path. */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(path);
}

/** Splits a root-relative path and refuses anything that leaves its root. */
export function relativeSegments(path: string): string[] {
  if (isAbsolutePath(path)) throw new Error("A workspace or thread-storage path must be relative.");
  const segments = path.split(/[\\/]/).filter((segment) => segment !== "" && segment !== ".");
  if (segments.includes("..")) throw new Error("The path leaves its root.");
  return segments;
}

export function joinPath(root: string, segments: string[]): string {
  const separator = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  return [root.replace(/[\\/]+$/, ""), ...segments].join(separator);
}
