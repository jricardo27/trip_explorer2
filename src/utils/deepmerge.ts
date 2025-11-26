import { TAny } from "../data/types"

export default function deepMerge(target: Record<string, TAny>, source: Record<string, TAny>): Record<string, TAny> {
  const output = { ...target }

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] })
        else output[key] = deepMerge(target[key] as Record<string, TAny>, source[key] as Record<string, TAny>)
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}

function isObject(item: TAny) {
  return item && typeof item === "object" && !Array.isArray(item)
}
