import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CalendarPlus, Pencil, Trash2, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Package, Gamepad2, StickyNote,
  FileDown,
} from "lucide-react";
import { generateReservationPdfClient } from "@/lib/pdfGenerator";

// ── Tipos ──────────────────────────────────────────────────────────────────
type Status = "confirmed" | "cancelled" | "completed";

const STATUS_LABEL: Record<Status, string> = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
};
const STATUS_COLOR: Record<Status, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-green-100 text-green-700",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatBRL(v: number | string) {
  return parseFloat(String(v) || "0").toLocaleString("pt-BR", {
    style: "currency", currency: "BRL",
  });
}

// ── Calendário de seleção múltipla ─────────────────────────────────────────
function ReservationCalendar({
  selected,
  onChange,
  reservedDates = [],
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
  reservedDates?: string[];
}) {
  const [view, setView] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const { year, month } = view;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function toDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function toggle(day: number) {
    const str = toDateStr(day);
    if (reservedDates.includes(str)) return; // blocked
    if (selected.includes(str)) {
      onChange(selected.filter((s) => s !== str));
    } else {
      onChange([...selected, str].sort());
    }
  }

  function prevMonth() {
    setView(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  }
  function nextMonth() {
    setView(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      {/* Navegação */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm text-navy">
          {MONTH_NAMES[month]} {year}
        </span>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Dias */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const day = idx - firstDay + 1;
          const inMonth = day > 0 && day <= daysInMonth;
          const dateStr = inMonth ? toDateStr(day) : "";
          const isSelected = inMonth && selected.includes(dateStr);
          const isReserved = inMonth && reservedDates.includes(dateStr);
          const isToday = inMonth && dateStr === todayStr;

          return (
            <button
              key={idx}
              type="button"
              disabled={!inMonth || isReserved}
              onClick={() => inMonth && toggle(day)}
              title={isReserved ? "Data já reservada" : undefined}
              className={[
                "aspect-square text-xs rounded-lg flex items-center justify-center font-medium transition-all select-none",
                !inMonth ? "invisible pointer-events-none" : "",
                isReserved
                  ? "bg-red-100 text-red-400 cursor-not-allowed line-through"
                  : isSelected
                  ? "bg-aqua text-white shadow-sm"
                  : "hover:bg-aqua/10 text-gray-700 cursor-pointer",
                isToday && !isSelected && !isReserved ? "ring-2 ring-aqua ring-offset-1" : "",
              ].join(" ")}
            >
              {inMonth ? day : ""}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-aqua inline-block" /> Selecionada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Reservada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded ring-2 ring-aqua inline-block" /> Hoje
        </span>
      </div>

      {/* Chips das datas selecionadas */}
      {selected.length > 0 && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
          {selected.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 bg-aqua/15 text-aqua text-xs px-2 py-0.5 rounded-full font-medium"
            >
              {new Date(d + "T12:00:00").toLocaleDateString("pt-BR")}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== d))}
                className="hover:text-red-500 ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formulário ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  clientId: "",
  dates: [] as string[],
  rentalPrice: "",
  observations: "",
  pgEnabled: false,
  pgStart: "",
  pgEnd: "",
  pgPrice: "",
  items: [] as Array<{ stockItemId: string; quantity: string }>,
};

type FormState = typeof EMPTY_FORM;

// ── Página principal ───────────────────────────────────────────────────────
export default function Reservations() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: reservations, isLoading } = trpc.reservations.list.useQuery();
  const { data: reservedDates = [] } = trpc.reservations.reservedDates.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: stockItems } = trpc.stock.list.useQuery();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  function invalidateAll() {
    utils.reservations.list.invalidate();
    utils.reservations.reservedDates.invalidate();
    utils.stock.list.invalidate();
  }

  const createMutation = trpc.reservations.create.useMutation({
    onSuccess: () => { invalidateAll(); toast.success("Reserva criada com sucesso!"); closeForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.reservations.update.useMutation({
    onSuccess: () => { invalidateAll(); toast.success("Reserva atualizada!"); closeForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.reservations.delete.useMutation({
    onSuccess: () => { invalidateAll(); toast.success("Reserva removida."); setDeletingId(null); },
    onError: (e) => toast.error(e.message),
  });

  const clientMap = useMemo(() => {
    const m = new Map<number, string>();
    clients?.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    if (!reservations) return [];
    if (!filterStatus) return reservations;
    return reservations.filter((r) => r.status === filterStatus);
  }, [reservations, filterStatus]);

  // Datas bloqueadas: todas reservadas EXCETO as da reserva sendo editada
  const blockedDates = useMemo(() => {
    if (!editingId) return reservedDates;
    // Não bloqueamos as datas da própria reserva sendo editada
    const editingDates = new Set(form.dates);
    return reservedDates.filter((d) => !editingDates.has(d));
  }, [reservedDates, editingId, form.dates]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  }

  function openEdit(r: typeof filtered[0]) {
    setEditingId(r.id);
    setForm({
      clientId: r.clientId.toString(),
      dates: r.dates ?? [],
      rentalPrice: parseFloat(String(r.rentalPrice ?? "0")).toString(),
      observations: r.observations ?? "",
      pgEnabled: false,
      pgStart: "",
      pgEnd: "",
      pgPrice: "",
      items: [],
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function addItem() {
    setForm((p) => ({ ...p, items: [...p.items, { stockItemId: "", quantity: "1" }] }));
  }
  function removeItem(i: number) {
    setForm((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }
  function setItemField(i: number, field: "stockItemId" | "quantity", val: string) {
    setForm((p) => {
      const items = [...p.items];
      items[i] = { ...items[i], [field]: val };
      return { ...p, items };
    });
  }

  // Calcula valor total estimado em tempo real
  const estimatedTotal = useMemo(() => {
    const rental = parseFloat(form.rentalPrice || "0") || 0;
    const itemsTotal = form.items.reduce((sum, item) => {
      const stock = stockItems?.find((s) => s.id === parseInt(item.stockItemId));
      if (!stock || !item.quantity) return sum;
      return sum + parseFloat(String(stock.unitPrice)) * parseInt(item.quantity);
    }, 0);
    const pgTotal = form.pgEnabled && form.pgPrice ? parseFloat(form.pgPrice) || 0 : 0;
    return rental + itemsTotal + pgTotal;
  }, [form, stockItems]);

  async function handleDownloadPdf(reservationId: number) {
    setDownloadingId(reservationId);
    try {
      const data = await utils.reservations.getById.fetch({ id: reservationId });
      if (!data) { toast.error("Reserva não encontrada."); return; }

      const client = clients?.find((c) => c.id === data.clientId);
      if (!client) { toast.error("Cliente não encontrado."); return; }

      generateReservationPdfClient({
        reservation: {
          id: data.id,
          rentalPrice: data.rentalPrice ?? 0,
          totalAmount: data.totalAmount ?? 0,
          observations: data.observations,
        },
        client: { name: client.name, cpfCnpj: client.cpfCnpj },
        dates: data.dates ?? [],
        items: (data.items ?? []).map((item) => ({
          name: stockItems?.find((s) => s.id === item.stockItemId)?.name ?? `Item #${item.stockItemId}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        playground: data.playground
          ? { startTime: data.playground.startTime, endTime: data.playground.endTime, price: data.playground.price }
          : null,
      });

      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.dates.length === 0) {
      toast.error("Selecione ao menos uma data no calendário.");
      return;
    }
    if (form.pgEnabled && form.pgStart && form.pgEnd && form.pgStart >= form.pgEnd) {
      toast.error("Horário de início da brinquedoteca deve ser anterior ao término.");
      return;
    }

    const items = form.items
      .filter((i) => i.stockItemId && i.quantity)
      .map((i) => ({ stockItemId: parseInt(i.stockItemId), quantity: parseInt(i.quantity) }));

    const playground =
      form.pgEnabled && form.pgStart && form.pgEnd && form.pgPrice
        ? { startTime: form.pgStart, endTime: form.pgEnd, price: parseFloat(form.pgPrice) }
        : undefined;

    const payload = {
      dates: form.dates,
      rentalPrice: parseFloat(form.rentalPrice || "0") || 0,
      observations: form.observations || undefined,
      items: items.length > 0 ? items : undefined,
      playground,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload, playground: playground ?? null });
    } else {
      createMutation.mutate({ clientId: parseInt(form.clientId), ...payload });
    }
  }

  function quickStatus(id: number, status: Status) {
    updateMutation.mutate(
      { id, status },
      {
        onSuccess: () => { invalidateAll(); toast.success(`Reserva marcada como ${STATUS_LABEL[status].toLowerCase()}.`); },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold text-navy">Reservas</h1>
        <Button onClick={openNew} className="bg-aqua hover:opacity-90 text-white flex items-center gap-2">
          <CalendarPlus size={18} /> Nova Reserva
        </Button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        {([["", "Todas"], ["confirmed", "Confirmadas"], ["completed", "Concluídas"], ["cancelled", "Canceladas"]] as const).map(
          ([val, label]) => (
            <Button
              key={val}
              size="sm"
              variant={filterStatus === val ? "default" : "outline"}
              onClick={() => setFilterStatus(val)}
              className={filterStatus === val ? "bg-navy text-white" : ""}
            >
              {label}
            </Button>
          ),
        )}
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhuma reserva encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  {["Cliente", "Datas", "Aluguel", "Total", "Status", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-sm">
                      {clientMap.get(r.clientId) ?? `Cliente #${r.clientId}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {(r.dates ?? []).slice(0, 2).map((d) => (
                          <span key={d} className="bg-aqua/10 text-aqua text-xs px-1.5 py-0.5 rounded font-medium">
                            {new Date(d + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        ))}
                        {(r.dates ?? []).length > 2 && (
                          <span className="text-xs text-gray-400 self-center">+{(r.dates ?? []).length - 2} datas</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatBRL(r.rentalPrice ?? 0)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatBRL(r.totalAmount ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLOR[r.status as Status]}`}>
                        {STATUS_LABEL[r.status as Status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="flex items-center gap-1">
                          <Pencil size={13} /> Editar
                        </Button>
                        {r.status === "confirmed" && (
                          <Button size="sm" variant="outline"
                            onClick={() => quickStatus(r.id, "completed")}
                            className="flex items-center gap-1 text-green-600 border-green-400 hover:bg-green-50">
                            <CheckCircle size={13} /> Concluir
                          </Button>
                        )}
                        {r.status !== "cancelled" && (
                          <Button size="sm" variant="outline"
                            onClick={() => quickStatus(r.id, "cancelled")}
                            className="flex items-center gap-1 text-amber-600 border-amber-400 hover:bg-amber-50">
                            <XCircle size={13} /> Cancelar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPdf(r.id)}
                          disabled={downloadingId === r.id}
                          className="flex items-center gap-1 text-aqua border-aqua/50 hover:bg-aqua/5"
                        >
                          <FileDown size={13} />
                          {downloadingId === r.id ? "Gerando..." : "PDF"}
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => setDeletingId(r.id)}
                          className="flex items-center gap-1 text-red-500 border-red-300 hover:bg-red-50">
                          <Trash2 size={13} /> Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Dialog do formulário ─────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingId ? "Editar Reserva" : "Nova Reserva"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">

            {/* ── 1. Cliente ── */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Cliente <span className="text-red-400">*</span>
              </label>
              <select
                value={form.clientId}
                onChange={(e) => set("clientId", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-aqua/30 focus:border-aqua outline-none"
                required
                disabled={!!editingId}
              >
                <option value="">Selecione um cliente...</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* ── 2. Calendário ── */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Datas <span className="text-red-400">*</span>
                <span className="font-normal text-gray-400 ml-1">(clique para selecionar, pode escolher várias)</span>
              </label>
              <ReservationCalendar
                selected={form.dates}
                onChange={(dates) => set("dates", dates)}
                reservedDates={blockedDates}
              />
              {form.dates.length === 0 && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  ⚠ Selecione ao menos uma data no calendário.
                </p>
              )}
            </div>

            {/* ── 3. Valor do aluguel ── */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Valor do Aluguel do Espaço (R$) <span className="text-red-400">*</span>
              </label>
              <Input
                type="number" min={0} step="0.01"
                value={form.rentalPrice}
                onChange={(e) => set("rentalPrice", e.target.value)}
                placeholder="0,00"
                required
                className="focus:ring-2 focus:ring-aqua/30 focus:border-aqua"
              />
            </div>

            {/* ── 4. Observações ── */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 flex items-center gap-2">
                <StickyNote size={15} className="text-gray-400" />
                Observações <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={form.observations}
                onChange={(e) => set("observations", e.target.value)}
                placeholder="Alguma observação sobre esta reserva..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-aqua/30 focus:border-aqua outline-none"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 mt-0.5 text-right">{form.observations.length}/1000</p>
            </div>

            {/* ── 5. Itens do estoque ── */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-500" />
                  <div>
                    <h3 className="font-semibold text-sm">Itens do Estoque</h3>
                    <p className="text-xs text-gray-400">Opcional — adicione itens alugados</p>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="text-xs">
                  + Adicionar Item
                </Button>
              </div>

              {form.items.length === 0 ? (
                <div className="border border-dashed rounded-lg py-4 text-center text-sm text-gray-400">
                  Nenhum item adicionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header das colunas */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <div className="col-span-6">Item</div>
                    <div className="col-span-2 text-center">Qtd</div>
                    <div className="col-span-3 text-right">Valor Unit.</div>
                    <div className="col-span-1" />
                  </div>
                  {form.items.map((item, idx) => {
                    const stock = stockItems?.find((s) => s.id === parseInt(item.stockItemId));
                    const subtotal = stock && item.quantity
                      ? parseFloat(String(stock.unitPrice)) * parseInt(item.quantity)
                      : null;
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                        <div className="col-span-6">
                          <select
                            value={item.stockItemId}
                            onChange={(e) => setItemField(idx, "stockItemId", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-aqua/30 outline-none"
                            required
                          >
                            <option value="">Selecione...</option>
                            {stockItems?.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} — {formatBRL(s.unitPrice)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number" min={1}
                            value={item.quantity}
                            onChange={(e) => setItemField(idx, "quantity", e.target.value)}
                            className="text-xs text-center h-8"
                            required
                          />
                        </div>
                        <div className="col-span-3 text-right text-xs">
                          {stock ? (
                            <div>
                              <div className="text-gray-500">{formatBRL(stock.unitPrice)}</div>
                              {subtotal !== null && (
                                <div className="font-semibold text-navy">{formatBRL(subtotal)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-600 text-lg leading-none"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 6. Brinquedoteca ── */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pg-toggle"
                  checked={form.pgEnabled}
                  onChange={(e) => set("pgEnabled", e.target.checked)}
                  className="w-4 h-4 accent-aqua cursor-pointer"
                />
                <label htmlFor="pg-toggle" className="flex items-center gap-2 cursor-pointer">
                  <Gamepad2 size={16} className="text-gray-500" />
                  <div>
                    <span className="font-semibold text-sm">Alugar Brinquedoteca</span>
                    <span className="text-xs text-gray-400 ml-1">(opcional)</span>
                  </div>
                </label>
              </div>

              {form.pgEnabled && (
                <div className="bg-aqua/5 border border-aqua/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    O sistema verificará automaticamente conflitos de horário com outras reservas.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600">Horário de Início</label>
                      <Input
                        type="time"
                        value={form.pgStart}
                        onChange={(e) => set("pgStart", e.target.value)}
                        required={form.pgEnabled}
                        className="focus:ring-2 focus:ring-aqua/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600">Horário de Término</label>
                      <Input
                        type="time"
                        value={form.pgEnd}
                        onChange={(e) => set("pgEnd", e.target.value)}
                        required={form.pgEnabled}
                        className="focus:ring-2 focus:ring-aqua/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-600">Valor do Aluguel (R$)</label>
                      <Input
                        type="number" min={0} step="0.01"
                        value={form.pgPrice}
                        onChange={(e) => set("pgPrice", e.target.value)}
                        placeholder="0,00"
                        required={form.pgEnabled}
                        className="focus:ring-2 focus:ring-aqua/30"
                      />
                    </div>
                  </div>
                  {form.pgStart && form.pgEnd && form.pgStart >= form.pgEnd && (
                    <p className="text-xs text-red-400">⚠ O horário de início deve ser anterior ao término.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Resumo do total ── */}
            <div className="bg-navy/5 border border-navy/10 rounded-xl p-4">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-600">Aluguel do espaço</span>
                <span>{formatBRL(form.rentalPrice || "0")}</span>
              </div>
              {form.items.some((i) => i.stockItemId && i.quantity) && (
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600">Itens do estoque</span>
                  <span>
                    {formatBRL(form.items.reduce((sum, item) => {
                      const stock = stockItems?.find((s) => s.id === parseInt(item.stockItemId));
                      if (!stock || !item.quantity) return sum;
                      return sum + parseFloat(String(stock.unitPrice)) * parseInt(item.quantity);
                    }, 0))}
                  </span>
                </div>
              )}
              {form.pgEnabled && form.pgPrice && (
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600">Brinquedoteca</span>
                  <span>{formatBRL(form.pgPrice)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold">
                <span className="text-navy">Total Estimado</span>
                <span className="text-navy text-lg">{formatBRL(estimatedTotal)}</span>
              </div>
            </div>

            {/* ── Botões ── */}
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-aqua hover:opacity-90 text-white font-semibold"
                disabled={isSaving || form.dates.length === 0}
              >
                {isSaving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Reserva"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de exclusão ── */}
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens e dados de brinquedoteca desta reserva serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:opacity-90"
              onClick={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
