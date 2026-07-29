interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
}

export default function StatCard({
  label,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="statCard">
      <p className="statLabel">{label}</p>
      <h2>{value}</h2>

      {description && (
        <p className="statDescription">{description}</p>
      )}
    </div>
  );
}