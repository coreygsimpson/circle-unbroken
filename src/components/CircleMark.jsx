export default function CircleMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="20" cy="20" r="17" stroke="#2c5f8a" strokeWidth="2.5" />
      {/* Inner ring */}
      <circle cx="20" cy="20" r="11.5" stroke="#b59040" strokeWidth="1.25" />
      {/* Cross */}
      <line x1="20" y1="12" x2="20" y2="28" stroke="#b59040" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="13" y1="20" x2="27" y2="20" stroke="#b59040" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
