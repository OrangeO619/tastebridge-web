import { NextResponse } from "next/server";
import { createInvite, getInvites, updateInvite } from "../collaboration/invites/core";

const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Sunset: "2026-06-30",
  Link: '</api/collaboration/invites>; rel="successor-version"',
  Warning: '299 - "/api/collab-invites is deprecated; use /api/collaboration/invites before 2026-06-30"',
};

export async function GET(request: Request) {
  const response = await getInvites(request);
  Object.entries(DEPRECATION_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function POST(request: Request) {
  const response = await createInvite(request);
  Object.entries(DEPRECATION_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function PATCH(request: Request) {
  const response = await updateInvite(request);
  Object.entries(DEPRECATION_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}
