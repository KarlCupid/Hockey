import { useMemo, useState } from "react";
import { generateBalanceReport, type BalanceReport } from "../../game/systems/balanceReport";
import { runOwnerGoalBalanceSample, type OwnerGoalBalanceSample } from "../../game/systems/ownerBalance";
import { runReSigningBalanceSample, type ReSigningBalanceSample } from "../../game/systems/reSigningBalance";
import { runDynastyPlaytest, type PlaytestReport } from "../../game/systems/dynastyPlaytest";
import { validateDynastyInvariants } from "../../game/systems/dynastyInvariants";
import { useFranchiseStore } from "../../store/franchiseStore";
import { Button } from "../ui/Button";
import { WarningCallout } from "../ui/WarningCallout";

export function DevToolsPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const [playtest, setPlaytest] = useState<PlaytestReport | undefined>();
  const [balance, setBalance] = useState<BalanceReport | undefined>();
  const [reSigning, setReSigning] = useState<ReSigningBalanceSample[] | undefined>();
  const [ownerBalance, setOwnerBalance] = useState<OwnerGoalBalanceSample | undefined>();
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
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-five-season-roster", 5, franchise.selectedTeamId))}>Run 5-season roster stress</Button>
        <Button onClick={() => setBalance(generateBalanceReport(["dev-a", "dev-b"], 1))}>Run balance report</Button>
        <Button onClick={() => setReSigning(runReSigningBalanceSample(["dev-rs-a", "dev-rs-b"]))}>Re-signing sample</Button>
        <Button onClick={() => setOwnerBalance(runOwnerGoalBalanceSample(["dev-o-a", "dev-o-b", "dev-o-c"]))}>Owner sample</Button>
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
          <div className="season-pulse">
            <span>Invalid rosters <strong>{playtest.invalidGameRosters[playtest.invalidGameRosters.length - 1]?.teams ?? 0}</strong></span>
            <span>Replacements <strong>{playtest.emergencyReplacementCounts[playtest.emergencyReplacementCounts.length - 1]?.count ?? 0}</strong></span>
            <span>Affiliate moves <strong>{playtest.affiliatePromotions[playtest.affiliatePromotions.length - 1]?.count ?? 0}</strong></span>
            <span>Cap-over teams <strong>{playtest.capOverTeams[playtest.capOverTeams.length - 1]?.teams ?? 0}</strong></span>
          </div>
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

      {reSigning && (
        <section className="panel-section">
          <h3>Re-Signing Acceptance Report</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Role</th><th>Cap</th><th>Weak</th><th>Fair</th><th>Strong</th><th>RFA</th><th>UFA</th></tr></thead>
              <tbody>
                {reSigning.map((row) => (
                  <tr key={`${row.role}-${row.capState}`}>
                    <td>{row.role}</td>
                    <td>{row.capState}</td>
                    <td>{Math.round(row.weakAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.fairAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.strongAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.rfaAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.ufaAcceptanceRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ownerBalance && (
        <section className="panel-section">
          <h3>Owner Goal Balance</h3>
          <div className="season-pulse">
            <span>Completion <strong>{Math.round(ownerBalance.completionRate * 100)}%</strong></span>
            <span>Security delta <strong>{ownerBalance.averageSecurityDelta}</strong></span>
            <span>Rebuild goals <strong>{ownerBalance.rebuildingGoalMix.join(", ")}</strong></span>
            <span>Contender goals <strong>{ownerBalance.contenderGoalMix.join(", ")}</strong></span>
          </div>
        </section>
      )}
    </div>
  );
}
