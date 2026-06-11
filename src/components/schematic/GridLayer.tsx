interface Props {
  width: number;
  height: number;
  viewport: { x: number; y: number; zoom: number };
  gridSize: number;
}

export default function GridLayer({ width, height, viewport, gridSize }: Props) {
  const { x, y, zoom } = viewport;
  const scaledGrid = gridSize;

  // Calculate visible grid range in canvas space
  const startX = Math.floor(-x / zoom / scaledGrid) * scaledGrid;
  const startY = Math.floor(-y / zoom / scaledGrid) * scaledGrid;
  const endX = Math.ceil((width - x) / zoom / scaledGrid) * scaledGrid;
  const endY = Math.ceil((height - y) / zoom / scaledGrid) * scaledGrid;

  const gridLines: React.ReactElement[] = [];
  const dotRadius = zoom > 1 ? 0.8 : zoom > 0.5 ? 0.5 : 0;

  if (zoom > 0.3) {
    // Fine grid dots
    for (let gx = startX; gx <= endX; gx += scaledGrid) {
      for (let gy = startY; gy <= endY; gy += scaledGrid) {
        gridLines.push(
          <circle
            key={`dot-${gx}-${gy}`}
            cx={gx}
            cy={gy}
            r={dotRadius / zoom}
            fill="rgba(255,255,255,0.15)"
          />
        );
      }
    }
  }

  // Major grid lines every 5 cells
  const majorGrid = scaledGrid * 5;
  const majorStartX = Math.floor(-x / zoom / majorGrid) * majorGrid;
  const majorStartY = Math.floor(-y / zoom / majorGrid) * majorGrid;
  const majorEndX = Math.ceil((width - x) / zoom / majorGrid) * majorGrid;
  const majorEndY = Math.ceil((height - y) / zoom / majorGrid) * majorGrid;

  for (let gx = majorStartX; gx <= majorEndX; gx += majorGrid) {
    gridLines.push(
      <line
        key={`mx-${gx}`}
        x1={gx} y1={startY} x2={gx} y2={endY}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1 / zoom}
      />
    );
  }

  for (let gy = majorStartY; gy <= majorEndY; gy += majorGrid) {
    gridLines.push(
      <line
        key={`my-${gy}`}
        x1={startX} y1={gy} x2={endX} y2={gy}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={1 / zoom}
      />
    );
  }

  // Origin axes
  gridLines.push(
    <line key="ax" x1={startX} y1={0} x2={endX} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1 / zoom} />,
    <line key="ay" x1={0} y1={startY} x2={0} y2={endY} stroke="rgba(255,255,255,0.08)" strokeWidth={1 / zoom} />
  );

  return <g style={{ pointerEvents: 'none' }}>{gridLines}</g>;
}
