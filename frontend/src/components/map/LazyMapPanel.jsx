import { lazy, Suspense } from 'react'
import { useI18n } from '../../i18n/LanguageContext'

const DeferredMapPanel = lazy(async () => {
  try {
    const module = await import('./MapPanel')
    return { default: module.MapPanel }
  } catch (error) {
    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch') ||
      error?.name === 'TypeError'

    const key = 'wasel_chunk_retry_map'
    if (isChunkError && typeof window !== 'undefined') {
      const lastRetry = sessionStorage.getItem(key)
      const now = Date.now()
      if (!lastRetry || now - Number(lastRetry) > 10000) {
        sessionStorage.setItem(key, String(now))
        window.location.reload()
        return new Promise(() => {})
      }
    }
    throw error
  }
})

/** Keep the map's space reserved while its code and styles load. */
export function MapPanel(props) {
  const { t } = useI18n()
  return (
    <Suspense fallback={
      <div className="map-panel" aria-label={t('map.label')} style={{ height: props.height ?? 260, borderRadius: 'var(--r-lg)', display: 'grid', placeItems: 'center' }}>
        <span className="spinner" role="status" aria-label={t('map.loading')} />
      </div>
    }>
      <DeferredMapPanel {...props} />
    </Suspense>
  )
}
