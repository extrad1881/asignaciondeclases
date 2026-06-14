"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") ?? "");
        const password = String(form.get("password") ?? "");
        const supabase = createClient();
        setError(null);

        startTransition(async () => {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            setError("No pudimos iniciar sesión. Revisa tu correo, contraseña o estado de usuario.");
            return;
          }

          router.replace("/dashboard");
          router.refresh();
        });
      }}
    >
      <label className="block text-sm font-semibold text-slate-700">
        Correo institucional
        <Input
          autoComplete="email"
          className="mt-1"
          name="email"
          placeholder="correo@institucion.edu.mx"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Contraseña
        <Input
          autoComplete="current-password"
          className="mt-1"
          name="password"
          placeholder="Escribe tu contraseña"
          required
          type="password"
        />
      </label>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700" role="alert">
          {error}
        </div>
      ) : null}
      <Button className="w-full" disabled={isPending} type="submit">
        <LogIn className="h-4 w-4" />
        {isPending ? "Validando acceso..." : "Entrar al sistema"}
      </Button>
    </form>
  );
}
