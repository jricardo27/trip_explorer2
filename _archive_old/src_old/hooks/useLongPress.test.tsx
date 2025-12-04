import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { useLongPress } from "./useLongPress"

const DEFAULT_DURATION = 500
const TOUCH_MOVE_TOLERANCE = 10 // Should match the one in useLongPress.tsx

describe("useLongPress", () => {
  let mockCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockCallback = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    mockCallback.mockClear()
  })

  // --- Touch Events ---
  describe("Touch Events", () => {
    it("should call callback after default duration on touchStart", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.TouchEvent

      act(() => {
        result.current.onTouchStart(mockEvent)
      })
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DURATION)
      })

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1)
    })

    it("should call callback after specified duration", () => {
      const duration = 1000
      const { result } = renderHook(() => useLongPress(mockCallback, duration))
      const mockEvent = {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.TouchEvent

      act(() => result.current.onTouchStart(mockEvent))
      act(() => vi.advanceTimersByTime(duration))

      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it("should cancel long press on onTouchEnd", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = { touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent

      act(() => result.current.onTouchStart(mockEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION / 2))
      act(() => result.current.onTouchEnd())
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it("should cancel long press on onTouchMove if tolerance exceeded", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const startEvent = { touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent
      const moveEvent = { touches: [{ clientX: TOUCH_MOVE_TOLERANCE + 1, clientY: 0 }] } as unknown as React.TouchEvent

      act(() => result.current.onTouchStart(startEvent))
      act(() => result.current.onTouchMove(moveEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it("should NOT cancel long press on onTouchMove if within tolerance", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const startEvent = {
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.TouchEvent
      const moveEvent = { touches: [{ clientX: TOUCH_MOVE_TOLERANCE - 1, clientY: 0 }] } as unknown as React.TouchEvent

      act(() => result.current.onTouchStart(startEvent))
      act(() => result.current.onTouchMove(moveEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(startEvent.preventDefault).toHaveBeenCalled()
      expect(startEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  // --- Mouse Events (Long Left-Click) ---
  describe("Mouse Events (Long Left-Click)", () => {
    it("should call callback on long mouse down (left-click)", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = {
        button: 0,
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent

      act(() => result.current.onMouseDown(mockEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it("should NOT call callback for non-left mouse down", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = { button: 1, clientX: 0, clientY: 0 } as unknown as React.MouseEvent // Right click

      act(() => result.current.onMouseDown(mockEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it("should cancel long press on onMouseUp", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = { button: 0, clientX: 0, clientY: 0 } as unknown as React.MouseEvent

      act(() => result.current.onMouseDown(mockEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION / 2))
      act(() => result.current.onMouseUp())
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it("should cancel long press on onMouseMove if tolerance exceeded", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const downEvent = { button: 0, clientX: 0, clientY: 0, buttons: 1 } as unknown as React.MouseEvent
      const moveEvent = { clientX: TOUCH_MOVE_TOLERANCE + 1, clientY: 0, buttons: 1 } as unknown as React.MouseEvent

      act(() => result.current.onMouseDown(downEvent))
      act(() => result.current.onMouseMove(moveEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it("should NOT cancel long press on onMouseMove if within tolerance (left button pressed)", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = {
        button: 0,
        clientX: 0,
        clientY: 0,
        buttons: 1,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent
      const moveEvent = { clientX: TOUCH_MOVE_TOLERANCE - 1, clientY: 0, buttons: 1 } as unknown as React.MouseEvent

      act(() => result.current.onMouseDown(mockEvent))
      act(() => result.current.onMouseMove(moveEvent))
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it("should NOT cancel long press on onMouseMove if left button is NOT pressed", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = {
        button: 0,
        clientX: 0,
        clientY: 0,
        buttons: 1,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent
      // Note: buttons: 0 means no button is pressed during move
      const moveEvent = { clientX: TOUCH_MOVE_TOLERANCE + 1, clientY: 0, buttons: 0 } as unknown as React.MouseEvent

      act(() => result.current.onMouseDown(mockEvent))
      act(() => result.current.onMouseMove(moveEvent)) // Timer should not be cleared
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it("should cancel long press on onMouseLeave if press was active", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = { button: 0, clientX: 0, clientY: 0 } as unknown as React.MouseEvent

      act(() => result.current.onMouseDown(mockEvent)) // Press is active
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION / 2))
      act(() => result.current.onMouseLeave())
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })

    it("should NOT cancel long press on onMouseLeave if press was not active", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))

      // No onMouseDown, so press is not active
      act(() => result.current.onMouseLeave())
      // If a timer was somehow running from a previous test (it shouldn't due to beforeEach/afterEach)
      // this ensures we don't make assumptions. The main point is onMouseLeave itself won't start one.
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))
      expect(mockCallback).not.toHaveBeenCalled()
    })
  })

  // --- Context Menu (Right-Click) ---
  describe("Context Menu (Right-Click)", () => {
    it("should call callback and preventDefault/stopPropagation on onContextMenu", () => {
      const { result } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent

      act(() => result.current.onContextMenu(mockEvent))

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1)
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1)
      // Timer should also be cleared if any was running, e.g. from a touch event
      // To test this robustly; we could start a touch timer, then right-click
      const touchStartEvent = { touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent
      act(() => result.current.onTouchStart(touchStartEvent))
      act(() => result.current.onContextMenu(mockEvent)) // This should clear the touch timer
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))
      expect(mockCallback).toHaveBeenCalledTimes(2) // Once for context menu, not again for touch
    })
  })

  // --- Cleanup ---
  describe("Cleanup", () => {
    it("should clear timer on unmount", () => {
      const { result, unmount } = renderHook(() => useLongPress(mockCallback))
      const mockEvent = { touches: [{ clientX: 0, clientY: 0 }] } as unknown as React.TouchEvent

      act(() => result.current.onTouchStart(mockEvent))
      unmount() // Trigger cleanup
      act(() => vi.advanceTimersByTime(DEFAULT_DURATION))

      expect(mockCallback).not.toHaveBeenCalled()
    })
  })
})
