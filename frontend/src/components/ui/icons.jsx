/**
 * Íconos de trazo (24×24) que heredan el color del texto (currentColor).
 * @param {{ className?: string, children: React.ReactNode }} props
 */
function Svg({ className = 'size-[18px]', children }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/** @typedef {{ className?: string }} IconProps */

/** @param {IconProps} p */ export const RefreshIcon = (p) => <Svg {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" /></Svg>
/** @param {IconProps} p */ export const EditIcon = (p) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></Svg>
/** @param {IconProps} p */ export const TrashIcon = (p) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>
/** @param {IconProps} p */ export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
/** @param {IconProps} p */ export const SearchIcon = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
/** @param {IconProps} p */ export const CheckIcon = (p) => <Svg {...p}><path d="M5 12l5 5 9-10" /></Svg>
/** @param {IconProps} p */ export const ChevronIcon = (p) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>
/** @param {IconProps} p */ export const CloseIcon = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
/** @param {IconProps} p */ export const WarnIcon = (p) => <Svg {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></Svg>
/** @param {IconProps} p */ export const LogoutIcon = (p) => <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" /></Svg>
/** @param {IconProps} p */ export const HomeIcon = (p) => <Svg {...p}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /></Svg>
/** @param {IconProps} p */ export const DeviceIcon = (p) => <Svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Svg>
/** @param {IconProps} p */ export const UsersIcon = (p) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .8 3 2.8 3 5.5" /></Svg>
/** @param {IconProps} p */ export const SunIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
/** @param {IconProps} p */ export const MoonIcon = (p) => <Svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></Svg>
/** @param {IconProps} p */ export const KeyIcon = (p) => <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></Svg>
