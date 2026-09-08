import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge, ModeDot } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Skeleton, StateBlock } from '../components/ui/Feedback'
import { Icon } from '../components/ui/Icon'
import { MapPanel } from '../components/map/MapPanel'
import {
  getActiveJourneyById,
  getJourneyDeviations,
  resumeJourney,
  generateRecoveryOptions,
  listRecoveryOptions,
  acceptRecoveryOption,
  cancelJourney,
} from '../api/activeJourneys'

export default function Deviation() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()

  const [journey, setJourney] = useState(null)
  const [deviations, setDeviations] = useState([])
  const [recoveryOptions, setRecoveryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Route params arrive as strings; normalize to a stable id for API calls.
  const activeId = paramId != null ? Number(paramId) : (journey?.id ?? null)

  const fetchDeviationData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!paramId) {
        setLoading(false)
        return
      }
      const targetId = paramId
      const [jData, devData, recData] = await Promise.all([
        getActiveJourneyById(targetId),
        getJourneyDeviations(targetId).catch(() => []),
        listRecoveryOptions(targetId).catch(() => []),
      ])
      setJourney(jData)
      const devList = Array.isArray(devData) ? devData : (devData?.data ?? [])
      setDeviations(devList)
      const recList = Array.isArray(recData) ? recData : (recData?.data ?? [])
      setRecoveryOptions(recList)
    } catch (err) {
      setError(err.message || 'Failed to load deviation details.')
    } finally {
      setLoading(false)
    }
  }, [paramId])

  useEffect(() => {
    fetchDeviationData()
  }, [fetchDeviationData])

  const latestDeviation = deviations[0] || null
  const canContinue = latestDeviation?.can_continue ?? true
  const isHighSeverity = latestDeviation?.severity === 'high'

  const handleResume = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await resumeJourney(activeId)
      setSuccess('Journey resumed on original plan!')
      setTimeout(() => {
        navigate(`/active-journeys/${activeId}`)
      }, 1200)
    } catch (err) {
      setError(err.message || 'Could not resume journey.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateOptions = async () => {
    setLoadingOptions(true)
    setError(null)
    try {
      const res = await generateRecoveryOptions(activeId, 3)
      const list = Array.isArray(res) ? res : (res?.data ?? [])
      setRecoveryOptions(list)
      if (list.length === 0) {
        setError('No recovery alternatives could be calculated from this point. You may need to cancel and re-plan.')
      }
    } catch (err) {
      setError(err.message || 'Failed to generate recovery options.')
    } finally {
      setLoadingOptions(false)
    }
  }

  const handleAcceptRecovery = async (recoveryId) => {
    setActionLoading(true)
    setError(null)
    try {
      await acceptRecoveryOption(activeId, recoveryId)
      setSuccess('New route plan accepted! Rerouting trip now...')
      setTimeout(() => {
        navigate(`/active-journeys/${activeId}`)
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to accept recovery option.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelTrip = async () => {
    if (!window.confirm('Cancel this entire journey?')) return
    setActionLoading(true)
    try {
      await cancelJourney(activeId)
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Failed to cancel journey.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell__page">
        <Skeleton height={140} />
        <Skeleton height={180} />
        <Skeleton height={100} />
      </div>
    )
  }

  return (
    <div className="app-shell__page">
      {/* Header */}
      <div className="row-between">
        <div>
          <span className="t-caption">Deviation Incident Management</span>
          <h1 className="t-h2" style={{ margin: 0, color: 'var(--e700)' }}>
            <Icon name="warning" size={18} aria-hidden="true" /> Route Deviation
          </h1>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/active-journeys/${activeId}`)}
        >
          <Icon name="arrowLeft" size={14} aria-hidden="true" /> Back to Map
        </Button>
      </div>

      {success && (
        <Alert severity="success" title="Resolved">
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" title="Notice">
          {error}
        </Alert>
      )}

      {/* Incident Summary Card */}
      <Card
        flat
        style={{
          borderLeft: '4px solid var(--e700)',
          background: 'var(--e50)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div className="row-between">
          <b style={{ fontSize: 15, color: 'var(--e700)' }}>
            {latestDeviation?.deviation_type === 'missed_stop'
              ? 'Missed Stop Event'
              : 'Off-Route Deviation'}
          </b>
          <Badge value={latestDeviation?.severity || 'medium'} />
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--ink900)', margin: 0 }}>
          {latestDeviation?.description ||
            'Your current vehicle or walking path has deviated from the planned transit schedule.'}
        </p>

        {latestDeviation?.expected_stop && (
          <div className="row" style={{ fontSize: 12.5, color: 'var(--ink700)' }}>
            <span>Expected stop:</span>
            <b>{latestDeviation.expected_stop.name}</b>
          </div>
        )}

        {/* Incident position for transparency */}
        {latestDeviation?.latitude != null && (
          <div className="t-caption" style={{ fontSize: 11.5 }}>
            Detected at {Number(latestDeviation.latitude).toFixed(4)}, {Number(latestDeviation.longitude).toFixed(4)}
            {canContinue != null ? (canContinue ? ' — you can still make the original route' : ' — reroute recommended') : ''}
          </div>
        )}

        <div className="row-between" style={{ marginTop: 4 }}>
          <span className="t-caption">
            {latestDeviation?.occurred_at
              ? new Date(latestDeviation.occurred_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now'}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: canContinue && !isHighSeverity ? 'var(--s700)' : 'var(--e700)',
            }}
          >
            {canContinue && !isHighSeverity
              ? 'Safe to resume without reroute'
              : 'Rerouting required'}
          </span>
        </div>
      </Card>

      {/* Resume Option */}
      <Card flat style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b style={{ fontSize: 14 }}>Option 1: Resume Original Route</b>
        <p className="t-caption">
          If you have returned to your designated path or made a minor detour, you can resume tracking without recalculating.
        </p>
        <Button
          variant="secondary"
          disabled={!canContinue || isHighSeverity || actionLoading}
          onClick={handleResume}
        >
          {isHighSeverity ? 'Resume Disabled (Severity High)' : 'Resume Original Plan'}
        </Button>
      </Card>

      {/* Recovery / Rerouting Section */}
      <div className="stack-sm">
        <div className="row-between">
          <div>
            <b style={{ fontSize: 14 }}>Option 2: Recovery Rerouting</b>
            <div className="t-caption">Find alternative paths from your current position</div>
          </div>
          <Button
            size="sm"
            variant="primary"
            loading={loadingOptions}
            onClick={handleGenerateOptions}
          >
            <Icon name="recover" size={15} aria-hidden="true" /> Find New Routes
          </Button>
        </div>

        {recoveryOptions.length === 0 ? (
          <Card flat>
            <StateBlock
              icon={<Icon name="recover" size={22} aria-hidden="true" />}
              title="No recovery routes loaded"
              message="Tap 'Find New Routes' to calculate alternative transit connections from your current location."
            />
          </Card>
        ) : (
          <div className="stack-sm">
            {recoveryOptions.map((opt, idx) => {
              const altJourney = opt.alternative_journey || opt.alternativeJourney || {}
              const altLegs = altJourney.legs || altJourney.journey_legs || altJourney.journeyLegs || []
              const delayMins = Math.round((opt.estimated_delay_sec || 0) / 60)

              return (
                <Card
                  key={opt.id || idx}
                  flat
                  style={{
                    border: '1.5px solid var(--p100)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div className="row-between">
                    <div className="row" style={{ gap: 6 }}>
                      <b style={{ fontSize: 14 }}>Recovery Option #{idx + 1}</b>
                      {delayMins > 0 ? (
                        <span className="badge badge--medium">+{delayMins} min delay</span>
                      ) : (
                        <span className="badge badge--verified">On time</span>
                      )}
                    </div>
                    {opt.score && <span className="t-caption">Score: {Math.round(opt.score)}</span>}
                  </div>

                  {/* Leg overview */}
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {altLegs.map((leg, legIdx) => (
                      <span key={legIdx} className="row" style={{ gap: 4 }}>
                        <ModeDot mode={leg.mode || 'bus'} />
                        <span style={{ fontSize: 12 }}>
                          {leg.mode}{' '}
                          {legIdx < altLegs.length - 1 && <Icon name="chevronRight" size={11} aria-hidden="true" style={{ verticalAlign: '-1px' }} />}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="row-between" style={{ marginTop: 4 }}>
                    <span className="t-caption">
                      {altLegs.length} legs · {Math.round((altJourney.total_duration_sec || altJourney.total_duration_seconds || 0) / 60)} min total
                      {delayMins > 0 ? ` · +${delayMins} min vs original` : ' · fastest available'}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      loading={actionLoading}
                      onClick={() => handleAcceptRecovery(opt.id)}
                    >
                      Use this route
                    </Button>
                  </div>

                  {/* Route preview: alternative mapped from the deviation point */}
                  <div style={{ marginTop: 10 }}>
                    <MapPanel
                      itinerary={{
                        legs: (altLegs.length > 0 ? altLegs : []).map((leg) => ({
                          ...leg,
                          from_lat: Number(leg.from_lat),
                          from_lng: Number(leg.from_lng),
                          to_lat: Number(leg.to_lat),
                          to_lng: Number(leg.to_lng),
                          geometry: Array.isArray(leg.geometry)
                            ? leg.geometry.map((pt) => [Number(pt[0]), Number(pt[1])])
                            : null,
                        })),
                      }}
                      userLocation={
                        latestDeviation
                          ? { lat: Number(latestDeviation.latitude), lng: Number(latestDeviation.longitude) }
                          : null
                      }
                      deviation={latestDeviation ? { lat: Number(latestDeviation.latitude), lng: Number(latestDeviation.longitude), severity: latestDeviation.severity } : null}
                      height={180}
                      showControls={false}
                    />
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Cancel trip fallback */}
      <div style={{ marginTop: 12 }}>
        <Button
          block
          variant="danger"
          loading={actionLoading}
          onClick={handleCancelTrip}
        >
          Cancel Entire Journey
        </Button>
      </div>
    </div>
  )
}
