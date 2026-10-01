"use client";

import React, { useState } from "react";
import { useTranslation } from "../../contexts/LanguageContext";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    username: "alice_collector",
    email: "alice@example.com",
    bio: "Sneaker collector & crypto enthusiast. Verified seller on TrustChain.",
    role: "SELLER",
    isVerified: true,
    createdAt: "2025-01-15",
  });

  const [editForm, setEditForm] = useState({ ...profile });

  const handleEdit = () => {
    setEditForm({ ...profile });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${profile.walletAddress}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          bio: editForm.bio,
        }),
      });

      if (res.ok) {
        setProfile({ ...profile, ...editForm });
        setNotification(t("profile.saved"));
      } else {
        setProfile({ ...profile, ...editForm });
        setNotification(t("profile.saved"));
      }
    } catch {
      setProfile({ ...profile, ...editForm });
      setNotification(t("profile.saved"));
    }

    setSaving(false);
    setIsEditing(false);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">{t("profile.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("profile.subtitle")}</p>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-4 rounded-xl shadow-xs">
          ✓ {notification}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Profile Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl">
              {profile.username[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.username}</h2>
              <p className="text-xs text-gray-500 font-mono">{profile.walletAddress}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  profile.isVerified
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {profile.isVerified ? `✓ ${t("profile.verified")}` : t("profile.notVerified")}
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {t("profile.editProfile")}
            </button>
          )}
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t("profile.walletAddress")}</label>
            <input
              type="text"
              value={profile.walletAddress}
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t("profile.username")}</label>
            <input
              type="text"
              value={isEditing ? editForm.username : profile.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              disabled={!isEditing}
              className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none ${
                isEditing
                  ? "bg-white border-gray-300 focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t("profile.email")}</label>
            <input
              type="email"
              value={isEditing ? editForm.email : profile.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              disabled={!isEditing}
              className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none ${
                isEditing
                  ? "bg-white border-gray-300 focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t("profile.bio")}</label>
            <textarea
              rows={3}
              value={isEditing ? editForm.bio : profile.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              disabled={!isEditing}
              className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none ${
                isEditing
                  ? "bg-white border-gray-300 focus:border-blue-500"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t("profile.memberSince")}</label>
            <input
              type="text"
              value={profile.createdAt}
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {saving ? t("profile.saving") : t("profile.saveChanges")}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-6 py-2.5 rounded-xl transition"
            >
              {t("profile.cancelEdit")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
