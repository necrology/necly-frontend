"use client";

import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardGlobalSearch } from "@/components/dashboard-global-search";
import { initialNotifications as seedNotifications, type NotificationItem } from "@/data/seed";
import { adminApi, authApi, DEMO_MODE, useAuthStore } from "@/lib/api";
import {
  NOTIFICATIONS_SEEN_EVENT,
  NOTIFICATION_FETCH_SIZE,
  NOTIFICATION_PREVIEW_SIZE,
  countNewNotifications,
  isNewNotification,
  markNotificationsSeen,
  notificationBadgeLabel,
  notificationFromAudit,
  readNotificationsSeenAt,
} from "@/lib/notifications";
import { formatDateID } from "@/lib/money";
import { useDashboardUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardTopbar() {
  const router = useRouter();
  const toggle = useDashboardUiStore((state) => state.toggleSidebar);
  const mobileOpen = useDashboardUiStore((state) => state.mobileSidebarOpen);
  const setMobileOpen = useDashboardUiStore((state) => state.setMobileSidebarOpen);
  const user = useAuthStore((state) => state.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_MODE ? seedNotifications : []);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsSeenAt, setNotificationsSeenAt] = useState<string | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const canReadNotifications = DEMO_MODE || user?.role === "admin";

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notificationsOpen]);

  // Halaman Notifikasi menandai "sudah dilihat" lewat localStorage. Event ini
  // membuat lonceng di topbar ikut memperbarui angka tanpa perlu reload.
  useEffect(() => {
    const syncSeenAt = () => setNotificationsSeenAt(readNotificationsSeenAt());
    syncSeenAt();
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, syncSeenAt);
    return () => window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, syncSeenAt);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (DEMO_MODE) {
      setNotifications(seedNotifications);
      setNotificationsLoading(false);
      setNotificationsError("");
      return;
    }
    if (!canReadNotifications) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await adminApi.listNotifications({ page: 1, per_page: NOTIFICATION_FETCH_SIZE });
      if (!Array.isArray(response.notifications)) {
        throw new Error("invalid notification response");
      }
      const mapped = response.notifications.map(notificationFromAudit);
      setNotifications(mapped);
      if (!readNotificationsSeenAt()) {
        // Kunjungan pertama tidak boleh menampilkan seluruh riwayat audit
        // sebagai "belum dibaca"; anggap entri terbaru sudah terlihat.
        markNotificationsSeen(mapped[0]?.time ?? new Date().toISOString());
      }
    } catch {
      setNotificationsError("Gagal memuat notifikasi.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [canReadNotifications]);

  useEffect(() => {
    void Promise.resolve().then(() => refreshNotifications());
  }, [refreshNotifications]);

  const toggleNotifications = () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) void refreshNotifications();
  };

  const toggleSidebar = () => {
    // Di layar sempit tombol hamburger harus bisa membuka sekaligus menutup
    // drawer. Sebelumnya nilainya selalu `true`, sehingga klik kedua tidak
    // berefek dan drawer terasa tidak bisa ditutup.
    if (typeof window !== "undefined" && window.innerWidth <= 800) {
      setMobileOpen(!mobileOpen);
      return;
    }
    toggle();
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authApi.logout();
    } finally {
      setSigningOut(false);
      setProfileOpen(false);
      router.push("/login");
    }
  };

  const displayName = user?.name?.trim() || "Ayu Admin";
  const displayRole = user?.role === "admin" ? "Administrator" : user?.role === "seller" ? "Penjual" : user ? "Pelanggan" : "Operasional";
  const displayEmail = user?.email?.trim() || "Sesi demo dashboard";

  const newNotificationCount = DEMO_MODE
    ? notifications.filter((notification) => !notification.read).length
    : countNewNotifications(notifications, notificationsSeenAt);
  const badgeLabel = notificationBadgeLabel(newNotificationCount);
  const preview = notifications.slice(0, NOTIFICATION_PREVIEW_SIZE);

  return (
    <header className="dashboard-topbar">
      <button
        className="icon-button sidebar-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-label={mobileOpen ? "Tutup navigasi dashboard" : "Buka navigasi dashboard"}
        aria-expanded={mobileOpen}
      >
        <Menu size={16} className="mobile-menu-button" />
        <PanelLeftClose size={16} className="nav-copy" />
      </button>
      <DashboardGlobalSearch />
      <span className="topbar-spacer" />
      <div className="dashboard-notifications" ref={notificationsRef}>
        <button
          className="icon-button cart-link"
          type="button"
          aria-label="Notifikasi"
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
          onClick={toggleNotifications}
        >
          <Bell size={16} />
          {badgeLabel && <span className="cart-count" data-testid="notification-count">{badgeLabel}</span>}
        </button>
        {notificationsOpen && (
          <div className="notifications-popover" role="dialog" aria-label="Notifikasi terbaru">
            <div className="notifications-popover-head">
              <div>
                <strong>Notifikasi</strong>
                <span className="muted">{newNotificationCount > 0 ? `${newNotificationCount} notifikasi baru` : "Tidak ada notifikasi baru"}</span>
              </div>
              <Link href="/dashboard/notifications" onClick={() => setNotificationsOpen(false)}>Lihat semua</Link>
            </div>
            {notificationsLoading && notifications.length === 0 && <p className="notifications-popover-state">Memuat notifikasi…</p>}
            {!notificationsLoading && notificationsError && (
              <p className="notifications-popover-state" role="alert">{notificationsError}</p>
            )}
            {!notificationsLoading && !notificationsError && preview.length === 0 && (
              <p className="notifications-popover-state">Belum ada notifikasi.</p>
            )}
            {preview.length > 0 && (
              <ul className="notifications-popover-list">
                {preview.map((notification) => {
                  const isNew = DEMO_MODE
                    ? !notification.read
                    : isNewNotification(notification, notificationsSeenAt);
                  return (
                    <li key={notification.id}>
                      <Link
                        className={cn("notifications-preview-item", isNew && "is-new")}
                        href="/dashboard/notifications"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <span className={`notifications-preview-dot type-${notification.type}`} aria-hidden="true" />
                        <span className="notifications-preview-copy">
                          <strong>{notification.title}</strong>
                          <small>{notification.detail}</small>
                          <time>{formatDateID(notification.time)}</time>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="notifications-popover-foot">
              <Link href="/dashboard/notifications" onClick={() => setNotificationsOpen(false)}>Buka halaman notifikasi</Link>
            </div>
          </div>
        )}
      </div>
      <div className="dashboard-profile" ref={profileRef}>
        <button
          className="profile-button"
          type="button"
          aria-label="Menu profil akun"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((value) => !value)}
        >
          <span className="profile-avatar" aria-hidden="true">{initialsOf(displayName)}</span>
          <span className="profile-copy" style={{ textAlign: "left" }}>
            <strong style={{ display: "block", fontSize: 10 }}>{displayName}</strong>
            <span className="muted" style={{ fontSize: 8 }}>{displayRole}</span>
          </span>
          <ChevronDown size={12} className={cn("profile-copy", "profile-chevron", profileOpen && "open")} />
        </button>
        {profileOpen && (
          <div className="dashboard-profile-menu" role="menu" aria-label="Menu akun">
            <div className="dashboard-profile-identity">
              <span className="profile-avatar" aria-hidden="true">{initialsOf(displayName)}</span>
              <div>
                <strong>{displayName}</strong>
                <small>{displayEmail}</small>
                <span>{displayRole}</span>
              </div>
            </div>
            <Link role="menuitem" href="/akun" onClick={() => setProfileOpen(false)}>
              <UserRound size={15} aria-hidden="true" /> Profil &amp; keamanan
            </Link>
            <Link role="menuitem" href="/" onClick={() => setProfileOpen(false)}>
              <Store size={15} aria-hidden="true" /> Kembali ke marketplace
            </Link>
            <button role="menuitem" type="button" onClick={signOut} disabled={signingOut}>
              <LogOut size={15} aria-hidden="true" /> {signingOut ? "Keluar…" : "Keluar"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
