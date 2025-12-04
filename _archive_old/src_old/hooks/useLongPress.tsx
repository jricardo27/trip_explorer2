import { useRef, useCallback, useEffect } from "react"

const TOUCH_MOVE_TOLERANCE = 10 // pixels

export const useLongPress = (
  callback: (event: React.TouchEvent | React.MouseEvent) => void,
  duration: number = 500,
) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Store the latest callback in a ref to avoid re-creating event handlers
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPositionRef.current = null // Reset start position when timer is cleared
  }, [])

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      clearTimer() // Clear any existing timer

      // Store the starting position of the touch
      const touch = event.touches[0]
      startPositionRef.current = { x: touch.clientX, y: touch.clientY }

      timerRef.current = setTimeout(() => {
        // event.persist() // Not needed in React 17+ for synthetic events if accessed async, but good to be aware of.
        // For this case, we pass the original event object to the callback.
        // If callback were to access event properties asynchronously *after* this event handler finishes,
        // and if React were to recycle the event, then persisting would be needed.
        // However, we are calling the callback synchronously within the setTimeout.
        callbackRef.current(event)
        event.preventDefault() // Prevent default actions like text selection or drag-scroll
        event.stopPropagation() // Stop event from bubbling up
        startPositionRef.current = null // Reset position after long press triggered
      }, duration)
    },
    [duration, clearTimer],
  )

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!startPositionRef.current) {
        return
      }

      const touch = event.touches[0]
      const deltaX = Math.abs(touch.clientX - startPositionRef.current.x)
      const deltaY = Math.abs(touch.clientY - startPositionRef.current.y)

      if (deltaX > TOUCH_MOVE_TOLERANCE || deltaY > TOUCH_MOVE_TOLERANCE) {
        clearTimer()
      }
    },
    [clearTimer],
  )

  const handleTouchEnd = useCallback(() => {
    // Removed event: React.TouchEvent as it's not used
    clearTimer()
  }, [clearTimer])

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // Prevent the default context menu.
      event.preventDefault()
      clearTimer() // Clear any touch-based timer
      callbackRef.current(event) // Trigger callback
      event.stopPropagation()
    },
    [clearTimer, callbackRef],
  )

  // Mouse event handlers for desktop
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return // Only left click

      clearTimer()
      startPositionRef.current = { x: event.clientX, y: event.clientY }

      timerRef.current = setTimeout(() => {
        callbackRef.current(event)
        event.preventDefault()
        event.stopPropagation()
        startPositionRef.current = null
      }, duration)
    },
    [duration, clearTimer, callbackRef],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!startPositionRef.current || event.buttons !== 1) {
        // event.buttons === 1 means left button is pressed
        return
      }

      const deltaX = Math.abs(event.clientX - startPositionRef.current.x)
      const deltaY = Math.abs(event.clientY - startPositionRef.current.y)

      if (deltaX > TOUCH_MOVE_TOLERANCE || deltaY > TOUCH_MOVE_TOLERANCE) {
        clearTimer()
      }
    },
    [clearTimer],
  )

  const handleMouseUp = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  const handleMouseLeave = useCallback(() => {
    // Clear timer only if a press was potentially active and mouse left the element
    if (startPositionRef.current) {
      clearTimer()
    }
  }, [clearTimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onContextMenu: handleContextMenu,
    // Desktop mouse event handlers
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  }
}

// Example Usage (not part of the hook itself):
/*
import React from 'react';
import { useLongPress } from './useLongPress';

const MyComponent = () => {
  const onLongPress = React.useCallback((event) => {
    console.log('Long press detected!', event);
    alert('Long press!');
  }, []);

  const longPressProps = useLongPress(onLongPress, 500);

  return (
    <button {...longPressProps} style={{ width: 200, height: 200, background: 'lightblue' }}>
      Long Press Me
    </button>
  );
};
*/
