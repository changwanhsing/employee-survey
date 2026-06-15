export type MooncakeItem = {
  id: string;
  name: string;
  description: string;
};

export const mooncakeItems: MooncakeItem[] = [
  {
    id: "traditional",
    name: "傳統蛋黃酥",
    description: "經典蛋黃酥，外酥內綿，香氣十足。",
  },
  {
    id: "custard",
    name: "奶黃流心月餅",
    description: "奶黃餡濃郁流心，口感滑順。",
  },
  {
    id: "snow",
    name: "冰皮月餅",
    description: "低溫冰皮，清爽不膩，適合夏季。",
  },
  {
    id: "five-nuts",
    name: "五仁月餅",
    description: "傳統五仁配方，香酥具層次感。",
  },
  {
    id: "chocolate",
    name: "巧克力月餅",
    description: "濃郁巧克力內餡，甜而不膩。",
  },
];
