import { describe, expect, it } from "vitest";
import {
  buildAccountExtensionPayload,
  buildSlotExtensionPayload,
  parseExtensionDuration,
  resolveInventoryExpiry,
} from "./inventory-expiry";

const NOW = new Date("2026-10-27T08:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

describe("resolveInventoryExpiry", () => {
  it("menandai akun/slot yang sudah kedaluwarsa dari status atau tanggal", () => {
    expect(
      resolveInventoryExpiry({ expiresAt: "2026-10-20T00:00:00Z", status: "active", now: NOW }),
    ).toMatchObject({ state: "expired", expired: true, marker: null, label: "Kedaluwarsa" });

    expect(
      resolveInventoryExpiry({ expiresAt: "2026-12-01T00:00:00Z", status: "expired", now: NOW }),
    ).toMatchObject({ state: "expired", expired: true });
  });

  it("memberi penanda H-7 untuk sisa 2–7 hari", () => {
    expect(
      resolveInventoryExpiry({ expiresAt: new Date(NOW + 3 * DAY).toISOString(), status: "active", now: NOW }),
    ).toMatchObject({ state: "expiring", marker: "H-7", daysRemaining: 3, expired: false });

    expect(
      resolveInventoryExpiry({ expiresAt: new Date(NOW + 7 * DAY).toISOString(), status: "active", now: NOW }),
    ).toMatchObject({ marker: "H-7", daysRemaining: 7 });
  });

  it("memberi penanda H-1 untuk sisa satu hari atau kurang", () => {
    expect(
      resolveInventoryExpiry({ expiresAt: new Date(NOW + DAY).toISOString(), status: "active", now: NOW }),
    ).toMatchObject({ state: "expiring", marker: "H-1", daysRemaining: 1 });

    expect(
      resolveInventoryExpiry({
        expiresAt: new Date(NOW + 4 * 60 * 60 * 1000).toISOString(),
        status: "active",
        now: NOW,
      }),
    ).toMatchObject({ marker: "H-1", label: "1 hari lagi" });
  });

  it("memakai days_remaining dari backend dan membedakan masa aktif tanpa batas", () => {
    expect(
      resolveInventoryExpiry({ expiresAt: "2099-01-01T00:00:00Z", daysRemaining: 5, now: NOW }),
    ).toMatchObject({ state: "expiring", marker: "H-7", daysRemaining: 5 });

    expect(resolveInventoryExpiry({ expiresAt: null, daysRemaining: null, now: NOW })).toMatchObject({
      state: "unlimited",
      expired: false,
      marker: null,
      label: "Tanpa batas",
    });
  });
});

describe("payload aksi perpanjangan", () => {
  it("memvalidasi durasi 1–3650 hari", () => {
    expect(parseExtensionDuration("30")).toBe(30);
    expect(parseExtensionDuration("1")).toBe(1);
    expect(parseExtensionDuration("3650")).toBe(3650);
    expect(parseExtensionDuration("0")).toBeNull();
    expect(parseExtensionDuration("3651")).toBeNull();
    expect(parseExtensionDuration("1.5")).toBeNull();
    expect(parseExtensionDuration("")).toBeNull();
  });

  it("membangun payload slot hanya dengan duration_days", () => {
    expect(buildSlotExtensionPayload(30)).toEqual({ duration_days: 30 });
    expect(buildSlotExtensionPayload(0)).toBeNull();
  });

  it("membangun payload akun dari durasi atau tanggal eksplisit", () => {
    expect(buildAccountExtensionPayload({ durationDays: 45 })).toEqual({ duration_days: 45 });
    expect(buildAccountExtensionPayload({ expiresAt: "2027-01-31T00:00:00.000Z" })).toEqual({
      expires_at: "2027-01-31T00:00:00.000Z",
    });
    expect(buildAccountExtensionPayload({ expiresAt: "bukan-tanggal" })).toBeNull();
    expect(buildAccountExtensionPayload({})).toBeNull();
  });
});
