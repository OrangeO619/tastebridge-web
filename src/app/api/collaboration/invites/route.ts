import { getInvites, createInvite, updateInvite, markInvitesRead } from "./core";

export async function GET(request: Request) {
  return getInvites(request);
}

export async function POST(request: Request) {
  return createInvite(request);
}

export async function PATCH(request: Request) {
  const sp = new URL(request.url).searchParams;
  if (sp.get("markRead") === "1") {
    return markInvitesRead(request);
  }
  return updateInvite(request);
}
