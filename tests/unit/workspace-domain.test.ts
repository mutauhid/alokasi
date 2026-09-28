import { describe, expect, it } from "vitest";
import {
  changeMemberRoleInput,
  createInvitationInput,
  createSharedWorkspaceInput,
} from "../../src/modules/workspaces/domain";

describe("workspace domain input", () => {
  it("normalizes a shared workspace name", () => {
    expect(
      createSharedWorkspaceInput.parse({ name: "  Dana   Keluarga  " }),
    ).toEqual({ name: "Dana Keluarga" });
  });

  it("normalizes invitation email and only accepts non-owner roles", () => {
    const workspaceId = "c7f06a7a-cac6-4b9e-b905-1d86d1cb1428";
    expect(
      createInvitationInput.parse({
        workspaceId,
        email: "Anggota@Example.COM",
        role: "editor",
      }),
    ).toMatchObject({ email: "anggota@example.com", role: "editor" });
    expect(
      createInvitationInput.safeParse({
        workspaceId,
        email: "anggota@example.com",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("requires optimistic membership version", () => {
    expect(
      changeMemberRoleInput.safeParse({
        workspaceId: "c7f06a7a-cac6-4b9e-b905-1d86d1cb1428",
        membershipId: "94b9fcb4-7d88-4d59-a811-4d0908fbdb95",
        version: "0",
        role: "viewer",
      }).success,
    ).toBe(false);
  });
});
