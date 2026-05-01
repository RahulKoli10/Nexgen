"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bell } from "lucide-react";
import useSWR from "swr";
import { NotificationsDropdown } from "./notifications-dropdown";

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30 seconds
  const { data: countData, mutate: mutateCount } = useSWR(
    "/api/notifications/unread-count",
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch last 10 notifications
  const { data: listData, mutate: mutateList } = useSWR(
    "/api/notifications?limit=10",
    fetcher
  );

  const unreadCount = countData?.count ?? 0;
  const notifications = listData?.notifications ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarkRead(id: string) {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      mutateCount();
      mutateList();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await axios.patch("/api/notifications/read-all");
      mutateCount();
      mutateList();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={[
          "relative inline-flex size-9 items-center justify-center rounded-lg border transition",
          isOpen ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        ].join(" ")}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationsDropdown
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
        />
      )}
    </div>
  );
}
