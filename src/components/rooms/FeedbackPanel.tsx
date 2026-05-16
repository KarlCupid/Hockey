import { useMemo, useState } from "react";
import { FEEDBACK_ENTRY_LIMIT, summarizeFeedback, validateFeedbackEntry, type BetaFeedbackCategory, type BetaFeedbackSeverity } from "../../game/systems/betaFeedback";
import { getPhaseLabel } from "../../game/systems/phaseGuidance";
import { useFeedbackStore } from "../../store/feedbackStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { DEFAULT_FACILITY_BLUEPRINT } from "../../game/facility/facilityBlueprint";
import { getDistrictForRoom } from "../../game/facility/facilityNavigation";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusPill } from "../ui/StatusPill";
import { getSeverityTone } from "../ui/statusStyles";

const CATEGORIES: BetaFeedbackCategory[] = ["bug", "confusing", "balance", "ui", "performance", "content", "suggestion", "positive"];
const SEVERITIES: BetaFeedbackSeverity[] = ["low", "medium", "high", "critical"];

export function FeedbackPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const recordTelemetryEvent = useFranchiseStore((state) => state.recordTelemetryEvent);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const feedbackState = useFeedbackStore((state) => state.feedbackState);
  const addEntry = useFeedbackStore((state) => state.addEntry);
  const deleteEntry = useFeedbackStore((state) => state.deleteEntry);
  const exportBundle = useFeedbackStore((state) => state.exportBundle);
  const clearEntries = useFeedbackStore((state) => state.clearEntries);
  const [category, setCategory] = useState<BetaFeedbackCategory>("confusing");
  const [severity, setSeverity] = useState<BetaFeedbackSeverity>("medium");
  const [headline, setHeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [includeSaveSummary, setIncludeSaveSummary] = useState(false);
  const [exportText, setExportText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const autofillRoom = (activeRoom === "feedback" ? nearbyRoom : activeRoom) ?? "feedback";
  const autofillDistrict = getDistrictForRoom(DEFAULT_FACILITY_BLUEPRINT, autofillRoom);
  const summary = useMemo(() => summarizeFeedback(feedbackState.entries), [feedbackState.entries]);

  if (!franchise) return null;

  const submit = () => {
    const entry = addEntry(
      {
        category,
        severity,
        headline,
        notes,
        roomId: autofillRoom,
        phase: franchise.seasonPhase,
        includeDiagnostics,
        includeSaveSummary,
        tags: tags.split(",")
      },
      franchise,
      { roomId: autofillRoom, districtId: autofillDistrict.id, districtLabel: autofillDistrict.label, phase: franchise.seasonPhase }
    );
    const nextIssues = validateFeedbackEntry(entry);
    setIssues(nextIssues);
    if (nextIssues.length) return;
    recordTelemetryEvent("feedbackSubmitted", entry.headline, { category, severity, roomId: autofillRoom, district: autofillDistrict.label });
    setHeadline("");
    setNotes("");
    setTags("");
  };

  return (
    <div className="room-grid room-grid--two feedback-room">
      <section className="panel-section">
        <SectionHeader title="Closed Beta Feedback" eyebrow="Local export only" actions={<Button onClick={() => setExportText(exportBundle(franchise))}>Export bundle</Button>} />
        <p className="muted">Entries stay on this device until you export the bundle. Diagnostics are summary-only and full save JSON is excluded here.</p>
        <div className="season-pulse">
          <span>Total <strong>{summary.total}</strong></span>
          <span>High/Critical <strong>{summary.highSeverityCount}</strong></span>
          <span>Diagnostics <strong>{summary.diagnosticRequests}</strong></span>
          <span>Cap <strong>{FEEDBACK_ENTRY_LIMIT}</strong></span>
          <span>Phase <strong>{getPhaseLabel(franchise.seasonPhase)}</strong></span>
        </div>
        <div className="settings-grid">
          <FormField label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value as BetaFeedbackCategory)}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
            </select>
          </FormField>
          <FormField label="Severity">
            <select value={severity} onChange={(event) => setSeverity(event.target.value as BetaFeedbackSeverity)}>
              {SEVERITIES.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
            </select>
          </FormField>
          <FormField label="Current room">
            <select value={autofillRoom} disabled>
              <option value={autofillRoom}>{labelize(autofillRoom)}</option>
            </select>
          </FormField>
          <FormField label="Current district">
            <input value={autofillDistrict.label} readOnly />
          </FormField>
          <FormField label="Current phase">
            <input value={getPhaseLabel(franchise.seasonPhase)} readOnly />
          </FormField>
        </div>
        <FormField label="Headline" hint="Keep it short enough that a playtest lead can scan it.">
          <input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={96} placeholder="I got confused after the first game" />
        </FormField>
        <FormField label="Notes">
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What did you expect? What happened instead? What room were you in?" />
        </FormField>
        <FormField label="Tags" hint="Comma-separated, optional.">
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="first-hour, result, roster" />
        </FormField>
        <div className="settings-grid">
          <label className="checkbox-row settings-toggle">
            <input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} />
            Include diagnostics summary
          </label>
          <label className="checkbox-row settings-toggle">
            <input type="checkbox" checked={includeSaveSummary} onChange={(event) => setIncludeSaveSummary(event.target.checked)} />
            Include save summary
          </label>
        </div>
        {issues.length > 0 && (
          <div className="warning-callout warning-callout--warning">
            <strong>Feedback needs a quick fix</strong>
            {issues.map((issue) => <p key={issue}>{issue}</p>)}
          </div>
        )}
        <div className="button-row">
          <Button tone="primary" onClick={submit} disabled={!headline.trim()}>Submit local entry</Button>
          <Button onClick={() => setExportText(exportBundle(franchise))}>Export feedback bundle</Button>
          <Button tone="danger" onClick={clearEntries} disabled={!feedbackState.entries.length}>Clear entries</Button>
        </div>
        <FormField label="Feedback bundle JSON">
          <textarea readOnly value={exportText} placeholder="Export a bundle to populate this field." />
        </FormField>
      </section>
      <section className="panel-section">
        <SectionHeader title="Recent Entries" eyebrow="Closed beta notes" />
        <div className="asset-list asset-list--compact">
          {feedbackState.entries.length ? feedbackState.entries.slice(0, 12).map((entry) => (
            <article key={entry.id}>
              <div className="feedback-entry__head">
                <strong>{entry.headline}</strong>
                <StatusPill tone={getSeverityTone(entry.severity)} label={labelize(entry.severity)} />
              </div>
              <span>{labelize(entry.category)} | {entry.roomId ? labelize(entry.roomId) : "No room"} | {entry.districtLabel ?? "No district"} | {entry.phase ? getPhaseLabel(entry.phase) : "No phase"} | {new Date(entry.createdAt).toLocaleString()}</span>
              {entry.notes && <p>{entry.notes}</p>}
              {!!entry.tags.length && <small className="muted">{entry.tags.join(", ")}</small>}
              <div className="button-row">
                <button type="button" onClick={() => deleteEntry(entry.id)}>Delete</button>
              </div>
            </article>
          )) : <p className="empty-state">No feedback entries yet. Good feedback can be a bug, a confusing moment, a tuning note, or something that felt unusually good.</p>}
        </div>
      </section>
    </div>
  );
}

function labelize(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
