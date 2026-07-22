import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getProfile, updateProfile, changePassword } from '../services/user.service';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    getProfile().then((res) => {
      setProfile(res.data);
      setName(res.data.name);
    });
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true);
    try {
      await changePassword(pwForm);
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  if (!profile) return <Spinner className="mt-20" size={32} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <Card title="Account Information">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={profile.email} disabled />
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Role: <strong className="text-gray-800">{profile.role}</strong></span>
            <span>Documents: <strong className="text-gray-800">{profile.documentCount}</strong></span>
          </div>
          <Button type="submit" loading={saving}>Save changes</Button>
        </form>
      </Card>

      <Card title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            required
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
          />
          <Input
            label="New password"
            type="password"
            required
            minLength={8}
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
          />
          <Button type="submit" loading={changingPw}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
