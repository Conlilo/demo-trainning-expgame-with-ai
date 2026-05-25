/**
 * Data definitions for the Tool section.
 *
 * Each game is a static config holding its rules text and a catalogue of
 * cards / resources. Images are intentionally absent for now — the UI shows
 * a placeholder slot for every card that we can fill in later.
 */

export type ToolCard = {
  id: string;
  name: string;
  /** Optional grouping label, e.g. "Hành động" / "Số" / "Phe Sói". */
  group?: string;
  description: string;
  // image?: string;  // provided later

  // ---- Optional fields for role-based games (Ma Sói) ----
  faction?: "Sói" | "Dân" | "Trung lập";
  /** Lower numbers wake up earlier in the night. Omit if the role has no night action. */
  nightOrder?: number;
  /** Script the GM reads aloud when this role wakes up. */
  nightInstruction?: string;
  /** True if this role acts only on the first night (e.g. Cupid). */
  onlyFirstNight?: boolean;
};

/** A numeric counter shown on the play-session screen — e.g. "Cọc rút". */
export type SessionCounter = {
  id: string;
  label: string;
  initial: number;
  min?: number;
  step?: number;
};

export type ToolGame = {
  id: string;
  name: string;
  /** Single-character icon shown in the list card. */
  icon: string;
  iconBg: string;
  shortDesc: string;
  players: string;
  duration: string;
  /** Suggested player count when starting a new session. */
  defaultPlayers: number;
  rules: string;
  cards: ToolCard[];
  sessionCounters?: SessionCounter[];
  /** Whether the "AI thực thi" mode toggle is shown for this game. Defaults to true. */
  supportsAi?: boolean;
};

export const TOOL_GAMES: ToolGame[] = [
  {
    id: "uno",
    name: "Uno",
    icon: "U",
    iconBg: "#D0021B",
    shortDesc: "Đặt bài khớp màu hoặc khớp số",
    players: "2–10 người",
    duration: "10–30 phút",
    defaultPlayers: 4,
    sessionCounters: [
      { id: "draw", label: "Cọc rút còn lại", initial: 80, min: 0 },
    ],
    rules: `MỤC TIÊU
Là người đầu tiên hết bài trên tay.

CHUẨN BỊ
• Chia mỗi người 7 lá.
• Phần còn lại làm cọc rút. Lật 1 lá lên làm cọc bỏ khởi đầu.

LƯỢT CHƠI
Đến lượt, bạn phải đặt 1 lá lên cọc bỏ. Lá đó phải khớp với lá trên cùng theo MÀU hoặc SỐ/BIỂU TƯỢNG, hoặc là 1 lá Wild (đổi màu).

Nếu không có lá nào đặt được, bạn rút 1 lá từ cọc rút. Nếu rút được lá đặt được thì có thể đặt luôn (tùy luật nhà), không thì kết thúc lượt.

LUẬT "UNO"
Khi tay còn đúng 1 lá, bạn phải hô "UNO". Nếu quên và bị bắt trước khi người chơi kế tiếp đi, bạn phải rút thêm 2 lá phạt.

KẾT THÚC
Ai hết bài đầu tiên thắng ván. Nếu chơi giải, tính điểm theo bài còn lại trên tay đối thủ.`,
    cards: [
      {
        id: "num",
        name: "Số 0–9",
        group: "Số",
        description:
          "Có 4 màu: Đỏ, Vàng, Lục, Lam. Số 0 mỗi màu 1 lá; số 1–9 mỗi màu 2 lá. Đặt khi khớp màu hoặc số với lá trên cọc bỏ.",
      },
      {
        id: "skip",
        name: "Bỏ lượt (Skip)",
        group: "Hành động",
        description:
          "Người chơi kế tiếp mất lượt. Mỗi màu có 2 lá Skip.",
      },
      {
        id: "reverse",
        name: "Đổi chiều (Reverse)",
        group: "Hành động",
        description:
          "Đảo chiều chơi. Trong ván 2 người, hoạt động như Skip. Mỗi màu có 2 lá.",
      },
      {
        id: "draw2",
        name: "Rút 2 (+2)",
        group: "Hành động",
        description:
          "Người chơi kế tiếp rút 2 lá và mất lượt. Phải đặt cùng màu hoặc đè bằng lá +2 khác. Mỗi màu có 2 lá.",
      },
      {
        id: "wild",
        name: "Đổi màu (Wild)",
        group: "Hoang dã",
        description:
          "Có thể đặt bất cứ lúc nào — người đặt chọn màu tiếp theo. Bộ bài có 4 lá.",
      },
      {
        id: "wild4",
        name: "Rút 4 đổi màu (Wild +4)",
        group: "Hoang dã",
        description:
          "Theo luật chuẩn, chỉ được đặt khi trên tay không còn lá nào khớp màu hiện tại. Người chơi kế tiếp rút 4 lá và mất lượt; người đặt chọn màu mới. Bộ bài có 4 lá.",
      },
    ],
  },
];

TOOL_GAMES.push({
  id: "masoi",
  name: "Ma Sói",
  icon: "狼",
  iconBg: "#7C2929",
  shortDesc: "Suy luận xã hội — tìm Sói trước khi bị ăn",
  players: "6–14 người",
  duration: "20–45 phút",
  defaultPlayers: 8,
  supportsAi: false,
  rules: `MỤC TIÊU
• Phe Dân: tìm và xử tử hết Sói.
• Phe Sói: ăn thịt Dân cho đến khi số Sói ngang hoặc nhiều hơn số Dân còn sống.

CHUẨN BỊ
Cần 1 người quản trò (GM) hoặc dùng chính tool này thay GM. Mỗi người chơi nhận 1 vai bí mật. Tối thiểu 6 người.

PHA ĐÊM
GM lần lượt gọi từng vai có hành động đêm theo thứ tự (Cupid → Tiên tri → Sói → Bảo vệ → Phù thủy). Mỗi người tỉnh dậy, ra hành động trong im lặng rồi nhắm mắt lại.

PHA NGÀY
• GM thông báo ai đã chết đêm qua.
• Cả làng thảo luận và bỏ phiếu. Người bị phiếu cao nhất bị treo cổ và lộ vai.

KẾT THÚC
Ván kết thúc khi:
• Sói diệt hết Dân → Phe Sói thắng.
• Dân tìm hết Sói → Phe Dân thắng.`,
  cards: [
    {
      id: "soi",
      name: "Sói",
      group: "Phe Sói",
      faction: "Sói",
      nightOrder: 30,
      nightInstruction:
        "Các Sói thức dậy. Hãy thống nhất chọn 1 người để cắn.",
      description:
        "Mỗi đêm, các Sói cùng nhau chọn 1 người để cắn. Mục tiêu: ăn cho đến khi số Sói bằng hoặc nhiều hơn số Dân còn lại.",
    },
    {
      id: "tien-tri",
      name: "Tiên tri",
      group: "Phe Dân",
      faction: "Dân",
      nightOrder: 20,
      nightInstruction:
        "Tiên tri thức dậy. Hãy chỉ vào 1 người — ta sẽ tiết lộ phe của họ.",
      description:
        "Mỗi đêm, được chỉ vào 1 người để biết người đó thuộc phe Sói hay Dân.",
    },
    {
      id: "bao-ve",
      name: "Bảo vệ",
      group: "Phe Dân",
      faction: "Dân",
      nightOrder: 40,
      nightInstruction:
        "Bảo vệ thức dậy. Hãy chỉ vào 1 người để bảo vệ đêm nay (không được bảo vệ cùng 1 người 2 đêm liên tiếp).",
      description:
        "Mỗi đêm, chọn 1 người để bảo vệ. Người được bảo vệ sẽ không chết nếu bị Sói cắn đêm đó. Không được bảo vệ cùng 1 người 2 đêm liền.",
    },
    {
      id: "phu-thuy",
      name: "Phù thủy",
      group: "Phe Dân",
      faction: "Dân",
      nightOrder: 50,
      nightInstruction:
        "Phù thủy thức dậy. Sói vừa cắn 1 người. Có dùng bình hồi sinh để cứu? Có dùng bình thuốc độc để giết ai khác?",
      description:
        "Có 1 bình hồi sinh (cứu nạn nhân bị Sói cắn đêm đó) và 1 bình thuốc độc (giết 1 người bất kỳ). Mỗi bình chỉ dùng 1 lần trong cả ván.",
    },
    {
      id: "tho-san",
      name: "Thợ săn",
      group: "Phe Dân",
      faction: "Dân",
      description:
        "Khi bị giết (Sói cắn hoặc bị treo cổ), được bắn chết 1 người bất kỳ trước khi tắt thở.",
    },
    {
      id: "cupid",
      name: "Cupid",
      group: "Phe Dân",
      faction: "Dân",
      nightOrder: 10,
      onlyFirstNight: true,
      nightInstruction:
        "Cupid thức dậy. Hãy chỉ vào 2 người để kết đôi. Họ sẽ yêu nhau và cùng sống chết.",
      description:
        "Đêm đầu tiên, chọn 2 người (có thể gồm bản thân) để kết đôi. Nếu 1 trong 2 chết, người còn lại cũng chết theo.",
    },
    {
      id: "dan",
      name: "Dân thường",
      group: "Phe Dân",
      faction: "Dân",
      description:
        "Không có khả năng đặc biệt. Vũ khí duy nhất là sự suy luận và lá phiếu.",
    },
  ],
});

export const findToolGame = (id: string): ToolGame | undefined =>
  TOOL_GAMES.find((g) => g.id === id);
