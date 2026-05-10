import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Trash2, PackagePlus, AlertTriangle, CheckCircle } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

const EMPTY_FORM = { name: "", quantity: "", unitPrice: "" };

export default function Stock() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: items, isLoading } = trpc.stock.list.useQuery();
  const utils = trpc.useUtils();

  const createItemMutation = trpc.stock.create.useMutation({
    onSuccess: () => {
      utils.stock.list.invalidate();
      toast.success("Item adicionado ao estoque!");
      closeForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateItemMutation = trpc.stock.update.useMutation({
    onSuccess: () => {
      utils.stock.list.invalidate();
      toast.success("Item atualizado com sucesso!");
      closeForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteItemMutation = trpc.stock.delete.useMutation({
    onSuccess: () => {
      utils.stock.list.invalidate();
      toast.success("Item removido do estoque.");
      setDeletingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  function openNewForm() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  }

  function openEditForm(item: { id: number; name: string; quantity: number; unitPrice: string }) {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      unitPrice: parseFloat(item.unitPrice).toString(),
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateItemMutation.mutate({
        id: editingId,
        name: formData.name || undefined,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
      });
    } else {
      createItemMutation.mutate({
        name: formData.name,
        quantity: parseInt(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
      });
    }
  }

  const isSaving = createItemMutation.isPending || updateItemMutation.isPending;
  const lowStockCount = items?.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">Estoque</h1>
          {lowStockCount > 0 && (
            <p className="text-sm text-warning flex items-center gap-1 mt-1">
              <AlertTriangle size={14} />
              {lowStockCount} {lowStockCount === 1 ? "item" : "itens"} com estoque baixo
            </p>
          )}
        </div>
        <Button onClick={openNewForm} className="bg-aqua hover:opacity-90 text-white flex items-center gap-2">
          <PackagePlus size={18} /> Novo Item
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Nenhum item cadastrado no estoque.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  {["Nome", "Quantidade", "Valor Unitário", "Status", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={item.id} className={`border-b hover:bg-gray-50 transition-colors ${isLow ? "bg-warning/5" : ""}`}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={isLow ? "font-bold text-warning" : ""}>{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {parseFloat(item.unitPrice).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/15 text-warning rounded text-xs font-medium">
                            <AlertTriangle size={12} /> Estoque Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/15 text-success rounded text-xs font-medium">
                            <CheckCircle size={12} /> Disponível
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditForm(item)}
                            className="flex items-center gap-1"
                          >
                            <Pencil size={14} /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingId(item.id)}
                            className="flex items-center gap-1 text-danger border-danger hover:bg-danger/5"
                          >
                            <Trash2 size={14} /> Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Item" : "Novo Item de Estoque"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Item *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Boia de Piscina"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantidade *</label>
              <Input
                type="number"
                min={0}
                value={formData.quantity}
                onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Valor Unitário (R$) *</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData((p) => ({ ...p, unitPrice: e.target.value }))}
                placeholder="0,00"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-aqua hover:opacity-90 text-white" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:opacity-90"
              onClick={() => deletingId !== null && deleteItemMutation.mutate({ id: deletingId })}
              disabled={deleteItemMutation.isPending}
            >
              {deleteItemMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
