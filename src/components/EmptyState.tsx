export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div
      className="nucleo-card"
      style={{ textAlign: "center", padding: "32px 24px" }}
      role="status"
    >
      <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{title}</p>
      {description && (
        <p style={{ margin: 0, color: "var(--nucleo-muted)", fontSize: 14 }}>{description}</p>
      )}
    </div>
  );
}
