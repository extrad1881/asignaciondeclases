import { LoginForm } from "@/app/(auth)/login/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3f7] px-4">
      <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-subtle">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-brand">Acceso administrativo</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Asignación de clases</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ingresa con una cuenta de administrador o coordinador.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
