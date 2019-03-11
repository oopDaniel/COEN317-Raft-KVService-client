import { useRef, useEffect } from 'react'
import { addIndex, map } from 'ramda'

export function usePrevious (value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export const mapIndexed = addIndex(map)