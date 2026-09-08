import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { getAdminUsers, deleteAdminUser } from '../api/admin'
import { getUserTrust } from '../api/reports'

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Trust score inspection state
  const [inspectingUser, setInspectingUser] = useState(null)
  const [trustData, setTrustData] = useState(null)
  const [loadingTrust, setLoadingTrust] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminUsers()
      const list = Array.isArray(res) ? res : (res?.data ?? [])
      setUsers(list)
    } catch (err) {
      setError(err.message || 'Could not load users list.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account from here.')
      return
    }
    if (!window.confirm(`Permanently remove user "${user.name}" (${user.email})?`)) return

    try {
      await deleteAdminUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      alert(err.message || 'Failed to delete user.')
    }
  }

  const handleInspectTrust = async (u) => {
    setInspectingUser(u)
    setLoadingTrust(true)
    setTrustData(null)
    try {
      const data = await getUserTrust(u.id)
      setTrustData(data)
    } catch {
      setTrustData({ score: 100, verified_reports_count: 0, rejected_reports_count: 0 })
    } finally {
      setLoadingTrust(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="app-shell__page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/admin" style={{ textDecoration: 'none', color: 'var(--p600)' }}>
              <Icon name="arrowLeft" size={14} aria-hidden="true" /> Dashboard
            </Link>
            <span style={{ color: 'var(--ink300)' }}>/</span>
            <h1 className="t-h2" style={{ color: 'var(--p900)', margin: 0 }}>
              User Directory & Roles
            </h1>
          </div>
          <p className="t-caption" style={{ marginTop: 2 }}>
            Manage registered commuter profiles, administrative roles, and trust ratings
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ maxWidth: 360 }}>
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <Alert severity="error" title="User Management Notice">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="stack">
          <Skeleton height={70} />
          <Skeleton height={70} />
          <Skeleton height={70} />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card flat>
          <StateBlock
            icon={<Icon name="users" size={22} aria-hidden="true" />}
            title="No Users Found"
            message="No user profiles match your search criteria."
          />
        </Card>
      ) : (
        <div className="stack">
          {filteredUsers.map((u) => {
            const isMe = u.id === currentUser?.id
            return (
              <Card key={u.id} flat style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: isMe ? 'var(--p600)' : 'var(--p100)',
                        color: isMe ? '#fff' : 'var(--p700)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {u.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        <b style={{ fontSize: 14 }}>{u.name}</b>
                        {isMe && <span className="badge badge--active">You</span>}
                      </div>
                      <div className="t-caption">
                        {u.email} {u.phone ? `${u.phone}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Role badges & actions */}
                  <div className="row" style={{ gap: 8 }}>
                    <div className="row" style={{ gap: 4 }}>
                      {(u.roles ?? [{ name: 'user' }]).map((role) => (
                        <span key={role.id || role.name} className="badge badge--neutral">
                          {role.name}
                        </span>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleInspectTrust(u)}
                    >
                      Trust Score
                    </Button>

                    {!isMe && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteUser(u)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Trust Score Inspector Modal */}
      {inspectingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--r-xl)',
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: 'var(--sh-lg)',
            }}
          >
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="t-h3" style={{ margin: 0 }}>
                  Reputation Profile
                </h3>
                <span className="t-caption">{inspectingUser.name}</span>
              </div>
              <button
                className="topbar__back"
                onClick={() => setInspectingUser(null)}
                aria-label="Close"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {loadingTrust ? (
              <Skeleton height={100} />
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <div
                  style={{
                    background: 'var(--s50)',
                    padding: 16,
                    borderRadius: 'var(--r-lg)',
                    textAlign: 'center',
                    border: '1px solid var(--s700)',
                  }}
                >
                  <div className="t-display t-num" style={{ color: 'var(--s700)', fontSize: 36 }}>
                    {trustData?.score ?? trustData?.trust_score ?? 100} / 100
                  </div>
                  <span className="t-caption" style={{ color: 'var(--s700)' }}>
                    Calculated Community Trust Index
                  </span>
                </div>

                <div className="stack-sm">
                  <div className="row-between">
                    <span className="t-caption">Verified Community Reports:</span>
                    <b>{trustData?.verified_reports_count ?? trustData?.verified_count ?? 0}</b>
                  </div>
                  <div className="row-between">
                    <span className="t-caption">Rejected / Flagged Reports:</span>
                    <b style={{ color: 'var(--e700)' }}>
                      {trustData?.rejected_reports_count ?? trustData?.rejected_count ?? 0}
                    </b>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Button
                block
                variant="secondary"
                onClick={() => setInspectingUser(null)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
