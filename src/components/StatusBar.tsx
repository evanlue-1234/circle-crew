export function StatusBar() {
  return (
    <div className="status-bar">
      <span className="time">9:41</span>
      <div className="status-icons">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 22h2V8H2zM6 22h2V2H6zM10 22h2v-9h-2z" /></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7 3 3 7 3 12h2a7 7 0 0 1 7-7z" /></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="10" rx="2" /><rect x="20" y="9" width="2" height="4" /></svg>
      </div>
    </div>
  );
}
