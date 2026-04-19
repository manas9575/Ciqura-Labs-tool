import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Trash } from "@phosphor-icons/react";

export default function AllUsers() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isAdmin = ["admin", "super_admin"].includes(user?.role);
  const isSuperAdmin = user?.role === "super_admin";

  const loadUsers = () => {
    let url = "/users";
    if (roleFilter !== "all") {
      url += `?role=${roleFilter}`;
    }

    api.get(url)
      .then((res) => setUsers(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    await api.delete(`/users/${userId}`);
    loadUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    await api.put(`/users/${userId}/role`, { role: newRole });
    loadUsers();
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6" data-testid="all-users-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Users</h1>
        {isSuperAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Add User
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border px-3 py-2"
        >
          <option value="all">All</option>
          <option value="students">Students</option>
          <option value="faculty">Faculty</option>
          <option value="admins">Admins</option>
        </select>
      </div>

      <div className="border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Joined</th>
              {isAdmin && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.user_id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                      className="border px-2 py-1 text-xs"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                      {user?.role === "super_admin" && (
                        <option value="super_admin">Super Admin</option>
                      )}
                    </select>
                  ) : (
                    u.role
                  )}
                </td>
                <td className="px-4 py-3">{u.created_at?.slice(0, 10)}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      className="text-red-500"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-10 text-gray-500">No users found</div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <AddUserModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

// Add User Modal Component
function AddUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "student" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", formData);
      onSuccess();
    } catch (err) {
      alert("Failed to create user. Please check your permissions.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New User</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name"
            className="border p-2 w-full"
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="border p-2 w-full"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 w-full"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <select
            className="border p-2 w-full"
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}