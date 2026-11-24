/** The SELLIO wordmark: Poppins 800 (the only place Poppins is used), yellow dot on the I. */
export default function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-label="Sellio"
      dir="ltr"
      style={{
        fontFamily: 'var(--font-wordmark)', fontWeight: 800, fontSize: size, lineHeight: 1,
        letterSpacing: '0.01em', color: 'var(--brand)', display: 'inline-flex', alignItems: 'flex-end',
        userSelect: 'none',
      }}
    >
      <span aria-hidden>SELL</span>
      <span aria-hidden style={{ position: 'relative', display: 'inline-block' }}>
        I
        <span style={{
          position: 'absolute', left: '50%', top: '-0.16em', transform: 'translateX(-50%)',
          width: '0.3em', height: '0.3em', borderRadius: '50%', background: 'var(--brand-accent)',
        }} />
      </span>
      <span aria-hidden>O</span>
    </span>
  )
}
