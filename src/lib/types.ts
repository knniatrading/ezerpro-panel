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

export type PayType = "hora" | "dia" | "domicilio";

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
  items: { distributorId: string; companyName: string; domain: string; demo: { host: string; resetAt: string | null } | null }[];
  roles: DemoRole[];
  distributorDemo: { resetAt: string | null } | null;
}
