import { NextResponse } from "next/server";

type MusicTrack = {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
};

async function searchMusic(
  query: string,
  skipCount: number = 0,
  excludeIds: string[] = [],
): Promise<MusicTrack | null> {
  const musicApiUrl = process.env.MUSIC_API_URL;
  if (!musicApiUrl) return null;

  try {
    // 搜索更多歌曲
    const limit = Math.max(30, skipCount + excludeIds.length + 10);
    const searchRes = await fetch(
      `${musicApiUrl}/search?keywords=${encodeURIComponent(query)}&limit=${limit}`,
    );
    const searchData = (await searchRes.json()) as {
      result?: {
        songs?: Array<{
          id: number;
          name: string;
          artists?: Array<{ name: string }>;
        }>;
      };
    };

    const songs = searchData.result?.songs ?? [];
    // 过滤掉已排除的歌曲
    const filtered = songs.filter((s) => !excludeIds.includes(String(s.id)));
    if (filtered.length === 0) return null;

    // 计算实际要返回的歌曲索引（循环）
    const targetIdx = skipCount % filtered.length;
    const song = filtered[targetIdx];
    if (!song) return null;

    // 获取播放链接
    const urlRes = await fetch(`${musicApiUrl}/song/url?id=${song.id}`);
    const urlData = (await urlRes.json()) as {
      data?: Array<{ url?: string }>;
    };
    const songUrl = urlData.data?.[0]?.url ?? "";

    // 获取封面
    const detailRes = await fetch(`${musicApiUrl}/song/detail?ids=${song.id}`);
    const detailData = (await detailRes.json()) as {
      songs?: Array<{ al?: { picUrl?: string } }>;
    };
    const cover = detailData.songs?.[0]?.al?.picUrl ?? "";

    return {
      id: String(song.id),
      name: song.name,
      artist: song.artists?.map((a) => a.name).join(", ") ?? "",
      url: songUrl,
      cover,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const musicApiUrl = process.env.MUSIC_API_URL;
  if (!musicApiUrl) {
    return NextResponse.json(
      { error: "未配置 MUSIC_API_URL 环境变量", track: null },
      { status: 503 },
    );
  }

  const sp = new URL(request.url).searchParams;
  const query = sp.get("query")?.trim();
  const excludeId = sp.get("excludeId")?.trim();
  const offset = parseInt(sp.get("offset") ?? "0", 10) || 0;

  if (!query) {
    return NextResponse.json({ error: "query 参数必填" }, { status: 400 });
  }

  const excludeIds = excludeId ? [excludeId] : [];
  const track = await searchMusic(query, offset, excludeIds);

  if (!track) {
    return NextResponse.json(
      { error: "未找到歌曲", track: null },
      { status: 404 },
    );
  }

  return NextResponse.json({ track });
}
