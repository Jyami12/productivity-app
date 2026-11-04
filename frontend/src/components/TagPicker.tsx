import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const defaults = ["Deep work", "Studying", "Reading", "Creative work"];

type Props = {
  value: string;
  disabled: boolean;
  onChange: (tag: string) => void;
};

export default function TagPicker(props: Props) {
  const auth = useAuth();
  return <AccountTagPicker key={auth?.user.id ?? "sample"} {...props} userId={auth?.user.id} />;
}

function AccountTagPicker({ value, disabled, onChange, userId }: Props & { userId?: string }) {
  const [custom, setCustom] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!userId);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (userId) api.tags().then(
      tags => { if (!cancelled) setCustom(tags.map(t => t.name)); },
      () => { if (!cancelled) setError("Couldn't load your tags. Try again."); },
    ).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, attempt]);
  const options = [...defaults];
  for (const tag of [...custom, value]) {
    if (!options.some(t => t.toLowerCase() === tag.toLowerCase())) options.push(tag);
  }
  async function create() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 40 || busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const preset = defaults.find(t => t.toLowerCase() === trimmed.toLowerCase());
      const saved = preset ?? (await api.createTag(trimmed)).name;
      setCustom(previous => previous.includes(saved) ? previous : [...previous, saved]);
      onChange(saved);
      setName("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fields).flat().filter(Boolean).join(" ") || err.message : "Couldn't save your tag. Try again.");
    } finally { setBusy(false); }
  }
  return <div className="tag-picker">
    <label>Working on
      <select aria-label="Working on" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
        {options.map(t => <option key={t}>{t}</option>)}
      </select>
    </label>
    {userId ? <>
      <button type="button" disabled={disabled || busy || loading} onClick={() => setAdding(!adding)}>{adding ? "Cancel new tag" : "+ Create tag"}</button>
      {loading && <small role="status">Loading your tags…</small>}
      {adding && <div className="tag-create">
        <label>New tag
          <input value={name} maxLength={40} disabled={busy || disabled} placeholder="e.g. Senior project" onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
        </label>
        <button type="button" disabled={busy || disabled || !name.trim()} onClick={() => void create()}>{busy ? "Saving…" : "Save tag"}</button>
        <small>Saved to your account · up to 40 characters</small>
      </div>}
      {error && <div role="alert">{error} <button type="button" disabled={busy || loading} onClick={() => { setLoading(true); setError(""); setAttempt(a => a + 1); }}>Reload tags</button></div>}
    </> : <small>Sign in to create and save your own tags.</small>}
  </div>;
}
