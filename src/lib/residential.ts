export { addDays, todayCO, waLink, timeCO, weekdayName } from "./clinic";
export { niceDate, hhmm, coStart, toMin } from "./clinic";

// ---------- Tipos (lo que responde el servidor) ----------
export interface ResOwner { personId: string; role: string; sharePct: number; id: string; name: string; phone: string | null; email: string | null; document: string | null; validated: boolean }
export interface ResUnit { id: string; label: string; tower: string | null; kind: string; coefficient: number; monthlyFee: number; area: number | null; notes: string | null; active: boolean; owners: ResOwner[]; balance: number; overdue: number }
export interface ResUnitList { units: ResUnit[]; totals: { units: number; coefficient: number } }
export interface ResPersonRow { id: string; name: string; document: string | null; phone: string | null; email: string | null; validated: boolean; active: boolean; units: { unitId: string; label: string; kind: string; coefficient: number; role: string; sharePct: number }[] }
export interface ResPersonDetail extends ResPersonRow { validatedAt: string | null; portalUrl: string; participation: { assemblyId: string; assembly: string; startsAt: string; unit: string; name: string; proxy: boolean; enteredAt: string; leftAt: string | null }[] }
export interface ResVehicle { id: string; unitId: string; unit: string; plate: string; kind: string; brand: string | null; color: string | null; authorized: boolean }
export interface ResPet { id: string; unitId: string; unit: string; name: string; species: string; breed: string | null; color: string | null; notes: string | null; vaccinated: boolean }
export interface ResCensus { vehicles: ResVehicle[]; pets: ResPet[] }
export interface ResDirRow { id: string; label: string; tower: string | null; people: { name: string; phone: string | null; role: string }[]; vehicles: { plate: string; kind: string; brand: string | null; color: string | null; authorized: boolean }[]; pets: { name: string; species: string; breed: string | null; color: string | null; notes: string | null }[]; parcels: number }
export interface ResVisit { id: string; unitId: string; unit: string; name: string; document: string | null; plate: string | null; kind: string; code: string; validFrom: string; validUntil: string; status: string; note: string | null; enteredAt: string | null; exitedAt: string | null; enteredBy: string | null; source: string; createdAt: string }
export interface ResScan { visit: ResVisit; canEnter: boolean; canExit: boolean; reason: string; people: { name: string; phone: string | null }[] }
export interface ResParcel { id: string; unitId: string; unit: string; carrier: string | null; description: string | null; receivedBy: string | null; receivedAt: string; status: string; deliveredAt: string | null; deliveredTo: string | null; notifiedAt: string | null; waAt: string | null; wa: { name: string; link: string }[] }
export interface ResPortfolioRow { unitId: string; label: string; monthlyFee: number; balance: number; overdue: number; owner: string | null; wa: string | null; hasEmail: boolean }
export interface ResPortfolio { totals: { debt: number; overdue: number; morosos: number; billedMonth: number; collectedMonth: number }; rows: ResPortfolioRow[] }
export interface ResStatement { unit: { id: string; label: string; monthlyFee: number }; balance: number; overdue: number; credit: number; charges: { id: string; kind: string; concept: string; period: string | null; amount: number; dueYmd: string; paid: number; pending: number; overdue: boolean }[]; payments: { id: string; amount: number; method: string; reference: string | null; note: string | null; paidYmd: string; byName: string | null; voided: boolean }[] }
export interface ResPaymentRow { id: string; unit: string; unitId: string; amount: number; method: string; reference: string | null; paidYmd: string; byName: string | null; voided: boolean }
export interface ResArea { id: string; name: string; description: string | null; capacity: number | null; openMin: number; closeMin: number; maxHours: number; requiresApproval: boolean; fee: number; rules: string | null; active: boolean }
export interface ResBooking { id: string; areaId: string; area: string; unitId: string; unit: string; start: string; end: string; startLabel: string; endLabel: string; guests: number | null; status: string; note: string | null; decidedBy: string | null; fee: boolean }
export interface ResNotice { id: string; title: string; body: string; level: string; pinned: boolean; authorName: string | null; publishedAt: string; expiresAt: string | null; emailedAt: string | null; active: boolean }
export interface ResTicket { id: string; number: number; unitId: string | null; personName: string | null; kind: string; place: string | null; title: string; body: string; status: string; response: string | null; createdAt: string; updatedAt: string; unit: string | null; events?: { id: string; byName: string | null; action: string; note: string | null; createdAt: string }[] }
export interface ResAssemblyRow { id: string; title: string; kind: string; startsAt: string; mode: string; status: string; minutesStatus: string; motions: number; invites: number }
export interface ResQuorum { unitsTotal: number; coefTotal: number; unitsPresent: number; coefPresent: number; pct: number; required: number; hasQuorum: boolean; proxies: number; unverified: number }
export interface ResMotionOpt { key: string; label: string }
export interface ResMotionResult { voted: { coef: number; units: number }; noVote: { coef: number; units: number }; passed: boolean | null; winner: { key: string; label: string } | null; blocked: { unit: string; reason: string }[]; tallies: { key: string; pct: number; coef: number; label: string; units: number }[]; baseCoef: number; baseKind: string; majority: string; baseUnits: number; majorityPct: number }
export interface ResMotion { id: string; number: number; title: string; description: string | null; type: string; options: ResMotionOpt[]; majority: string; majorityPct: number; base: string; status: string; openedAt: string | null; closedAt: string | null; result: ResMotionResult | null; digest: string | null; ballots: number }
export interface ResAttendanceRow { id: string; unitId: string; unit: string; coefficient: number; personId: string | null; name: string; document: string | null; proxy: boolean; verified: boolean; method: string; enteredAt: string; leftAt: string | null }
export interface ResLive {
  assembly: { id: string; title: string; kind: string; startsAt: string; mode: string; place: string | null; link: string | null; agenda: { n: number; title: string }[]; status: string; quorumPct: number; convokedAt: string | null; openedAt: string | null; closedAt: string | null; minutesStatus: string };
  quorum: ResQuorum; attendance: ResAttendanceRow[];
  proxies: { id: string; unitId: string; unit: string; holderName: string; holderDocument: string | null; holderPersonId: string | null; note: string | null; used: boolean }[];
  motions: ResMotion[]; events: { id: string; type: string; detail: string | null; byName: string | null; at: string }[];
  docs: { id: string; title: string; kind: string; url: string; note: string | null }[];
  invites: { total: number; emailed: number; wa: number; viewed: number };
}
export interface ResInvite { id: string; personId: string; name: string; phone: string | null; email: string | null; units: string[]; coefficient: number; emailAt: string | null; waAt: string | null; viewedAt: string | null; url: string; code: string; wa: string | null }
export interface ResMinutes { assembly: { id: string; title: string; kind: string; startsAt: string; status: string; minutesStatus: string; approvedBy: string | null; approvedAt: string | null; signatures: { at: string; by: string; name: string; role: string }[] }; conjunto: { name: string; nit: string | null; address: string | null }; minutes: string; versions: { id: string; version: number; byName: string | null; createdAt: string }[]; events: { type: string; detail: string | null; byName: string | null; at: string }[] }
export interface ResEvidence { motion: { number: number; title: string; status: string; digest: string | null }; eligible: { rep: string; coef: number; label: string; unitId: string; blocked: boolean }[]; ballots: { unit: string; option: string; voter: string; via: string; at: string; hash: string }[] }
export interface ResDash { units: number; persons: number; visitors: { inside: number; expected: number }; parcels: number; tickets: number; notices: number; nextAssembly: { id: string; title: string; startsAt: string; status: string } | null; bookingsToday: number; pendingBookings: number; money: { debt: number; overdue: number; morosos: number; collectedMonth: number } | null }
export interface ResProfile { profile: { name: string; nit: string | null; address: string | null; phone: string | null; adminName: string | null; feeDueDay: number; reminders: boolean; blockDebtorsVote: boolean; quorumPct: number }; host: string }

// Portal del residente
export interface ResPortal {
  suspended: boolean; conjunto: { name: string; address: string | null; phone: string | null };
  person: { id: string; name: string; document: string | null; phone: string | null; email: string | null; validated: boolean };
  units: { id: string; label: string; kind: string; role: string; coefficient: number; monthlyFee: number; balance: number; overdue: number }[];
  notices: { id: string; title: string; body: string; level: string; pinned: boolean; authorName: string | null; publishedAt: string }[];
  parcels: { id: string; unitId: string; unit: string; carrier: string | null; description: string | null; receivedAt: string }[];
  visits: (Omit<ResVisit, "document" | "note" | "enteredBy" | "source" | "createdAt"> & { url: string })[];
  bookings: ResBooking[];
  areas: { id: string; name: string; description: string | null; capacity: number | null; openMin: number; closeMin: number; maxHours: number; requiresApproval: boolean; fee: number; rules: string | null }[];
  tickets: { id: string; number: number; kind: string; title: string; status: string; response: string | null; createdAt: string; unit?: string | null }[];
  vehicles: { id: string; unitId: string; plate: string; kind: string; brand: string | null; color: string | null; authorized: boolean }[];
  pets: { id: string; unitId: string; name: string; species: string; breed: string | null; color: string | null; notes: string | null; vaccinated?: boolean }[];
  assemblies: { id: string; title: string; kind: string; startsAt: string; status: string; token: string }[];
}
export interface ResPublicAssembly {
  assembly: { id: string; title: string; kind: string; startsAt: string; mode: string; place: string | null; link: string | null; agenda: { n: number; title: string }[]; status: string };
  conjunto: { name: string; phone: string | null }; person: string;
  docs: { id: string; title: string; kind: string; url: string; note: string | null }[];
  units: { unitId: string; label: string; coefficient: number; proxy: boolean; present: boolean; byMe: boolean; representedBy: string | null }[];
  quorum: { pct: number; required: number; hasQuorum: boolean; unitsPresent: number };
  open: { id: string; number: number; title: string; description: string | null; options: ResMotionOpt[]; type: string; majority: string; majorityPct: number; units: { unitId: string; label: string; canVote: boolean; voted: boolean; blocked: boolean; reason: string | null }[] } | null;
  closed: { number: number; title: string; result: ResMotionResult | null }[];
}

// ---------- Textos ----------
export const UNIT_KINDS = [{ v: "apartamento", l: "Apartamento" }, { v: "casa", l: "Casa" }, { v: "local", l: "Local" }, { v: "parqueadero", l: "Parqueadero" }, { v: "deposito", l: "Depósito" }, { v: "otro", l: "Otro" }];
export const UNIT_KIND_TEXT: Record<string, string> = Object.fromEntries(UNIT_KINDS.map((k) => [k.v, k.l]));
export const ROLE_IN_UNIT = [{ v: "propietario", l: "Propietario" }, { v: "arrendatario", l: "Arrendatario" }, { v: "residente", l: "Residente" }];
export const ROLE_IN_UNIT_TEXT: Record<string, string> = Object.fromEntries(ROLE_IN_UNIT.map((k) => [k.v, k.l]));
export const VISIT_KINDS = [{ v: "visita", l: "Visita" }, { v: "domicilio", l: "Domicilio" }, { v: "proveedor", l: "Proveedor" }, { v: "servicio", l: "Servicio técnico" }, { v: "evento", l: "Evento" }];
export const VISIT_KIND_TEXT: Record<string, string> = Object.fromEntries(VISIT_KINDS.map((k) => [k.v, k.l]));
export const VISIT_STATUS: Record<string, { label: string; tone: "ok" | "info" | "warn" }> = { esperada: { label: "Esperada", tone: "info" }, dentro: { label: "Adentro", tone: "ok" }, salio: { label: "Ya salió", tone: "info" }, cancelada: { label: "Cancelada", tone: "warn" } };
export const VEH_KINDS = [{ v: "carro", l: "Carro" }, { v: "moto", l: "Moto" }, { v: "bicicleta", l: "Bicicleta" }, { v: "otro", l: "Otro" }];
export const PET_SPECIES = [{ v: "perro", l: "Perro" }, { v: "gato", l: "Gato" }, { v: "ave", l: "Ave" }, { v: "otro", l: "Otro" }];
export const PET_TEXT: Record<string, string> = Object.fromEntries(PET_SPECIES.map((k) => [k.v, k.l]));
export const CHARGE_KINDS = [{ v: "extraordinaria", l: "Cuota extraordinaria" }, { v: "multa", l: "Multa" }, { v: "otro", l: "Otro cobro" }];
export const CHARGE_TEXT: Record<string, string> = { administracion: "Administración", extraordinaria: "Extraordinaria", multa: "Multa", reserva: "Reserva", otro: "Otro" };
export const PAY_METHODS = [{ v: "transferencia", l: "Transferencia" }, { v: "efectivo", l: "Efectivo" }, { v: "consignacion", l: "Consignación" }, { v: "tarjeta", l: "Tarjeta" }, { v: "otro", l: "Otro" }];
export const METHOD_TEXT: Record<string, string> = Object.fromEntries(PAY_METHODS.map((k) => [k.v, k.l]));
export const NOTICE_LEVELS = [{ v: "info", l: "Informativo" }, { v: "importante", l: "Importante" }, { v: "urgente", l: "Urgente" }];
export const NOTICE_TONE: Record<string, "info" | "warn" | "ok"> = { info: "info", importante: "warn", urgente: "warn" };
export const TICKET_KINDS = [{ v: "peticion", l: "Petición" }, { v: "queja", l: "Queja" }, { v: "reclamo", l: "Reclamo" }, { v: "sugerencia", l: "Sugerencia" }, { v: "dano", l: "Daño en zona común" }];
export const TICKET_KIND_TEXT: Record<string, string> = Object.fromEntries(TICKET_KINDS.map((k) => [k.v, k.l]));
export const TICKET_STATES = [{ v: "radicada", l: "Radicada" }, { v: "en_proceso", l: "En proceso" }, { v: "resuelta", l: "Resuelta" }, { v: "cerrada", l: "Cerrada" }];
export const TICKET_STATE_TEXT: Record<string, string> = Object.fromEntries(TICKET_STATES.map((k) => [k.v, k.l]));
export const BOOKING_STATUS: Record<string, { label: string; tone: "ok" | "info" | "warn" }> = { aprobada: { label: "Aprobada", tone: "ok" }, pendiente: { label: "Por aprobar", tone: "warn" }, rechazada: { label: "Rechazada", tone: "info" }, cancelada: { label: "Cancelada", tone: "info" } };
export const ASM_STATUS: Record<string, { label: string; tone: "ok" | "info" | "warn" }> = { borrador: { label: "Borrador", tone: "info" }, convocada: { label: "Convocada", tone: "info" }, en_curso: { label: "En curso", tone: "ok" }, cerrada: { label: "Cerrada", tone: "info" } };
export const MINUTES_STATUS: Record<string, string> = { borrador: "Borrador", revision: "En revisión", aprobada: "Aprobada", firmada: "Firmada" };
export const MODES = [{ v: "presencial", l: "Presencial" }, { v: "virtual", l: "Virtual" }, { v: "mixta", l: "Mixta" }];
export const MODE_TEXT: Record<string, string> = Object.fromEntries(MODES.map((k) => [k.v, k.l]));
export const ASM_KINDS = [{ v: "extraordinaria", l: "Extraordinaria" }, { v: "ordinaria", l: "Ordinaria" }];
export const DOC_KINDS = [{ v: "estados_financieros", l: "Estados financieros" }, { v: "presupuesto", l: "Presupuesto" }, { v: "informe", l: "Informe" }, { v: "propuesta", l: "Propuesta" }, { v: "otro", l: "Otro" }];
export const DOC_TEXT: Record<string, string> = Object.fromEntries(DOC_KINDS.map((k) => [k.v, k.l]));
export const MAJORITIES = [{ v: "simple", l: "Mayoría simple (más de la mitad)" }, { v: "calificada", l: "Mayoría calificada (porcentaje especial)" }];
export const BASES = [{ v: "presentes", l: "Sobre los coeficientes presentes y habilitados" }, { v: "total", l: "Sobre el total de coeficientes del conjunto" }];
export const EVENT_TEXT: Record<string, string> = { creada: "Asamblea creada", editada: "Datos editados", convocatoria: "Convocatoria enviada", iniciada: "Se inició la asamblea", cerrada: "Se cerró la asamblea", ingreso: "Ingreso", retiro: "Retiro", identidad_verificada: "Identidad verificada", poder: "Poder registrado", poder_retirado: "Poder retirado", quorum_ok: "Se alcanzó el quórum", quorum_perdido: "Se perdió el quórum", votacion_abierta: "Se abrió una votación", votacion_cerrada: "Se cerró una votación", acta_generada: "Borrador del acta generado", acta_editada: "Acta editada", acta_revision: "Acta enviada a revisión", acta_aprobar: "Acta aprobada", acta_devolver: "Acta devuelta a borrador", acta_firmar: "Acta firmada" };

export const minLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const pct = (n: number, d = 2) => `${(Math.round(n * 10 ** d) / 10 ** d).toLocaleString("es-CO", { maximumFractionDigits: d })} %`;
export const dtCO = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const dateLongCO = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
export const hourCO = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });
/** AAAA-MM del mes actual en Colombia y los siguientes/anteriores. */
export function monthOpts(back = 3, fwd = 1): { v: string; l: string }[] {
  const now = new Date(Date.now() - 5 * 3600000);
  const out: { v: string; l: string }[] = [];
  for (let i = -back; i <= fwd; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    out.push({ v: d.toISOString().slice(0, 7), l: d.toLocaleString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }) });
  }
  return out;
}
export const curMonth = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 7);
/** Fecha y hora de Colombia (inputs date + time) → ISO UTC. */
export const coIso = (ymd: string, hhmm: string) => new Date(`${ymd}T${hhmm}:00-05:00`).toISOString();
export const coParts = (iso: string) => { const d = new Date(new Date(iso).getTime() - 5 * 3600000).toISOString(); return { date: d.slice(0, 10), time: d.slice(11, 16) }; };
export const residentUrl = (host: string, token: string) => `https://${host}/residente?t=${token}`;
