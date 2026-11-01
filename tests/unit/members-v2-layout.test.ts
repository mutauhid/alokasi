import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function projectSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function componentSource(path: string) {
  return projectSource(`src/components/${path}`);
}

describe("Members & Access V2 presentation contract", () => {
  it("keeps workspace and membership data connected to the existing service", async () => {
    const [section, service] = await Promise.all([
      componentSource("members-section.tsx"),
      projectSource("src/modules/workspaces/service.ts"),
    ]);

    expect(section).toContain("getMembersOverview(access)");
    expect(section).toContain("getWorkspaceDeletionSummary(access)");
    expect(service).toContain("workspaceId: access.workspaceId");
    expect(service).toContain('status: "active"');
    expect(service).toContain('role: { not: "owner" }');
  });

  it("retains every supported workspace lifecycle action", async () => {
    const [section, panels, actions] = await Promise.all([
      componentSource("members-section.tsx"),
      componentSource("members-v2-panels.tsx"),
      projectSource("src/app/(workspace)/workspace-actions.ts"),
    ]);

    expect(panels).toContain("createSharedWorkspaceAction");
    expect(panels).toContain("changeMemberRoleAction");
    expect(panels).toContain("revokeMemberAction");
    expect(panels).toContain("revokeInvitationAction");
    expect(section).toContain("requestOwnershipTransferAction");
    expect(section).toContain("acceptOwnershipTransferAction");
    expect(section).toContain("leaveWorkspaceAction");
    expect(section).toContain("DeleteWorkspaceForm");
    expect(actions).toContain("requireWorkspaceAccess(");
  });

  it("uses only Owner, Editor, and Viewer without inventing email resend", async () => {
    const [section, panels, invitation] = await Promise.all([
      componentSource("members-section.tsx"),
      componentSource("members-v2-panels.tsx"),
      componentSource("invitation-form.tsx"),
    ]);

    expect(section).toContain('label: "Owner"');
    expect(section).toContain('label: "Editor"');
    expect(section).toContain('label: "Viewer"');
    expect(panels).not.toContain("resendInvitationAction");
    expect(panels).not.toContain("Kirim ulang");
    expect(invitation).toContain(
      "Pengiriman email otomatis belum dikonfigurasi",
    );
  });

  it("uses accessible responsive dialog, sheet, table, and confirmations", async () => {
    const [section, panels, styles] = await Promise.all([
      componentSource("members-section.tsx"),
      componentSource("members-v2-panels.tsx"),
      projectSource("src/app/globals.css"),
    ]);

    expect(section).toContain("<table");
    expect(section).toContain("<caption");
    expect(panels).toContain("DialogPrimitive.Title");
    expect(panels).toContain('side="responsive"');
    expect(panels).toContain("ConfirmActionDialog");
    expect(panels).toContain("Cabut akses");
    expect(panels).toContain("Batalkan undangan");
    expect(styles).toContain(".members-v2-sheet-scroll");
  });

  it("makes private/shared separation and stale workspace reset explicit", async () => {
    const section = await componentSource("members-section.tsx");

    expect(section).toContain("Ruang pribadi tetap pribadi");
    expect(section).toContain("tidak memindahkan data pribadi");
    expect(section).toContain("tidak memberi akses ke ruang pribadi");
    expect(section).toContain("key={access.workspaceId}");
  });
});
