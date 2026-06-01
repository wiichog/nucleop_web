export function PageLoading({ label = "Cargando…" }: { label?: string }) {
  return <p style={{ color: "var(--nucleo-muted)" }}>{label}</p>;
}

export function PageError({
  message = "No se pudo cargar la información. Intenta de nuevo.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="nucleo-card" role="alert">
      <p style={{ margin: "0 0 12px", color: "var(--nucleo-danger)" }}>{message}</p>
      {onRetry && (
        <button type="button" className="nucleo-btn nucleo-btn--secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function NoGymAssigned() {
  return (
    <PageError message="No tienes un gimnasio asignado. Contacta al administrador de Nucleo." />
  );
}
