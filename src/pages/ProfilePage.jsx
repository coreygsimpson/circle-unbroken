import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()

  // ── Profile fields ────────────────────────────────────────
  const [form, setForm] = useState({
    full_name:    '',
    display_name: '',
    bio:          '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg,    setProfileMsg]    = useState({ type: '', text: '' })

  // ── Avatar ───────────────────────────────────────────────
  const [avatarUrl,      setAvatarUrl]      = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  // ── Password ─────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg,    setPwMsg]    = useState({ type: '', text: '' })

  // ── Load profile on mount ─────────────────────────────────
  useEffect(() => {
    if (!profile) return
    setForm({
      full_name:    profile.full_name    || '',
      display_name: profile.display_name || '',
      bio:          profile.bio          || '',
    })
    setAvatarUrl(profile.avatar_url || null)
  }, [profile])

  // ────────────────────────────────────────────────────────
  // Profile save
  // ────────────────────────────────────────────────────────
  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg({ type: '', text: '' })

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:    form.full_name.trim(),
        display_name: form.display_name.trim() || null,
        bio:          form.bio.trim() || null,
      })
      .eq('id', user.id)

    setProfileSaving(false)

    if (error) {
      setProfileMsg({ type: 'error', text: error.message })
    } else {
      setProfileMsg({ type: 'success', text: 'Profile updated.' })
      refreshProfile()
    }
  }

  // ────────────────────────────────────────────────────────
  // Avatar upload
  // ────────────────────────────────────────────────────────
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setAvatarUploading(true)

    const ext      = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${ext}`

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (error) {
      setAvatarUploading(false)
      setProfileMsg({ type: 'error', text: 'Avatar upload failed: ' + error.message })
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now() // cache bust

    // Save avatar URL to profile
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)

    setAvatarUrl(publicUrl)
    setAvatarUploading(false)
    refreshProfile()
  }

  // ────────────────────────────────────────────────────────
  // Password change
  // ────────────────────────────────────────────────────────
  async function handlePasswordSave(e) {
    e.preventDefault()
    setPwMsg({ type: '', text: '' })

    if (pwForm.next.length < 8) {
      setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwSaving(false)

    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'Password updated.' })
      setPwForm({ current: '', next: '', confirm: '' })
    }
  }

  // ────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────
  const initials = (profile?.full_name || profile?.display_name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const msgStyle = (type) => ({
    padding: '10px 14px', borderRadius: '7px', fontSize: '0.85rem',
    background: type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
    color:      type === 'error' ? 'var(--error)'    : 'var(--success)',
  })

  return (
    <div style={{ maxWidth: '560px' }}>
      <div className="page-header">
        <div>
          <h1>Your Profile</h1>
          <p className="page-subtitle">Update your name, photo, and account settings.</p>
        </div>
      </div>

      {/* ── Avatar ── */}
      <div className="form-section">
        <h2>Photo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

          {/* Avatar circle */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'var(--slate-light)',
            border: '2px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate)',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              display: 'inline-block', padding: '8px 16px',
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600,
              color: 'var(--ink)', cursor: 'pointer',
            }}>
              {avatarUploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                style={{ display: 'none' }}
              />
            </label>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>JPG, PNG or GIF · max 5 MB</span>
          </div>
        </div>
      </div>

      {/* ── Profile info ── */}
      <div className="form-section">
        <h2>Info</h2>
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <label className="study-form" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Full Name
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Display Name
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Nickname shown in notes and comments (optional)"
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 400 }}>If blank, your full name is used.</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Bio
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="A little about yourself — optional"
              rows={3}
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)', resize: 'vertical', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
            />
          </label>

          {profileMsg.text && <div style={msgStyle(profileMsg.type)}>{profileMsg.text}</div>}

          <div>
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Password ── */}
      <div className="form-section">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            New Password
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Confirm New Password
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password"
              autoComplete="new-password"
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
          </label>

          {pwMsg.text && <div style={msgStyle(pwMsg.type)}>{pwMsg.text}</div>}

          <div>
            <button type="submit" className="btn-primary" disabled={pwSaving || !pwForm.next || !pwForm.confirm}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Account info (read-only) ── */}
      <div className="form-section">
        <h2>Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Email</span>
            <span style={{ color: 'var(--ink)' }}>{user?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Role</span>
            <span style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{profile?.role}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
