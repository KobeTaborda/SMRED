/**
 * Campos extra del formulario según el tipo de revisión. Ping no tiene campos propios.
 *
 * @typedef {object} FieldsProps
 * @property {Record<string, any>} form
 * @property {Record<string, string>} errors
 * @property {(key: string, value: any) => void} update
 */

/** @type {Partial<Record<import('../types').CheckType, (props: FieldsProps) => import('react').ReactNode>>} */
const FIELDS = {}

/** Campos del tipo de revisión elegido (nada si el tipo no tiene campos propios). @param {FieldsProps & { checkType: string }} props */
export function CheckFields({ checkType, ...props }) {
  const Fields = FIELDS[checkType]
  return Fields ? <Fields {...props} /> : null
}
