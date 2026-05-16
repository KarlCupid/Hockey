import type { AssistantGmReport, RoomId } from "../../game/types";

interface AssistantGmReportCardProps {
  report: AssistantGmReport;
  onGoTo?: (roomId: RoomId) => void;
  onDismiss?: (reportId: string) => void;
}

export function AssistantGmReportCard({ report, onGoTo, onDismiss }: AssistantGmReportCardProps) {
  const visibleRecommendations = report.recommendations.slice(0, 5);
  return (
    <article className="assistant-report-card">
      <header>
        <div>
          <small>{report.date} | {report.type}</small>
          <strong>{report.headline}</strong>
        </div>
        {onDismiss && (
          <button type="button" className="button-ghost" onClick={() => onDismiss(report.id)}>
            Dismiss
          </button>
        )}
      </header>
      <p>{report.summary}</p>
      {visibleRecommendations.length ? (
        <div className="asset-list asset-list--compact">
          {visibleRecommendations.map((recommendation) => {
            const targetRoomId = recommendation.targetRoomId;
            return (
              <article key={recommendation.id} className={`assistant-rec assistant-rec--${recommendation.priority}`}>
                <small>{recommendation.priority} | {recommendation.category} | {recommendation.estimatedImpact} impact</small>
                <strong>{recommendation.title}</strong>
                <span>{recommendation.body}</span>
                {recommendation.targetDistrictLabel && <small>{recommendation.targetDistrictLabel} | {recommendation.navigationHint}</small>}
                {targetRoomId && onGoTo && (
                  <button type="button" onClick={() => onGoTo(targetRoomId)}>
                    {recommendation.actionLabel}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">No active recommendations. The room is clean for now.</p>
      )}
      {(report.riskFlags.length > 0 || report.opportunityFlags.length > 0) && (
        <footer>
          {report.riskFlags.slice(0, 2).map((flag) => (
            <span className="status-pill status-pill--warning" key={flag}>{flag}</span>
          ))}
          {report.opportunityFlags.slice(0, 2).map((flag) => (
            <span className="status-pill" key={flag}>{flag}</span>
          ))}
        </footer>
      )}
    </article>
  );
}
