import { useState } from "react";
import { calculateCapSpace, formatMoney } from "../../game/systems/contracts";
import { formatPickLabel } from "../../game/systems/draftPicks";
import { defaultRosterStatusForIncomingPlayer } from "../../game/systems/rosterManagement";
import { getPlayerRosterStatus, getRosterStatusLabel } from "../../game/systems/rosterRules";
import { calculateTradePackageValue, evaluateTrade } from "../../game/systems/trades";
import type { Team, TradeAsset } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

export function TradeWarRoomPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const proposal = useFranchiseStore((state) => state.activeTradeProposal);
  const proposeTrade = useFranchiseStore((state) => state.proposeTrade);
  const toggleTradeAsset = useFranchiseStore((state) => state.toggleTradeAsset);
  const submitTradeProposal = useFranchiseStore((state) => state.submitTradeProposal);
  const clearTradeProposal = useFranchiseStore((state) => state.clearTradeProposal);
  const addPlayerToTradeBlock = useFranchiseStore((state) => state.addPlayerToTradeBlock);
  const removePlayerFromTradeBlock = useFranchiseStore((state) => state.removePlayerFromTradeBlock);
  const [opponentId, setOpponentId] = useState<string | undefined>();

  if (!franchise) return null;
  const userTeam = selectedTeam(franchise);
  const opponents = franchise.league.teams.filter((team) => team.id !== userTeam.id);
  const selectedOpponent = franchise.league.teams.find((team) => team.id === (opponentId ?? proposal?.toTeamId)) ?? opponents[0];
  const activeProposal = proposal && proposal.toTeamId === selectedOpponent.id ? proposal : undefined;
  const evaluation = activeProposal ? evaluateTrade(activeProposal, franchise.league) : undefined;
  const userValue = activeProposal ? calculateTradePackageValue(activeProposal.assetsFrom, userTeam, franchise.league) : 0;
  const otherValue = activeProposal ? calculateTradePackageValue(activeProposal.assetsTo, selectedOpponent, franchise.league) : 0;

  const chooseOpponent = (teamId: string) => {
    setOpponentId(teamId);
    proposeTrade(teamId);
  };

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <label className="compact-select">
          <span>Trade Partner</span>
          <select value={selectedOpponent.id} onChange={(event) => chooseOpponent(event.target.value)}>
            {opponents.map((team) => (
              <option key={team.id} value={team.id}>
                {team.fullName}
              </option>
            ))}
          </select>
        </label>
        <div>
          <small>Our Cap Space</small>
          <strong>{formatMoney(calculateCapSpace(userTeam))}</strong>
        </div>
        <div>
          <small>Their Cap Space</small>
          <strong>{formatMoney(calculateCapSpace(selectedOpponent))}</strong>
        </div>
        <div>
          <small>Status</small>
          <strong>{evaluation ? (evaluation.accepted ? "Likely yes" : "Needs work") : "Drafting"}</strong>
        </div>
        <button type="button" onClick={() => proposeTrade(selectedOpponent.id)}>
          Start Proposal
        </button>
        <button type="button" onClick={clearTradeProposal} disabled={!proposal}>
          Clear
        </button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Team Needs</h3>
          <div className="needs-grid">
            <NeedList title="Our Needs" team={userTeam} />
            <NeedList title={`${selectedOpponent.nickname} Needs`} team={selectedOpponent} />
          </div>

          <h3>Assets From Us</h3>
          <AssetPicker team={userTeam} proposal={activeProposal} side="from" teams={franchise.league.teams} onToggle={toggleTradeAsset} disabled={!activeProposal} />

          <h3>Assets From Them</h3>
          <AssetPicker team={selectedOpponent} proposal={activeProposal} side="to" teams={franchise.league.teams} onToggle={toggleTradeAsset} disabled={!activeProposal} />
        </section>

        <section className="panel-section">
          <h3>Evaluation</h3>
          <div className="evaluation-card">
            <span>Value sent <strong>{userValue}</strong></span>
            <span>Value requested <strong>{otherValue}</strong></span>
            <span>Need fit <strong>{evaluation?.otherTeamNeedFit ?? 0}</strong></span>
            <span>Cap validity <strong>{evaluation?.capValid ? "Valid" : "Blocked"}</strong></span>
          </div>
          <p className="muted">Trade value is influenced by age, potential, contract, role, production, injury status, picks, and team needs.</p>
          {evaluation?.warnings.map((warning) => (
            <p className="warning-text" key={warning}>
              {warning}
            </p>
          ))}
          {evaluation?.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          <div className="button-row">
            <button type="button" disabled={!activeProposal || !evaluation?.capValid} onClick={() => void submitTradeProposal()}>
              Submit Trade
            </button>
          </div>

          <h3>Trade Block</h3>
          <div className="asset-list">
            {selectedOpponent.tradeBlock.map((playerId) => {
              const player = selectedOpponent.roster.find((candidate) => candidate.id === playerId);
              if (!player) return null;
              return (
                <article key={player.id}>
                  <strong>{player.displayName}</strong>
                  <span>
                    {player.position} | {player.overall} OVR | {formatMoney(player.contract.capHit)}
                  </span>
                </article>
              );
            })}
          </div>

          <h3>Our Trade Block Controls</h3>
          <div className="asset-list">
            {[...userTeam.roster].sort((a, b) => a.displayName.localeCompare(b.displayName)).slice(0, 10).map((player) => {
              const listed = userTeam.tradeBlock.includes(player.id);
              return (
                <article key={player.id}>
                  <strong>{player.displayName}</strong>
                  <span>
                    {player.position} | {player.overall} OVR
                  </span>
                  <button type="button" onClick={() => (listed ? removePlayerFromTradeBlock(player.id) : addPlayerToTradeBlock(player.id))}>
                    {listed ? "Remove from block" : "Add to block"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function NeedList({ title, team }: { title: string; team: Team }) {
  return (
    <div className="asset-list">
      <strong>{title}</strong>
      {team.teamNeeds.length ? (
        team.teamNeeds.map((need) => (
          <article key={`${team.id}-${need.position}`}>
            <strong>
              {need.position} | {need.urgency}/100
            </strong>
            <span>{need.description}</span>
          </article>
        ))
      ) : (
        <p className="empty-state">No urgent needs.</p>
      )}
    </div>
  );
}

function AssetPicker({
  team,
  proposal,
  side,
  teams,
  onToggle,
  disabled
}: {
  team: Team;
  proposal?: { assetsFrom: TradeAsset[]; assetsTo: TradeAsset[] };
  side: "from" | "to";
  teams: Team[];
  onToggle: (asset: TradeAsset) => void;
  disabled: boolean;
}) {
  const assets = side === "from" ? proposal?.assetsFrom ?? [] : proposal?.assetsTo ?? [];
  const selected = new Set(assets.map((asset) => `${asset.type}:${asset.assetId}`));
  return (
    <div className="asset-picker">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th>OVR</th>
              <th>Cap</th>
              <th>Status</th>
              <th>Dest.</th>
              <th>Asset</th>
            </tr>
          </thead>
          <tbody>
            {[...team.roster].sort((a, b) => b.overall - a.overall).map((player) => (
              <tr key={player.id}>
                <td>{player.displayName}</td>
                <td>{player.position}</td>
                <td>{player.overall}</td>
                <td>{formatMoney(player.contract.capHit)}</td>
                <td>{getRosterStatusLabel(getPlayerRosterStatus(player))}</td>
                <td>{getRosterStatusLabel(defaultRosterStatusForIncomingPlayer(team, player))}</td>
                <td>
                  <button
                    type="button"
                    disabled={disabled}
                    className={selected.has(`player:${player.id}`) ? "is-active" : ""}
                    onClick={() => onToggle({ type: "player", teamId: team.id, assetId: player.id })}
                  >
                    {selected.has(`player:${player.id}`) ? "Selected" : "Add"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="asset-list asset-list--compact">
        {team.draftPicks.map((pick) => (
          <article key={pick.id}>
            <strong>{formatPickLabel(pick, teams)}</strong>
            <span>Value {pick.projectedValue}</span>
            <button
              type="button"
              disabled={disabled}
              className={selected.has(`pick:${pick.id}`) ? "is-active" : ""}
              onClick={() => onToggle({ type: "pick", teamId: team.id, assetId: pick.id })}
            >
              {selected.has(`pick:${pick.id}`) ? "Selected" : "Add pick"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
