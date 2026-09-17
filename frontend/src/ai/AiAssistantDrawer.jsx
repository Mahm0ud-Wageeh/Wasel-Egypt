import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function formatInline(text) {
  if (!text) return ''
  const parts = String(text).split(/(\*\*.*?\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="ai-msg__bold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function FormattedMessage({ content, isAr, navigate, setOpen }) {
  const lines = (content || '').split('\n')
  const hasRouteIntent = /المسار|الرحلة|محطة|route|journey|planner|مخطط|اتجاه/i.test(content)

  return (
    <div className="ai-msg__content">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim()
        if (!line) {
          return <div key={i} className="ai-msg__spacer" />
        }

        // Headers: ### Title or ## Title
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const headerText = line.replace(/^#+\s*/, '')
          return (
            <h4 key={i} className="ai-msg__h4">
              {formatInline(headerText)}
            </h4>
          )
        }

        // Numbered steps: 1. or 2.
        const numMatch = line.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={i} className="ai-msg__step-row">
              <span className="ai-msg__step-num">{numMatch[1]}</span>
              <span className="ai-msg__step-text">{formatInline(numMatch[2])}</span>
            </div>
          )
        }

        // Bullet items: - or *
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const itemText = line.slice(2)
          return (
            <div key={i} className="ai-msg__bullet-row">
              <span className="ai-msg__bullet-dot">•</span>
              <span className="ai-msg__bullet-text">{formatInline(itemText)}</span>
            </div>
          )
        }

        // Highlight row for emoji indicators (📍, 🎯, 🚆, 🚌, ⏱️, 💰, 💡)
        if (/^[📍🎯🚆🚌⏱️💰💡⚠️]/.test(line)) {
          return (
            <div key={i} className="ai-msg__highlight-row">
              {formatInline(line)}
            </div>
          )
        }

        return (
          <p key={i} className="ai-msg__p">
            {formatInline(line)}
          </p>
        )
      })}

      {hasRouteIntent && (
        <div className="ai-msg__actions-footer">
          <button
            type="button"
            className="ai-msg__cta-btn"
            onClick={() => {
              setOpen(false)
              navigate('/search')
            }}
          >
            <Icon name="navigation" size={14} aria-hidden="true" />
            <span>{isAr ? 'عرض مسار الرحلة على الخريطة والمخطط' : 'View Journey on Map & Planner'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function AiAssistantDrawer() {
  const navigate = useNavigate()
  const {
    open,
    setOpen,
    messages,
    sessions,
    activeSessionId,
    sending,
    status,
    send,
    clear,
    newChat,
    switchChat,
    deleteChat,
    clearAllChats,
    isRtl,
    journeyContext,
  } = useAiAssistant()
  const { t, language } = useI18n()
  const [draft, setDraft] = useState('')
  const [appliedChips, setAppliedChips] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      trackEvent('ai_opened')
    }
  }, [open])

  useEffect(() => {
    setAppliedChips([])
    setDraft('')
  }, [activeSessionId])

  // Auto-scroll to the newest message; focus the composer when opened.
  useEffect(() => {
    if (open && !showHistory) {
      listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus?.(), 250)
    }
  }, [open, messages.length, sending, showHistory])

  // Escape closes the drawer (keyboard access).
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showHistory) setShowHistory(false)
        else setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, showHistory, setOpen])

  const suggestions = journeyContext
    ? (language === 'ar'
        ? ['ما هي محطتي التالية؟', 'كم من الوقت متبقي؟', 'هل أنا على المسار الصحيح؟', 'في تحذيرات على الشبكة؟']
        : ['What is my next stop?', 'How much time is left?', 'Am I on track?', 'Any service alerts?'])
    : (language === 'ar'
        ? ['عايز اروح من المعادي للتحرير', 'ازاي اروح محطة الشهداء؟', 'تذكرة المترو بكام؟', 'في تحذيرات على الشبكة؟']
        : ['From Maadi to Tahrir', 'How to go to Shohadaa?', 'Metro ticket price?', 'Any service alerts?'])

  const onSubmit = async (e) => {
    e?.preventDefault?.()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setAppliedChips([])
    const result = await send(text)
    if (result?.applied?.length) {
      setAppliedChips(result.applied)
    }
  }

  const onSuggestion = (text) => {
    setDraft(text)
    inputRef.current?.focus?.()
  }

  if (!open) return null

  const isSimulated = status?.provider?.simulated ?? false
  const providerLabel = isSimulated
    ? t('ai.mock_note')
    : (status?.provider?.label || 'AI Model')

  const validSessions = (sessions || []).filter((s) => s.messages && s.messages.length > 0)

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
                {status?.available === false && <span className="ai-status--down">{t('ai.unavailable')}</span>}
                {status?.available && (
                  <span className={`ai-status--ok${isSimulated ? ' ai-status--simulated' : ''}`}>
                    <span className="ai-status__dot" />
                    {providerLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="ai-drawer__head-actions">
            <button
              type="button"
              className="ai-drawer__head-btn"
              onClick={() => {
                newChat()
                setShowHistory(false)
              }}
              aria-label={t('ai.new_chat')}
              title={t('ai.new_chat')}
            >
              <Icon name="plus" size={15} aria-hidden="true" />
              <span className="ai-drawer__btn-text">{t('ai.new_chat')}</span>
            </button>
            <button
              type="button"
              className={`ai-drawer__ghost-btn ${showHistory ? 'ai-drawer__ghost-btn--active' : ''}`}
              onClick={() => setShowHistory((prev) => !prev)}
              aria-label={t('ai.chat_history')}
              title={t('ai.chat_history')}
            >
              <Icon name="history" size={16} aria-hidden="true" />
              {validSessions.length > 0 && (
                <span className="ai-drawer__badge">{validSessions.length}</span>
              )}
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                className="ai-drawer__ghost-btn"
                onClick={clear}
                aria-label={t('action.clear')}
                title={t('action.clear')}
              >
                <Icon name="trash" size={16} aria-hidden="true" />
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

        {showHistory ? (
          <div className="ai-drawer__history-view">
            <div className="ai-history__head">
              <span className="ai-history__heading">{t('ai.chat_history')}</span>
              <button
                type="button"
                className="ai-history__back-btn"
                onClick={() => setShowHistory(false)}
              >
                <Icon name={isRtl ? 'arrowRight' : 'arrowLeft'} size={15} aria-hidden="true" />
                <span>{t('ai.back_to_chat')}</span>
              </button>
            </div>

            <div className="ai-history__list">
              {validSessions.length === 0 ? (
                <div className="ai-history__empty">
                  <p>{t('ai.no_history')}</p>
                  <button
                    type="button"
                    className="ai-drawer__chip"
                    onClick={() => {
                      newChat()
                      setShowHistory(false)
                    }}
                  >
                    {t('ai.new_chat')}
                  </button>
                </div>
              ) : (
                validSessions.map((s) => {
                  const isActive = s.id === activeSessionId
                  const displayTitle = s.title || t('ai.new_chat')
                  const timeStr = new Date(s.updatedAt || s.createdAt).toLocaleDateString(
                    language === 'ar' ? 'ar-EG' : 'en-US',
                    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                  )
                  const msgCountText = t('ai.messages_count').replace('{count}', s.messages.length)

                  return (
                    <div
                      key={s.id}
                      className={`ai-history-card ${isActive ? 'ai-history-card--active' : ''}`}
                      onClick={() => {
                        switchChat(s.id)
                        setShowHistory(false)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          switchChat(s.id)
                          setShowHistory(false)
                        }
                      }}
                    >
                      <div className="ai-history-card__body">
                        <div className="ai-history-card__title-row">
                          <span className="ai-history-card__title">{displayTitle}</span>
                          {isActive && (
                            <span className="ai-history-card__badge">{t('ai.active_chat')}</span>
                          )}
                        </div>
                        <div className="ai-history-card__meta">
                          <span>{timeStr}</span>
                          <span>•</span>
                          <span>{msgCountText}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ai-history-card__delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(s.id)
                        }}
                        aria-label={t('ai.delete_chat')}
                        title={t('ai.delete_chat')}
                      >
                        <Icon name="trash" size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {validSessions.length > 0 && (
              <div className="ai-history__footer">
                <button
                  type="button"
                  className="ai-history__clear-all-btn"
                  onClick={() => {
                    clearAllChats()
                    setShowHistory(false)
                  }}
                >
                  <Icon name="trash" size={14} aria-hidden="true" />
                  <span>{t('ai.clear_all')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
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
                {m.role === 'assistant' && !m.isError ? (
                  <FormattedMessage
                    content={m.content}
                    isAr={isRtl}
                    navigate={navigate}
                    setOpen={setOpen}
                  />
                ) : (
                  m.content.split('\n').map((line, i) => (
                    <span key={i} style={{ display: 'block' }}>
                      {line}
                    </span>
                  ))
                )}
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
        </>
      )}
      </aside>
    </div>
  )
}

/** Floating launcher button — rendered once at the app shell level. */
export function AiAssistantLauncher() {
  const { open, setOpen } = useAiAssistant()
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
      <span className="ai-launcher__pulse" aria-hidden="true" />
      <Icon name="botMessage" size={20} aria-hidden="true" />
      <span className="ai-launcher__label">{t('ai.launch_label')}</span>
    </button>
  )
}
