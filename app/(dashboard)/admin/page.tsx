"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username?: string;
  isAdmin: boolean;
  isActive: boolean;
  totalStaked: number;
  totalRewards: number;
  totalTransactions: number;
  lastActiveAt?: string;
  createdAt: string;
  _count: {
    activities: number;
    userData: number;
  };
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalActivities: number;
  totalStaked: number;
  recentUsers: User[];
  topUsers: User[];
  activityStats: Array<{ action: string; count: number }>;
}

export default function AdminPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<User>;
    }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedUser(null);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedUser(null);
    },
  });

  const handleUpdateUser = (user: User, updates: Partial<User>) => {
    updateUserMutation.mutate({ id: user.id, data: updates });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage users, track activities, and monitor platform metrics
        </p>
      </div>

      {/* Stats Overview */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/10 bg-slate-900/50"
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            change={`${stats.activeUsers} active`}
          />
          <StatCard
            label="Active Users (7d)"
            value={stats.activeUsers.toLocaleString()}
            change={`${stats.adminUsers} admins`}
          />
          <StatCard
            label="Total Staked"
            value={`${stats.totalStaked.toFixed(2)} SOL`}
            change={`${stats.totalActivities} activities`}
          />
          <StatCard
            label="Total Activities"
            value={stats.totalActivities.toLocaleString()}
            change="All time"
          />
        </div>
      ) : null}

      {/* Activity Stats */}
      {stats && stats.activityStats.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Activity Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.activityStats.map((stat) => (
              <div
                key={stat.action}
                className="rounded-lg border border-white/10 bg-slate-950/50 p-3"
              >
                <p className="text-xs text-slate-400">{stat.action}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {stat.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-300/50 focus:outline-none"
          />
        </div>

        {usersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-white/10 bg-slate-950/50"
              />
            ))}
          </div>
        ) : usersData?.users?.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                    <th className="pb-3 pr-4">Wallet</th>
                    <th className="pb-3 pr-4">Username</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Staked</th>
                    <th className="pb-3 pr-4">Activities</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.users.map((user: User) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 text-sm hover:bg-white/5"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-mono text-xs text-white">
                          {user.walletAddress.slice(0, 6)}...
                          {user.walletAddress.slice(-4)}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {user.username || "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {user.email || "—"}
                      </td>
                      <td className="py-3 pr-4 text-white">
                        {user.totalStaked.toFixed(2)} SOL
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {user._count.activities}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {user.isAdmin && (
                            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                              Admin
                            </span>
                          )}
                          {user.isActive ? (
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-white transition hover:border-sky-300/50"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateUser(user, {
                                isActive: !user.isActive,
                              })
                            }
                            className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-white transition hover:border-sky-300/50"
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-300 transition hover:border-red-500/50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData.pagination && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Page {usersData.pagination.page} of{" "}
                  {usersData.pagination.totalPages} (
                  {usersData.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-white transition hover:border-sky-300/50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(usersData.pagination.totalPages, p + 1)
                      )
                    }
                    disabled={page === usersData.pagination.totalPages}
                    className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-white transition hover:border-sky-300/50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">
            No users found
          </p>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdateUser}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{change}</p>
    </div>
  );
}

function UserDetailModal({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: (user: User, updates: Partial<User>) => void;
}) {
  const [email, setEmail] = useState(user.email || "");
  const [username, setUsername] = useState(user.username || "");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSave = () => {
    onUpdate(user, { email, username, isAdmin, isActive });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">Wallet Address</label>
            <p className="mt-1 font-mono text-sm text-white">
              {user.walletAddress}
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-sky-300/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white focus:border-sky-300/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="rounded border-white/10"
              />
              <span className="text-sm text-white">Admin</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-white/10"
              />
              <span className="text-sm text-white">Active</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">Total Staked</label>
              <p className="mt-1 text-sm text-white">
                {user.totalStaked.toFixed(2)} SOL
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400">Total Rewards</label>
              <p className="mt-1 text-sm text-white">
                {user.totalRewards.toFixed(2)} SOL
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400">Activities</label>
              <p className="mt-1 text-sm text-white">
                {user._count.activities}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-400">User Data</label>
              <p className="mt-1 text-sm text-white">{user._count.userData}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white transition hover:border-sky-300/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg border border-sky-300/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/30"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

