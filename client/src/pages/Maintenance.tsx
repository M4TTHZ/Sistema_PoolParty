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
import { Wrench, Plus, Pencil, Trash2, Search, TrendingDown, Calendar } from "lucide-react";

function formatBRL(v: number | string) {
  return parseFloat(String(v) || "0").toLocaleString("pt-BR", {
    style: "currency", currency: "BRL",
  });
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

const EMPTY_FORM = {
  description: "",
  value: "",
  maintenanceDate: "",
};

export default function Maintenance() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const { data: maintenances, isLoading } = trpc.maintenance.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => { utils.maintenance.list.invalidate(); toast.success("Manutenção registrada!"); closeForm(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.maintenance.update.useMutation({
    onSuccess: () => { utils.maintenance.list.invalidate(); toast.success("Manutenção atualizada!"); closeForm(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.maintenance.delete.useMutation({
    onSuccess: () => { utils.maintenance.list.invalidate(); toast.success("Manutenção removida."); setDeletingId(null); },
    onError: (e) => toast.error(e.message),
  });

  // Filter and search
  const filtered = useMemo(() => {
    if (!maintenances) return [];
    return maintenances.filter((m) => {
      const matchSearch = !search.trim() || m.description.toLowerCase().includes(search.toLowerCase());
      const matchMonth = !filterMonth || m.maintenanceDate.startsWith(filterMonth);
      return matchSearch && matchMonth;
    });
  }, [maintenances, search, filterMonth]);

  // Dashboard stats
  const stats = useMemo(() => {
    if (!maintenances) return null;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = maintenances.filter((m) => m.maintenanceDate.startsWith(currentMonth));
    const totalAll = maintenances.reduce((s, m) => s + parseFloat(String(m.value)), 0);
    const totalMonth = thisMonth.reduce((s, m) => s + parseFloat(String(m.value)), 0);
    return { totalAll, totalMonth, countAll: maintenances.length, countMonth: thisMonth.length };
  }, [maintenances]);

  function openNew() { setEditingId(null); setForm(EMPTY_FORM); setIsFormOpen(true); }

  function openEdit(m: NonNullable<typeof maintenances>[0]) {
    setEditingId(m.id);
    setForm({
      description: m.description,
      value: parseFloat(String(m.value)).toString(),
      maintenanceDate: m.maintenanceDate,
    });
    setIsFormOpen(true);
  }

  function closeForm() { setIsFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      description: form.description,
      value: parseFloat(form.value),
      maintenanceDate: form.maintenanceDate,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center">
            <Wrench size={20} className="text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-navy">Manutenção</h1>
            <p className="text-sm text-gray-500">Controle de gastos com manutenção</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-navy hover:opacity-90 text-white flex items-center gap-2">
          <Plus size={18} /> Registrar Manutenção
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-16 w-full" /></Card>)
        ) : (
          <>
            <Card className="p-5 bg-gradient-to-br from-gold/10 to-gold/5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <TrendingDown size={15} className="text-gold" />
                Gasto Total
              </div>
              <div className="text-2xl font-bold text-gold">{formatBRL(stats?.totalAll ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">Todos os registros</div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-navy/10 to-navy/5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Calendar size={15} className="text-navy" />
                Gasto este Mês
              </div>
              <div className="text-2xl font-bold text-navy">{formatBRL(stats?.totalMonth ?? 0)}</div>
              <div className="text-xs text-gray-400 mt-1">{stats?.countMonth ?? 0} manutenções</div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-aqua/10 to-aqua/5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Wrench size={15} className="text-aqua" />
                Total de Registros
              </div>
              <div className="text-2xl font-bold text-aqua">{stats?.countAll ?? 0}</div>
              <div className="text-xs text-gray-400 mt-1">Manutenções cadastradas</div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-gray-100 to-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <TrendingDown size={15} className="text-gray-500" />
                Média por Manutenção
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {formatBRL(stats && stats.countAll > 0 ? stats.totalAll / stats.countAll : 0)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Valor médio</div>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-44"
            />
            {filterMonth && (
              <Button variant="outline" size="sm" onClick={() => setFilterMonth("")}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Wrench size={40} className="mx-auto mb-3 opacity-20" />
            <p>{search || filterMonth ? "Nenhum resultado para os filtros aplicados." : "Nenhuma manutenção registrada."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  {["#", "Descrição", "Data", "Valor", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">#{m.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-navy">{m.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={13} className="text-gray-400" />
                        {formatDate(m.maintenanceDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gold">
                      {formatBRL(m.value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(m)}
                          className="flex items-center gap-1">
                          <Pencil size={13} /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeletingId(m.id)}
                          className="flex items-center gap-1 text-red-500 border-red-300 hover:bg-red-50">
                          <Trash2 size={13} /> Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer total */}
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">
                    {filtered.length} {filtered.length === 1 ? "registro" : "registros"} exibidos
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-navy">
                    {formatBRL(filtered.reduce((s, m) => s + parseFloat(String(m.value)), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench size={18} className="text-gold" />
              {editingId ? "Editar Manutenção" : "Registrar Manutenção"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Descrição <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Descreva o serviço de manutenção realizado..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-navy/30 focus:border-navy outline-none"
                rows={3}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{form.description.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Valor (R$) <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="0,00"
                required
                className="focus:ring-2 focus:ring-navy/30"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Data da Manutenção <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={form.maintenanceDate}
                onChange={(e) => set("maintenanceDate", e.target.value)}
                required
                className="focus:ring-2 focus:ring-navy/30"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-navy hover:opacity-90 text-white font-semibold"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : editingId ? "Salvar Alterações" : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta manutenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será permanentemente removido. Esta ação não pode ser desfeita.
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
