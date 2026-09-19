import { useEffect, useRef, useState } from "react";
import { validateHome, type HomeProject } from "./core";

export type PairRequest = (
  method: string,
  path: string,
  token?: string,
  body?: unknown,
) => Promise<{ status: number; data: any }>;
export const webPairRequest: PairRequest = async (
  method,
  path,
  token,
  body,
) => {
  const r = await fetch("/api/home-labels/sessions" + path, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const KEY = "barcodemate.home.pair.v1";
export interface PairState {
  id: string;
  token: string;
  role: "owner" | "phone";
  revision: number;
  expires: number;
  ready: boolean;
  paired: boolean;
  base: HomeProject;
  draft: HomeProject;
  invite?: string;
  code?: string;
  inviteExpires?: number;
  origin?: string;
  pending?: { operation: string; revision: number; project: HomeProject };
}
export function restoredPair(): PairState | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      !p ||
      !/^[\w-]{32}$/.test(p.id) ||
      !/^[\w-]{32}$/.test(p.token) ||
      !["owner", "phone"].includes(p.role)
    )
      return null;
    p.ready = p.ready !== false;
    p.paired = !!p.paired;
    p.base = validateHome(p.base);
    p.draft = validateHome(p.draft);
    return p;
  } catch {
    return null;
  }
}
const encode = (p: HomeProject) => JSON.stringify(p);
export function usePairing(
  project: HomeProject,
  apply: (p: HomeProject) => void,
  request: PairRequest = webPairRequest,
) {
  const [connection, setConnection] = useState<PairState | null>(restoredPair);
  const state = useRef(connection),
    current = useRef(project),
    receiver = useRef(apply);
  current.current = project;
  receiver.current = apply;
  const [status, setStatus] = useState("idle"),
    [peer, setPeer] = useState(false),
    [paired, setPaired] = useState(false);
  const [conflict, setConflict] = useState<{
    revision: number;
    project: HomeProject;
  } | null>(null);
  const conflictRef = useRef(conflict);
  conflictRef.current = conflict;
  const [storageError, setStorageError] = useState(false);
  const busy = useRef(false),
    retryAt = useRef(0),
    mounted = useRef(true),
    editAt = useRef(0),
    hold = useRef(false);
  const [invite, setInvite] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("pair") || "",
  );
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    const changed = () => {
      if (!state.current?.paired)
        setInvite(
          new URLSearchParams(location.hash.slice(1)).get("pair") || "",
        );
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const save = (value: PairState | null) => {
    state.current = value;
    setConnection(value);
    try {
      if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
      else sessionStorage.removeItem(KEY);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  useEffect(() => {
    const s = state.current;
    if (s && encode(s.draft) !== encode(project)) {
      editAt.current = Date.now();
      save({ ...s, draft: project });
      if (!conflictRef.current) setStatus(s.paired ? "syncing" : "synced");
    }
  }, [project]);
  useEffect(() => {
    mounted.current = true;
    const leaving = (e: BeforeUnloadEvent) => {
      const s = state.current;
      if (s?.paired && (s.pending || encode(s.draft) !== encode(s.base))) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leaving);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", leaving);
    };
  }, []);
  const receive = (p: HomeProject) => {
    current.current = p;
    receiver.current(p);
  };
  const run = async () => {
    const s = state.current;
    if (
      s?.role === "owner" &&
      !s.paired &&
      !invite &&
      (status === "expired" || Date.now() >= s.expires)
    ) {
      if (
        !busy.current &&
        !opening &&
        Date.now() >= retryAt.current &&
        document.visibilityState !== "hidden"
      ) {
        retryAt.current = Date.now() + 15000;
        await create();
      }
      return;
    }
    if (
      !s ||
      busy.current ||
      hold.current ||
      conflictRef.current ||
      status === "expired"
    )
      return;
    if (Date.now() >= s.expires) {
      setStatus("expired");
      return;
    }
    if (document.visibilityState === "hidden") return;
    busy.current = true;
    try {
      // Persist each operation before sending. Retrying a lost response cannot add a label twice.
      if (
        (s.ready || (s.role === "owner" && s.paired)) &&
        (s.pending || !s.ready || encode(s.draft) !== encode(s.base))
      ) {
        if (!s.pending && Date.now() - editAt.current < 500) return;
        const pending = s.pending || {
          operation: crypto.randomUUID(),
          revision: s.revision,
          project: s.draft,
        };
        save({ ...s, pending });
        setStatus("syncing");
        const r = await request("PUT", "/" + s.id, s.token, pending);
        if (!mounted.current || state.current?.id !== s.id) return;
        if (r.status === 409) {
          const remote = {
            revision: r.data.revision,
            project: validateHome(r.data.project),
          };
          setConflict(remote);
          conflictRef.current = remote;
          setStatus("conflict");
          return;
        }
        if ([401, 404, 410].includes(r.status)) {
          setStatus("expired");
          return;
        }
        if (r.status !== 200) throw Error("network");
        save({
          ...state.current!,
          base: pending.project,
          revision: r.data.revision,
          pending: undefined,
          ready: true,
        });
      }
      const latest = state.current!;
      const r = await request(
        "GET",
        "/" + latest.id + "?since=" + latest.revision,
        latest.token,
      );
      if (!mounted.current || state.current?.id !== s.id) return;
      if ([401, 404, 410].includes(r.status)) {
        setStatus("expired");
        return;
      }
      if (r.status !== 200) throw Error("network");
      setPeer(s.role === "owner" ? r.data.phoneOnline : r.data.ownerOnline);
      setPaired(r.data.paired);
      const now = {
        ...state.current!,
        paired: !!r.data.paired,
        ready: !!r.data.ready,
        ...(typeof r.data.expires === "number"
          ? { expires: r.data.expires }
          : {}),
        ...(r.data.invite
          ? {
              invite: r.data.invite,
              code: r.data.code,
              inviteExpires: r.data.inviteExpires,
            }
          : {}),
      };
      save(now);
      if (r.data.project) {
        const remote = validateHome(r.data.project);
        if (encode(now.draft) !== encode(now.base)) {
          const clash = { revision: r.data.revision, project: remote };
          setConflict(clash);
          conflictRef.current = clash;
          setStatus("conflict");
          return;
        }
        // Do not replace a draft field while the user is still typing or recording.
        if (
          hold.current ||
          document.activeElement?.matches("input, textarea, select")
        )
          return;
        save({
          ...now,
          revision: r.data.revision,
          base: remote,
          draft: remote,
        });
        receive(remote);
      }
      setStatus(
        !state.current!.paired ||
          encode(state.current!.draft) === encode(state.current!.base)
          ? state.current!.role === "phone" && !state.current!.ready
            ? "syncing"
            : "synced"
          : "syncing",
      );
    } catch {
      if (mounted.current) setStatus("offline");
    } finally {
      busy.current = false;
    }
  };
  const runner = useRef(run);
  runner.current = run;
  useEffect(() => {
    if (!connection) return;
    const tick = () => void runner.current();
    tick();
    const timer = setInterval(tick, 1500);
    window.addEventListener("online", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [connection?.id]);
  const create = async () => {
    if (opening) return;
    setOpening(true);
    setStatus("syncing");
    try {
      const r = await request("POST", "", undefined, {});
      if (r.status !== 200) throw Error();
      if (!mounted.current) return;
      const p = validateHome(current.current);
      save({ ...r.data, role: "owner", base: p, draft: p });
      setPaired(false);
      setPeer(false);
      setStatus("synced");
    } catch {
      setStatus("failed");
    } finally {
      setOpening(false);
    }
  };
  const join = async (code?: string) => {
    if (opening) return;
    setOpening(true);
    setStatus("syncing");
    try {
      let nonce = sessionStorage.getItem(KEY + ".join");
      if (!nonce) {
        nonce = crypto.randomUUID();
        sessionStorage.setItem(KEY + ".join", nonce);
      }
      const r = await request("POST", "/join", undefined, {
        invite: code ? "" : invite,
        code: code?.replace(/\s/g, ""),
        nonce,
      });
      if (r.status !== 200) throw Error();
      const old = state.current;
      const p = r.data.ready
        ? validateHome(r.data.project)
        : validateHome(current.current);
      save({ ...r.data, role: "phone", base: p, draft: p });
      if (old && !old.paired)
        void request("DELETE", "/" + old.id, old.token).catch(() => {});
      receive(p);
      setInvite("");
      history.replaceState(null, "", location.pathname + location.search);
      setPaired(true);
      setStatus("synced");
    } catch {
      setStatus("failed");
    } finally {
      setOpening(false);
    }
  };
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!state.current && !invite && !autoStarted.current) {
      autoStarted.current = true;
      void create();
    }
  }, [invite]);
  const cancelJoin = () => {
    setInvite("");
    history.replaceState(null, "", location.pathname + location.search);
    setStatus("idle");
  };
  const resolve = (local: boolean) => {
    const s = state.current,
      c = conflictRef.current;
    if (!s || !c) return;
    if (!local) receive(c.project);
    save({
      ...s,
      base: c.project,
      revision: c.revision,
      draft: local ? current.current : c.project,
      pending: undefined,
    });
    conflictRef.current = null;
    setConflict(null);
    setStatus(local ? "syncing" : "synced");
  };
  const close = async () => {
    if (opening) return;
    const s = state.current;
    if (!s) return;
    setOpening(true);
    try {
      if (status !== "expired") {
        const r = await request("DELETE", "/" + s.id, s.token);
        if (![200, 401, 404, 410].includes(r.status)) throw Error();
      }
      // Keep the last working copy as an ordinary local project on this device.
      localStorage.setItem(
        "barcodemate.home.v1",
        JSON.stringify(current.current),
      );
      save(null);
      setConflict(null);
      conflictRef.current = null;
      setStatus("idle");
      setPeer(false);
      setPaired(false);
    } catch {
      setStatus("offline");
    } finally {
      setOpening(false);
    }
  };
  return {
    hold,
    connection,
    status,
    peer,
    paired,
    conflict,
    storageError,
    invite,
    opening,
    create,
    join,
    cancelJoin,
    resolve,
    close,
  };
}
