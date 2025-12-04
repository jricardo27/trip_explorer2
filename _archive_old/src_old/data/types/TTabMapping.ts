export type TTabMappingDynamicTab = {
  key: string | number
  className?: string
  isHtml?: boolean
}

export type TTabMapping = {
  [key: string]: (string | TTabMappingDynamicTab)[]
}
