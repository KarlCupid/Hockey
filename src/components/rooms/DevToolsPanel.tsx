import { useMemo, useState } from "react";
import { generateBalanceReport, type BalanceReport } from "../../game/systems/balanceReport";
import { runDynastyPlaytest, type PlaytestReport } from "../../game/systems/dynastyPlaytest";
import { validateDynastyInvariants } from "../../game/systems/dynastyInvariants";
import { useFranchiseStore } from "../../store/franchiseStore";
import { Button } from "../ui/Button";
import { WarningCallout } from "../ui/WarningCallout";

export function DevToolsPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const [playtest, setPlaytest] = useState<PlaytestReport | undefined>();
  const [balance, setBalance] = useState<BalanceReport | undefined>();
  const invariant = useMemo(() => (franchise ? validateDynastyInvariants(franchise) : undefined), [franchise]);

  if (!franchise) return null;

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <div>
          <small>Invariant Status</small>
          <strong>{invariant?.valid ? "Passing" : "Needs attention"}</strong>
        </div>
        <div>
          <small>Warnings</small>
          <strong>{invariant?.warnings.length ?? 0}</strong>
        </div>
        <div>
          <small>Errors</small>
          <strong>{invariant?.errors.length ?? 0}</strong>
        </div>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-one-season", 1, franchise.selectedTeamId))}>Run 1-season dry run</Button>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-three-season", 3, franchise.selectedTeamId))}>Run 3-season dry run</Button>
        <Button onClick={() => setBalance(generateBalanceReport(["dev-a", "dev-b"], 1))}>Run balance report</Button>
      </section>

      {invariant && !invariant.valid && (
        <WarningCallout title="Invariant Errors" tone="danger">
          {invariant.errors.slice(0, 8).map((item) => (
            <p key={`${item.code}-${item.path}`}>{item.message}</p>
          ))}
        </WarningCallout>
      )}

      <section className="panel-section">
        <h3>Current Invariant Report</h3>
        <div className="season-pulse">
          <span>Teams <strong>{invariant?.summary.teams}</strong></span>
          <span>Players <strong>{invariant?.summary.activePlayers}</strong></span>
          <span>Draft picks <strong>{invariant?.summary.draftPicks}</strong></span>
          <span>Prospects <strong>{invariant?.summary.prospects}</strong></span>
        </div>
      </section>

      {playtest && (
        <section className="panel-section">
          <h3>Playtest Report</h3>
          <div className="season-pulse">
            <span>Seed <strong>{playtest.seed}</strong></span>
            <span>Seasons <strong>{playtest.seasonsCompleted}</strong></span>
            <span>Warnings <strong>{playtest.warnings.length}</strong></span>
            <span>Errors <strong>{playtest.errors.length}</strong></span>
          </div>
          <p className={playtest.errors.length ? "error-text" : "muted"}>{playtest.errors[0] ?? "Dry run completed without fatal invariant errors."}</p>
        </section>
      )}

      {balance && (
        <section className="panel-section">
          <h3>Balance Report</h3>
          <div className="season-pulse">
            <span>Goals/game <strong>{balance.leagueScoring.averageGoalsPerGame}</strong></span>
            <span>Shots/game <strong>{balance.leagueScoring.averageShotsPerGame}</strong></span>
            <span>PP% <strong>{Math.round(balance.leagueScoring.powerPlayConversion * 100)}%</strong></span>
            <span>FA signing rate <strong>{Math.round(balance.rosterEconomy.freeAgentSigningRate * 100)}%</strong></span>
          </div>
          <ul className="compact-list">
            {balance.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
