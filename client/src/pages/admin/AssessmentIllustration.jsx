export default function AssessmentIllustration({ variant = 'results' }) {
  const suffix = variant.replace(/[^a-z]/gi, '')
  return (
    <svg className={`assessment-workflow-illustration assessment-workflow-illustration--${variant}`} viewBox="0 0 300 170" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`assessment-art-paper-${suffix}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#eaf2ff" /></linearGradient>
        <linearGradient id={`assessment-art-blue-${suffix}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a9d1f4" /><stop offset="1" stopColor="#6f99cf" /></linearGradient>
        <linearGradient id={`assessment-art-lilac-${suffix}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cec3f1" /><stop offset="1" stopColor="#9d8bd7" /></linearGradient>
      </defs>
      <path d="M21 130c-13-22-2-61 19-82 24-24 56-29 93-24 43 6 88-4 123 23 28 22 27 61 3 84-30 28-212 28-238-1Z" fill="#eaf2ff" />
      {variant === 'upload' ? (
        <>
          <rect x="111" y="23" width="82" height="103" rx="11" fill={`url(#assessment-art-paper-${suffix})`} stroke="#b9ccec" strokeWidth="3" />
          <path d="M128 47h42m-42 13h48m-48 13h35" stroke="#9eb7db" strokeLinecap="round" strokeWidth="4" />
          <circle cx="132" cy="94" r="6" fill="#63aa7a" /><path d="m129 94 2 2 4-5" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M75 116V82m0 0-12 12m12-12 12 12" fill="none" stroke="#5488c7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
          <rect x="52" y="119" width="46" height="10" rx="4" fill={`url(#assessment-art-lilac-${suffix})`} />
          <path d="m206 34 17-8 18 8-18 9-17-9Z" fill="#6879b6" /><path d="M212 39v8c7 5 14 5 21 0v-8" fill="#8795c8" />
        </>
      ) : variant === 'edit' ? (
        <>
          <rect x="91" y="25" width="91" height="112" rx="12" fill={`url(#assessment-art-paper-${suffix})`} stroke="#b9ccec" strokeWidth="3" />
          <path d="M111 51h51m-51 15h42m-42 15h34" stroke="#a4bcde" strokeLinecap="round" strokeWidth="4" />
          <path d="m147 112 39-39 12 12-39 39-17 5 5-17Z" fill={`url(#assessment-art-lilac-${suffix})`} stroke="#8e7fc6" strokeLinejoin="round" strokeWidth="2" />
          <path d="m185 73 12 12" stroke="#fff" strokeWidth="2" />
          <path d="m215 40 17-8 18 8-18 9-17-9Z" fill="#6879b6" /><path d="M221 45v8c7 5 14 5 21 0v-8" fill="#8795c8" />
          <path d="M221 98h34v39h-34z" fill="#f5f8ff" stroke="#cbd9ed" strokeWidth="2" /><path d="M229 109h18m-18 8h18m-18 8h12" stroke="#9eb7db" strokeLinecap="round" strokeWidth="3" />
        </>
      ) : (
        <>
          <path d="M66 118h45v36H66z" fill={`url(#assessment-art-blue-${suffix})`} />
          <path d="M112 98h48v56h-48z" fill={`url(#assessment-art-lilac-${suffix})`} />
          <path d="M161 109h46v45h-46z" fill="#a8d5b8" />
          <path d="M66 118h45m1-20h48m1 11h46" stroke="#fff" strokeOpacity=".85" strokeWidth="3" />
          <path d="m117 63 20-9 21 9-21 10-20-10Z" fill="#6879b6" /><path d="M124 68v9c8 6 17 6 25 0v-9" fill="#8795c8" />
          <path d="m158 66 7 21" stroke="#d9ad55" strokeLinecap="round" strokeWidth="2.5" /><circle cx="165" cy="88" r="3" fill="#d9ad55" />
          <path d="m208 46 5 10 11 2-8 7 2 11-10-5-10 5 2-11-8-7 11-2 5-10Z" fill="#f0c56f" />
          <path d="M52 155h177" stroke="#b7cbea" strokeLinecap="round" strokeWidth="3" />
        </>
      )}
      <path d="m49 48 4 8 9 2-7 6 2 9-8-5-8 5 2-9-7-6 9-2 4-8Z" fill="#98b6e7" />
    </svg>
  )
}