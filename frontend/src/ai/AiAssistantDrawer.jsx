import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useAiAssistant } from './AiAssistantContext'
import { useI18n } from '../i18n/LanguageContext'
import { trackEvent } from '../utils/analytics'

/**
 * Assistant chat drawer — the visible product surface of the AI layer.
 *
 * - Opens from the floating button (AiAssistantLauncher) on any page.
 * - Shows the full conversation with loading + honest unavailable/error
 *   states; the provider badge discloses mock vs live model.
 * - Suggested prompts seed first-time users with real capabilities.
 * - Server-validated actions run automatically with each reply and are
 *   summarized as applied-action chips (transparency, not silent magic).
 * - Streaming-ready: replies render progressively if the backend later
 *   switches to streamed responses (architecture: send() resolves to a
 *   message object; UI only depends on message.content).
 */

const MAX_HEIGHT_PHONE = '78vh'

export function AiAssistantDrawer() {
  const { open, setOpen, messages, sending, status, send, clear, isRtl, journeyContext } = useAiAssistant()
  const { t, language } = useI18n()
  const [draft, setDraft] = useState('')
  const [appliedChips, setAppliedChips] = useState([])
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      trackEvent('ai_opened')
    }
  }, [open])

  // Auto-scroll to the newest message; focus the composer when opened.
  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus?.(), 250)
    }
  }, [open, messages.length, sending])

  // Escape closes the drawer (keyboard access).
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const suggestions = journeyContext
    ? (language === 'ar'
        ? ['ما هي محطتي التالية؟', 'كم من الوقت متبقي؟', 'هل أنا على المسار الصحيح؟', 'في تحذيرات على الشبكة؟']
        : ['What is my next stop?', 'How much time is left?', 'Am I on track?', 'Any service alerts?'])
    : (language === 'ar'
        ? ['من التحرير إلى الجيزة', 'اعرض الخط الأول', 'تذكرة المترو بكام؟', 'في تحذيرات على الشبكة؟']
        : ['From Tahrir to Giza', 'Show line 1', 'Metro ticket price?', 'Any service alerts?'])

  const onSubmit = async (e) => {
    e?.preventDefault?.()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setAppliedChips([])
    const result = await send(text)
    if (result?.applied?.length) {
      trackEvent('ai_action_executed', {
        actions_count: result.applied.length,
        action_names: result.applied.map((a) => a.action).join(','),
      })
      setAppliedChips(result.applied)
    }
  }

  const onSuggestion = (text) => {
    setDraft('')
    send(text).then((result) => {
      setAppliedChips(result?.applied ?? [])
    })
  }

  if (!open) return null

  const providerLabel = status?.provider?.label
  const isMock = status?.provider?.simulated

  return (
    <div className="ai-drawer__scrim" onClick={() => setOpen(false)}>
      <aside
        className={`ai-drawer${isRtl ? ' ai-drawer--rtl' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('ai.title')}
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ai-drawer__head">
          <div className="ai-drawer__head-id">
            <span className="ai-drawer__avatar" aria-hidden="true">
              <Icon name="botMessage" size={18} />
            </span>
            <div>
              <div className="ai-drawer__name">{t('ai.title')}</div>
              <div className="ai-drawer__sub">
                {status === null && <span>{t('ai.checking')}</span>}
                {status?.available === false && <span>{t('ai.unavailable')}</span>}
                {status?.available && (
                  <span>
                    {providerLabel}
                    {isMock ? ` · ${t('ai.mock_note')}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="ai-drawer__head-actions">
            {messages.length > 0 && (
              <button
                type="button"
                className="ai-drawer__ghost-btn"
                onClick={clear}
                aria-label={t('action.clear')}
                title={t('action.clear')}
              >
                <Icon name="history" size={16} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="ai-drawer__ghost-btn"
              onClick={() => setOpen(false)}
              aria-label={t('action.close')}
              title={t('action.close')}
            >
              <Icon name="close" size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="ai-drawer__list" ref={listRef}>
          {messages.length === 0 && !sending && (
            <div className="ai-drawer__empty">
              <p className="ai-drawer__empty-title">{t('ai.welcome')}</p>
              <p className="ai-drawer__empty-body">{t('ai.welcome_body')}</p>
              <div className="ai-drawer__suggestions" role="list">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="ai-drawer__chip" onClick={() => onSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`ai-msg ai-msg--${m.role}${m.isError ? ' ai-msg--error' : ''}`}>
              <div className="ai-msg__bubble">
                {m.content.split('\n').map((line, i) => (
                  <span key={i} style={{ display: 'block' }}>
                    {line}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {sending && (
            <div className="ai-msg ai-msg--assistant">
              <div className="ai-msg__bubble ai-msg__bubble--typing" aria-label={t('ai.thinking')}>
                <span /><span /><span />
              </div>
            </div>
          )}

          {appliedChips.length > 0 && (
            <div className="ai-applied" role="status">
              <Icon name="badgeCheck" size={13} aria-hidden="true" />
              <span>{t('ai.applied')}</span>
              <span className="ai-applied__chips">
                {appliedChips.map((chip) => (
                  <span key={chip} className="ai-applied__chip">{t(`ai.action_${chip}`) || chip}</span>
                ))}
              </span>
            </div>
          )}
        </div>

        <form className="ai-drawer__composer" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            className="ai-drawer__input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('ai.placeholder')}
            aria-label={t('ai.placeholder')}
            maxLength={2000}
            disabled={sending || status?.available === false}
          />
          <button
            type="submit"
            className="ai-drawer__send"
            disabled={!draft.trim() || sending}
            aria-label={t('ai.send')}
          >
            <Icon name="send" size={16} aria-hidden="true" />
          </button>
        </form>
        <div className="ai-drawer__foot" style={{ maxHeight: MAX_HEIGHT_PHONE }}>
          <span>{t('ai.disclaimer')}</span>
        </div>
      </aside>
    </div>
  )
}

/** Floating launcher button — rendered once at the app shell level. */
export function AiAssistantLauncher() {
  const { open, setOpen, status } = useAiAssistant()
  const { t } = useI18n()

  if (open) return null

  return (
    <button
      type="button"
      className="ai-launcher"
      onClick={() => setOpen(true)}
      aria-label={t('ai.launch')}
      title={t('ai.launch')}
    >
      <Icon name="botMessage" size={20} aria-hidden="true" />
      <span className="ai-launcher__label">{t('ai.launch_label')}</span>
    </button>
  )
}
