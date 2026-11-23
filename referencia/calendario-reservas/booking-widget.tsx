"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Globe,
  LoaderCircle,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackLeadCreated } from "@/lib/tracking";
import { cn } from "@/lib/utils";

const TZ = "Europe/Madrid";
const DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
] as const;
const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const longDayFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const monthFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

type Step = "pick" | "form" | "done";
type Month = { y: number; m: number }; // m: 0-11

function keyToUtcNoon(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDay(key: string) {
  return capitalize(longDayFmt.format(keyToUtcNoon(key)));
}

function formatRange(iso: string, duration: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + duration * 60_000);
  return `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function monthOf(key: string): Month {
  const [y, m] = key.split("-").map(Number);
  return { y, m: m - 1 };
}

function compareMonth(a: Month, b: Month) {
  return a.y * 12 + a.m - (b.y * 12 + b.m);
}

function addMonth({ y, m }: Month, delta: number): Month {
  const total = y * 12 + m + delta;
  return { y: Math.floor(total / 12), m: total % 12 };
}

export function BookingWidget() {
  const [duration, setDuration] = useState<number>(30);
  const [slotsByDuration, setSlotsByDuration] = useState<Record<number, string[]>>({});
  const [loadError, setLoadError] = useState(false);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<Month | null>(null);
  const [step, setStep] = useState<Step>("pick");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [business, setBusiness] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadSlots = useCallback(async (value: number) => {
    const res = await fetch(`/api/booking/slots?duration=${value}`, { cache: "no-store" });
    if (!res.ok) throw new Error("slots_failed");
    const data: { slots: string[] } = await res.json();
    setSlotsByDuration((prev) => ({ ...prev, [value]: data.slots }));
  }, []);

  const fetchAll = useCallback(
    () => Promise.all(DURATIONS.map((d) => loadSlots(d.value))).catch(() => setLoadError(true)),
    [loadSlots]
  );

  function loadAll() {
    setLoadError(false);
    fetchAll();
  }

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const slots = slotsByDuration[duration];

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots ?? []) {
      const key = dayKeyFmt.format(new Date(iso));
      map.set(key, [...(map.get(key) ?? []), iso]);
    }
    return map;
  }, [slots]);

  const availableDays = useMemo(() => [...slotsByDay.keys()], [slotsByDay]);

  // Si el día elegido no tiene huecos con esta duración, se muestra el primero libre.
  const selectedDay = pickedDay && slotsByDay.has(pickedDay) ? pickedDay : (availableDays[0] ?? null);

  const todayKey = dayKeyFmt.format(new Date());
  const minMonth = monthOf(todayKey);
  const maxMonth = availableDays.length ? monthOf(availableDays[availableDays.length - 1]) : minMonth;
  const month = visibleMonth ?? (selectedDay ? monthOf(selectedDay) : minMonth);

  function pickSlot(iso: string) {
    setSelectedSlot(iso);
    setSubmitError(null);
    setStep("form");
  }

  // La librería de teléfonos solo se descarga cuando el cliente llega a este campo.
  async function checkPhone(value: string) {
    const { normalizePhone } = await import("@/lib/phone");
    const valid = normalizePhone(value) !== null;
    setPhoneError(!valid);
    return valid;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || submitting) return;
    setSubmitError(null);
    if (!(await checkPhone(phone))) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: selectedSlot, duration, name, email, phone, business, website }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setSubmitError("Ese hueco se acaba de ocupar. Elige otra hora, por favor.");
        setSelectedSlot(null);
        setStep("pick");
        loadAll();
        return;
      }
      if (data.error === "invalid_phone") {
        setPhoneError(true);
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || "book_failed");
      trackLeadCreated(data.eventId);
      setStep("done");
    } catch {
      setSubmitError("No se ha podido completar la reserva. Inténtalo de nuevo en unos segundos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card text-card-foreground w-full overflow-hidden rounded-2xl border shadow-sm">
      <div className="grid md:grid-cols-[240px_1fr]">
        {/* Anfitrión y detalles */}
        <aside className="border-b p-6 md:border-r md:border-b-0">
          <Image
            src="/foto.jpg"
            alt="Tu nombre"
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
            priority
          />
          <p className="text-muted-foreground mt-5 text-[11px] font-medium tracking-wide uppercase">
            Reunión con
          </p>
          <h1 className="mt-1 text-lg font-medium tracking-tight">Tu Nombre</h1>

          {step !== "done" && (
            <div className="bg-muted mt-4 grid grid-cols-2 rounded-lg p-1 text-sm">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  disabled={step === "form"}
                  onClick={() => setDuration(d.value)}
                  className={cn(
                    "rounded-md py-1.5 transition-colors disabled:cursor-not-allowed",
                    duration === d.value
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Clock className="size-4" /> {duration === 60 ? "1 hora" : "30 min"}
            </li>
            <li className="flex items-center gap-2">
              <Globe className="size-4" /> Europe/Madrid
            </li>
            <li className="flex items-center gap-2">
              <Video className="size-4" /> Google Meet
            </li>
          </ul>

          {selectedSlot && step !== "pick" && selectedDay && (
            <p className="bg-muted text-foreground mt-5 rounded-lg px-3 py-2 text-sm">
              {formatDay(dayKeyFmt.format(new Date(selectedSlot)))}
              <br />
              <span className="font-medium">{formatRange(selectedSlot, duration)}</span>
            </p>
          )}
        </aside>

        {/* Paso 1: día y hora */}
        {step === "pick" && (
          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_170px]">
            <section>
              <h2 className="text-sm font-medium">Elige un día</h2>
              {submitError && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{submitError}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  disabled={compareMonth(month, minMonth) <= 0}
                  onClick={() => setVisibleMonth(addMonth(month, -1))}
                  className="text-muted-foreground hover:text-foreground rounded-md p-1 disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm">{monthFmt.format(new Date(Date.UTC(month.y, month.m, 1)))}</span>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  disabled={compareMonth(month, maxMonth) >= 0}
                  onClick={() => setVisibleMonth(addMonth(month, 1))}
                  className="text-muted-foreground hover:text-foreground rounded-md p-1 disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <MonthGrid
                month={month}
                loading={!slots && !loadError}
                available={slotsByDay}
                selected={selectedDay}
                onSelect={setPickedDay}
              />
            </section>

            <section>
              <h2 className="text-sm font-medium">
                {selectedDay ? formatDay(selectedDay) : "Horarios"}
              </h2>
              <div className="mt-4 space-y-2">
                {loadError ? (
                  <div className="text-muted-foreground text-sm">
                    No se pueden cargar los horarios ahora mismo.
                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={loadAll}>
                      Reintentar
                    </Button>
                  </div>
                ) : !slots ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-muted h-9 animate-pulse rounded-lg" />
                  ))
                ) : selectedDay ? (
                  (slotsByDay.get(selectedDay) ?? []).map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => pickSlot(iso)}
                      className="hover:border-primary hover:text-primary w-full rounded-lg border py-2 text-sm font-medium tabular-nums transition-colors"
                    >
                      {formatRange(iso, duration)}
                    </button>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No quedan huecos libres en los próximos días.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Paso 2: datos */}
        {step === "form" && (
          <form onSubmit={submit} className="p-6">
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="size-4" /> Cambiar hora
            </button>
            <h2 className="mt-4 text-sm font-medium">Tus datos</h2>
            <div className="mt-4 grid max-w-lg gap-4">
              <Field label="Nombre">
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+34 600 000 000"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError(false);
                  }}
                  onBlur={() => phone.trim() && checkPhone(phone)}
                  aria-invalid={phoneError}
                  aria-describedby="phone-hint"
                  className={inputClass}
                />
                <span
                  id="phone-hint"
                  className={cn("text-xs", phoneError ? "text-destructive" : "text-muted-foreground")}
                >
                  {phoneError
                    ? "Revisa el teléfono: no parece un número válido. Si no es español, añade el prefijo de tu país (+33, +52…)."
                    : "Si no es un número español, añade el prefijo de tu país."}
                </span>
              </Field>
              <Field label="Cuéntame sobre tu negocio">
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Qué vendes y a quién, tu web, dónde inviertes ahora en anuncios y qué te gustaría mejorar."
                  className={cn(inputClass, "h-auto resize-y py-2")}
                />
              </Field>
              {/* Campo trampa para bots: oculto a personas y lectores de pantalla */}
              <input
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                name="website"
              />
              {submitError && <p className="text-destructive text-sm">{submitError}</p>}
              <Button type="submit" disabled={submitting} className="h-10 rounded-lg text-sm">
                {submitting ? (
                  <>
                    <LoaderCircle className="animate-spin" /> Reservando…
                  </>
                ) : (
                  "Confirmar reserva"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Paso 3: confirmación */}
        {step === "done" && selectedSlot && (
          <div className="flex flex-col items-start justify-center p-6 md:p-10">
            <CircleCheck className="text-primary size-8" />
            <h2 className="mt-4 text-xl font-medium tracking-tight">Reserva confirmada</h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
              {formatDay(dayKeyFmt.format(new Date(selectedSlot)))}, {formatRange(selectedSlot, duration)}.
              Te he enviado la invitación a <span className="text-foreground">{email}</span> con el enlace de
              Google Meet.
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-lg">
              <Link href="/">Volver a la web</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function MonthGrid({
  month,
  loading,
  available,
  selected,
  onSelect,
}: {
  month: Month;
  loading: boolean;
  available: Map<string, string[]>;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const offset = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const prefix = `${month.y}-${String(month.m + 1).padStart(2, "0")}-`;

  return (
    <div className="mt-4 grid grid-cols-7 gap-y-1 text-center text-sm">
      {WEEKDAYS.map((d) => (
        <span key={d} className="text-muted-foreground pb-2 text-xs">
          {d}
        </span>
      ))}
      {Array.from({ length: offset }).map((_, i) => (
        <span key={`empty-${i}`} />
      ))}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1;
        const key = prefix + String(day).padStart(2, "0");
        const isAvailable = available.has(key);
        const isSelected = key === selected;
        return (
          <div key={key} className="flex justify-center">
            <button
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelect(key)}
              className={cn(
                "size-9 rounded-lg tabular-nums transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground font-medium"
                  : isAvailable
                    ? "text-foreground hover:bg-primary/10 font-medium"
                    : "text-muted-foreground/50 cursor-default",
                loading && "animate-pulse"
              )}
            >
              {day}
            </button>
          </div>
        );
      })}
    </div>
  );
}
