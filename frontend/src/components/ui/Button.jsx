import { forwardRef } from 'react'

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']
const SIZES = ['sm', 'md', 'lg']

/**
 * Button — approved design system §2.6.
 * variant: primary | secondary | ghost | danger
 * size: sm | md | lg · block: full width · loading: spinner replaces content
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', block = false, loading = false, disabled, children, className = '', ...rest },
  ref
) {
  const variantClass = VARIANTS.includes(variant) ? `btn--${variant}` : 'btn--primary'
  const sizeClass = SIZES.includes(size) ? `btn--${size}` : 'btn--md'
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={['btn', sizeClass, variantClass, block && 'btn--block', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
})
