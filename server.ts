import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";
import { joinPath, relativeSegments, isAbsolutePath } from "./src/paths";

/** Where the file opener's file lives, as the opener reports it. */
export const rpcContract = defineRpcContract({
  readFile: {
    input: z
      .object({
        kind: z.enum(["workspace", "host", "thread-storage"]),
        path: z.string().min(1),
        threadId: z.string().nullable(),
        environmentId: z.string().nullable(),
        hostId: z.string().nullable(),
      })
      .strict(),
    output: z.object({ content: z.string(), sizeBytes: z.number() }),
  },
});

type ReadFileInput = z.infer<typeof rpcContract.readFile.input>;

export default function plugin(bb: BbPluginApi) {
  bb.rpc.register(rpcContract, {
    async readFile(input) {
      const target = await resolveTarget(bb, input);
      const file = await bb.sdk.files.read(target);
      if (file.contentEncoding !== "utf8") {
        throw new Error("This file is not UTF-8 text.");
      }
      return { content: file.content, sizeBytes: file.sizeBytes };
    },
  });
}

async function resolveTarget(bb: BbPluginApi, input: ReadFileInput) {
  if (input.kind === "host") {
    if (!isAbsolutePath(input.path)) throw new Error("A host file path must be absolute.");
    return { hostId: input.hostId ?? undefined, path: input.path };
  }

  const segments = relativeSegments(input.path);
  if (input.kind === "workspace") {
    if (!input.environmentId) throw new Error("This file has no workspace.");
    const environment = await bb.sdk.environments.get({ environmentId: input.environmentId });
    if (!environment.path) throw new Error("This workspace has no path on its host.");
    return {
      hostId: environment.hostId,
      rootPath: environment.path,
      path: joinPath(environment.path, segments),
    };
  }

  if (!input.threadId) throw new Error("This file has no thread storage.");
  const location = await bb.sdk.threads.storageLocation({ threadId: input.threadId });
  return {
    hostId: location.hostId,
    rootPath: location.storageRootPath,
    path: joinPath(location.storageRootPath, segments),
  };
}
