"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAllBookings, 
  updateBookingStatusAction, 
  rescheduleBookingAction,
  sendOnMyWayEmail,
  handleNoShowAction,
  getAllServices,
  deleteBookingAction,
  getOperatingHours,
  updateOperatingHoursAction,
  getBlockedDates,
  toggleBlockedDateAction,
  getRevenueBreakdown,
  getAllTimeStats,
  getSettingAction,
  setSettingAction,
} from "@/app/actions/adminActions";
import type { AdminBooking } from "@/types/admin";

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await deleteBookingAction(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["admin", "services"],
    queryFn: async () => await getAllServices(),
  });
}

export function useAdminBookings() {
  return useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      return await getAllBookings() as AdminBooking[];
    },
    staleTime: 30000,
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdminBooking["status"] }) => {
      return await updateBookingStatusAction(id, status);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date, time }: { id: string; date: string; time: string }) => {
      return await rescheduleBookingAction(id, date, time);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });
}

export function useSendOnMyWay() {
  return useMutation({
    mutationFn: async (id: string) => await sendOnMyWayEmail(id),
  });
}

export function useHandleNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await handleNoShowAction(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });
}

/**
 * SCHEDULE MANAGEMENT HOOKS
 */
export function useOperatingHours() {
  return useQuery({
    queryKey: ["admin", "operating-hours"],
    queryFn: async () => await getOperatingHours(),
  });
}

export function useUpdateOperatingHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hours: any[]) => await updateOperatingHoursAction(hours),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "operating-hours"] }),
  });
}

export function useBlockedDates() {
  return useQuery({
    queryKey: ["admin", "blocked-dates"],
    queryFn: async () => await getBlockedDates(),
  });
}

export function useToggleBlockedDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, isBlocked, reason }: { date: string; isBlocked: boolean; reason?: string }) => 
      await toggleBlockedDateAction(date, isBlocked, reason),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "blocked-dates"] }),
  });
}

export function useRevenueBreakdown(monthOffset = 0) {
  return useQuery({
    queryKey: ["admin", "revenue", monthOffset],
    queryFn: async () => await getRevenueBreakdown(monthOffset),
    staleTime: 60_000,
  });
}

export function useAllTimeStats() {
  return useQuery({
    queryKey: ["admin", "all-time-stats"],
    queryFn: async () => await getAllTimeStats(),
    staleTime: 60_000,
  });
}

export function useMonthlyGoal() {
  return useQuery({
    queryKey: ["admin", "monthly-goal"],
    queryFn: async () => {
      const v = await getSettingAction("monthly_goal");
      return v ? Number(v) : 5000;
    },
  });
}

export function useSetMonthlyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goal: number) => setSettingAction("monthly_goal", String(goal)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "monthly-goal"] }),
  });
}
