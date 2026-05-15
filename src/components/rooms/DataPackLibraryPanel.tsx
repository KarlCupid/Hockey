import { DataPackLibrary } from "../editors/DataPackLibrary";
import { useFranchiseStore } from "../../store/franchiseStore";

export function DataPackLibraryPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const startFranchiseFromDataPack = useFranchiseStore((state) => state.startFranchiseFromDataPack);
  return <DataPackLibrary currentFranchise={franchise} onStartPack={(pack, selectedTeamId) => startFranchiseFromDataPack(pack, selectedTeamId)} />;
}
