export function Card({ interactive = false, flat = false, className = '', children, ...rest }) {
  return (
    <div
      className={[
        'card',
        interactive && 'card--interactive',
        flat && 'card--flat',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
