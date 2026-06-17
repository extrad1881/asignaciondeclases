import Image from "next/image";
import { LoginForm } from "@/app/(auth)/login/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,var(--brand-soft),transparent_30rem),var(--panel)] px-4 py-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden flex-col justify-between border-r border-line px-10 py-8 lg:flex">
        <div className="flex items-center gap-4">
          <Image alt="Logo institucional" className="h-16 w-16 rounded-md object-contain" height={64} src="/logos/logo-color.png" width={64} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Coordinación académica</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">Asignación de clases</h1>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Sistema administrativo académico</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight text-ink">
            Control confiable para grupos, docentes, materias y horarios.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Accede con tu cuenta institucional para revisar datos, corregir pendientes y gestionar asignaciones con trazabilidad.
          </p>
        </div>
        <p className="text-sm text-muted">Uso interno. Las acciones sensibles se validan con permisos y auditoría.</p>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-md border border-line bg-card p-6 shadow-panel">
          <div className="mb-6 text-center lg:text-left">
            <Image alt="Logo institucional" className="mx-auto mb-4 h-14 w-14 rounded-md object-contain lg:hidden" height={56} src="/logos/logo-color.png" width={56} />
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Acceso administrativo</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Iniciar sesión</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ingresa con una cuenta autorizada de administrador o coordinador.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
