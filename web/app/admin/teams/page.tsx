"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";

import { TeamBadge } from "@/components/TeamBadge";
import { useApp } from "@/context/AppProvider";
import { useAuth } from "@/context/AuthProvider";
import type { Team } from "@/lib/types";

export default function AdminTeamsPage() {
  const { user } = useAuth();
  const { teams, saveTeam } = useApp();
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    name: "",
    shortName: "",
    city: "",
    primaryColor: "#00C4FF",
    secondaryColor: "#FFFFFF",
    logoFile: null as File | null,
    preview: "" as string,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (user?.role !== "administrador") {
    return <p className="text-[var(--muted)]">Acceso solo admin.</p>;
  }

  const edit = (team: Team) => {
    setForm({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      city: team.city,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      logoFile: null,
      preview: team.logoUrl ?? "",
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await saveTeam({
        id: form.id,
        name: form.name,
        shortName: form.shortName,
        city: form.city,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        logoFile: form.logoFile,
      });
      setForm({
        id: undefined,
        name: "",
        shortName: "",
        city: "",
        primaryColor: "#00C4FF",
        secondaryColor: "#FFFFFF",
        logoFile: null,
        preview: "",
      });
      setMsg("Equipo guardado.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <ArrowLeft size={16} /> Admin
      </Link>
      <h1 className="text-2xl font-bold">Equipos y logos</h1>

      <form onSubmit={onSubmit} className="card space-y-3 p-5">
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--elevated)]">
          {form.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.preview} alt="Logo" className="h-24 w-24 object-contain" />
          ) : (
            <span className="text-sm text-[var(--primary)]">Seleccionar logo (máx 2 MB)</span>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file && file.size > 2 * 1024 * 1024) {
                setMsg("Logo demasiado grande (máx 2 MB).");
                return;
              }
              setForm((f) => ({
                ...f,
                logoFile: file,
                preview: file ? URL.createObjectURL(file) : f.preview,
              }));
            }}
          />
        </label>
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Abreviatura</label>
            <input
              className="input"
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {form.id ? "Actualizar equipo" : "Crear equipo"}
        </button>
        {msg && <p className="text-sm text-[var(--muted)]">{msg}</p>}
      </form>

      <div className="space-y-2">
        <h2 className="font-bold">Equipos registrados</h2>
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => edit(team)}
            className="card flex w-full items-center gap-3 p-3 text-left hover:border-[var(--primary)]/40"
          >
            <TeamBadge team={team} size={44} />
            <div className="flex-1">
              <p className="font-semibold">{team.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {team.shortName}
                {team.city ? ` · ${team.city}` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
