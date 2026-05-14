import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, User, Eye, EyeOff, Waves } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Bem-vindo ao PoolParty!");
      setLocation("/dashboard");
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      toast.error("Preencha usuário e senha.");
      return;
    }
    loginMutation.mutate({ username: form.username, password: form.password });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-[#0d2040] flex items-center justify-center p-4">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-aqua/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-aqua/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-aqua to-aqua/70 rounded-2xl shadow-lg shadow-aqua/30 mb-4">
            <Waves size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PoolParty</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de Gestão</p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-2xl shadow-black/40 bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Entrar</h2>
              <p className="text-gray-400 text-sm mt-1">Acesso restrito ao administrador</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Usuário
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    placeholder="admin"
                    autoComplete="username"
                    autoFocus
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-aqua focus:ring-aqua/20 h-11"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-aqua focus:ring-aqua/20 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-aqua hover:bg-aqua/90 text-white font-semibold text-sm shadow-lg shadow-aqua/30 transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>
        </Card>

        <p className="text-center text-gray-600 text-xs mt-6">
          PoolParty Manager © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
