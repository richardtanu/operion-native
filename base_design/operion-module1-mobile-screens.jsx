import React, { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Check, Bell, AlertTriangle,
  Paperclip, Ban, Info, X, Lock,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   TOKENS — drop into theme/tokens.js
   Direction: range safety board. Concrete ground, stencil type,
   hazard yellow as the one loud element.
   ══════════════════════════════════════════════════════════════════ */
const T = {
  ground: "#DFDDD6", surface: "#F7F6F2", panel: "#FFFFFF",
  ink: "#15171A", steel: "#5C6670", mute: "#8A9099",
  line: "#C6C3BA", hair: "#E4E2DB", derived: "#EDEBE4",
  tag: "#E8B10A", good: "#2E7D4F", warn: "#C97C10", bad: "#AF2A20",
  info: "#2C5A82",
};
const D = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const B = "'Barlow', system-ui, sans-serif";
const M = "'IBM Plex Mono', ui-monospace, monospace";

const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");

/* ══════════════════════════════════════════════════════════════════
   PRIMITIVES — mirror components/ in operion-mobile
   ══════════════════════════════════════════════════════════════════ */
function Section({ children }) {
  return (
    <div className="uppercase" style={{
      fontFamily: D, fontSize: 11, letterSpacing: "0.16em",
      color: T.steel, fontWeight: 600, marginBottom: 7,
      paddingBottom: 4, borderBottom: `1px solid ${T.hair}`,
    }}>{children}</div>
  );
}

function FieldLabel({ children }) {
  return (
    <div className="uppercase" style={{
      fontFamily: D, fontSize: 10, letterSpacing: "0.14em",
      color: T.mute, fontWeight: 600, marginBottom: 3,
    }}>{children}</div>
  );
}

/** variant: edit | derived | picker | blank */
function Field({ label, value, variant = "edit", mono, sub }) {
  const derived = variant === "derived";
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div style={{
        fontFamily: mono || derived ? M : B,
        fontSize: 14,
        fontStyle: derived ? "italic" : "normal",
        color: value === "—" || variant === "blank" ? T.mute : derived ? T.steel : T.ink,
        background: derived ? T.derived : T.panel,
        border: `1.5px solid ${derived ? "transparent" : T.line}`,
        borderRadius: 2, padding: "9px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        {variant === "picker" && <ChevronRight size={15} color={T.mute} style={{ flexShrink: 0 }} />}
        {derived && <Lock size={12} color={T.mute} style={{ flexShrink: 0 }} />}
      </div>
      {sub && <div style={{ fontFamily: B, fontSize: 11, color: T.mute, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const TONE = {
  neutral: T.steel, success: T.good, warning: T.warn,
  danger: T.bad, pending: T.info,
};

function Chip({ tone = "neutral", children, solid }) {
  const c = TONE[tone];
  return (
    <span style={{
      fontFamily: D, fontSize: 12, fontWeight: 700, letterSpacing: "0.09em",
      textTransform: "uppercase", color: solid ? "#fff" : c,
      background: solid ? c : "transparent",
      border: `1.5px solid ${c}`, borderRadius: 2,
      padding: "2px 8px", whiteSpace: "nowrap", display: "inline-block",
    }}>{children}</span>
  );
}

function Callout({ children, tone = "neutral" }) {
  const c = TONE[tone];
  return (
    <div style={{
      border: `1.5px dashed ${c}`, borderRadius: 2, padding: "8px 10px",
      background: tone === "neutral" ? "transparent" : `${c}0F`,
    }}>
      <div style={{ fontFamily: B, fontSize: 12, color: tone === "neutral" ? T.steel : c, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

function SyncState({ state = "queued" }) {
  const map = {
    queued: { tone: "pending", label: "Queued", note: "Saved on this device. Sends when back online." },
    confirmed: { tone: "success", label: "Confirmed", note: "Recorded on the server." },
    failed: { tone: "danger", label: "Failed", note: "Tap retry — nothing was lost." },
  }[state];
  return (
    <div className="flex items-center gap-2">
      <Chip tone={map.tone}>{map.label}</Chip>
      <span style={{ fontFamily: B, fontSize: 11, color: T.steel }}>{map.note}</span>
    </div>
  );
}

function Btn({ children, variant = "primary", gate, onClick, disabled }) {
  const base = {
    fontFamily: D, fontSize: 17, fontWeight: 700, letterSpacing: "0.05em",
    textTransform: "uppercase", borderRadius: 2, padding: "12px 14px",
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, lineHeight: 1.1,
  };
  const style = disabled
    ? { ...base, background: T.line, color: "#fff" }
    : variant === "primary"
    ? { ...base, background: T.ink, color: "#fff" }
    : variant === "gated"
    ? { ...base, background: "transparent", color: T.ink, border: `2px solid ${T.tag}` }
    : { ...base, background: "transparent", color: T.ink, border: `1.5px solid ${T.line}` };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={style}>
      <span>{children}</span>
      {gate && (
        <span style={{ fontFamily: M, fontSize: 10, fontWeight: 600, color: disabled ? "#fff" : T.warn, letterSpacing: 0 }}>
          {gate}
        </span>
      )}
    </button>
  );
}

function Row({ children, gap = 10 }) {
  return <div className="flex" style={{ gap }}>{children}</div>;
}

function Card({ children, tone }) {
  return (
    <div style={{
      background: T.panel, border: `1.5px solid ${tone ? TONE[tone] : T.hair}`,
      borderRadius: 2, padding: 11,
    }}>{children}</div>
  );
}

function KV({ k, v, strong, derived }) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 10, padding: "5px 0" }}>
      <span style={{ fontFamily: B, fontSize: 13, color: T.steel }}>{k}</span>
      <span style={{
        fontFamily: M, fontSize: strong ? 15 : 13,
        fontWeight: strong ? 600 : 400,
        fontStyle: derived ? "italic" : "normal",
        color: derived ? T.steel : T.ink, textAlign: "right",
      }}>{v}</span>
    </div>
  );
}

/* Ceiling meter — grey consumed, black this entry, notch at ceiling */
function CeilingBar({ authorized, consumed }) {
  const pct = (n) => Math.min(100, (n / authorized) * 100);
  return (
    <div>
      <div style={{ height: 14, background: T.hair, borderRadius: 2, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, width: `${pct(consumed)}%`, background: T.ink }} />
      </div>
      <div className="flex justify-between" style={{ fontFamily: M, fontSize: 11, color: T.steel, marginTop: 3 }}>
        <span>{consumed} used</span><span>{authorized - consumed} remaining</span>
      </div>
    </div>
  );
}

function ScopeToggle({ note }) {
  const [owner, setOwner] = useState(true);
  return (
    <div>
      <Section>Cost visibility by scope</Section>
      <div className="flex" style={{ border: `1.5px solid ${T.line}`, borderRadius: 2, overflow: "hidden" }}>
        {[["Owner+", true], ["Below Owner", false]].map(([lab, v]) => (
          <button key={lab} onClick={() => setOwner(v)} style={{
            flex: 1, padding: "7px 0", fontFamily: D, fontSize: 14, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            background: owner === v ? T.ink : "transparent",
            color: owner === v ? "#fff" : T.steel,
          }}>{lab}</button>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Field label="What that scope sees" variant="derived"
          value={owner ? note.owner : note.below} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SCREENS
   ══════════════════════════════════════════════════════════════════ */

function P01() {
  return (
    <>
      <Section>Line items</Section>
      <Card>
        <Row>
          <Field label="Part" value="Part A" variant="picker" />
          <div style={{ width: 82 }}><Field label="Qty" value="—" /></div>
        </Row>
      </Card>
      <button style={{
        border: `1.5px dashed ${T.line}`, borderRadius: 2, padding: "10px 0",
        fontFamily: D, fontSize: 16, fontWeight: 600, color: T.steel,
        textTransform: "uppercase", letterSpacing: "0.06em",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}><Plus size={15} /> Add line</button>

      <Field label="Requested by" value="you (current user)" variant="derived" />

      <div>
        <FieldLabel>Starts at</FieldLabel>
        <Chip tone="pending">Pending</Chip>
      </div>

      <Callout>No cost fields on this screen — quantity only. Pricing enters at Realisasi, not here.</Callout>
      <Callout tone="warning">No role or scope gate: anyone signed in can submit.</Callout>

      <div>
        <Section>After you tap create</Section>
        <SyncState state="queued" />
      </div>
    </>
  );
}

function P02() {
  const [f, setF] = useState("PENDING");
  const filters = ["PENDING", "APPROVED", "REJECTED", "ORDERED", "AUTHORIZED", "CANCELLED"];
  const rows = [
    { id: "PR-1042", lines: 3, by: "Field PIC", st: "PENDING" },
    { id: "PR-1049", lines: 1, by: "Warehouse Receiver", st: "PENDING" },
  ];
  return (
    <>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {filters.map((x) => (
          <button key={x} onClick={() => setF(x)} style={{
            fontFamily: D, fontSize: 13, fontWeight: 600, letterSpacing: "0.07em",
            padding: "4px 9px", borderRadius: 2,
            background: f === x ? T.ink : "transparent",
            color: f === x ? "#fff" : T.steel,
            border: `1.5px solid ${f === x ? T.ink : T.line}`,
          }}>{x}</button>
        ))}
      </div>

      {rows.map((r) => (
        <button key={r.id} style={{
          background: T.panel, border: `1.5px solid ${r.id === "PR-1042" ? T.ink : T.hair}`,
          borderRadius: 2, padding: 11, textAlign: "left", width: "100%",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: M, fontSize: 14, fontWeight: 600, color: T.ink }}>{r.id}</div>
            <div style={{ fontFamily: D, fontSize: 19, fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
              {r.lines} line{r.lines > 1 ? "s" : ""}
            </div>
            <div style={{ fontFamily: B, fontSize: 12, color: T.steel }}>requested by {r.by}</div>
          </div>
          <Chip tone="pending">Pending</Chip>
          <ChevronRight size={16} color={T.mute} />
        </button>
      ))}

      <Section>Selected — PR-1042 · history</Section>
      <Card><KV k="Created" v="10 Aug 2026 · Field PIC" /></Card>

      <Callout>Tapping a row pushes a full detail screen. Shown collapsed here because one wireframe per record is what the inventory asks for, not navigation state.</Callout>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <Row>
          <Btn variant="gated" gate="OWNER+">Approve</Btn>
          <Btn variant="gated" gate="OWNER+">Reject</Btn>
        </Row>
        <Btn variant="secondary">Cancel</Btn>
      </div>
      <Callout tone="warning">The asymmetry is real: approve and reject need Owner+, cancel needs nothing. The yellow border carries that at a glance.</Callout>
    </>
  );
}

function P03() {
  return (
    <>
      <Section>Purchase requests being authorized</Section>
      {["PR-1042", "PR-1049"].map((x) => (
        <div key={x} className="flex items-center" style={{ gap: 9 }}>
          <div style={{
            width: 19, height: 19, border: `1.5px solid ${T.ink}`, background: T.ink,
            display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2,
          }}><Check size={13} color={T.tag} /></div>
          <span style={{ fontFamily: M, fontSize: 14, color: T.ink }}>{x}</span>
        </div>
      ))}
      <button style={{
        border: `1.5px dashed ${T.line}`, borderRadius: 2, padding: "8px 0",
        fontFamily: D, fontSize: 15, fontWeight: 600, color: T.steel,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>+ Add PR</button>

      <Section>Ceiling lines</Section>
      <Card>
        <Row><Field label="Part" value="Part A" variant="picker" /></Row>
        <div style={{ marginTop: 9 }}>
          <Row>
            <Field label="Authorized qty" value="10" mono />
            <Field label="Max value" value="Rp 500,000" mono />
          </Row>
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLabel>Consumption — live, computed from APPROVED realisasi only</FieldLabel>
          <CeilingBar authorized={10} consumed={6} />
        </div>
        <div style={{ marginTop: 8, borderTop: `1px solid ${T.hair}` }}>
          <KV k="Purchased" v="6 · Rp 120,000" derived />
          <KV k="Remaining" v="4 · Rp 380,000" derived strong />
        </div>
      </Card>

      <Callout tone="warning">No total row, deliberately. Ceilings exist per line only — there is no cap above line level, so ten lines each individually within ceiling can still overrun a budget nobody stated.</Callout>
      <Callout>There is no approve step. Creating this record <em>is</em> the authorization.</Callout>
      <Callout tone="danger">Nothing notifies anyone when a PRA is created — no notification type exists for it (BE-07). Purchasing finds out by looking.</Callout>

      <div>
        <Section>Status &amp; fulfillment</Section>
        <div className="flex" style={{ gap: 6 }}><Chip tone="success" solid>Active</Chip></div>
        <div style={{ fontFamily: B, fontSize: 11, color: T.mute, marginTop: 6 }}>
          Also reachable: partially_fulfilled · fulfilled · cancelled — recomputed, never stored
        </div>
      </div>

      <ScopeToggle note={{
        owner: "Max Rp 500K · purchased Rp 120K · remaining Rp 380K",
        below: "Quantities only — all values hidden",
      }} />
    </>
  );
}

function P04() {
  const [step, setStep] = useState(1);
  const [c] = useState({ subtotal: 1200000, disc: 50000, vou: 20000, ship: 35000, ins: 10000, fee: 15000 });
  const total = useMemo(() => c.subtotal - c.disc - c.vou + c.ship + c.ins + c.fee, [c]);

  return (
    <>
      <div className="flex" style={{ gap: 4 }}>
        {["Receipt", "Costs", "Items"].map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)} style={{
            flex: 1, padding: "6px 0", borderRadius: 2,
            fontFamily: D, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: step === i + 1 ? T.ink : "transparent",
            color: step === i + 1 ? "#fff" : T.steel,
            border: `1.5px solid ${step === i + 1 ? T.ink : T.line}`,
          }}>{i + 1}. {s}</button>
        ))}
      </div>

      {step === 1 && (
        <>
          <Row><Field label="PRA / line" value="select…" variant="picker" /></Row>
          <Row>
            <Field label="Channel" value="Marketplace" variant="picker" />
            <Field label="Supplier" value="select…" variant="picker" />
          </Row>
          <Row>
            <Field label="Payment method" value="Personal (reimb.)" variant="picker" />
            <Field label="Payment ref" value="TRX-93921" mono />
          </Row>
          <Row><Field label="Purchased at" value="09 Aug 2026" mono /></Row>
          <Field label="Attachment" value="https://drive.example.com/receipt-93921.pdf" mono
            sub="URL field, not a file picker — no upload backing exists" />
          <Callout>Optional here on purpose, so an urgent purchase is never blocked from being logged. Goods receipt refuses to run without it.</Callout>
        </>
      )}

      {step === 2 && (
        <>
          <Section>Landed cost — six separate inputs</Section>
          <Row><Field label="Subtotal" value="1,200,000" mono /><Field label="− Seller discount" value="50,000" mono /></Row>
          <Row><Field label="− Platform voucher" value="20,000" mono /><Field label="+ Shipping" value="35,000" mono /></Row>
          <Row><Field label="+ Insurance" value="10,000" mono /><Field label="+ Service fee" value="15,000" mono /></Row>
          <Card tone="neutral">
            <FieldLabel>Total cost — computed, never entered</FieldLabel>
            <div style={{ fontFamily: M, fontSize: 26, fontWeight: 600, color: T.ink }}>{rp(total)}</div>
          </Card>
          <Callout>Six inputs rather than one price because the allocation policy has to stay changeable. List price would record Rp 300,000/box against a true Rp 297,500 — the error goes straight into cost-per-shot.</Callout>
        </>
      )}

      {step === 3 && (
        <>
          <Section>Items</Section>
          <Card>
            <Row><Field label="Part / purchase UOM" value="6mm BBs 0.25g · Box(600)" variant="picker" /></Row>
            <div style={{ marginTop: 9 }}>
              <Row>
                <Field label="Qty (purchase UOM)" value="4" mono />
                <Field label="Unit price" value="Rp 300,000" mono />
              </Row>
            </div>
            <div style={{ marginTop: 8, borderTop: `1px solid ${T.hair}` }}>
              <KV k="Into stock" v="2,400 pcs (×600)" strong />
              <KV k="Allocated landed cost" v="Rp 297,500" derived />
            </div>
          </Card>

          <div>
            <Section>Status — two independent dimensions</Section>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              <Chip tone="pending">Pending_approval</Chip>
              <Chip tone="danger" solid>Escalated</Chip>
            </div>
          </div>
          <Callout tone="warning">Only escalated purchases look like this. A purchase inside the ceiling auto-approves the moment it's created — no approval step, no queue, nothing to tap.</Callout>

          <div>
            <FieldLabel>Reimbursement</FieldLabel>
            <Chip tone="warning">Pending</Chip>
            <div style={{ fontFamily: B, fontSize: 11, color: T.mute, marginTop: 5 }}>
              Nothing tappable beside it — no mark-reimbursed endpoint exists.
            </div>
          </div>

          <Row>
            <Btn variant="gated" gate="OWNER+">Approve</Btn>
            <Btn variant="secondary">Reject</Btn>
          </Row>
          <Btn variant="secondary">Supersede</Btn>
          <Callout>Supersede is replacement, not edit: the original stays visible read-only, the correction is a full new record linked by <span style={{ fontFamily: M }}>supersedesId</span>, and the ceiling reopens the moment the original flips.</Callout>

          <ScopeToggle note={{
            owner: "All six inputs + total + allocated landed cost",
            below: "Quantities and part only — every value hidden",
          }} />
        </>
      )}
    </>
  );
}

function P05() {
  const [via, setVia] = useState("realisasi");
  return (
    <>
      <div className="flex" style={{ border: `1.5px solid ${T.line}`, borderRadius: 2, overflow: "hidden" }}>
        {[["po", "By purchase order"], ["realisasi", "By realisasi"]].map(([k, lab]) => (
          <button key={k} onClick={() => setVia(k)} style={{
            flex: 1, padding: "8px 0", fontFamily: D, fontSize: 14, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            background: via === k ? T.ink : "transparent",
            color: via === k ? "#fff" : T.steel,
          }}>{lab}</button>
        ))}
      </div>
      <Callout>Exactly one, never both. The two paths are different kinds of purchase, not two ways of doing one.</Callout>

      <Row>
        <Field label={via === "po" ? "PO number" : "Realisasi"} value={via === "po" ? "PO-2201" : "REA-2026-0114"} mono />
        <Field label="Received date" value="10 Aug 2026" mono />
      </Row>
      <Field label="Received by" value="you (current user)" variant="derived" />
      <Field label="Notes" value="Box slightly damaged, contents intact" />

      <Section>Items</Section>
      <Card>
        <Row><Field label="Part" value="6mm BBs 0.25g" variant="picker" /></Row>
        <div style={{ marginTop: 8, borderTop: `1px solid ${T.hair}` }}>
          <KV k="Purchased (purchase UOM)" v="4 box" derived />
          <KV k="Received (stock units)" v="2,400 pcs" strong />
        </div>
      </Card>

      {via === "realisasi" ? (
        <>
          <Card tone="danger">
            <div className="flex items-start" style={{ gap: 8 }}>
              <Ban size={17} color={T.bad} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontFamily: D, fontSize: 17, fontWeight: 700, color: T.bad }}>
                  Cannot receive — no attachment on file
                </div>
                <div style={{ fontFamily: B, fontSize: 12, color: "#4A4E52", marginTop: 2 }}>
                  Add the receipt to the Realisasi first. Stock does not move without it.
                </div>
              </div>
            </div>
          </Card>
          <Callout tone="warning">Receiver must differ from the Realisasi's creator, with no Owner exemption — unlike the PRA rule, which has one. Two rules, two behaviours; don't merge them.</Callout>
        </>
      ) : (
        <Callout>PO path has no attachment requirement and no receiver check — there is no creator concept on that path.</Callout>
      )}

      <Callout tone="danger">Nothing is notified on receipt, unlike every screen upstream of it. The flow ends silently.</Callout>
    </>
  );
}

function P06() {
  const [root] = useState(false);
  return (
    <>
      <Callout>The list always shows the root tenant's suppliers, whoever is looking. An outlet user sees head office's list with no indication that's what it is.</Callout>

      <Section>Suppliers</Section>
      <Card>
        <div className="flex items-center" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: D, fontSize: 21, fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
              Airsoft Depo Jakarta
            </div>
            <div style={{ fontFamily: M, fontSize: 12, color: T.steel }}>081234567890</div>
          </div>
          <ChevronRight size={16} color={T.mute} />
        </div>
      </Card>
      <Callout>No edit, no delete — neither exists on the backend. Tapping a row can only ever show detail.</Callout>

      <Section>New supplier</Section>
      <Row><Field label="Name" value="—" /><Field label="Contact" value="—" /></Row>

      {!root && (
        <Card tone="warning">
          <div className="flex items-start" style={{ gap: 8 }}>
            <Lock size={16} color={T.warn} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: B, fontSize: 12, color: "#5A4A22" }}>
              Suppliers are managed centrally. You're signed in to an outlet tenant, so creation is refused server-side — the form is disabled rather than failing after you fill it in.
            </div>
          </div>
        </Card>
      )}
      <Callout tone="warning">The source wireframe shows this form live for everyone. Creation throws unless you're on the root tenant, so it must be gated before the tap, not after.</Callout>
    </>
  );
}

function P07() {
  return (
    <>
      <Callout>Outlet-to-centre restock — the franchise leg, running parallel to PRA/Realisasi. Not a marketplace purchase.</Callout>

      <Row>
        <Field label="Supplier (legacy, optional)" value="select…" variant="picker" />
        <Field label="Order date" value="—" />
      </Row>
      <Callout>Supplier on this path predates the split. New code shouldn't rely on a PO carrying a real external supplier — that role moved to Realisasi.</Callout>

      <Section>From purchase requests</Section>
      <Field label="Linked PRs" value="PR-1051, PR-1052" variant="picker"
        sub="Every linked PR must already be APPROVED — the API refuses otherwise" />

      <Section>Items</Section>
      <Card>
        <Row><Field label="Part" value="6mm BBs 0.25g" variant="picker" /></Row>
        <div style={{ marginTop: 9 }}>
          <Row><Field label="Qty" value="20 box" mono /><Field label="Price" value="Rp 300,000" mono /></Row>
        </div>
      </Card>
      <Callout>Flat price only. No cost components, no landed cost, no conversion factor on this path.</Callout>

      <div>
        <Section>Status</Section>
        <Chip tone="neutral" solid>Draft</Chip>
        <div style={{ fontFamily: B, fontSize: 11, color: T.mute, marginTop: 6 }}>
          Also reachable: ordered · partially_received · received · cancelled
        </div>
      </div>

      <Row>
        <Btn variant="secondary">Send to supplier</Btn>
        <Btn variant="secondary">Cancel</Btn>
      </Row>
      <Callout tone="warning">Neither action has a scope check today, so both are drawn plain — including "send to supplier", arguably as consequential as a PRA authorization.</Callout>

      <Card tone="danger">
        <div className="flex items-start" style={{ gap: 8 }}>
          <AlertTriangle size={16} color={T.bad} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: T.bad }}>
              BE-11 open — redaction not live
            </div>
            <div style={{ fontFamily: B, fontSize: 12, color: "#4A4E52", marginTop: 2 }}>
              Total Rp 6,225,000 and every line price return to any authenticated caller. Realisasi and PartInstance redact; this path doesn't. Drawn as intended, not as built.
            </div>
          </div>
        </div>
      </Card>

      <ScopeToggle note={{
        owner: "Total Rp 6,225,000 · per-line prices",
        below: "Intended: hidden. Actual today: fully visible.",
      }} />
    </>
  );
}

function P08() {
  return (
    <>
      <Callout tone="warning">Filter is personal-reimbursable + pending, applied on the device. The API has no filter for it, so this can't paginate correctly once the list grows.</Callout>

      <Card>
        <div className="flex items-baseline justify-between" style={{ gap: 10 }}>
          <div>
            <div style={{ fontFamily: D, fontSize: 21, fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
              Owed to Field PIC
            </div>
            <div style={{ fontFamily: B, fontSize: 12, color: T.steel }}>
              REA-2026-0114 · purchased 09 Aug 2026
            </div>
          </div>
          <div style={{ fontFamily: M, fontSize: 19, fontWeight: 600, color: T.ink }}>Rp 1,190,000</div>
        </div>
        <div style={{ marginTop: 9 }}><Chip tone="warning">Pending</Chip></div>
      </Card>

      <Card tone="neutral">
        <div className="flex items-start" style={{ gap: 8 }}>
          <Info size={16} color={T.steel} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontFamily: B, fontSize: 12, color: T.steel }}>
            View only. There is no mark-reimbursed endpoint, so this screen can show the debt but never clear it. Settlement happens outside Operion and the record stays PENDING forever.
          </div>
        </div>
      </Card>

      <Callout tone="danger">The entity stores reimbursedTo and reimbursedAt, but neither is on the response DTO — so even after paying, the app couldn't display when or by whom.</Callout>
      <Callout>Every figure here inherits Realisasi's cost redaction. Below Owner scope, this screen is a list of names with no amounts.</Callout>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REGISTRY
   ══════════════════════════════════════════════════════════════════ */
const SCREENS = [
  { id: "PROC-01", title: "New Request", nav: "PR — Create", El: P01, cta: "Create request",
    intent: "Requester creates a PR for one or more parts. Quantity only, no cost fields.",
    notes: [
      ["warning", "Open question", "Nothing gates who can submit. If only Procurement or Admin should, this screen is the only guard today."],
      ["neutral", "Record gap", "The Part picker's fields come from another module, out of scope here — drawn generically."],
      ["success", "Added in redraw", "Sync state is shown explicitly. This is an outboxed field write, so a queued submit must never read as an error."],
    ] },
  { id: "PROC-02", title: "Requests", nav: "PR — Approval", El: P02, cta: "Approve", bell: true,
    intent: "Owner reviews pending PRs and approves, rejects, or cancels them.",
    notes: [
      ["neutral", "Asymmetry, drawn deliberately", "Approve and reject need Owner+; cancel needs nothing. The accent border carries that, plain border doesn't."],
      ["neutral", "Drill-down assumed", "A real build pushes a detail screen on tap. Collapsed onto one frame here."],
      ["danger", "Correction to the source wireframe", "It shows four filters. The status enum has six — AUTHORIZED and CANCELLED were missing, and AUTHORIZED is the state every PR reaches on the direct-purchase path."],
    ] },
  { id: "PROC-03", title: "New Authorization", nav: "PRA — Authorize", El: P03, cta: "Create (= authorize)",
    intent: "Authorize per-line ceilings against one or more approved PRs. Creation is the authorization.",
    notes: [
      ["warning", "Confirms the brief's warning", "No total row makes the screen feel unbalanced. That's the intended signal, not a defect — there genuinely is no header cap."],
      ["success", "Added in redraw", "A consumption bar replaces the purchased/remaining text rows. The data already exists — the read endpoint returns computed per-item purchased and remaining."],
      ["danger", "Confirmed against source", "No notification type exists for PRA creation and the service never injects NotificationService (BE-07). Nobody is told."],
    ] },
  { id: "PROC-04", title: "New Realisasi", nav: "Realisasi", El: P04, cta: "Create",
    intent: "Record a purchase that already happened, against an active PRA line. Landed-cost entry, not an order.",
    notes: [
      ["success", "Acted on the finding", "The source wireframe noted this was the densest screen and a real build would want it split. It's split — three steps, not one long scroll."],
      ["danger", "Correction to the source wireframe", "It shows only the escalated outcome. In-ceiling purchases auto-approve at creation — status APPROVED directly, no approval step. Two different screens after submit, and only one was drawn."],
      ["warning", "Will read as a bug if unexplained", "Reimbursement shows PENDING with nothing tappable. Correct per the API — inline copy now says why."],
    ] },
  { id: "PROC-05", title: "Receive Goods", nav: "Goods Receipt", El: P05, cta: "Receive",
    intent: "Record physical receipt against a Purchase Order or a Realisasi — exactly one, never both.",
    notes: [
      ["danger", "Platform contradiction, unresolved", "The source record tags this web-console, not the mobile scan loop — a paperwork step deliberately kept off mobile. Drawn mobile per direction. Flag before it ships."],
      ["neutral", "No list screen", "No GET /goods-receipts and no GET by id (BE-08). Only reachable from a specific PO or Realisasi."],
      ["danger", "Silent flow end", "No notification fires on receipt, unlike every screen upstream."],
    ] },
  { id: "PROC-06", title: "Suppliers", nav: "Suppliers", El: P06, cta: "Create supplier",
    intent: "Create and list suppliers, managed centrally at the root tenant.",
    notes: [
      ["danger", "Correction to the source wireframe", "It draws the create form live for everyone. Creation throws unless the caller is on the root tenant, so the form must be gated before the tap."],
      ["warning", "Unconsidered side effect", "A non-root outlet sees the root's supplier list with no tenant-context indicator. Kept visible rather than hidden."],
      ["neutral", "Entry point not confirmed", "Nothing in PROC-01..04 links here — likely a settings or admin screen outside this module's sweep."],
    ] },
  { id: "PROC-07", title: "New Purchase Order", nav: "PO — Franchise", El: P07, cta: "Create (draft)",
    intent: "Outlet-to-centre ordering — the parallel path alongside PRA/Realisasi.",
    notes: [
      ["danger", "Drawn to spec, not to today's API", "Unlike every other cost screen here, this redaction isn't live. Total and price are fully visible at every scope (BE-11)."],
      ["warning", "Visual inconsistency, and it's real", "Send and cancel sit plain because neither is gated — including 'send to supplier', arguably as consequential as a PRA."],
      ["neutral", "Worth knowing", "PO numbers are generated from the current millisecond, which isn't collision-safe under concurrent creates."],
    ] },
  { id: "PROC-08", title: "Reimbursements", nav: "Reimbursement", El: P08,
    intent: "Surface Realisasi records paid with personal funds, awaiting reimbursement. View-only.",
    notes: [
      ["danger", "DTO gap surfaced by drawing", "reimbursedTo and reimbursedAt exist on the entity but not on the response — even after paying, the app couldn't show when or by whom."],
      ["warning", "Client-side filter", "Personal + pending is filtered on the device. No API filter exists, so this can't paginate once the list grows."],
      ["neutral", "Entry point not confirmed", "Same flag as PROC-06 — likely a dashboard or a filter on PROC-04, not established here."],
    ] },
];

/* ══════════════════════════════════════════════════════════════════
   SHELL
   ══════════════════════════════════════════════════════════════════ */
export default function Module1Screens() {
  const [i, setI] = useState(0);
  const S = SCREENS[i];

  return (
    <div style={{ background: T.ground, minHeight: "100vh", fontFamily: B }}>
      <style>{css}</style>
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "24px 16px 48px" }}>

        <div style={{ marginBottom: 4 }}>
          <div className="uppercase" style={{ fontFamily: D, fontSize: 12, letterSpacing: "0.2em", color: T.steel, fontWeight: 600 }}>
            Operion · module 1 · mobile
          </div>
          <div style={{ fontFamily: D, fontSize: 40, fontWeight: 700, color: T.ink, lineHeight: 1 }}>
            Procurement screens
          </div>
          <div style={{ fontFamily: B, fontSize: 14, color: T.steel, marginTop: 5, maxWidth: 640 }}>
            Same fields, same actions, same backend rules as the wireframe set — redrawn with real tokens.
            Findings that a drawing surfaced stay visible as callouts rather than being quietly resolved.
          </div>
        </div>

        <div className="flex flex-wrap" style={{ gap: 6, margin: "18px 0" }}>
          {SCREENS.map((s, n) => (
            <button key={s.id} onClick={() => setI(n)} style={{
              fontFamily: D, fontSize: 14, fontWeight: 600, letterSpacing: "0.06em",
              padding: "5px 10px", borderRadius: 2, textTransform: "uppercase",
              background: i === n ? T.ink : "transparent",
              color: i === n ? "#fff" : T.steel,
              border: `1.5px solid ${i === n ? T.ink : T.line}`,
            }}>
              <span style={{ fontFamily: M, fontSize: 11, opacity: 0.75 }}>{s.id.slice(5)}</span>
              &nbsp;{s.nav}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row" style={{ gap: 24 }}>
          {/* phone */}
          <div style={{ width: "100%", maxWidth: 400, flexShrink: 0 }}>
            <div style={{
              border: `2px solid ${T.ink}`, borderRadius: 6, overflow: "hidden",
              background: T.surface, height: 760, display: "flex", flexDirection: "column",
            }}>
              <div className="flex items-center justify-between" style={{ background: T.ink, padding: "9px 13px", flexShrink: 0 }}>
                <div className="flex items-center" style={{ gap: 7 }}>
                  <ChevronLeft size={19} color="#fff" />
                  <span style={{ fontFamily: D, fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>
                    {S.title}
                  </span>
                  {S.bell && <Bell size={15} color={T.tag} />}
                </div>
                <span style={{ fontFamily: M, fontSize: 10, color: "#8C9298" }}>{S.id}</span>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                <S.El key={S.id} />
              </div>

              {S.cta && (
                <div style={{ padding: 13, borderTop: `1.5px solid ${T.line}`, background: T.surface, flexShrink: 0 }}>
                  <Btn>{S.cta}</Btn>
                </div>
              )}
            </div>
          </div>

          {/* notes */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: M, fontSize: 12, color: T.steel }}>{S.id}</div>
            <div style={{ fontFamily: D, fontSize: 30, fontWeight: 700, color: T.ink, lineHeight: 1.05 }}>
              {S.nav}
            </div>
            <div style={{ fontFamily: B, fontSize: 14, color: T.steel, marginTop: 5 }}>{S.intent}</div>

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {S.notes.map(([tone, head, txt], n) => (
                <div key={n} style={{ borderLeft: `3px solid ${TONE[tone]}`, paddingLeft: 11 }}>
                  <div className="uppercase" style={{
                    fontFamily: D, fontSize: 12, fontWeight: 700,
                    letterSpacing: "0.11em", color: TONE[tone],
                  }}>{head}</div>
                  <div style={{ fontFamily: B, fontSize: 13.5, color: "#3E4246", lineHeight: 1.5, marginTop: 2 }}>
                    {txt}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              <div className="uppercase" style={{ fontFamily: D, fontSize: 11, letterSpacing: "0.14em", color: T.mute, fontWeight: 600 }}>
                Reading the visual language
              </div>
              <div style={{ fontFamily: B, fontSize: 13, color: T.steel, lineHeight: 1.55, marginTop: 7 }}>
                <strong style={{ color: T.ink }}>Yellow border</strong> means the action is scope-gated — plain border means anyone can press it.{" "}
                <strong style={{ color: T.ink }}>Grey italic with a lock</strong> is server-derived and never editable.{" "}
                <strong style={{ color: T.ink }}>Dashed boxes</strong> are open questions kept visible rather than silently resolved.{" "}
                Mono is for anything a person would read back aloud — IDs, quantities, money.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
button:focus-visible { outline: 3px solid ${T.ink}; outline-offset: 2px }
`;
