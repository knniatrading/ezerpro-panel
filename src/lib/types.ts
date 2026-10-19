export type Role =
  | "SUPER_ADMIN"
  | "DISTRIBUTOR_ADMIN"
  | "TENANT_ADMIN"
  | "EMPLOYEE"
  | "CASHIER"
  | "WAITER"
  | "DRIVER"
  | "CUSTOMER";

export interface Me {
  demo?: boolean;
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  status: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    modules?: string[];
    host?: string;
    brandColor?: string | null;
    logo?: string | null;
  } | null;
  distributor: {
    id: string;
    companyName: string;
    domain: string;
    status?: string;
    paidUntil?: string | null;
  } | null;
}

export interface Distributor {
  id: string;
  userId: string;
  companyName: string;
  domain: string;
  status: string;
  createdAt: string;
  user: { email: string };
  _count: { tenants: number };
  paidUntil: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export interface Tenant {
  id: string;
  distributorId: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  address: string;
  distributor: { domain: string; companyName: string };
  _count: { users: number };
  paidUntil: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export interface PublicTenant {
  modules?: string[];
  brandColor?: string | null;
  logo?: string | null;
  name: string;
  slug: string;
  status: string;
  distributor: { companyName: string };
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  note: string | null;
  months: number;
  paidAt: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  recordedBy: { email: string };
}

export interface PaymentWithTenant extends Payment {
  tenant: { name: string; slug: string; distributor: { companyName: string } };
}

export interface PaymentsResponse {
  items: PaymentWithTenant[];
  monthTotal: number;
  monthCount: number;
  currency: string;
}

export interface RegisterPaymentResult {
  payment: Payment;
  tenant: { id: string; status: string; paidUntil: string };
}

export interface DistributorPaymentWithDistributor extends Payment {
  distributor: { companyName: string; domain: string };
}

export interface DistributorPaymentsResponse {
  items: DistributorPaymentWithDistributor[];
  monthTotal: number;
  monthCount: number;
  currency: string;
}

// A quién se le registra o consulta un pago: un Cliente o un Distribuidor.
export interface PayTarget {
  kind: "tenant" | "distributor";
  id: string;
  name: string;
  subtitle: string;
  status: string;
  paidUntil: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
  active: boolean;
}

export interface MenuItem {
  img?: number | null;
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  categoryId: string | null;
  stock?: number | null;
  stockMin?: number | null;
}

export interface MenuResponse {
  acceptingOrders: boolean;
  deliveryFee: number;
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface OrderLine {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: number;
  customerName: string;
  phone: string | null;
  type: "domicilio" | "recoger" | "mesa";
  source: "web" | "mesa" | "pos";
  tableName: string | null;
  paymentStatus: "pendiente" | "pagado";
  paymentMethod: string | null;
  address: string | null;
  note: string | null;
  total: number;
  status: "nuevo" | "preparando" | "listo" | "en_camino" | "entregado" | "cancelado";
  deliveryFee: number;
  driverId: string | null;
  driverName: string | null;
  assignedAt: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: OrderLine[];
}

export interface OrdersResponse {
  items: Order[];
  counts: Record<string, number>;
}

export interface PublicMenu {
  available: boolean;
  acceptingOrders: boolean;
  deliveryFee?: number;
  categories: { id: string; name: string; items: { id: string; name: string; description: string | null; price: number; img?: number | null }[] }[];
}

export interface Employee {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: Role;
  status: string;
  createdAt: string;
}

export interface Brand {
  brandColor: string | null;
  logo: string | null;
}

export interface DiningTable {
  id: string;
  name: string;
  code: string;
  active: boolean;
  position: number;
  openOrders: number;
}

export interface CashSummary {
  byMethod: Record<string, number>;
  total: number;
  count: number;
}

export interface CashCurrent {
  open: boolean;
  shift?: { id: string; openedAt: string; openingAmount: number };
  summary?: CashSummary;
  expectedCash?: number;
}

export interface CashClosed {
  id: string;
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  expectedAmount: number | null;
  countedAmount: number | null;
  difference: number;
  note: string | null;
  total: number;
  count: number;
  byMethod: Record<string, number>;
}

export interface Driver {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  openDeliveries: number;
}

export interface MyDelivery {
  id: string;
  number: number;
  customerName: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  total: number;
  deliveryFee: number;
  status: Order["status"];
  paymentStatus: "pendiente" | "pagado";
  createdAt: string;
  assignedAt: string | null;
  readyAt: string | null;
  dispatchedAt: string | null;
  items: { id: string; name: string; quantity: number }[];
}

export interface SalesRow {
  id: string;
  number: number;
  paidAt: string;
  type: "domicilio" | "recoger" | "mesa";
  source: string;
  customerName: string;
  tableName: string | null;
  paymentMethod: string | null;
  deliveryFee: number;
  total: number;
  cashier: string | null;
  products: string;
}

export interface Tally {
  total: number;
  count: number;
}

export interface SalesResponse {
  from: string;
  to: string;
  summary: {
    count: number;
    total: number;
    average: number;
    deliveryFees: number;
    byMethod: Record<string, Tally>;
    byType: Record<string, Tally>;
  };
  truncated: boolean;
  items: SalesRow[];
}

export interface MetricsResponse {
  from: string;
  to: string;
  summary: { count: number; total: number; average: number; cancelled: number };
  byDay: { date: string; total: number; count: number }[];
  byHour: { hour: number; total: number; count: number }[];
  byType: Record<string, Tally>;
  byMethod: Record<string, Tally>;
  topDishes: { name: string; quantity: number; revenue: number }[];
}

export type PayType = "hora" | "dia" | "domicilio" | "rutina";

export interface PayrollRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: string;
  payType: PayType | null;
  payRate: number;
  units: number;
  earnedPeriod: number;
  paidPeriod: number;
  balance: number;
}

export interface PayrollResponse {
  items: PayrollRow[];
  totals: { earnedPeriod: number; paidPeriod: number; balance: number };
}

export interface PayrollDetail {
  user: { id: string; name: string | null; email: string; role: Role; payType: PayType | null; payRate: number };
  work: { id: string; workDate: string; units: number; rate: number; amount: number; note: string | null }[];
  deliveries: { id: string; number: number; deliveredAt: string; driverPay: number }[];
  routines?: { id: string; title: string; createdAt: string; pay: number; memberName: string | null }[];
  payments: { id: string; amount: number; method: string | null; note: string | null; paidAt: string }[];
  balance: number;
}

export interface DemoRole {
  key: string;
  label: string;
  desc: string;
}

export interface DemoInfo {
  kind: "tenant" | "distributor" | null;
  roles?: DemoRole[];
}

export interface DemosResponse {
  demos: {
    niche: string;
    label: string;
    host: string | null;
    resetAt: string | null;
    roles: DemoRole[];
    adminUrl?: string;
    adminLabel?: string;
    clientUrl?: string;
    clientLabel?: string;
  }[];
  distributorDemo: { resetAt: string | null; url: string } | null;
}

// ---------- Nicho conductores ----------
export interface RideOffer {
  by: "conductor" | "pasajero";
  amount: number;
  km?: number | null;
  note?: string | null;
  createdAt: string;
}
export interface Ride {
  id: string;
  number: number;
  status: string;
  serviceName: string | null;
  passengerName: string;
  passengerPhone: string;
  pickup: string;
  dropoff: string;
  notes: string | null;
  extras: { id: string; name: string; amount: number }[] | null;
  extrasTotal: number;
  km: number | null;
  price: number | null;
  offeredBy: "conductor" | "pasajero" | null;
  finalPrice: number | null;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  offers: RideOffer[];
}
export interface DriverProfile {
  displayName: string;
  vehicleType: string;
  vehicleDesc: string | null;
  plate: string | null;
  phone: string | null;
  bio: string | null;
  available: boolean;
  perKm: number;
  baseFee: number;
  minFare: number;
  img: number | null;
}
export interface RideServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  active: boolean;
}
export interface RideExtraItem {
  id: string;
  name: string;
  amount: number;
  active: boolean;
}
export interface DriverData {
  profile: DriverProfile;
  services: RideServiceItem[];
  extras: RideExtraItem[];
  host: string | null;
}
export interface DriverSummary {
  count: number;
  total: number;
  average: number;
  cancelled: number;
  km: number;
  byDay: { date: string; count: number; total: number }[];
  byService: { name: string; count: number; total: number }[];
}
export interface PublicDriver {
  suspended: boolean;
  name: string;
  vehicleType?: string;
  vehicleDesc?: string | null;
  plate?: string | null;
  phone?: string | null;
  bio?: string | null;
  img?: number | null;
  available: boolean;
  perKm?: number;
  baseFee?: number;
  minFare?: number;
  services?: { id: string; name: string; description: string | null; price: number | null }[];
  extras?: { id: string; name: string; amount: number }[];
}
export interface PublicRide {
  number: number;
  status: string;
  serviceName: string | null;
  pickup: string;
  dropoff: string;
  notes: string | null;
  extras: { id: string; name: string; amount: number }[];
  extrasTotal: number;
  km: number | null;
  price: number | null;
  offeredBy: "conductor" | "pasajero" | null;
  finalPrice: number | null;
  createdAt: string;
  completedAt: string | null;
  cancelledBy: string | null;
  offers: RideOffer[];
  driver: { name: string; phone: string | null; vehicleType: string; vehicleDesc: string | null; plate: string | null };
}
export interface RideSummaryRow {
  token: string;
  number: number;
  status: string;
  serviceName: string | null;
  pickup: string;
  dropoff: string;
  price: number | null;
  finalPrice: number | null;
  createdAt: string;
}

export interface AuditItem {
  id: string;
  at: string;
  email: string | null;
  role: string | null;
  action: string;
  summary: string;
  ip: string | null;
  meta: Record<string, unknown> | null;
}
export interface AuditResponse {
  items: AuditItem[];
  next: string | null;
}

// ---------- Nicho técnicos ----------
export interface TechProfile {
  id: string;
  tenantId: string;
  displayName: string;
  trade: string;
  phone: string | null;
  bio: string | null;
  years: number | null;
  coverage: string | null;
  certifications: string | null;
  emergency: boolean;
  available: boolean;
  img: number | null;
}
export interface TechWorkItem {
  id: string;
  title: string;
  description: string | null;
  before: number | null;
  after: number | null;
}
export interface TechData {
  profile: TechProfile;
  services: RideServiceItem[];
  works: TechWorkItem[];
  host: string | null;
}
export interface PublicTech {
  suspended: boolean;
  name: string;
  trade?: string;
  phone?: string | null;
  bio?: string | null;
  years?: number | null;
  coverage?: string | null;
  certifications?: string[];
  emergency?: boolean;
  available?: boolean;
  img?: number | null;
  services?: { id: string; name: string; description: string | null; price: number | null }[];
  works?: TechWorkItem[];
}

// ---------- Nicho veterinarias ----------
export interface VetProfile {
  id: string;
  clinicName: string;
  phone: string | null;
  address: string | null;
  bio: string | null;
  openHour: number;
  closeHour: number;
  slotMinutes: number;
  capacity: number;
  workDays: string;
  reminderDays: number;
}
export interface VetServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  minutes: number;
  active: boolean;
}
export interface VetProfileData {
  profile: VetProfile;
  services: VetServiceItem[];
  host: string;
}
export interface VetOwner {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  portalUrl: string;
  pets?: { id: string; name: string; species: string; code: string; img: number | null }[];
}
export interface VetPet {
  id: string;
  ownerId: string;
  code: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
  weightKg: number | null;
  allergies: string | null;
  notes: string | null;
  lost: boolean;
  img: number | null;
  owner?: { id: string; name: string; phone: string };
}
export interface VetRecord {
  id: string;
  kind: string;
  title: string;
  notes: string | null;
  date: string;
  weightKg: number | null;
  amount: number;
  nextDue: string | null;
}
export interface VetAppt {
  id: string;
  serviceId: string | null;
  serviceName: string;
  start: string;
  end: string;
  status: string;
  notes: string | null;
  source: string;
  petId: string | null;
  ownerId: string | null;
  petName: string | null;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  guest: boolean;
}
export interface VetPetDetail {
  pet: VetPet;
  owner: VetOwner;
  records: VetRecord[];
  appointments: VetAppt[];
  host: string;
  idUrl: string;
}
export interface VetDashboard {
  today: { income: number; services: number; products: number; patients: number; appointments: number; attended: number; pending: number };
  appointments: VetAppt[];
  days: { date: string; income: number; products: number; services: number; patients: number }[];
  upcoming: { id: string; petId: string; petName: string; ownerName: string; phone: string; title: string; kind: string; nextDue: string; overdue: boolean }[];
  lowStock: { id: string; name: string; stock: number; min: number }[];
  totals: { pets: number; owners: number; newPetsMonth: number };
}
export interface PublicVet {
  suspended: boolean;
  name: string;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  openHour?: number;
  closeHour?: number;
  workDays?: string;
  services?: { id: string; name: string; description: string | null; price: number | null; minutes: number }[];
  shop?: boolean;
  demoPortalUrl?: string | null;
}
export interface VetPortalPet {
  id: string;
  code: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
  weightKg: number | null;
  allergies: string | null;
  lost: boolean;
  img: number | null;
  records: { id: string; kind: string; title: string; notes: string | null; date: string; weightKg: number | null; nextDue: string | null }[];
}
export interface VetPortal {
  suspended: boolean;
  name?: string;
  clinic?: { name: string; phone: string | null; address: string | null };
  owner?: { name: string; phone: string; email: string | null };
  pets?: VetPortalPet[];
  appointments?: { id: string; serviceName: string; petName: string | null; start: string; status: string }[];
}
export interface PublicPetId {
  suspended: boolean;
  name: string;
  species?: string;
  breed?: string | null;
  sex?: string | null;
  birthDate?: string | null;
  allergies?: string | null;
  img?: number | null;
  lost?: boolean;
  clinic?: { name: string; phone: string | null; address: string | null };
  owner?: { name: string; phone: string } | null;
}

// ---------- Nicho gimnasios ----------
export type GymState = "al_dia" | "por_vencer" | "vencido" | "sin_plan";
export interface GymProfile { id: string; gymName: string; phone: string | null; address: string | null; bio: string | null; reminderDays: number; graceDays: number }
export interface GymPlanItem { id: string; name: string; description: string | null; price: number; days: number; active: boolean }
export interface GymProfileData { profile: GymProfile; plans: GymPlanItem[]; host: string }
export interface GymMember {
  id: string; code: string; name: string; phone: string; email: string | null; document: string | null; notes: string | null;
  planId: string | null; planName: string | null; paidUntil: string | null; archived: boolean; createdAt: string;
  state: GymState; daysLeft: number | null; img: number | null; lastCheckin: string | null; portalUrl: string;
}
export interface GymPay { id: string; memberName: string; planName: string; amount: number; method: string; days: number; periodStart: string; periodEnd: string; note: string | null; paidAt: string }
export interface GymCheckin { id: string; at: string; ok: boolean; status: string }
export interface GymRoutine { id: string; memberId: string | null; title: string; body: string; videoUrl: string | null; trainerName: string | null; trainerId: string | null; trainerPay: number | null; createdAt: string }
export interface GymMemberDetail { member: GymMember; payments: GymPay[]; checkins: GymCheckin[]; routines: GymRoutine[] }
export interface GymAccessResult {
  result: "ok" | "vencido" | "sin_plan" | "baja" | "invalido"; color: "green" | "red"; message: string; repeated?: boolean;
  member?: { id: string; name: string; code: string; planName: string | null; paidUntil: string | null; daysLeft: number | null; img: number | null; phone: string; routines: number; lastVisit: string | null };
}
export interface GymCheckinRow { id: string; at: string; ok: boolean; status: string; member: { id: string; name: string; planName: string | null; code: string } }
export interface GymDashboard {
  today: { income: number; memberships: number; store: number; visits: number; uniqueVisitors: number };
  members: { total: number; active: number; expiring: number; overdue: number; noPlan: number; inactive: number };
  days: { date: string; income: number; memberships: number; store: number; visits: number }[];
  expiring: { id: string; name: string; phone: string; planName: string | null; paidUntil: string; daysLeft: number }[];
  lowStock: { id: string; name: string; stock: number; min: number }[];
  recent: { id: string; at: string; ok: boolean; status: string; name: string; memberId: string }[];
}
export interface GymClassItem { id: string; name: string; instructor: string | null; description: string | null; weekday: number; startMin: number; minutes: number; capacity: number; active: boolean }
export interface GymSession {
  classId: string; date: string; name: string; instructor: string | null; description: string | null; startMin: number; minutes: number; capacity: number; booked: number; full: boolean; mineId: string | null; started?: boolean;
  attendees?: { bookingId: string; memberId: string; name: string; status: string }[];
}
export interface PublicGym {
  suspended: boolean; shop?: boolean; name: string; phone?: string | null; address?: string | null; bio?: string | null;
  plans?: { id: string; name: string; description: string | null; price: number; days: number }[];
  classes?: { id: string; name: string; instructor: string | null; weekday: number; startMin: number; minutes: number }[];
  demoPortalUrl?: string | null;
}
export interface GymPortal {
  suspended: boolean; shop?: boolean; name?: string; gym?: { name: string; phone: string | null; address: string | null };
  member?: { name: string; code: string; planName: string | null; paidUntil: string | null; img: number | null; state: GymState; daysLeft: number | null };
  visits30?: number;
  routines?: { id: string; title: string; body: string; videoUrl: string | null; trainerName: string | null; createdAt: string }[];
  payments?: { id: string; planName: string; amount: number; periodStart: string; periodEnd: string; paidAt: string }[];
  bookings?: { id: string; date: string; classId: string; name: string; startMin: number; minutes: number; instructor: string | null }[];
}

// ---------- Nicho clínicas ----------
export type ApptStatus = "programada" | "confirmada" | "atendida" | "cancelada" | "no_asistio";
export interface ClinicAgenda { id: string; name: string; kind: "especialista" | "silla"; specialty: string | null; license: string | null; color: string; workDays: string; openMin: number; closeMin: number; slotMin: number; active: boolean; hasSignature?: boolean }
export interface ClinicServiceItem { id: string; name: string; description: string | null; price: number | null; minutes: number; active: boolean }
export interface ClinicProfileData {
  profile: { id: string; clinicName: string; phone: string | null; address: string | null; bio: string | null; reminders: boolean };
  agendas: ClinicAgenda[]; services: ClinicServiceItem[]; host: string;
}
export interface ClinicPatient {
  id: string; name: string; phone: string; email: string | null; document: string | null; birthDate: string | null; allergies: string | null; conditions?: string | null; notes: string | null;
  archived: boolean; createdAt: string; debt?: number; nextAppt?: string | null; lastVisit?: string | null; portalUrl?: string;
}
export interface ClinicAppt { id: string; start: string; end: string; status: ApptStatus; serviceName: string; notes: string | null; source?: string; agendaId: string; agendaName: string; color: string; patientId: string; patientName: string; phone: string }
export interface ToothMark { w?: string; s?: Record<string, string>; n?: string }
export type ToothChart = Record<string, ToothMark>;
export interface ClinicRecord { id: string; kind: string; title: string; body: string | null; tooth: string | null; doctorName: string | null; createdAt: string }
export interface ClinicPay { id: string; amount: number; method: string; note: string | null; paidAt: string }
export interface ClinicTreatment { id: string; name: string; total: number; installments: number | null; status: "activo" | "terminado" | "cancelado"; doctorName: string | null; startDate: string; notes: string | null; paid: number; balance: number; paymentsCount: number; payments: ClinicPay[] }
export interface ClinicRxItem { drug: string; dose?: string | null; instructions?: string | null }
export interface ClinicRxRow { id: string; number: number; token: string; doctorName: string; diagnosis: string | null; createdAt: string; items: ClinicRxItem[]; url: string }
export interface ClinicConsentRow { id: string; title: string; token: string; status: "pendiente" | "firmado"; signedAt: string | null; signedName: string | null; createdAt: string; url: string }
export interface ClinicPatientDetail {
  patient: ClinicPatient & { portalUrl: string };
  chart: ToothChart | null;
  appointments: Omit<ClinicAppt, "patientId" | "patientName" | "phone">[];
  treatments: ClinicTreatment[];
  records: ClinicRecord[];
  prescriptions: ClinicRxRow[];
  consents: ClinicConsentRow[];
}
export interface ClinicDashboard {
  today: { income: number; appointments: number; attended: number; confirmed: number; pending: number };
  tomorrow: { total: number; confirmed: number };
  patients: { total: number; newThisMonth: number; withDebt: number; debtTotal: number };
  days: { date: string; income: number }[];
  agenda: { id: string; start: string; end: string; status: ApptStatus; serviceName: string; patientId: string; patientName: string; phone: string; agendaName: string; color: string }[];
  debtors: { id: string; name: string; phone: string; debt: number }[];
}
export interface ClinicPaymentsRes { total: number; byMethod: Record<string, number>; rows: { id: string; patientId: string | null; patientName: string; treatmentName: string; amount: number; method: string; paidAt: string }[] }
export interface ConsentTpl { id: string; title: string; body: string; active: boolean }
export interface PublicClinic {
  suspended: boolean; name: string; phone?: string | null; address?: string | null; bio?: string | null;
  services?: { id: string; name: string; description: string | null; price: number | null; minutes: number }[];
  agendas?: { id: string; name: string; kind: string; specialty: string | null; color: string }[];
  demoPortalUrl?: string | null;
}
export interface ClinicPortalAppt { id: string; start: string; status: ApptStatus; serviceName: string; agendaName: string; confirmUrl: string }
export interface ClinicPortal {
  suspended: boolean; name?: string;
  clinic?: { name: string; phone: string | null; address: string | null };
  patient?: { name: string; phone: string; email: string | null };
  upcoming?: ClinicPortalAppt[]; past?: ClinicPortalAppt[];
  prescriptions?: { id: string; number: number; doctorName: string; diagnosis: string | null; createdAt: string; url: string }[];
  consents?: { id: string; title: string; status: "pendiente" | "firmado"; signedAt: string | null; url: string }[];
  treatments?: { id: string; name: string; total: number; installments: number | null; status: string; paid: number; balance: number; payments: { id: string; amount: number; method: string; paidAt: string }[] }[];
}
export interface ClinicHeader { name: string; phone: string | null; address: string | null; logo?: string | null }
export interface PublicRx { clinic: ClinicHeader; number: number; createdAt: string; patient: { name: string; document: string | null; birthDate: string | null }; doctor: { name: string; specialty: string | null; license: string | null; signature: string | null }; diagnosis: string | null; items: ClinicRxItem[]; notes: string | null }
export interface PublicConsent { clinic: ClinicHeader; title: string; body: string; status: "pendiente" | "firmado"; patient: { name: string; document: string | null }; doctorName: string | null; createdAt: string; signedAt: string | null; signedName: string | null; signature: string | null }
export interface PublicApptInfo { suspended: boolean; name?: string; clinic?: { name: string; phone: string | null; address: string | null }; patientName?: string; serviceName?: string; agendaName?: string; start?: string; status?: ApptStatus; open?: boolean }
