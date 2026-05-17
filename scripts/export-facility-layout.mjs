import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const blueprintPath = path.join(repoRoot, "src", "game", "facility", "facilityBlueprint.ts");
const outputPath = path.join(repoRoot, "docs", "facility-layout", "current-facility-layout.svg");

const blueprint = await loadBlueprint();
const svg = renderFacilitySvg(blueprint);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, svg, "utf8");

console.log(`Exported facility layout SVG to ${path.relative(repoRoot, outputPath)}`);

async function loadBlueprint() {
  let ts;
  try {
    const tsModule = await import("typescript");
    ts = tsModule.default ?? tsModule;
  } catch (error) {
    throw new Error(
      [
        "Unable to load the TypeScript package needed to read facilityBlueprint.ts.",
        "Run npm install, then retry npm run export:facility-layout.",
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      ].join("\n")
    );
  }

  const source = fs.readFileSync(blueprintPath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: blueprintPath
  });

  const relevantDiagnostics = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (relevantDiagnostics.length) {
    const messages = relevantDiagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n");
    throw new Error(`Unable to transpile facilityBlueprint.ts for layout export:\n${messages}`);
  }

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`;
  let blueprintModule;
  try {
    blueprintModule = await import(moduleUrl);
  } catch (error) {
    throw new Error(
      [
        "Unable to evaluate facilityBlueprint.ts for layout export.",
        "The exporter supports the current blueprint shape, where runtime layout data is self-contained and imports are type-only.",
        "If facilityBlueprint.ts gains runtime imports, expose a JS-safe blueprint extraction path or update this exporter to resolve those imports.",
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      ].join("\n")
    );
  }

  if (typeof blueprintModule.createDefaultFacilityBlueprint !== "function") {
    throw new Error("facilityBlueprint.ts did not export createDefaultFacilityBlueprint().");
  }

  return blueprintModule.createDefaultFacilityBlueprint();
}

function renderFacilitySvg(facilityBlueprint) {
  const bounds = getWorldBounds(facilityBlueprint);
  const padding = 84;
  const scale = 44;
  const width = Math.ceil((bounds.maxX - bounds.minX) * scale + padding * 2 + 280);
  const height = Math.ceil((bounds.maxZ - bounds.minZ) * scale + padding * 2);
  const toSvg = (point) => ({
    x: padding + (point.x - bounds.minX) * scale,
    y: padding + (point.z - bounds.minZ) * scale
  });
  const rectFor = (center, size) => {
    const topLeft = toSvg({ x: center.x - size.width / 2, z: center.z - size.depth / 2 });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: size.width * scale,
      height: size.depth * scale
    };
  };

  const mainEdges = new Set();
  for (let index = 0; index < facilityBlueprint.mainCorridorNodes.length - 1; index += 1) {
    mainEdges.add(edgeKey(facilityBlueprint.mainCorridorNodes[index], facilityBlueprint.mainCorridorNodes[index + 1]));
  }

  const pathNodeById = new Map(facilityBlueprint.pathNodes.map((node) => [node.id, node]));
  const edges = [];
  const seenEdges = new Set();
  for (const node of facilityBlueprint.pathNodes) {
    for (const connectedId of node.connectedNodeIds) {
      const connected = pathNodeById.get(connectedId);
      if (!connected) continue;
      const key = edgeKey(node.id, connected.id);
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({ key, from: node, to: connected, isMain: mainEdges.has(key) });
    }
  }

  const legendX = width - 236;
  const legendY = 72;
  const mapBoundsRect = {
    x: padding,
    y: padding,
    width: (bounds.maxX - bounds.minX) * scale,
    height: (bounds.maxZ - bounds.minZ) * scale
  };

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Franchise Ice current facility layout floorplan">`,
    "  <defs>",
    "    <filter id=\"label-shadow\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\">",
    "      <feDropShadow dx=\"0\" dy=\"1\" stdDeviation=\"1\" flood-color=\"#07111f\" flood-opacity=\"0.35\" />",
    "    </filter>",
    "  </defs>",
    "  <rect width=\"100%\" height=\"100%\" fill=\"#0d1524\" />",
    `  <rect x="${format(mapBoundsRect.x)}" y="${format(mapBoundsRect.y)}" width="${format(mapBoundsRect.width)}" height="${format(mapBoundsRect.height)}" fill=\"none\" stroke=\"#c9d8ef\" stroke-width=\"1.4\" stroke-dasharray=\"8 6\" opacity=\"0.7\" />`,
    "  <g id=\"districts\">",
    ...facilityBlueprint.districts.map((district) => renderDistrict(district, rectFor)),
    "  </g>",
    "  <g id=\"branch-corridors\">",
    ...edges.filter((edge) => !edge.isMain).map((edge) => renderEdge(edge, toSvg, "#9aa8be", 3.5, 0.55)),
    "  </g>",
    "  <g id=\"main-corridor\">",
    ...edges.filter((edge) => edge.isMain).map((edge) => renderEdge(edge, toSvg, "#ffd166", 7, 0.95)),
    "  </g>",
    "  <g id=\"rooms\">",
    ...facilityBlueprint.rooms.map((room) => renderRoom(room, rectFor)),
    "  </g>",
    "  <g id=\"path-nodes\">",
    ...facilityBlueprint.pathNodes.map((node) => renderPathNode(node, toSvg, facilityBlueprint.mainCorridorNodes.includes(node.id))),
    "  </g>",
    "  <g id=\"landmarks\">",
    ...facilityBlueprint.landmarks.map((landmark) => renderLandmark(landmark, toSvg)),
    "  </g>",
    renderSpawn(facilityBlueprint.spawnPoint, toSvg),
    renderTitle(facilityBlueprint, width),
    renderLegend(legendX, legendY),
    "</svg>",
    ""
  ].join("\n");
}

function renderDistrict(district, rectFor) {
  const rect = rectFor(district.bounds, { width: district.bounds.width, depth: district.bounds.depth });
  const labelX = rect.x + rect.width / 2;
  const labelY = rect.y + 20;
  const roomCount = district.roomIds.length;
  return [
    `    <g id="district-${escapeAttr(district.id)}">`,
    `      <rect x="${format(rect.x)}" y="${format(rect.y)}" width="${format(rect.width)}" height="${format(rect.height)}" rx="14" fill="${escapeAttr(district.colorToken)}" fill-opacity="0.16" stroke="${escapeAttr(district.colorToken)}" stroke-width="2.4" />`,
    `      <text x="${format(labelX)}" y="${format(labelY)}" fill="#f7fbff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle" filter="url(#label-shadow)">${escapeText(district.label)}</text>`,
    `      <text x="${format(labelX)}" y="${format(labelY + 17)}" fill="#d8e6f7" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="10" text-anchor="middle" opacity="0.86">${escapeText(district.id)} - ${roomCount} room${roomCount === 1 ? "" : "s"}</text>`,
    "    </g>"
  ].join("\n");
}

function renderEdge(edge, toSvg, color, strokeWidth, opacity) {
  const from = toSvg(edge.from.position);
  const to = toSvg(edge.to.position);
  return `    <line x1="${format(from.x)}" y1="${format(from.y)}" x2="${format(to.x)}" y2="${format(to.y)}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}" />`;
}

function renderRoom(room, rectFor) {
  const rect = rectFor(room.position, room.size);
  const labelLines = wrapLabel(room.label, Math.max(7, Math.floor(rect.width / 6.2)), 2);
  const textY = rect.y + rect.height / 2 - (labelLines.length - 1) * 6;
  const facing = entranceMarker(room, rect);
  return [
    `    <g id="room-${escapeAttr(room.roomId)}">`,
    `      <rect x="${format(rect.x)}" y="${format(rect.y)}" width="${format(rect.width)}" height="${format(rect.height)}" rx="7" fill="#f8fbff" stroke="${escapeAttr(room.colorToken)}" stroke-width="2.2" />`,
    `      <rect x="${format(rect.x + 4)}" y="${format(rect.y + 4)}" width="${format(Math.max(0, rect.width - 8))}" height="${format(Math.max(0, rect.height - 8))}" rx="4" fill="${escapeAttr(room.colorToken)}" fill-opacity="0.12" />`,
    ...labelLines.map((line, index) => `      <text x="${format(rect.x + rect.width / 2)}" y="${format(textY + index * 12)}" fill="#152033" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeText(line)}</text>`),
    `      <text x="${format(rect.x + rect.width / 2)}" y="${format(rect.y + rect.height - 7)}" fill="#4a5d78" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="8.5" text-anchor="middle">${escapeText(room.roomId)}</text>`,
    `      <circle cx="${format(facing.x)}" cy="${format(facing.y)}" r="4" fill="#0d1524" stroke="#ffffff" stroke-width="1.5" />`,
    "    </g>"
  ].join("\n");
}

function renderPathNode(node, toSvg, isMainNode) {
  const point = toSvg(node.position);
  const fill = isMainNode ? "#ffd166" : node.isLandmark ? "#f8fbff" : "#9aa8be";
  const radius = isMainNode ? 6 : node.isLandmark ? 5 : 3.5;
  const shouldLabel = isMainNode || node.isLandmark || node.id.includes("gate");
  const label = shouldLabel
    ? `\n      <text x="${format(point.x)}" y="${format(point.y - radius - 6)}" fill="#dfe9f8" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="9" font-weight="600" text-anchor="middle" filter="url(#label-shadow)">${escapeText(node.label)}</text>`
    : "";
  return `    <g id="path-node-${escapeAttr(node.id)}">\n      <circle cx="${format(point.x)}" cy="${format(point.y)}" r="${radius}" fill="${fill}" stroke="#0d1524" stroke-width="1.5" />${label}\n    </g>`;
}

function renderLandmark(landmark, toSvg) {
  const point = toSvg(landmark.position);
  const size = 7;
  return [
    `    <g id="landmark-${escapeAttr(landmark.id)}">`,
    `      <path d="M ${format(point.x)} ${format(point.y - size)} L ${format(point.x + size)} ${format(point.y)} L ${format(point.x)} ${format(point.y + size)} L ${format(point.x - size)} ${format(point.y)} Z" fill="#ffffff" stroke="#ffd166" stroke-width="2" />`,
    `      <text x="${format(point.x + 10)}" y="${format(point.y + 3)}" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="10" font-weight="700" filter="url(#label-shadow)">${escapeText(landmark.label)}</text>`,
    "    </g>"
  ].join("\n");
}

function renderSpawn(spawnPoint, toSvg) {
  const point = toSvg(spawnPoint);
  return [
    "  <g id=\"spawn-point\">",
    `    <circle cx="${format(point.x)}" cy="${format(point.y)}" r="11" fill="#61c9ff" stroke="#ffffff" stroke-width="2.5" />`,
    `    <path d="M ${format(point.x)} ${format(point.y - 16)} L ${format(point.x + 7)} ${format(point.y - 4)} L ${format(point.x - 7)} ${format(point.y - 4)} Z" fill="#ffffff" />`,
    `    <text x="${format(point.x + 15)}" y="${format(point.y + 4)}" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="12" font-weight="800" filter="url(#label-shadow)">Spawn</text>`,
    "  </g>"
  ].join("\n");
}

function renderTitle(facilityBlueprint, width) {
  const subtitle = `${facilityBlueprint.rooms.length} rooms - ${facilityBlueprint.districts.length} districts - ${facilityBlueprint.pathNodes.length} path nodes`;
  return [
    "  <g id=\"title\">",
    "    <text x=\"84\" y=\"38\" fill=\"#f7fbff\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"24\" font-weight=\"800\">Franchise Ice Facility Layout Export</text>",
    `    <text x="84" y="59" fill="#b8c8dc" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="12">${escapeText(facilityBlueprint.label)} v${facilityBlueprint.version} - ${escapeText(subtitle)}</text>`,
    `    <text x="${width - 236}" y="38" fill="#b8c8dc" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="11">Generated from src/game/facility/facilityBlueprint.ts</text>`,
    "  </g>"
  ].join("\n");
}

function renderLegend(x, y) {
  return [
    `  <g id="legend" transform="translate(${format(x)} ${format(y)})">`,
    "    <rect x=\"0\" y=\"0\" width=\"196\" height=\"178\" rx=\"12\" fill=\"#111c2e\" stroke=\"#33435b\" stroke-width=\"1.5\" />",
    "    <text x=\"16\" y=\"25\" fill=\"#f7fbff\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"14\" font-weight=\"800\">Legend</text>",
    "    <rect x=\"16\" y=\"42\" width=\"24\" height=\"16\" rx=\"4\" fill=\"#61c9ff\" fill-opacity=\"0.18\" stroke=\"#61c9ff\" stroke-width=\"2\" />",
    "    <text x=\"50\" y=\"55\" fill=\"#dbe8f8\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"11\">District bounds</text>",
    "    <rect x=\"16\" y=\"68\" width=\"24\" height=\"16\" rx=\"4\" fill=\"#f8fbff\" stroke=\"#8ee7d1\" stroke-width=\"2\" />",
    "    <text x=\"50\" y=\"81\" fill=\"#dbe8f8\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"11\">Room shell</text>",
    "    <line x1=\"16\" y1=\"105\" x2=\"42\" y2=\"105\" stroke=\"#ffd166\" stroke-width=\"7\" stroke-linecap=\"round\" />",
    "    <text x=\"50\" y=\"109\" fill=\"#dbe8f8\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"11\">Main corridor</text>",
    "    <line x1=\"16\" y1=\"129\" x2=\"42\" y2=\"129\" stroke=\"#9aa8be\" stroke-width=\"3.5\" stroke-linecap=\"round\" opacity=\"0.7\" />",
    "    <text x=\"50\" y=\"133\" fill=\"#dbe8f8\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"11\">Branch corridor</text>",
    "    <path d=\"M 28 143 L 36 151 L 28 159 L 20 151 Z\" fill=\"#ffffff\" stroke=\"#ffd166\" stroke-width=\"2\" />",
    "    <text x=\"50\" y=\"155\" fill=\"#dbe8f8\" font-family=\"Inter, Segoe UI, Arial, sans-serif\" font-size=\"11\">Landmark</text>",
    "  </g>"
  ].join("\n");
}

function getWorldBounds(facilityBlueprint) {
  const xs = [];
  const zs = [];
  for (const district of facilityBlueprint.districts) {
    xs.push(district.bounds.x - district.bounds.width / 2, district.bounds.x + district.bounds.width / 2);
    zs.push(district.bounds.z - district.bounds.depth / 2, district.bounds.z + district.bounds.depth / 2);
  }
  for (const room of facilityBlueprint.rooms) {
    xs.push(room.position.x - room.size.width / 2, room.position.x + room.size.width / 2);
    zs.push(room.position.z - room.size.depth / 2, room.position.z + room.size.depth / 2);
  }
  for (const node of facilityBlueprint.pathNodes) {
    xs.push(node.position.x);
    zs.push(node.position.z);
  }
  for (const landmark of facilityBlueprint.landmarks) {
    xs.push(landmark.position.x);
    zs.push(landmark.position.z);
  }
  xs.push(facilityBlueprint.spawnPoint.x);
  zs.push(facilityBlueprint.spawnPoint.z);
  const margin = 1.4;
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minZ: Math.min(...zs) - margin,
    maxZ: Math.max(...zs) + margin
  };
}

function entranceMarker(room, rect) {
  if (room.entranceFacing === "north") return { x: rect.x + rect.width / 2, y: rect.y };
  if (room.entranceFacing === "south") return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  if (room.entranceFacing === "east") return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
  return { x: rect.x, y: rect.y + rect.height / 2 };
}

function edgeKey(a, b) {
  return [a, b].sort().join("::");
}

function wrapLabel(label, maxChars, maxLines) {
  const words = label.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[lines.length - 1] = trimToLength(lines[lines.length - 1], maxChars);
  }
  return lines.length ? lines : [label];
}

function trimToLength(value, maxChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1))}.`;
}

function format(value) {
  return Number(value.toFixed(2)).toString();
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replaceAll("\"", "&quot;");
}
