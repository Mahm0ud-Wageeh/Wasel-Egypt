import { useId } from 'react'

/**
 * Text and select inputs with label, error and hint — approved design system §2.6.
 * Error is either a boolean (border only) or a string (border + helper).
 */
export function Field({ label, error, hint, children, id }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {typeof children === 'function' ? children(inputId) : children}
      {typeof error === 'string' && error !== '' && (
        <span className="field__error">{error}</span>
      )}
      {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
  )
}

export function TextInput({ label, error, hint, invalid, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id) => (
        <input
          id={id}
          className={['field__input', (invalid ?? error) && 'field__input--error']
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(invalid ?? error)}
          {...rest}
        />
      )}
    </Field>
  )
}

export const Input = TextInput

/** Select dropdown with field wrapper. */
export function Select({ label, error, hint, invalid, children, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id) => (
        <select
          id={id}
          className={['field__input', (invalid ?? error) && 'field__input--error']
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(invalid ?? error)}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  )
}

/** Select-like input for constrained numeric/text values (e.g. transfers). */
export function SelectInput({ label, error, hint, invalid, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id) => (
        <input
          id={id}
          className={['field__input', (invalid ?? error) && 'field__input--error']
            .filter(Boolean)
            .join(' ')}
          style={{ width: 110, flex: 'none' }}
          aria-invalid={Boolean(invalid ?? error)}
          {...rest}
        />
      )}
    </Field>
  )
}
