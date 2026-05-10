import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, UserPlus, Search } from "lucide-react";

type Client = {
  id: number;
  name: string;
  cpfCnpj: string;
  birthDate?: Date | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cep?: string | null;
  city?: string | null;
  state?: string | null;
};

const EMPTY_FORM = {
  name: "",
  cpfCnpj: "",
  birthDate: "",
  email: "",
  phone: "",
  cep: "",
  address: "",
  city: "",
  state: "",
};

export default function Clients() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fetchingCep, setFetchingCep] = useState(false);

  const { data: clients, isLoading } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Cliente cadastrado com sucesso!");
      closeForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Cliente atualizado com sucesso!");
      closeForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Cliente removido.");
      setDeletingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchTerm.trim()) return clients;
    const lower = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.cpfCnpj.includes(searchTerm) ||
        c.email?.toLowerCase().includes(lower),
    );
  }, [clients, searchTerm]);

  function openNewForm() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  }

  function openEditForm(client: Client) {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      cpfCnpj: client.cpfCnpj,
      birthDate: client.birthDate
        ? new Date(client.birthDate).toISOString().split("T")[0]
        : "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      cep: client.cep ?? "",
      address: client.address ?? "",
      city: client.city ?? "",
      state: client.state ?? "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  async function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cep = e.target.value;
    setFormData((prev) => ({ ...prev, cep }));

    if (cep.replace(/\D/g, "").length === 8) {
      setFetchingCep(true);
      try {
        const data = await utils.clients.fetchAddressByCEP.fetch({ cep });
        setFormData((prev) => ({
          ...prev,
          address: data.address,
          city: data.city,
          state: data.state,
        }));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "CEP não encontrado.");
      } finally {
        setFetchingCep(false);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      cep: formData.cep || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
    };

    if (editingId) {
      updateClientMutation.mutate({ id: editingId, ...payload });
    } else {
      createClientMutation.mutate({ ...payload, cpfCnpj: formData.cpfCnpj });
    }
  }

  const isSaving = createClientMutation.isPending || updateClientMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold text-navy">Clientes</h1>
        <Button onClick={openNewForm} className="bg-aqua hover:opacity-90 text-white flex items-center gap-2">
          <UserPlus size={18} /> Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  {["Nome", "CPF/CNPJ", "E-mail", "Telefone", "Cidade", "Ações"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      {searchTerm ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado."}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.cpfCnpj}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.email || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.city || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditForm(client)}
                            className="flex items-center gap-1"
                          >
                            <Pencil size={14} /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingId(client.id)}
                            className="flex items-center gap-1 text-danger border-danger hover:bg-danger/5"
                          >
                            <Trash2 size={14} /> Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            {!editingId && (
              <div>
                <label className="block text-sm font-medium mb-1">CPF / CNPJ *</label>
                <Input
                  value={formData.cpfCnpj}
                  onChange={(e) => setFormData((p) => ({ ...p, cpfCnpj: e.target.value }))}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData((p) => ({ ...p, birthDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">CEP</label>
              <Input
                value={formData.cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                disabled={fetchingCep}
              />
              {fetchingCep && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Endereço</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Cidade</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UF</label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-aqua hover:opacity-90 text-white"
                disabled={isSaving}
              >
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
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:opacity-90"
              onClick={() => deletingId !== null && deleteClientMutation.mutate({ id: deletingId })}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
