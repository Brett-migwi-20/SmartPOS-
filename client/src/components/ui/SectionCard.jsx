function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="section-card">
      {(title || action) && (
        <header className="section-card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export default SectionCard;
