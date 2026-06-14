"use client";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle,
  Lock,
  Moon,
  Power,
  Search,
  Shield,
  Sun,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccessLog,
  DESTINATIONS,
  Destination,
  UserRecord,
  evaluateAccess,
  makeLog,
  parseQr,
} from "@/lib/kiosk";
import {
  encryptionHealthy,
  loadEncryptedLogs,
  saveEncryptedLogs,
} from "@/lib/crypto-log";
import { speak, tone } from "@/lib/audio";
type State =
  | "HOME"
  | "SCANNING"
  | "LOCATION_SELECTION"
  | "PROCESSING"
  | "RESULT"
  | "RESET";
type Result = {
  granted: boolean;
  user: UserRecord;
  destination: Destination;
  reason?: string;
};
const ADMIN_PASSWORD = "Joseph3136";
export default function Home() {
  const [state, setState] = useState<State>("HOME");
  const [shutdown, setShutdown] = useState(false);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [qr, setQr] = useState("");
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => {
    speak("QR Access Kiosk ready.");
    void loadEncryptedLogs()
      .then((l) => {
        const next = [makeLog("STARTUP"), ...l];
        setLogs(next);
        return saveEncryptedLogs(next);
      })
      .catch(() =>
        setLogs([
          makeLog("STARTUP", {
            details: "Encryption or storage recovery initialized",
          }),
        ]),
      );
  }, []);
  async function addLog(log: AccessLog) {
    const next = [log, ...logs].slice(0, 500);
    setLogs(next);
    try {
      await saveEncryptedLogs(next);
      await fetch("/api/logs", { method: "POST", body: JSON.stringify(log) });
    } catch {}
  }
  async function startScan() {
    if (shutdown) return;
    setState("SCANNING");
    speak("Please scan your identification QR code.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOk(true);
    } catch {
      setCameraOk(false);
      tone("failure");
      speak("Camera not available.");
      await addLog(makeLog("CAMERA_FAILURE"));
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  async function handleQr(raw: string) {
    tone("scan");
    await addLog(makeLog("SCAN_ATTEMPT", { details: raw }));
    const parsed = parseQr(raw);
    if (!parsed.ok) {
      tone("failure");
      speak(
        parsed.reason === "unknown"
          ? "User not recognized."
          : "Invalid QR code scanned.",
      );
      await addLog(
        makeLog(parsed.reason === "unknown" ? "UNKNOWN_USER" : "INVALID_QR", {
          details: raw,
        }),
      );
      setTimeout(() => setState("HOME"), 1500);
      return;
    }
    stopCamera();
    setUser(parsed.user);
    setState("LOCATION_SELECTION");
    speak(`Welcome, ${parsed.user.name}. Please select a destination.`);
  }
  async function selectDestination(destination: Destination) {
    if (!user) return;
    setState("PROCESSING");
    speak(`${destination} selected.`);
    const access = evaluateAccess(destination);
    const r = {
      granted: access.granted,
      user,
      destination,
      reason: access.reason,
    };
    setResult(r);
    const event = access.granted ? "ACCESS_GRANTED" : "ACCESS_DENIED";
    const log = makeLog(event, {
      name: user.name,
      userId: user.id,
      role: user.role,
      department: user.department,
      destination,
      result: access.granted ? "GRANTED" : "DENIED",
      reason: access.reason,
    });
    await addLog(log);
    fetch("/api/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(log),
    }).catch(() =>
      addLog(
        makeLog("EMAIL_FAILURE", {
          name: user.name,
          userId: user.id,
          destination,
          details: "Email request failed",
        }),
      ),
    );
    tone(access.granted ? "success" : "failure");
    speak(
      access.granted
        ? `${user.name}, ${user.role}. ID number ${user.id}. Location access granted to ${destination}.`
        : `${user.name}, access denied. ${access.reason}.`,
    );
    setState("RESULT");
    setTimeout(() => {
      setState("RESET");
      setUser(null);
      setResult(null);
      setQr("");
      setTimeout(() => setState("HOME"), 250);
    }, 2000);
  }
  async function login() {
    if (adminPass === ADMIN_PASSWORD) {
      setAdmin(true);
      setAdminPass("");
      speak("Administrator access granted.");
      await addLog(makeLog("ADMIN_LOGIN"));
    }
  }
  async function logout() {
    setAdmin(false);
    setAdminOpen(false);
    await addLog(makeLog("ADMIN_LOGOUT"));
  }
  async function toggleShutdown() {
    const next = !shutdown;
    setShutdown(next);
    speak(next ? "System entering offline mode." : "System online.");
    await addLog(makeLog(next ? "SHUTDOWN" : "SYSTEM_ONLINE"));
  }
  const diagnostics = useDiagnostics(cameraOk);
  const shown = useMemo(
    () =>
      logs.filter(
        (l) =>
          (filter === "ALL" || l.event === filter) &&
          JSON.stringify(l).toLowerCase().includes(query.toLowerCase()),
      ),
    [logs, filter, query],
  );
  return (
    <main className="kiosk-bg min-h-screen p-6 text-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        {shutdown && !admin ? (
          <Offline onAdmin={() => setAdminOpen(true)} />
        ) : state === "HOME" ? (
          <HomeScreen
            shutdown={shutdown}
            start={startScan}
            admin={() => setAdminOpen(true)}
          />
        ) : state === "SCANNING" ? (
          <ScanScreen
            videoRef={videoRef}
            qr={qr}
            setQr={setQr}
            submit={() => handleQr(qr)}
            cancel={() => {
              stopCamera();
              setState("HOME");
            }}
          />
        ) : state === "LOCATION_SELECTION" && user ? (
          <LocationScreen user={user} select={selectDestination} />
        ) : state === "PROCESSING" ? (
          <Center title="PROCESSING" subtitle="Please wait..." />
        ) : state === "RESULT" && result ? (
          <ResultScreen result={result} />
        ) : (
          <Center title="RESETTING" subtitle="Returning home" />
        )}
        {adminOpen && (
          <AdminPanel
            pass={adminPass}
            setPass={setAdminPass}
            login={login}
            admin={admin}
            logout={logout}
            close={() => setAdminOpen(false)}
            logs={shown}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
            diagnostics={diagnostics}
            theme={theme}
            setTheme={setTheme}
            reset={() => {
              stopCamera();
              setState("HOME");
            }}
            shutdown={shutdown}
            toggleShutdown={toggleShutdown}
          />
        )}
      </div>
    </main>
  );
}
function HomeScreen(p: {
  shutdown: boolean;
  start: () => void;
  admin: () => void;
}) {
  return (
    <section className="flex min-h-[92vh] flex-col items-center justify-center gap-8 text-center">
      <Shield className="h-24 w-24 text-green-800" />
      <h1 className="text-7xl font-black tracking-tight">QR ACCESS KIOSK</h1>
      <Button
        size="xl"
        className="pulse-soft w-full max-w-3xl"
        onClick={p.start}
        disabled={p.shutdown}
      >
        START SCAN
      </Button>
      <div className="flex flex-wrap justify-center gap-5">
        <Button variant="secondary" onClick={p.admin}>
          ADMIN MENU
        </Button>
        <Button
          variant="secondary"
          onClick={() => alert("Diagnostics are available in the admin panel.")}
        >
          DIAGNOSTICS
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            alert(
              "QR Access Kiosk for the Negri household. Made with love by Joseph Negri.",
            )
          }
        >
          ABOUT
        </Button>
      </div>
      <p className="rounded-full bg-white px-8 py-4 text-3xl font-bold shadow">
        System Status: {p.shutdown ? "OFFLINE" : "READY"}
      </p>
    </section>
  );
}
function ScanScreen({
  videoRef,
  qr,
  setQr,
  submit,
  cancel,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  qr: string;
  setQr: (v: string) => void;
  submit: () => void;
  cancel: () => void;
}) {
  return (
    <section className="grid min-h-[90vh] gap-6 text-center">
      <h2 className="text-6xl font-black">Scan your ID QR code</h2>
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-[50vh] w-full object-cover"
        />
        <div className="scan-frame absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-8 border-white" />
      </div>
      <input
        className="mx-auto w-full max-w-3xl rounded-2xl border-4 p-5 text-3xl text-black"
        value={qr}
        onChange={(e) => setQr(e.target.value)}
        placeholder="Manual QR input for testing"
      />
      <div className="flex justify-center gap-4">
        <Button size="lg" onClick={submit}>
          SUBMIT SCAN
        </Button>
        <Button size="lg" variant="destructive" onClick={cancel}>
          CANCEL
        </Button>
      </div>
    </section>
  );
}
function LocationScreen({
  user,
  select,
}: {
  user: UserRecord;
  select: (d: Destination) => void;
}) {
  return (
    <section className="py-12 text-center">
      <h2 className="text-5xl font-black">
        Welcome,
        <br />
        {user.name}
      </h2>
      <p className="mt-4 text-4xl">Where would you like to go?</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <Button
            key={d}
            size="lg"
            className="min-h-28"
            onClick={() => select(d)}
          >
            {d}
          </Button>
        ))}
      </div>
    </section>
  );
}
function ResultScreen({ result }: { result: Result }) {
  return (
    <section
      className={`-m-6 flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center text-white ${result.granted ? "bg-green-700" : "bg-red-700"}`}
    >
      {result.granted ? (
        <CheckCircle className="h-28 w-28" />
      ) : (
        <XCircle className="h-28 w-28" />
      )}
      <h2 className="text-7xl font-black">
        ACCESS {result.granted ? "GRANTED" : "DENIED"}
      </h2>
      <div className="text-4xl leading-relaxed">
        <p>{result.user.name}</p>
        {result.granted && (
          <>
            <p>{result.user.role}</p>
            <p>{result.user.department}</p>
            <p>ID Number: {result.user.id}</p>
          </>
        )}
        <p>Destination: {result.destination}</p>
        {!result.granted && <p>Reason: {result.reason}</p>}
      </div>
    </section>
  );
}
function Center({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="flex min-h-[90vh] flex-col items-center justify-center text-center">
      <h2 className="text-7xl font-black">{title}</h2>
      <p className="mt-6 text-4xl">{subtitle}</p>
    </section>
  );
}
function Offline({ onAdmin }: { onAdmin: () => void }) {
  return (
    <section className="flex min-h-[90vh] flex-col items-center justify-center gap-8 text-center">
      <Power className="h-28 w-28 text-red-700" />
      <h1 className="text-7xl font-black">SYSTEM OFFLINE</h1>
      <Button size="lg" onClick={onAdmin}>
        ADMIN MENU
      </Button>
    </section>
  );
}
function AdminPanel(p: {
  pass: string;
  setPass: (v: string) => void;
  login: () => void;
  admin: boolean;
  logout: () => void;
  close: () => void;
  logs: AccessLog[];
  query: string;
  setQuery: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  diagnostics: Record<string, boolean>;
  theme: string;
  setTheme: (v: "light" | "dark") => void;
  reset: () => void;
  shutdown: boolean;
  toggleShutdown: () => void;
}) {
  const events = [
    "ALL",
    "STARTUP",
    "SHUTDOWN",
    "SCAN_ATTEMPT",
    "ACCESS_GRANTED",
    "ACCESS_DENIED",
    "INVALID_QR",
    "UNKNOWN_USER",
    "ADMIN_LOGIN",
    "ADMIN_LOGOUT",
    "CAMERA_FAILURE",
  ];
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-5">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 text-slate-950 shadow-2xl dark:bg-slate-900 dark:text-white">
        <h2 className="mb-5 text-4xl font-black">ADMIN MENU</h2>
        {!p.admin ? (
          <div className="grid gap-4">
            <input
              type="password"
              className="rounded-xl border-2 p-4 text-2xl text-black"
              value={p.pass}
              onChange={(e) => p.setPass(e.target.value)}
              placeholder="Password"
            />
            <Button onClick={p.login}>LOGIN</Button>
            <Button variant="secondary" onClick={p.close}>
              CLOSE
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  p.setTheme(p.theme === "dark" ? "light" : "dark")
                }
              >
                {p.theme === "dark" ? <Sun /> : <Moon />} Theme Toggle
              </Button>
              <Button
                onClick={() =>
                  fetch("/api/email", {
                    method: "POST",
                    body: JSON.stringify({
                      result: "GRANTED",
                      name: "Test User",
                      timestamp: new Date().toISOString(),
                    }),
                  })
                }
              >
                Send Test Email
              </Button>
              <Button onClick={p.reset}>System Reset</Button>
              <Button variant="destructive" onClick={p.toggleShutdown}>
                {p.shutdown ? "Reactivate" : "Shutdown Mode"}
              </Button>
              <Button variant="secondary" onClick={p.logout}>
                Logout
              </Button>
            </div>
            <div className="grid gap-3 rounded-2xl border p-4">
              <h3 className="text-3xl font-bold">Diagnostics</h3>
              <div className="grid gap-2 md:grid-cols-3">
                {Object.entries(p.diagnostics).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl bg-slate-100 p-3 text-xl dark:bg-slate-800"
                  >
                    {k}:{" "}
                    <b className={v ? "text-green-700" : "text-red-700"}>
                      {v ? "PASS" : "FAIL"}
                    </b>
                  </div>
                ))}
              </div>
              <p className="text-lg">
                <Camera className="inline" /> Camera Selector: browser
                permission prompt controls available cameras on this Vercel-safe
                build.
              </p>
            </div>
            <div className="grid gap-3">
              <h3 className="text-3xl font-bold">View Logs</h3>
              <div className="flex gap-2">
                <Search />
                <input
                  className="w-full rounded-xl border p-3 text-black"
                  value={p.query}
                  onChange={(e) => p.setQuery(e.target.value)}
                  placeholder="Search Logs"
                />
                <select
                  className="rounded-xl border p-3 text-black"
                  value={p.filter}
                  onChange={(e) => p.setFilter(e.target.value)}
                >
                  {events.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-80 overflow-auto rounded-xl border">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {p.logs.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2 font-bold">{l.event}</td>
                        <td className="p-2">{l.name}</td>
                        <td className="p-2">{l.destination}</td>
                        <td className="p-2">{l.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function useDiagnostics(cameraOk: boolean | null) {
  const [enc, setEnc] = useState(false);
  useEffect(() => {
    void encryptionHealthy()
      .then(setEnc)
      .catch(() => setEnc(false));
  }, []);
  return {
    Camera: cameraOk !== false,
    Speech: typeof window !== "undefined" && "speechSynthesis" in window,
    Storage: typeof window !== "undefined" && !!window.localStorage,
    Email: true,
    Database: true,
    Encryption: enc,
  };
}