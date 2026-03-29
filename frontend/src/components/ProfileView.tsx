import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, Loader2, ShieldCheck, Mail } from 'lucide-react';

export default function ProfileView() {
const { mongoUser, user, changePassword } = useAuth();

const [currentPass, setCurrentPass] = useState('');
const [newPass, setNewPass] = useState('');
const [confirmPass, setConfirmPass] = useState('');
const [loading, setLoading] = useState(false);
const [errorMsg, setErrorMsg] = useState('');

const [bio, setBio] = useState(mongoUser?.bio || "");
const [name, setName] = useState(mongoUser?.name || "");
const [saving, setSaving] = useState(false);
const [imagePreview, setImagePreview] = useState(mongoUser?.image || "/default.png");

const providerId = user?.providerData?.[0]?.providerId ?? 'password';
const isEmailMethod = providerId === 'password';

const handlePasswordChange = async (e) => {
e.preventDefault();
setErrorMsg('');

```
if (newPass !== confirmPass) {
  setErrorMsg("Passwords do not match");
  return;
}

setLoading(true);
try {
  await changePassword(currentPass, newPass);
  setCurrentPass('');
  setNewPass('');
  setConfirmPass('');
} catch (err) {
  setErrorMsg(err?.response?.data?.message || "Failed to update password");
}
setLoading(false);
```

};

const handleProfileUpdate = async () => {
setSaving(true);
setErrorMsg('');
try {
await axios.put("/api/auth/update-profile", { name, bio }, { withCredentials: true });
} catch (err) {
setErrorMsg("Failed to update profile");
}
setSaving(false);
};

const handleImageUpload = async (e) => {
const file = e.target.files[0];
if (!file) return;

```
setImagePreview(URL.createObjectURL(file));

const formData = new FormData();
formData.append("image", file);

try {
  await axios.post("/api/upload-profile", formData, {
    withCredentials: true,
  });
} catch (err) {
  console.error("Image upload failed", err);
  setErrorMsg("Image upload failed");
}
```

};

return <div className="flex flex-col gap-6">

```
  <div className="bg-[#111] border border-[#E50914]/30 rounded-lg p-6 flex flex-col gap-6">

    <h3 className="text-lg font-bold font-mono uppercase tracking-widest text-white border-b border-gray-800 pb-2">
      Operative Profile
    </h3>

    <div className="flex items-center gap-6">

      <div className="relative">
        <img
          src={imagePreview}
          className="w-20 h-20 rounded-full border-2 border-[#E50914] object-cover"
          alt="profile"
        />

        <label className="absolute bottom-0 right-0 bg-[#E50914] p-1 rounded-full cursor-pointer">
          📷
          <input type="file" hidden onChange={handleImageUpload} />
        </label>
      </div>

      <div className="flex flex-col gap-3 w-full">

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-black border border-gray-800 px-3 py-2 text-white font-mono uppercase tracking-widest focus:border-[#E50914]"
        />

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Mail size={14} />
          {mongoUser?.email}
        </div>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write your mission..."
          className="bg-black border border-gray-800 px-3 py-2 text-gray-300 text-sm font-mono focus:border-[#E50914]"
        />
      </div>
    </div>

    {errorMsg && (
      <div className="text-red-500 text-sm">{errorMsg}</div>
    )}

    <button
      onClick={handleProfileUpdate}
      disabled={saving}
      className="bg-[#E50914] px-6 py-3 text-white font-mono uppercase tracking-widest disabled:opacity-50"
    >
      {saving ? "Saving..." : "Update Profile"}
    </button>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

    <div className="bg-[#111] border border-gray-800 p-4 text-center">
      <p className="text-xs text-gray-500">STREAK</p>
      <p className="text-xl text-[#E50914] font-bold">{mongoUser?.streak || 0} 🔥</p>
    </div>

    <div className="bg-[#111] border border-gray-800 p-4 text-center">
      <p className="text-xs text-gray-500">LEVEL</p>
      <p className="text-xl text-white">{mongoUser?.level || 1}</p>
    </div>

    <div className="bg-[#111] border border-gray-800 p-4 text-center">
      <p className="text-xs text-gray-500">XP</p>
      <p className="text-xl text-white">{mongoUser?.xp || 0}</p>
    </div>

    <div className="bg-[#111] border border-gray-800 p-4 text-center">
      <p className="text-xs text-gray-500">STUDY TIME</p>
      <p className="text-xl text-[#45A29E]">
        {Math.floor((mongoUser?.studyTime || 0) / 3600)}h
      </p>
    </div>

  </div>

  {isEmailMethod ? (
    <form onSubmit={handlePasswordChange} className="bg-[#111] border border-gray-800 rounded-lg p-6 flex flex-col gap-4">

      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Lock size={18} className="text-[#E50914]" /> Change Password
      </h3>

      {errorMsg && (
        <div className="text-red-500 text-sm">{errorMsg}</div>
      )}

      <input
        type="password"
        placeholder="Current Password"
        value={currentPass}
        onChange={(e) => setCurrentPass(e.target.value)}
        className="bg-black p-3 border border-gray-800 text-white"
      />

      <input
        type="password"
        placeholder="New Password"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        className="bg-black p-3 border border-gray-800 text-white"
      />

      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPass}
        onChange={(e) => setConfirmPass(e.target.value)}
        className="bg-black p-3 border border-gray-800 text-white"
      />

      <button className="bg-[#E50914] p-3 text-white flex justify-center">
        {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
      </button>

    </form>
  ) : (
    <div className="bg-[#111] border border-gray-800 p-6 text-center">
      <ShieldCheck className="text-gray-500 mx-auto mb-2" />
      OAuth account — password managed externally
    </div>
  )}
<input
  type="password"
  placeholder="Confirm Password"
  value={confirmPass}
  onChange={(e) => setConfirmPass(e.target.value)}
  className="bg-black p-3 border border-gray-800 text-white"
/>
```</div>
}
