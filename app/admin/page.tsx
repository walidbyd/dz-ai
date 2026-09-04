"use client";

import { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  Plus,
  Trash2,
  Edit,
  RotateCw,
  LogOut,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function AdminPage() {
  const [auth, setAuth] = useState<{ email: string; pass: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create User Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    credits: 3,
    currentPack: "PACK_3_VOICE",
  });

  // Edit User State
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Authenticate Admin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOGIN",
          email: emailInput,
          password: passInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuth({ email: emailInput, pass: passInput });
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Failed to reach server");
    }
  };

  // Fetch Users
  const loadUsers = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        headers: {
          "x-admin-email": auth.email,
          "x-admin-key": auth.pass,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth) loadUsers();
  }, [auth]);

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-email": auth.email,
        "x-admin-key": auth.pass,
      },
      body: JSON.stringify({
        action: "CREATE_USER",
        ...newUser,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setShowAddModal(false);
      setNewUser({ name: "", email: "", credits: 3, currentPack: "PACK_3_VOICE" });
      loadUsers();
    } else {
      alert(data.error);
    }
  };

  // Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !editingUser) return;

    const res = await fetch("/api/admin", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-email": auth.email,
        "x-admin-key": auth.pass,
      },
      body: JSON.stringify(editingUser),
    });
    const data = await res.json();
    if (data.success) {
      setEditingUser(null);
      loadUsers();
    } else {
      alert(data.error);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this user?")) return;
    if (!auth) return;

    const res = await fetch(`/api/admin?id=${id}`, {
      method: "DELETE",
      headers: {
        "x-admin-email": auth.email,
        "x-admin-key": auth.pass,
      },
    });
    const data = await res.json();
    if (data.success) {
      loadUsers();
    } else {
      alert(data.error);
    }
  };

  // 1. RENDER LOGIN FORM
  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-white shadow-2xl">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="font-bold text-lg">Admin Access</h1>
          </div>
          {loginError && (
            <div className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-xl">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all"
            >
              Sign In to Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. RENDER DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              DZ Studio Control Center
            </span>
            <h1 className="text-2xl font-black text-slate-900">User & Pack Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
            <button
              onClick={loadUsers}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setAuth(null)}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold">Total Accounts</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold">Total Credits in System</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {users.reduce((acc, u) => acc + (u.credits || 0), 0)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold">Total Ads Generated</span>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {users.reduce((acc, u) => acc + (u._count?.generations || 0), 0)}
            </p>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Pack</th>
                  <th className="p-4">Credits</th>
                  <th className="p-4">Ads Made</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{user.name || "No name"}</div>
                      <div className="text-slate-400 text-[11px]">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono text-[10px] font-bold">
                        {user.currentPack}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        ⚡ {user.credits}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{user._count?.generations || 0}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: ADD USER MANUALLY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-black text-slate-900">Add User Manually</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={newUser.credits}
                    onChange={(e) =>
                      setNewUser({ ...newUser, credits: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Pack
                  </label>
                  <select
                    value={newUser.currentPack}
                    onChange={(e) => setNewUser({ ...newUser, currentPack: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FREE_TRIAL">Free Trial (1)</option>
                    <option value="PACK_3_NO_VOICE">Pack 3 Showcase</option>
                    <option value="PACK_3_VOICE">Pack 3 Avatar</option>
                    <option value="PACK_10_NO_VOICE">Pack 10 Showcase</option>
                    <option value="PACK_10_VOICE">Pack 10 Avatar</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-black text-slate-900">Edit User Profile</h2>
            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Name</label>
                <input
                  type="text"
                  value={editingUser.name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={editingUser.credits}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, credits: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Pack
                  </label>
                  <select
                    value={editingUser.currentPack}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, currentPack: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                  >
                    <option value="FREE_TRIAL">Free Trial</option>
                    <option value="PACK_3_NO_VOICE">Pack 3 Showcase</option>
                    <option value="PACK_3_VOICE">Pack 3 Avatar</option>
                    <option value="PACK_10_NO_VOICE">Pack 10 Showcase</option>
                    <option value="PACK_10_VOICE">Pack 10 Avatar</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}