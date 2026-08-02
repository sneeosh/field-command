"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Side = "rome" | "carthage";
type Formation = "Line" | "Guard" | "Wedge";
type Unit = {
  id: number;
  side: Side;
  name: string;
  kind: "Infantry" | "Spears" | "Cavalry" | "Archers";
  men: number;
  maxMen: number;
  morale: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  facing: number;
  formation: Formation;
};

const initialUnits: Unit[] = [
  { id: 1, side: "rome", name: "I Legion — Hastati", kind: "Infantry", men: 120, maxMen: 120, morale: 96, x: 21, y: 39, tx: 21, ty: 39, facing: 0, formation: "Line" },
  { id: 2, side: "rome", name: "I Legion — Principes", kind: "Infantry", men: 112, maxMen: 112, morale: 98, x: 16, y: 52, tx: 16, ty: 52, facing: 0, formation: "Line" },
  { id: 3, side: "rome", name: "Velites", kind: "Archers", men: 80, maxMen: 80, morale: 84, x: 27, y: 58, tx: 27, ty: 58, facing: 0, formation: "Line" },
  { id: 4, side: "rome", name: "Equites", kind: "Cavalry", men: 48, maxMen: 48, morale: 91, x: 13, y: 29, tx: 13, ty: 29, facing: 0, formation: "Wedge" },
  { id: 5, side: "rome", name: "Triarii", kind: "Spears", men: 72, maxMen: 72, morale: 100, x: 20, y: 69, tx: 20, ty: 69, facing: 0, formation: "Guard" },
  { id: 6, side: "carthage", name: "Libyan Infantry", kind: "Spears", men: 120, maxMen: 120, morale: 94, x: 76, y: 38, tx: 76, ty: 38, facing: 180, formation: "Line" },
  { id: 7, side: "carthage", name: "Iberian Swords", kind: "Infantry", men: 110, maxMen: 110, morale: 90, x: 82, y: 51, tx: 82, ty: 51, facing: 180, formation: "Line" },
  { id: 8, side: "carthage", name: "Numidian Riders", kind: "Cavalry", men: 54, maxMen: 54, morale: 88, x: 88, y: 30, tx: 88, ty: 30, facing: 180, formation: "Wedge" },
  { id: 9, side: "carthage", name: "Balearic Slingers", kind: "Archers", men: 76, maxMen: 76, morale: 82, x: 70, y: 60, tx: 70, ty: 60, facing: 180, formation: "Line" },
  { id: 10, side: "carthage", name: "Sacred Band", kind: "Infantry", men: 80, maxMen: 80, morale: 100, x: 82, y: 69, tx: 82, ty: 69, facing: 180, formation: "Guard" },
];

const formations: { name: Formation; icon: string; note: string }[] = [
  { name: "Line", icon: "━━", note: "Balanced front" },
  { name: "Guard", icon: "▰", note: "Hold position" },
  { name: "Wedge", icon: "◆", note: "Charge impact" },
];

export default function Home() {
  const [units, setUnits] = useState(initialUnits);
  const [selected, setSelected] = useState<number[]>([1]);
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("Select a unit, then click the field to issue an order.");
  const fieldRef = useRef<HTMLDivElement>(null);

  const living = useMemo(() => units.filter((unit) => unit.men > 0), [units]);
  const romanStrength = living.filter((u) => u.side === "rome").reduce((sum, u) => sum + u.men, 0);
  const enemyStrength = living.filter((u) => u.side === "carthage").reduce((sum, u) => sum + u.men, 0);
  const result = romanStrength <= 0 ? "DEFEAT" : enemyStrength <= 0 ? "VICTORY" : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (paused || result) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + speed);
      setUnits((current) => {
        const snapshot = current.map((unit) => ({ ...unit }));
        for (const unit of snapshot) {
          if (unit.men <= 0) continue;
          if (unit.side === "carthage") {
            const opponents = snapshot.filter((other) => other.side === "rome" && other.men > 0);
            const target = opponents.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
            if (target && distance(unit, target) > (unit.kind === "Archers" ? 23 : 6)) {
              unit.tx = target.x;
              unit.ty = target.y;
            }
          }
          const dx = unit.tx - unit.x;
          const dy = unit.ty - unit.y;
          const dist = Math.hypot(dx, dy);
          const moveRate = (unit.kind === "Cavalry" ? 1.3 : unit.kind === "Archers" ? 0.72 : 0.86) * speed;
          if (dist > 1 && unit.formation !== "Guard") {
            unit.x += (dx / dist) * Math.min(moveRate, dist);
            unit.y += (dy / dist) * Math.min(moveRate, dist);
            unit.facing = Math.atan2(dy, dx) * 180 / Math.PI;
          }
        }
        for (const attacker of snapshot) {
          if (attacker.men <= 0) continue;
          const range = attacker.kind === "Archers" ? 22 : 7;
          const targets = snapshot.filter((other) => other.side !== attacker.side && other.men > 0 && distance(attacker, other) < range);
          if (!targets.length) continue;
          const target = targets[0];
          const advantage = attacker.kind === "Cavalry" && target.kind === "Archers" ? 1.8 : attacker.kind === "Spears" && target.kind === "Cavalry" ? 1.65 : 1;
          const formationBonus = attacker.formation === "Wedge" ? 1.22 : attacker.formation === "Guard" ? 0.78 : 1;
          const loss = Math.max(1, Math.round(0.44 * speed * advantage * formationBonus));
          target.men = Math.max(0, target.men - loss);
          target.morale = Math.max(0, target.morale - loss * 0.75);
          if (target.morale < 25) {
            target.tx = target.side === "rome" ? 3 : 97;
            target.ty = target.y;
            target.formation = "Line";
          }
        }
        return snapshot;
      });
    }, 280);
    return () => window.clearInterval(timer);
  }, [paused, speed, result]);

  function issueOrder(event: React.MouseEvent<HTMLDivElement>) {
    if (!fieldRef.current || selected.length === 0 || result) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setUnits((current) => current.map((unit, index) => {
      if (!selected.includes(unit.id)) return unit;
      const orderIndex = selected.indexOf(unit.id);
      return { ...unit, tx: Math.max(4, Math.min(96, x)), ty: Math.max(8, Math.min(90, y + orderIndex * 4)), formation: unit.formation === "Guard" ? "Line" : unit.formation };
    }));
    setMessage(`${selected.length > 1 ? `${selected.length} cohorts` : "Cohort"} advancing to position.`);
  }

  function selectUnit(event: React.MouseEvent, id: number) {
    event.stopPropagation();
    const unit = units.find((item) => item.id === id);
    if (!unit || unit.side !== "rome" || unit.men <= 0) return;
    setSelected(event.shiftKey ? (old) => old.includes(id) ? old.filter((n) => n !== id) : [...old, id] : [id]);
    setMessage(`${unit.name} awaiting orders.`);
  }

  function setFormation(formation: Formation) {
    setUnits((current) => current.map((unit) => selected.includes(unit.id) ? { ...unit, formation, tx: unit.x, ty: unit.y } : unit));
    setMessage(`${formation} formation ordered.`);
  }

  function resetBattle() {
    setUnits(initialUnits.map((unit) => ({ ...unit })));
    setSelected([1]);
    setPaused(true);
    setElapsed(0);
    setMessage("Army reset. Issue orders when ready.");
  }

  const chosen = units.find((unit) => unit.id === selected[0]);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="laurel">❧</span><div><strong>IMPERIUM</strong><small>FIELD COMMAND</small></div></div>
        <div className="battle-title"><strong>Battle of the Bagradas</strong><span>256 BC · North Africa</span></div>
        <div className="time-control">
          <span className="timer">{mins}:{secs}</span>
          <button aria-label={paused ? "Begin battle" : "Pause battle"} className={paused ? "active" : ""} onClick={() => setPaused((value) => !value)}>{paused ? "▶" : "Ⅱ"}</button>
          {[1, 2, 3].map((value) => <button key={value} className={speed === value ? "active" : ""} onClick={() => { setSpeed(value); setPaused(false); }}>{value}×</button>)}
          <button aria-label="Reset battle" onClick={resetBattle}>↺</button>
        </div>
      </header>

      <section className="command-row">
        <div className="army rome"><span className="standard">SPQR</span><div><small>YOUR ARMY</small><strong>Roman Republic</strong></div><b>{romanStrength}</b><em>soldiers</em></div>
        <div className="balance"><span style={{ width: `${(romanStrength / Math.max(1, romanStrength + enemyStrength)) * 100}%` }} /><i /></div>
        <div className="army carthage"><em>soldiers</em><b>{enemyStrength}</b><div><small>ENEMY ARMY</small><strong>Carthage</strong></div><span className="standard enemy">𐤒</span></div>
      </section>

      <section className="battle-layout">
        <aside className="unit-panel">
          <div className="panel-head"><span>Ⅰ</span><div><strong>LEGIO I</strong><small>AQUILA</small></div></div>
          <div className="select-note">SHIFT + SELECT FOR GROUP</div>
          {units.filter((unit) => unit.side === "rome").map((unit) => (
            <button key={unit.id} className={`unit-card ${selected.includes(unit.id) ? "selected" : ""} ${unit.men <= 0 ? "fallen" : ""}`} onClick={(event) => selectUnit(event, unit.id)}>
              <span className={`unit-symbol ${unit.kind.toLowerCase()}`}>{unit.kind === "Cavalry" ? "♞" : unit.kind === "Archers" ? "➶" : unit.kind === "Spears" ? "♜" : "⚔"}</span>
              <span className="unit-data"><strong>{unit.name.replace("I Legion — ", "")}</strong><small>{unit.kind} · {unit.formation}</small><i><span style={{ width: `${(unit.men / unit.maxMen) * 100}%` }} /></i></span>
              <span className="men"><b>{unit.men}</b><small>{Math.round(unit.morale)} MRL</small></span>
            </button>
          ))}
          <div className="general"><span>♛</span><div><small>COMMANDER</small><strong>Marcus Atilius Regulus</strong><em>Authority +8</em></div></div>
        </aside>

        <div className="field-wrap">
          <div className="field" ref={fieldRef} onClick={issueOrder} role="application" aria-label="Battlefield. Select Roman units and click to move them.">
            <div className="terrain-ridge ridge-one" /><div className="terrain-ridge ridge-two" />
            <div className="farm-lines" /><div className="road" /><div className="scrub s1">♣</div><div className="scrub s2">♣</div><div className="scrub s3">♣</div><div className="scrub s4">♣</div>
            <div className="deployment roman-zone">ROMAN DEPLOYMENT</div><div className="deployment enemy-zone">CARTHAGINIAN LINE</div>
            {units.map((unit) => unit.men > 0 && (
              <button
                key={unit.id}
                className={`formation-unit ${unit.side} ${selected.includes(unit.id) ? "selected" : ""} ${unit.morale < 25 ? "routing" : ""} ${unit.formation.toLowerCase()}`}
                style={{ left: `${unit.x}%`, top: `${unit.y}%`, transform: `translate(-50%, -50%) rotate(${unit.facing}deg)` }}
                onClick={(event) => selectUnit(event, unit.id)}
                aria-label={`${unit.name}, ${unit.men} soldiers`}
              >
                <span className="flag">{unit.side === "rome" ? "Ⅰ" : "◆"}</span>
                <span className="soldier-row">{Array.from({ length: Math.max(3, Math.ceil((unit.men / unit.maxMen) * 8)) }).map((_, i) => <i key={i} />)}</span>
                <small>{unit.men}</small>
              </button>
            ))}
            {selected.map((id) => {
              const unit = units.find((item) => item.id === id);
              if (!unit || (Math.abs(unit.tx - unit.x) < 1 && Math.abs(unit.ty - unit.y) < 1)) return null;
              return <div key={`order-${id}`} className="order-marker" style={{ left: `${unit.tx}%`, top: `${unit.ty}%` }}><span /></div>;
            })}
            <div className="north">N<span>↑</span></div>
            <div className="scale">100 PACES</div>
            {result && <div className="result"><small>THE EAGLES REPORT</small><strong>{result}</strong><button onClick={(event) => { event.stopPropagation(); resetBattle(); }}>Fight again</button></div>}
          </div>
          <div className="status-strip"><span className={paused ? "amber-dot" : "green-dot"} />{result ? `Battle concluded — ${result}` : paused ? "Battle paused — deploy your cohorts" : message}<kbd>SPACE</kbd><span>Pause</span><kbd>SHIFT</kbd><span>Multi-select</span></div>
        </div>

        <aside className="orders-panel">
          <div className="orders-heading"><small>SELECTED UNIT</small><strong>{chosen?.name ?? "No cohort"}</strong><span>{chosen ? `${chosen.men} men · ${Math.round(chosen.morale)} morale` : "—"}</span></div>
          <h3>FORMATION</h3>
          <div className="formation-grid">
            {formations.map((item) => <button key={item.name} className={chosen?.formation === item.name ? "active" : ""} onClick={() => setFormation(item.name)}><span>{item.icon}</span><strong>{item.name}</strong><small>{item.note}</small></button>)}
          </div>
          <h3>ORDERS</h3>
          <button className="wide-order" onClick={() => { setFormation("Guard"); setMessage("Hold ground. Brace for impact."); }}><span>▣</span><div><strong>HOLD POSITION</strong><small>Brace and defend</small></div></button>
          <button className="wide-order" onClick={() => { setUnits((old) => old.map((u) => selected.includes(u.id) ? { ...u, formation: "Wedge" } : u)); setPaused(false); setMessage("Charge ordered! Break their line."); }}><span>⚔</span><div><strong>ADVANCE / CHARGE</strong><small>Click the field to set target</small></div></button>
          <div className="tip"><strong>TACTICAL ADVICE</strong><p>Spears blunt cavalry. Wedges hit hard, but lines hold longer. Low-morale units will rout.</p></div>
        </aside>
      </section>
      <footer><span>PROTOTYPE CAMPAIGN ENGINE · BUILD I</span><p>“Fortune favors the bold.”</p><span>FIELD CONDITIONS: DRY · VISIBILITY: GOOD</span></footer>
    </main>
  );
}

function distance(a: Unit, b: Unit) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
