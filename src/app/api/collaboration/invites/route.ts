import { getInvites, createInvite, updateInvite } from "./core";

export async function GET(request: Request) {
  return getInvites(request);
}

export async function POST(request: Request) {
  return createInvite(request);
}

export async function PATCH(request: Request) {
  return updateInvite(request);
}
