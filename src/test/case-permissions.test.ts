import { describe, expect, it } from "vitest";
import { canDeleteCase, canEditCase, isRubricEditable } from "@/lib/casePermissions";

describe("case detail permissions", () => {
  it("allows the owner admin to edit", () => {
    expect(
      canEditCase({ isAdmin: true, isMasterAdmin: false, createdBy: "owner-id", userId: "owner-id" })
    ).toBe(true);
  });

  it("allows the master admin to edit a case owned by another admin", () => {
    expect(
      canEditCase({ isMasterAdmin: true, createdBy: "owner-id", userId: "master-id" })
    ).toBe(true);
  });

  it("allows a non-owner admin to edit every case and its rubric", () => {
    const canEdit = canEditCase({
      isAdmin: true,
      isMasterAdmin: false,
      createdBy: "owner-id",
      userId: "other-admin-id",
    });

    expect(canEdit).toBe(true);
    expect(isRubricEditable({ canEdit, isEditing: true })).toBe(true);
    expect(isRubricEditable({ canEdit, isEditing: false })).toBe(false);
  });

  it("keeps non-admins read-only even when they own the case", () => {
    const canEdit = canEditCase({
      isAdmin: false,
      isMasterAdmin: false,
      createdBy: "owner-id",
      userId: "owner-id",
    });

    expect(isRubricEditable({ canEdit, isEditing: true })).toBe(false);
  });

  it("allows admins to edit agent-created cases without an owner", () => {
    expect(canEditCase({ isAdmin: true, isMasterAdmin: false, createdBy: null, userId: "admin-id" })).toBe(true);
  });

  it("denies editing without a signed-in user", () => {
    expect(canEditCase({ isAdmin: true, isMasterAdmin: true })).toBe(false);
  });

  it("does not widen deletion permissions to non-owner admins", () => {
    expect(canDeleteCase({ isAdmin: true, isMasterAdmin: false, createdBy: "owner-id", userId: "other-admin-id" })).toBe(false);
    expect(canDeleteCase({ isMasterAdmin: false, createdBy: "owner-id", userId: "owner-id" })).toBe(true);
    expect(canDeleteCase({ isMasterAdmin: true, createdBy: "owner-id", userId: "master-id" })).toBe(true);
  });
});
