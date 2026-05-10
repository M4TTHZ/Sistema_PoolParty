import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllClients,
  getClientById,
  getClientByCpfCnpj,
  createClient,
  updateClient,
  deleteClient,
} from "../db";

// ── Formatação ────────────────────────────────────────────────────────────────

/** Sempre salva e busca CPF/CNPJ apenas com dígitos para evitar problemas de comparação */
function normalizeDocument(value: string): string {
  return value.replace(/\D/g, "");
}

// ── Validação ─────────────────────────────────────────────────────────────────

function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    const sum = Array.from({ length: len }, (_, i) => parseInt(c[i]) * (len + 1 - i)).reduce((a, b) => a + b, 0);
    const r = (sum * 10) % 11;
    return r >= 10 ? 0 : r;
  };
  return calc(9) === parseInt(c[9]) && calc(10) === parseInt(c[10]);
}

function validateCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcDigit = (digits: string, weights: number[]) => {
    const sum = digits.split("").reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return (
    calcDigit(c.slice(0, 12), weights1) === parseInt(c[12]) &&
    calcDigit(c.slice(0, 13), weights2) === parseInt(c[13])
  );
}

// ── ViaCEP ────────────────────────────────────────────────────────────────────

async function fetchAddressFromCEP(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8)
    throw new TRPCError({ code: "BAD_REQUEST", message: "CEP deve ter 8 dígitos." });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "Erro ao consultar o ViaCEP." });
    const data = await res.json();
    if (data.erro) throw new TRPCError({ code: "NOT_FOUND", message: "CEP não encontrado." });
    return { address: data.logradouro as string, city: data.localidade as string, state: data.uf as string, cep: data.cep as string };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof TRPCError) throw err;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha na consulta do CEP." });
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────

const clientInputSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(255),
  cpfCnpj: z.string().min(1, "CPF/CNPJ obrigatório"),
  birthDate: z.date().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  cep: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const clientsRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllClients();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const client = await getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      return client;
    }),

  getByCpfCnpj: protectedProcedure
    .input(z.object({ cpfCnpj: z.string() }))
    .query(async ({ input }) => {
      return getClientByCpfCnpj(normalizeDocument(input.cpfCnpj));
    }),

  fetchAddressByCEP: protectedProcedure
    .input(z.object({ cep: z.string() }))
    .query(async ({ input }) => {
      return fetchAddressFromCEP(input.cep);
    }),

  create: protectedProcedure
    .input(clientInputSchema)
    .mutation(async ({ input }) => {
      // Normaliza: salva sempre só dígitos (evita problemas de comparação no MySQL)
      const normalized = normalizeDocument(input.cpfCnpj);
      const isCpf = normalized.length === 11;
      const isValid = isCpf ? validateCPF(normalized) : validateCNPJ(normalized);

      if (!isValid)
        throw new TRPCError({ code: "BAD_REQUEST", message: "CPF ou CNPJ inválido." });

      const existing = await getClientByCpfCnpj(normalized);
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Já existe um cliente com este CPF/CNPJ." });

      return createClient({
        ...input,
        cpfCnpj: normalized, // salva sem formatação
        email: input.email || undefined,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      email: z.string().email("E-mail inválido").optional().or(z.literal("")),
      phone: z.string().max(20).optional(),
      address: z.string().optional(),
      cep: z.string().max(10).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(2).optional(),
      birthDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const existing = await getClientById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      await updateClient(id, { ...updates, email: updates.email || undefined });
      return getClientById(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const existing = await getClientById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      await deleteClient(input.id);
      return { success: true };
    }),
});
