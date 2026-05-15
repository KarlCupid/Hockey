import { GUIDE_TOPICS } from "../content/guideTopics";
import type { GuideTopic, RoomId } from "../types";

export function getGuideTopics(): GuideTopic[] {
  return GUIDE_TOPICS;
}

export function getGuideTopic(topicId: string): GuideTopic | undefined {
  return GUIDE_TOPICS.find((topic) => topic.id === topicId);
}

export function getGuideTopicsForRoom(roomId: RoomId): GuideTopic[] {
  return GUIDE_TOPICS.filter((topic) => topic.relatedRoomIds.includes(roomId));
}

export function getGuideTopicsForAction(action: string): GuideTopic[] {
  return GUIDE_TOPICS.filter((topic) => topic.relatedActions.includes(action));
}

export function searchGuideTopics(query: string): GuideTopic[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return GUIDE_TOPICS;
  return GUIDE_TOPICS.filter((topic) =>
    [topic.title, topic.summary, topic.body, topic.category, ...topic.relatedActions].join(" ").toLowerCase().includes(normalized)
  );
}

export function validateGuideCoverage(roomIds: RoomId[]): string[] {
  return roomIds.filter((roomId) => !GUIDE_TOPICS.some((topic) => topic.relatedRoomIds.includes(roomId)));
}

export function getStarterGuideTopicIds(): string[] {
  return [
    "basics-what-is-franchise-ice",
    "basics-your-role",
    "basics-moving-around",
    "basics-assistant-gm-action-queue",
    "room-gm-office",
    "system-game-simulation",
    "system-achievements-milestones"
  ];
}
