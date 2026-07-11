function ReadingCard({ title, value, unit, color }) {
  return (
    <div
      className="reading-card"
      style={{
        borderTop: `4px solid ${color}`,
      }}
    >
      <span className="reading-title">{title}</span>

      <h2>{value}</h2>

      {unit && <small>{unit}</small>}
    </div>
  );
}

export default ReadingCard;