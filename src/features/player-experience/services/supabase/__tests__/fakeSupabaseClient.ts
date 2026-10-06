import type { SupabaseClient } from "@supabase/supabase-js";

// A fake Supabase client for the adapters' tests: no network. It implements only what the
// adapters call (from().select/insert/delete().eq().maybeSingle(), rpc, functions.invoke,
// storage.from().upload) and records every call. Each test decides the answers.

type Awaitable<T> = T | Promise<T>;
export interface Answer {
  data?: unknown;
  error?: { message: string; code?: string; context?: unknown } | null;
}
export type Filters = Array<[column: string, value: unknown]>;

export interface FakeHandlers {
  select?: (table: string, filters: Filters) => Awaitable<Answer>;
  remove?: (table: string, filters: Filters) => Awaitable<Answer>;
  rpc?: (name: string, args: Record<string, unknown>) => Awaitable<Answer>;
  invoke?: (
    name: string,
    options: { body?: unknown; signal?: AbortSignal },
  ) => Awaitable<Answer>;
  upload?: (
    bucket: string,
    path: string,
    body: unknown,
    options: unknown,
  ) => Awaitable<Answer>;
}

export interface FakeCall {
  kind: "select" | "delete" | "rpc" | "invoke" | "upload";
  target: string;
  payload?: unknown;
}

const ok: Answer = { data: null, error: null };
const settle = async (answer: Awaitable<Answer> | undefined) => {
  const value = await answer;
  return { data: value?.data ?? null, error: value?.error ?? null };
};

export function createFakeSupabase(handlers: FakeHandlers = {}) {
  const calls: FakeCall[] = [];

  function from(table: string) {
    const filters: Filters = [];
    let operation: "select" | "delete" = "select";
    const run = () => {
      calls.push({ kind: operation, target: table, payload: [...filters] });
      return operation === "delete"
        ? settle(handlers.remove?.(table, filters) ?? ok)
        : settle(handlers.select?.(table, filters) ?? ok);
    };
    const builder = {
      select: () => builder,
      delete: () => {
        operation = "delete";
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      maybeSingle: run,
      single: run,
      then: <T>(
        resolve: (value: Awaited<ReturnType<typeof run>>) => T,
        reject?: (reason: unknown) => T,
      ) => run().then(resolve, reject),
    };
    return builder;
  }

  const client = {
    from,
    rpc: (name: string, args: Record<string, unknown> = {}) => {
      calls.push({ kind: "rpc", target: name, payload: args });
      return settle(handlers.rpc?.(name, args) ?? ok);
    },
    functions: {
      invoke: (
        name: string,
        options: { body?: unknown; signal?: AbortSignal } = {},
      ) => {
        calls.push({ kind: "invoke", target: name, payload: options.body });
        return settle(handlers.invoke?.(name, options) ?? ok);
      },
    },
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, body: unknown, options: unknown) => {
          calls.push({
            kind: "upload",
            target: `${bucket}/${path}`,
            payload: options,
          });
          return settle(handlers.upload?.(bucket, path, body, options) ?? ok);
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}
