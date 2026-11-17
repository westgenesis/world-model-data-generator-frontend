interface LoginArtworkProps {
  /** 额外类名 */
  className?: string
}

/**
 * 登录页右侧插画：道路、自车、传感器覆盖范围与城市轮廓，呼应世界模型数据生成场景。
 * @param props.className - 额外类名
 */
export const LoginArtwork = ({ className }: LoginArtworkProps) => (
  <svg viewBox="0 0 520 250" fill="none" aria-hidden className={className}>
    {/* 云层 */}
    <g fill="#fff" opacity=".5">
      <ellipse cx="84" cy="46" rx="20" ry="9" />
      <ellipse cx="104" cy="40" rx="15" ry="8" />
      <ellipse cx="70" cy="41" rx="12" ry="7" />
      <ellipse cx="438" cy="72" rx="16" ry="7" />
      <ellipse cx="452" cy="67" rx="11" ry="6" />
    </g>

    {/* 远山与城市天际线 */}
    <g fill="#002c66" opacity=".3">
      <path d="M0 196c58-22 118-26 176-8 60 18 120 22 184 8 58-12 108-10 160 6v58H0v-64Z" />
      <rect x="18" y="176" width="12" height="42" rx="2" />
      <rect x="36" y="160" width="16" height="58" rx="2" />
      <rect x="58" y="184" width="10" height="34" rx="2" />
      <rect x="74" y="170" width="14" height="48" rx="2" />
    </g>

    {/* 地面 */}
    <path d="M0 212c96-16 188-18 270-6 78 11 158 14 250 2v42H0v-38Z" fill="#00357a" opacity=".4" />
    <path
      d="M0 228c104-14 200-14 288-2 76 10 152 12 232 2v22H0v-22Z"
      fill="#002555"
      opacity=".45"
    />

    {/* 道路 */}
    <path
      d="M-20 250c86-34 196-46 294-34 84 10 166 28 266 52v20H-20v-38Z"
      fill="#fff"
      opacity=".08"
    />
    <path
      d="M-20 250c86-34 196-46 294-34 84 10 166 28 266 52"
      stroke="#fff"
      strokeOpacity=".28"
      strokeWidth="2"
      strokeDasharray="18 14"
    />

    {/* 树木 */}
    <g fill="#00306f" opacity=".5">
      <path d="M406 210c0-13 9-24 18-24s18 11 18 24h-36Z" />
      <rect x="421" y="204" width="4" height="18" rx="2" />
      <path d="M452 218c0-9 7-17 14-17s14 8 14 17h-28Z" />
      <rect x="463" y="213" width="4" height="14" rx="2" />
    </g>

    {/* 自车与传感器覆盖 */}
    <g transform="translate(276 144)">
      <ellipse cx="72" cy="72" rx="66" ry="8" fill="#00255a" opacity=".35" />
      <g stroke="#fff" strokeLinecap="round" strokeDasharray="4 8">
        <path d="M38 46a34 34 0 0 1 68 0" strokeOpacity=".55" strokeWidth="1.6" />
        <path d="M22 46a50 50 0 0 1 100 0" strokeOpacity=".4" strokeWidth="1.4" />
        <path d="M6 46a66 66 0 0 1 132 0" strokeOpacity=".25" strokeWidth="1.2" />
      </g>
      <circle cx="72" cy="46" r="3" fill="#fff" opacity=".85" />
      <path d="M54 58c2-11 9-17 18-17s16 6 18 17H54Z" fill="#d9f1ff" />
      <rect x="24" y="56" width="96" height="22" rx="10" fill="#fff" />
      <path d="M57 56c2-6 7-9 13-9h4v9H57Z" fill="#0a5aa8" opacity=".5" />
      <path d="M78 47h4c6 0 11 3 13 9H78v-9Z" fill="#0a5aa8" opacity=".4" />
      <circle cx="45" cy="79" r="9" fill="#062c5b" />
      <circle cx="45" cy="79" r="3.5" fill="#b9e2ff" />
      <circle cx="99" cy="79" r="9" fill="#062c5b" />
      <circle cx="99" cy="79" r="3.5" fill="#b9e2ff" />
    </g>

    {/* 传感器数据点 */}
    <g fill="#fff" opacity=".5">
      <circle cx="196" cy="120" r="2" />
      <circle cx="212" cy="104" r="1.5" />
      <circle cx="182" cy="100" r="1.5" />
      <path d="M196 120l16-16M196 120l-14-20" stroke="#fff" strokeOpacity=".25" strokeWidth="1" />
    </g>
  </svg>
)
