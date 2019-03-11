import { useRef, useEffect } from 'react'
import { addIndex, map, complement, isNil } from 'ramda'

export function usePrevious (value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export const mapIndexed = addIndex(map)

export const exist = complement(isNil)