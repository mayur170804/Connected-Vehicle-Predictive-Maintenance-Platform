interface HeaderProps {
  serviceStatus: string;
}

export default function Header({ serviceStatus }: HeaderProps) {
  const online = serviceStatus === "UP";

  return (
    <header className="header">
      <div>
        <div className="brand">
          <div className="brandIcon">CV</div>

          <div>
            <h1>Connected Vehicle</h1>
            <p>Predictive Maintenance Platform</p>
          </div>
        </div>
      </div>

      <div className={`systemStatus ${online ? "online" : "offline"}`}>
        <span className="statusDot" />
        {online ? "System Operational" : serviceStatus}
      </div>
    </header>
  );
}