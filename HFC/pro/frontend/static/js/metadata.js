export const position_order_map = {
  QB: 1,
  RB: 2,
  FB: 3,
  WR: 4,
  TE: 5,
  OT: 6,
  IOL: 7,

  EDGE: 8,
  DL: 9,
  LB: 10,
  CB: 11,
  S: 12,

  K: 13,
  P: 14,

  Offense: 101,
  Defense: 102,
  "Special Teams": 103,
};

export const position_group_map = {
  QB: "Offense",
  RB: "Offense",
  FB: "Offense",
  WR: "Offense",
  TE: "Offense",
  OT: "Offense",
  IOL: "Offense",

  EDGE: "Defense",
  DL: "Defense",
  LB: "Defense",
  CB: "Defense",
  S: "Defense",

  K: "Offense",
  P: "Defense",
};

export const world_options = [
  {
    display: "Full Modern World",
    description: "All conferences and teams as of 2022",
    database_suffix: "",
  }
];

export const class_order_map = {
  FR: 1,
  "FR (RS)": 1.5,
  SO: 2,
  "SO (RS)": 2.5,
  JR: 3,
  "JR (RS)": 3.5,
  SR: 4,
  "SR (RS)": 4.5,
};

export const classes = ["All", "SR", "JR", "SO", "FR"];
export const position_groups = ["All", "Offense", "Defense", "Special Teams"];
