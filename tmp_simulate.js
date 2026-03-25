const METRICS = {
  H_W: 120,
  H_H: 68,
  V_W: 60,
  V_H: 128, 
  GAP: 4,   
  MARGIN: 40 
};

const board = [
  {ladoA: 5, ladoB: 5},
  {ladoA: 5, ladoB: 0},
  {ladoA: 0, ladoB: 0},
  {ladoA: 0, ladoB: 1},
  {ladoA: 1, ladoB: 1},
  {ladoA: 1, ladoB: 3},
  {ladoA: 3, ladoB: 4},
];

const { H_W, H_H, V_W, V_H, GAP, MARGIN } = METRICS;

const layoutItems = [
  { type: 'drop', side: 'left', label: 'Cá' },
  ...board.map(p => ({ type: 'piece', ...p })),
  { type: 'drop', side: 'right', label: 'Lá' }
];

const positions = [];
let x = 0;
let y = 60;
let direction = 1;
let col = 0;
const maxPerRow = 6;

layoutItems.forEach((item, index) => {
  const isPiece = item.type === 'piece';
  const isDouble = isPiece && item.ladoA === item.ladoB;
  const isAtEnd = (direction === 1 && col >= maxPerRow - 1) || (direction === -1 && col <= 0);
  
  const isVerticalPiece = (isAtEnd && index < layoutItems.length - 1 && board.length > 0) || (isDouble && board.length > 0);
  const pieceWidth = isVerticalPiece ? V_W : H_W;
  
  let posX = x;
  if (direction === -1 && board.length > 0) {
      posX = x - pieceWidth;
  }

  const yOffset = (isDouble && !isAtEnd && board.length > 0) ? (H_H - V_H) / 2 : 0;
  
  positions.push({
    ...item,
    posX: posX,
    pieceWidth,
    horizontal: !isVerticalPiece
  });

  if (isAtEnd && index < layoutItems.length - 1 && board.length > 0) {
    y += V_H + GAP;
    direction *= -1;
    if (direction === -1) {
       x = posX - GAP;
    } else {
       x = posX + pieceWidth + GAP;
    }
  } else if (board.length > 0 || (board.length === 0 && index < layoutItems.length - 1)) {
    if (direction === 1) {
       x += pieceWidth + GAP;
    } else {
       x -= (pieceWidth + GAP);
    }
    col += direction;
  }
});

positions.forEach((p, i) => {
  console.log(`[${i}] ${p.type === 'drop' ? p.label : p.ladoA+'|'+p.ladoB} | posX: ${p.posX} | width: ${p.pieceWidth} | rightEdge: ${p.posX + p.pieceWidth} | horizontal: ${p.horizontal}`);
});
