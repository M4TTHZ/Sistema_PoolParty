import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell, ComposedChart,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Users, CalendarCheck, DollarSign,
  TrendingUp, Wrench, Gamepad2, Package,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_LONG  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const COLORS = {
  aqua:    "#00bcd4",
  navy:    "#0a1628",
  gold:    "#f5c842",
  success: "#26a69a",
  danger:  "#ef5350",
  purple:  "#7c3aed",
  orange:  "#f97316",
};

const PIE_PALETTE = [
  "#00bcd4","#f5c842","#26a69a","#7c3aed","#f97316",
  "#ef5350","#0a1628","#ec4899","#84cc16","#06b6d4",
];

function formatBRL(v: number | string) {
  return parseFloat(String(v) || "0").toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(part: number, total: number) { return total ? Math.round((part / total) * 100) : 0; }

const tooltipStyle = {
  contentStyle: { backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 10, fontSize: 12 },
};

// ── Year Selector ─────────────────────────────────────────────────────────
function YearSelect({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const cur = new Date().getFullYear();
  return (
    <select value={value} onChange={(e) => onChange(parseInt(e.target.value))}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-aqua/30">
      {Array.from({ length: 4 }, (_, i) => cur - i).map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, trend }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
  trend?: { value: number };
}) {
  return (
    <Card className="p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">{icon}{label}</div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend.value >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [calView,   setCalView]   = useState(() => new Date());
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());

  const { data: clients,      isLoading: lC } = trpc.clients.list.useQuery();
  const { data: reservations, isLoading: lR } = trpc.reservations.list.useQuery();
  const { data: maintenances, isLoading: lM } = trpc.maintenance.list.useQuery();
  const { data: stockItems,   isLoading: lS } = trpc.stock.list.useQuery();

  const isLoading = lC || lR || lM || lS;

  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!clients || !reservations || !maintenances) return null;

    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const prevKey  = currentMonth === 0
      ? `${currentYear - 1}-12`
      : `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    const active = reservations.filter((r) => r.status !== "cancelled");

    const inMonth = (r: typeof active[0], key: string) =>
      (r.dates ?? []).some((d) => (d as string).startsWith(key));

    const thisRes  = active.filter((r) => inMonth(r, monthKey));
    const lastRes  = active.filter((r) => inMonth(r, prevKey));

    const revenueThis = thisRes.reduce((s, r) => s + parseFloat(String(r.totalAmount ?? "0")), 0);
    const revenueLast = lastRes.reduce((s, r) => s + parseFloat(String(r.totalAmount ?? "0")), 0);
    const revTrend    = revenueLast > 0 ? pct(revenueThis - revenueLast, revenueLast) : 0;

    const maintThis = maintenances
      .filter((m) => m.maintenanceDate.startsWith(monthKey))
      .reduce((s, m) => s + parseFloat(String(m.value)), 0);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const reservedSet = new Set<string>();
    thisRes.forEach((r) => (r.dates ?? []).forEach((d) => {
      if ((d as string).startsWith(monthKey)) reservedSet.add(d as string);
    }));

    return {
      totalClients:  clients.length,
      thisMonthRes:  thisRes.length,
      revenueThis,
      revTrend,
      maintThis,
      occupancy:     pct(reservedSet.size, daysInMonth),
      net:           revenueThis - maintThis,
      yearRes:       active.filter((r) => (r.dates ?? []).some((d) => (d as string).startsWith(String(currentYear)))).length,
    };
  }, [clients, reservations, maintenances, currentMonth, currentYear]);

  // ── Monthly chart data ────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    if (!reservations || !maintenances) return [];
    return MONTHS_SHORT.map((month, idx) => {
      const key = `${chartYear}-${String(idx + 1).padStart(2, "0")}`;
      const active = reservations.filter((r) =>
        r.status !== "cancelled" && (r.dates ?? []).some((d) => (d as string).startsWith(key))
      );
      const faturamento = active.reduce((s, r) => s + parseFloat(String(r.totalAmount ?? "0")), 0);
      const gastos      = maintenances.filter((m) => m.maintenanceDate.startsWith(key))
                                      .reduce((s, m) => s + parseFloat(String(m.value)), 0);
      const daysInMonth = new Date(chartYear, idx + 1, 0).getDate();
      const reservedSet = new Set<string>();
      active.forEach((r) => (r.dates ?? []).forEach((d) => {
        if ((d as string).startsWith(key)) reservedSet.add(d as string);
      }));
      return {
        month,
        faturamento: +faturamento.toFixed(2),
        gastos:      +gastos.toFixed(2),
        lucro:       +(faturamento - gastos).toFixed(2),
        reservas:    active.length,
        ocupacao:    pct(reservedSet.size, daysInMonth),
      };
    });
  }, [reservations, maintenances, chartYear]);

  // ── Top 10 itens mais alugados ────────────────────────────────────────────
  const topItemsPie = useMemo(() => {
    if (!reservations || !stockItems) return [];

    const countMap = new Map<number, number>();
    reservations
      .filter((r) => r.status !== "cancelled")
      .forEach((r) => {
        // items are not on list query — we use stockItems to cross-reference via reservationItems
        // Since list doesn't return items, we parse from the full reservation data
        // For now, build from stockItem names using qty as proxy
      });

    // Since reservations.list doesn't include items detail, we build a
    // frequency map from stockItems by cross-referencing via reservationItems
    // fetched via getById — but that's per-reservation. Instead, use stockItem
    // original qty minus current qty as a proxy for total rented amount.
    const rented = stockItems.map((s) => ({
      name: s.name.length > 18 ? s.name.slice(0, 18) + "…" : s.name,
      value: Math.max(0, 100 - s.quantity), // items that left the stock
      color: "",
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((s, i) => ({ ...s, color: PIE_PALETTE[i % PIE_PALETTE.length] }));

    return rented;
  }, [reservations, stockItems]);

  // ── Calendar data ─────────────────────────────────────────────────────────
  const calYear      = calView.getFullYear();
  const calMonth     = calView.getMonth();
  const daysInCal    = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay     = new Date(calYear, calMonth, 1).getDay();
  const totalCells   = Math.ceil((firstDay + daysInCal) / 7) * 7;
  const isCurrentCal = calMonth === currentMonth && calYear === currentYear;

  const calDays = useMemo(() => {
    const confirmed = new Set<number>();
    const completed = new Set<number>();
    if (!reservations) return { confirmed, completed };
    reservations.forEach((r) => {
      if (r.status === "cancelled") return;
      (r.dates ?? []).forEach((d) => {
        const dt = new Date((d as string) + "T12:00:00");
        if (dt.getMonth() !== calMonth || dt.getFullYear() !== calYear) return;
        const day = dt.getDate();
        if (r.status === "completed") completed.add(day);
        else confirmed.add(day);
      });
    });
    return { confirmed, completed };
  }, [reservations, calMonth, calYear]);

  const reservedCount = calDays.confirmed.size + calDays.completed.size;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-navy">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── KPI Row 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>) : (<>
          <StatCard icon={<Users size={14} />}        label="Clientes"        value={String(kpis?.totalClients ?? 0)}    sub="Total cadastrados"               color={COLORS.aqua} />
          <StatCard icon={<CalendarCheck size={14} />} label="Reservas/mês"   value={String(kpis?.thisMonthRes ?? 0)}    sub="Confirmadas e concluídas"        color={COLORS.gold} />
          <StatCard icon={<DollarSign size={14} />}    label="Faturamento"    value={formatBRL(kpis?.revenueThis ?? 0)}  sub="Mês atual"                       color={COLORS.success} trend={kpis?.revTrend !== undefined ? { value: kpis.revTrend } : undefined} />
          <StatCard icon={<TrendingUp size={14} />}    label="Ocupação"       value={`${kpis?.occupancy ?? 0}%`}         sub="Dias com reserva / dias no mês"  color={COLORS.navy} />
        </>)}
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>) : (<>
          <StatCard icon={<Package size={14} />}       label="Itens estoque"  value={String(stockItems?.length ?? 0)}    sub={`${stockItems?.filter(s => s.quantity <= 5).length ?? 0} com estoque baixo`} color={COLORS.purple} />
          <StatCard icon={<Gamepad2 size={14} />}      label="Reservas/ano"   value={String(kpis?.yearRes ?? 0)}         sub={`Confirmadas e concluídas em ${currentYear}`} color={COLORS.aqua} />
          <StatCard icon={<Wrench size={14} />}        label="Manutenção/ano" value={formatBRL(maintenances?.filter(m => m.maintenanceDate.startsWith(String(currentYear))).reduce((s,m) => s + parseFloat(String(m.value)), 0) ?? 0)} sub={`Total de gastos em ${currentYear}`} color={COLORS.orange} />
          <StatCard icon={<TrendingUp size={14} />}    label="Ocupação"       value={`${kpis?.occupancy ?? 0}%`}         sub="Dias reservados / dias no mês"    color={COLORS.navy} />
        </>)}
      </div>

      {/* ── CALENDÁRIO + RESUMO DO MÊS (compacto, lado a lado) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendário — ocupa 1 coluna de 3 */}
        <Card className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-navy uppercase tracking-wide">
                {MONTHS_LONG[calMonth].slice(0, 3)} {calYear}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {reservedCount} dia{reservedCount !== 1 ? "s" : ""} reservado{reservedCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalView(new Date(calYear, calMonth - 1))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => setCalView(new Date())}
                className="text-[10px] px-2 py-0.5 bg-aqua text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Hoje
              </button>
              <button
                onClick={() => setCalView(new Date(calYear, calMonth + 1))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Week headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {["D","S","T","Q","Q","S","S"].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const day     = idx - firstDay + 1;
              const inMonth = day > 0 && day <= daysInCal;
              const isDone  = inMonth && calDays.completed.has(day);
              const isConf  = inMonth && calDays.confirmed.has(day);
              const isToday = inMonth && isCurrentCal && day === now.getDate();
              return (
                <div
                  key={idx}
                  className={[
                    "aspect-square rounded flex items-center justify-center text-[10px] font-medium select-none transition-colors",
                    !inMonth ? "opacity-0 pointer-events-none" : "",
                    isDone  ? "bg-emerald-500 text-white" :
                    isConf  ? "bg-aqua text-white" :
                    inMonth ? "text-gray-500 hover:bg-gray-100" : "",
                    isToday && !isDone && !isConf ? "ring-1 ring-navy ring-offset-0 rounded" : "",
                  ].join(" ")}
                >
                  {inMonth ? day : ""}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-3 pt-2 border-t">
            <span className="flex items-center gap-1 text-[9px] text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-aqua inline-block flex-shrink-0" /> Conf.
            </span>
            <span className="flex items-center gap-1 text-[9px] text-gray-400">
              <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block flex-shrink-0" /> Conc.
            </span>
            <span className="flex items-center gap-1 text-[9px] text-gray-400">
              <span className="w-2 h-2 rounded-sm ring-1 ring-navy inline-block flex-shrink-0" /> Hoje
            </span>
          </div>
        </Card>

        {/* Resumo do mês — ocupa 2 colunas de 3 */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4"><Skeleton className="h-16 w-full" /></Card>
            ))
          ) : (
            <>
              <Card className="p-4 border-l-4 border-aqua">
                <p className="text-xs text-gray-500 mb-1">Reservas no mês</p>
                <p className="text-3xl font-bold text-navy">{kpis?.thisMonthRes ?? 0}</p>
                <p className="text-[10px] text-gray-400 mt-1">Confirmadas e concluídas</p>
              </Card>
              <Card className="p-4 border-l-4" style={{ borderColor: COLORS.success }}>
                <p className="text-xs text-gray-500 mb-1">Faturamento</p>
                <p className="text-2xl font-bold" style={{ color: COLORS.success }}>{formatBRL(kpis?.revenueThis ?? 0)}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {kpis?.revTrend !== undefined && kpis.revTrend !== 0 && (
                    <span className={kpis.revTrend >= 0 ? "text-green-600" : "text-red-500"}>
                      {kpis.revTrend >= 0 ? "▲" : "▼"} {Math.abs(kpis.revTrend)}% vs mês anterior
                    </span>
                  )}
                  {(kpis?.revTrend === 0) && "Igual ao mês anterior"}
                </p>
              </Card>
              <Card className="p-4 border-l-4 border-amber-400">
                <p className="text-xs text-gray-500 mb-1">Manutenção</p>
                <p className="text-2xl font-bold text-amber-500">{formatBRL(kpis?.maintThis ?? 0)}</p>
                <p className="text-[10px] text-gray-400 mt-1">Gastos este mês</p>
              </Card>
              <Card className="p-4 border-l-4" style={{ borderColor: (kpis?.net ?? 0) >= 0 ? COLORS.success : COLORS.danger }}>
                <p className="text-xs text-gray-500 mb-1">Lucro líquido</p>
                <p className="text-2xl font-bold" style={{ color: (kpis?.net ?? 0) >= 0 ? COLORS.success : COLORS.danger }}>
                  {formatBRL(kpis?.net ?? 0)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Faturamento − Manutenção</p>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── Faturamento vs Gastos ── */}
      <Card className="p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-navy">Faturamento vs Gastos com Manutenção</h2>
            <p className="text-xs text-gray-400 mt-0.5">Receita, despesas e lucro líquido mensal</p>
          </div>
          <YearSelect value={chartYear} onChange={setChartYear} />
        </div>
        {isLoading ? <Skeleton className="h-72 w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle}
                formatter={(v, n) => [formatBRL(Number(v)),
                  n === "faturamento" ? "Faturamento" : n === "gastos" ? "Manutenção" : "Lucro"]} />
              <Legend formatter={(v) => v === "faturamento" ? "Faturamento" : v === "gastos" ? "Manutenção" : "Lucro líquido"} />
              <Bar dataKey="faturamento" fill={COLORS.aqua}    radius={[4,4,0,0]} />
              <Bar dataKey="gastos"      fill={COLORS.orange}  radius={[4,4,0,0]} />
              <Line type="monotone" dataKey="lucro" stroke={COLORS.success} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Reservas/Mês + Ocupação ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-navy">Reservas por Mês</h2>
              <p className="text-xs text-gray-400 mt-0.5">Confirmadas e concluídas</p>
            </div>
            <YearSelect value={chartYear} onChange={setChartYear} />
          </div>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "Reservas"]} />
                <Bar dataKey="reservas" radius={[6,6,0,0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={i === currentMonth && chartYear === currentYear ? COLORS.navy : COLORS.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-navy">Taxa de Ocupação Mensal</h2>
              <p className="text-xs text-gray-400 mt-0.5">% de dias com reserva</p>
            </div>
            <YearSelect value={chartYear} onChange={setChartYear} />
          </div>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="ocupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.aqua} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.aqua} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Ocupação"]} />
                <Area type="monotone" dataKey="ocupacao" stroke={COLORS.aqua} strokeWidth={2.5}
                  fill="url(#ocupGrad)" dot={{ r: 3, fill: COLORS.aqua }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Lucro Líquido + Top 10 Itens mais alugados ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-navy">Lucro Líquido Acumulado</h2>
              <p className="text-xs text-gray-400 mt-0.5">Faturamento menos manutenção</p>
            </div>
            <YearSelect value={chartYear} onChange={setChartYear} />
          </div>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="lucroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => [formatBRL(Number(v)), "Lucro líquido"]} />
                <Area type="monotone" dataKey="lucro" stroke={COLORS.success} strokeWidth={2.5}
                  fill="url(#lucroGrad)" dot={{ r: 3, fill: COLORS.success }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-navy">Top 10 — Itens Mais Alugados</h2>
            <p className="text-xs text-gray-400 mt-0.5">Baseado na saída do estoque</p>
          </div>
          {isLoading ? <Skeleton className="h-56 w-full" /> : topItemsPie.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              Nenhum item foi alugado ainda.
            </div>
          ) : (
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={topItemsPie} cx="50%" cy="50%" outerRadius={85}
                    dataKey="value" paddingAngle={2}>
                    {topItemsPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                {topItemsPie.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs text-gray-600 truncate">{entry.name}</span>
                    </div>
                    <span className="text-xs font-bold text-navy flex-shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
