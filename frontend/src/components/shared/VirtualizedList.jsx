import { useRef, useState } from "react";

export default function VirtualizedList({
  items,
  rowHeight,
  renderRow,
  onEndReached,
  overscan = 8,
  emptyState,
  height = 480,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const endReachedFiredRef = useRef(false);

  if (items.length === 0) {
    return emptyState ?? null;
  }

  const totalHeight = items.length * rowHeight;
  const visibleCount = Math.ceil(height / rowHeight);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    startIndex + visibleCount + overscan * 2,
  );

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (event) => {
    const target = event.currentTarget;

    setScrollTop(target.scrollTop);

    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceFromBottom < rowHeight * 5) {
      if (!endReachedFiredRef.current) {
        endReachedFiredRef.current = true;
        onEndReached?.();
      }
    } else {
      endReachedFiredRef.current = false;
    }
  };

  return (
    <div
      onScroll={handleScroll}
      style={{
        height,
        overflowY: "auto",
        position: "relative",
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, offset) => {
          const index = startIndex + offset;

          return (
            <div
              key={item?.id ?? index}
              style={{
                position: "absolute",
                top: index * rowHeight,
                left: 0,
                right: 0,
                height: rowHeight,
              }}
            >
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
