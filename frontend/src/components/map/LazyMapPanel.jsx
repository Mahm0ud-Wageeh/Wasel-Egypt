import { lazy, Suspense } from 'react'
import { useI18n } from '../../i18n/LanguageContext'

const DeferredMapPanel = lazy(async () => {
  const module = await import('./MapPanel')
  return { default: module.MapPanel }
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
