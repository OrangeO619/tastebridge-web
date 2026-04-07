/** 与 PRD PrefRecord 对齐（前端/API） */
export type PrefDimensions = {
  taste: number;
  ambiance: number;
  service: number;
  value: number;
};

export type PrefRecord = {
  id: string;
  userId: string;
  spotId: string;
  overall: number;
  emoji?: string;
  moodTag?: string;
  tags: string[];
  invitedBy?: string;
  isCollaborative: boolean;
  dimensions?: PrefDimensions;
  note?: string;
  images: string[];
  visitDate: string;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PrefRow = {
  id: string;
  spot_id: string;
  user_id: string;
  overall: number;
  emoji: string | null;
  mood_tag: string | null;
  tags: string[] | null;
  invited_by: string | null;
  is_collaborative: boolean;
  dimensions: PrefDimensions | null;
  note: string | null;
  images: string[] | null;
  visit_date: string;
  visit_count: number;
  created_at: string;
  updated_at: string;
};

export function rowToPref(row: PrefRow): PrefRecord {
  return {
    id: row.id,
    spotId: row.spot_id,
    userId: row.user_id,
    overall: row.overall,
    emoji: row.emoji ?? undefined,
    moodTag: row.mood_tag ?? undefined,
    tags: row.tags ?? [],
    invitedBy: row.invited_by ?? undefined,
    isCollaborative: row.is_collaborative,
    dimensions: row.dimensions ?? undefined,
    note: row.note ?? undefined,
    images: row.images ?? [],
    visitDate: row.visit_date,
    visitCount: row.visit_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type PrefsSummary = {
  count: number;
  avgOverall: number | null;
  participantIds: string[];
};

export function summarizePrefs(prefs: PrefRecord[]): PrefsSummary {
  if (prefs.length === 0) {
    return { count: 0, avgOverall: null, participantIds: [] };
  }
  const sum = prefs.reduce((a, p) => a + p.overall, 0);
  const participantIds = [...new Set(prefs.map((p) => p.userId))];
  return {
    count: prefs.length,
    avgOverall: Math.round((sum / prefs.length) * 10) / 10,
    participantIds,
  };
}
