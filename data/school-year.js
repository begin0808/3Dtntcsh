// 國立南大附中 3D 校園導覽 — 每學年更新資料
//
// 換學年時只需修改這個檔案：
//   1. academicYear：學年度 (頁首與版權說明會自動顯示)
//   2. welcomeBannerText：校門口電子看板第三行文字
//   3. buildings：各建築的名稱、介紹、特色標籤與各樓層空間配置
//      (選填 navLabel：導航起點／終點選單顯示的名稱，未填則使用 name)
//
// 各樓層空間 (floorsData) 填寫方式：
//   - 每一層是一個陣列，依建築走向排列：東西向建築由「西 → 東」，南北向建築由「北 → 南」
//     (每棟第一行的註解會標示該棟的排列方向)
//   - 每個空間：{ code: "代碼或班級", name: "顯示名稱", type: "類型" }
//     type：class1 高一班級、class2 高二班級、class3 高三班級、office 辦公室、
//           special 專科／特殊教室、lab 實驗室、sport 運動場地、common 公共空間、
//           stair 樓梯、wc 廁所
//   - code 在同一棟同一層內不可重複；搜尋班級 (例如 315) 會比對 code 與 name
//
// 建築的位置、大小、外觀與道路請改 data/campus-data.js，不在這個檔案。

window.SCHOOL_YEAR_DATA = {
  academicYear: "115",

  welcomeBannerText: "115 學年度升學繁星成果輝煌",

  buildings: {
    main_gate: { // 東西向：各樓層由西 → 東排列
      name: "校門口與警衛室",
      summary: "國立南大附中正門地標（中山南路948號）。門口右側為深褐疊石題字石塔（直書金色「國立臺南大學附屬高級中學」）與漸降造型景觀牆（藍色立體校名大字「國立 臺南大學附中」與圓形月門穿透孔）；門口左側為單層警衛室，屋頂架設大型戶外全彩電子看板（LED 電視牆巨幕）；中央為安全島、黃黑警示防撞柱與伸縮大門。",
      features: ["門口右側：造型景觀牆（孔雀石藍綠立體校名大字＋圓形月門孔）與疊石門柱", "門口左側：大型戶外 LED 電子看板（巨幕電視牆）與下方警衛室（綠白遮陽棚）", "中央出入：車道安全島、黃黑反光警示防撞柱與紅色電動伸縮門"],
      floorsData: {
        1: [
          { code: "GATE", name: "校門警衛室", type: "office" },
          { code: "ENTR", name: "正門出入雙車道", type: "common" }
        ]
      }
    },

    admin: { // 東西向：各樓層由西 → 東排列
      name: "行政大樓",
      summary: "全校行政中樞。中央與東側弧形梯塔為 4 層高、左右兩翼為 3 層，外牆貼象牙白細磁磚，東端設有幾何圓形浮雕之半圓弧形樓梯塔。空間配置由西端（靠近中央大道）至東端（靠近學生車棚）排列。",
      features: ["中央 4 層垂直細窗主體", "1F 懸挑迎賓門廊", "東側幾何浮雕半圓弧形梯塔"],
      // 由西側 (-X, 靠近中央大道) 至東側 (+X, 靠近學生車棚) 排列
      // 已修正：總務處與主計室中間無樓梯、二樓校長室與會議室一中間無樓梯
      floorsData: {
        1: [
          { code: "ADM5", name: "人事室", type: "office" },
          { code: "ADM4", name: "主計室", type: "office" },
          { code: "ADM3", name: "總務處", type: "office" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "ADM2", name: "關懷室", type: "office" },
          { code: "ADM1", name: "實習處", type: "office" },
          { code: "WC", name: "廁所", type: "wc" }
        ],
        2: [
          { code: "ADM9", name: "會議室一", type: "special" },
          { code: "ADM8", name: "校長室", type: "office" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "ADM7", name: "個諮室", type: "office" },
          { code: "ADM6", name: "校史室", type: "special" },
          { code: "WC", name: "廁所", type: "wc" }
        ],
        3: [
          { code: "ADM13", name: "多媒體教室", type: "special" },
          { code: "ADM12", name: "攝影棚", type: "special" },
          { code: "ADM11", name: "學籍室", type: "office" },
          { code: "ADM14", name: "機房", type: "office" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "ADM10", name: "視聽教室", type: "special" },
          { code: "WC", name: "廁所", type: "wc" }
        ]
      }
    },

    jingye: { // 東西向：各樓層由西 → 東排列
      name: "敬業樓",
      summary: "位於行政大樓西側對稱位置，包含教務處、K書中心、教師辦公室與三間電腦教室。由西端（靠近西側主幹道／操場）至東端（靠近中央大道）排列。",
      features: ["1F 中央穿廊與教務處", "2F 白色防墜格柵外露樓梯", "3F 電腦教室群與頂棚"],
      // 由西側 (-X, 靠近操場側) 至東側 (+X, 靠近中央大道側) 排列
      floorsData: {
        1: [
          { code: "ST2", name: "樓梯", type: "stair" },
          { code: "WC", name: "廁所", type: "wc" },
          { code: "JY3", name: "K書中心", type: "special" },
          { code: "JY2", name: "油印室", type: "office" },
          { code: "JY1", name: "教務處", type: "office" },
          { code: "ST", name: "樓梯", type: "stair" }
        ],
        2: [
          { code: "ST2", name: "樓梯", type: "stair" },
          { code: "WC", name: "廁所", type: "wc" },
          { code: "JY6", name: "會議室", type: "special" },
          { code: "JY5", name: "教師辦公室2", type: "office" },
          { code: "JY4", name: "教師辦公室1", type: "office" },
          { code: "ST", name: "樓梯", type: "stair" }
        ],
        3: [
          { code: "ST2", name: "樓梯", type: "stair" },
          { code: "WC", name: "廁所", type: "wc" },
          { code: "JY10", name: "教師辦公室3", type: "office" },
          { code: "JY9", name: "電腦教室三", type: "lab" },
          { code: "JY8", name: "電腦教室二", type: "lab" },
          { code: "JY7", name: "電腦教室一", type: "lab" },
          { code: "ST", name: "樓梯", type: "stair" }
        ]
      }
    },

    activity: { // 東西向：各樓層由西 → 東排列
      name: "活動中心",
      summary: "全校大型集會、典禮與室內體育館。南向正門有灰色垂直高塔（嵌校徽）與 4 道大型斜撐托架；東側有一整排 A 字型水泥斜撐柱與橘、黃、綠、藍彩虹橫樑。",
      features: ["南側校徽高塔與 4 道斜撐托架", "東側 A 字斜撐柱列與彩虹橫樑", "挑高大跨度集會與運動場館"],
      floorsData: {
        1: [{ code: "ACT1", name: "活動中心一樓廣場／穿堂", type: "common" }],
        2: [{ code: "ACT2", name: "大禮堂／室內綜合球場", type: "sport" }]
      }
    },

    west_shed: { // 東西向：各樓層由西 → 東排列
      name: "車棚（西北側）",
      summary: "位於活動中心北側、校門西側之單層停車棚。",
      features: ["深灰斜頂開放式車棚"],
      floorsData: { 1: [{ code: "PK1", name: "教職員與來賓車棚", type: "common" }] }
    },

    student_shed: { // 南北向：各樓層由北 → 南排列
      name: "學生車棚",
      summary: "位於東側南北向主幹道東側、餐飲館西側與北側之 L 型開放式學生單車／機車棚，採用薄荷綠波浪頂棚與波浪滾邊屋簷。",
      features: ["薄荷綠波浪頂棚", "位於道路東側不擋車道之 L 型停車棚區"],
      floorsData: { 1: [{ code: "PK2", name: "學生單車／機車停放區", type: "common" }] }
    },

    legeng: { // 東西向：各樓層由西 → 東排列
      name: "樂耕樓",
      summary: "中庭教學區北棟（3 層樓），西端 1、2 樓與利用樓 1、2 樓直接連通（可從樂耕樓二樓 315 教室直接轉彎走進利用樓二樓 215 教室）。從大門進來面對樂耕樓，右側（西端，連接利用樓）二樓第一間為 315 教室，往左（東端，靠近厚生樓）依序至 310 教室；1 樓為輔導處、資源教室（西側）與學務處、校安中心（東側）；3 樓為數學、社會、護理、社群與自然科專科教室。",
      features: ["西端 1–2F 與利用樓 1–2F 轉角連通（315 班直通 215 班）", "北向圓角凸出門廊與圓環花圃", "南向中庭雙座全高冷灰塔樓"],
      // 由西側 (-X, 連接利用樓，即大門進來面對樂耕樓的右方) 至東側 (+X, 靠近厚生樓，即左方) 排列
      floorsData: {
        1: [
          { code: "LG8", name: "團體諮商室", type: "office" },
          { code: "LG7", name: "個諮室", type: "office" },
          { code: "LG6", name: "資源教室", type: "special" },
          { code: "LG5", name: "輔導處", type: "office" },
          { code: "ST2", name: "樓梯", type: "stair" },
          { code: "LG4", name: "玄關穿堂", type: "common" },
          { code: "ST1", name: "樓梯", type: "stair" },
          { code: "LG3", name: "學務處", type: "office" },
          { code: "LG2", name: "校安中心", type: "office" },
          { code: "LG1", name: "自學討論室(二)", type: "special" }
        ],
        2: [
          { code: "315", name: "315 教室", type: "class3" },
          { code: "314", name: "314 教室", type: "class3" },
          { code: "311", name: "311 教室", type: "class3" },
          { code: "LG11", name: "學生會", type: "special" },
          { code: "LG10", name: "創思空間", type: "special" },
          { code: "LG9", name: "自學討論室(三)", type: "special" },
          { code: "313", name: "313 教室", type: "class3" },
          { code: "312", name: "312 教室", type: "class3" },
          { code: "310", name: "310 教室", type: "class3" }
        ],
        3: [
          { code: "LG18", name: "數學科教室", type: "special" },
          { code: "WC", name: "女廁", type: "wc" },
          { code: "LG17", name: "社會科教室", type: "special" },
          { code: "LG16", name: "教官室", type: "office" },
          { code: "LG15", name: "護理教室", type: "special" },
          { code: "LG14", name: "器材室", type: "office" },
          { code: "LG13", name: "社群教室", type: "special" },
          { code: "LG12", name: "自然科教室", type: "lab" }
        ]
      }
    },

    liyong: { // 南北向：各樓層由北 → 南排列
      name: "利用樓",
      summary: "中庭教學區西棟（2 層樓），北端 1、2 樓與樂耕樓直接連通（215 教室轉個彎即達樂耕樓 315 教室），南端 1、2 樓亦與正德樓 1、2 樓直接連通。具鮮明的蘋果綠走廊腰帶與 2 樓幾何梯形鏤空女兒牆。由北端往南端依序為：1 樓女廁、健康中心、115 班至 111 班、自學討論室(一)；2 樓為男廁、215 班至 210 班。",
      features: ["北端 1–2F 連通樂耕樓、南端 1–2F 連通正德樓", "鮮明蘋果綠走廊腰帶 #689F4E", "北端 1F 為健康中心與 115 班、2F 為 215 班"],
      // 由北端 (-Z, 連接樂耕樓) 至南端 (+Z, 連接正德樓) 排列
      floorsData: {
        1: [
          { code: "WC", name: "女廁／樓梯", type: "wc" },
          { code: "LY2", name: "健康中心", type: "office" },
          { code: "115", name: "115 教室", type: "class1" },
          { code: "114", name: "114 教室", type: "class1" },
          { code: "113", name: "113 教室", type: "class1" },
          { code: "ST2", name: "樓梯／女廁", type: "stair" },
          { code: "112", name: "112 教室", type: "class1" },
          { code: "111", name: "111 教室", type: "class1" },
          { code: "LY1", name: "自學討論室(一)", type: "special" },
          { code: "ST1", name: "樓梯／男廁", type: "stair" }
        ],
        2: [
          { code: "WC", name: "男廁／樓梯", type: "wc" },
          { code: "215", name: "215 教室", type: "class2" },
          { code: "214", name: "214 教室", type: "class2" },
          { code: "213", name: "213 教室", type: "class2" },
          { code: "212", name: "212 教室", type: "class2" },
          { code: "LY3", name: "儲藏室", type: "office" },
          { code: "211", name: "211 教室", type: "class2" },
          { code: "210", name: "210 教室", type: "class2" },
          { code: "ST1", name: "女廁／樓梯", type: "stair" }
        ]
      }
    },

    zhengde: { // 東西向：各樓層由西 → 東排列
      name: "正德樓",
      summary: "中庭教學區南棟（3 層樓），西端 1、2 樓與利用樓 1、2 樓直接連通。從大門方向面對正德樓，右邊（西端，連接利用樓）2 樓第一間教室為 105 班，往左（東端，靠近厚生樓）依序為 106–110 及 207–209 班；1 樓西側為享學空間、進修部辦公室、307、101，東側為 102–104 與哺乳室；3 樓西側為 203–206、303，東側為 304–305、308–309。",
      features: ["西端 1–2F 與利用樓 1–2F 轉角直接連通", "從大門面對二樓最右側為 105 班、最左側為 209 班", "1F 中央南北向大穿堂"],
      // 由西側 (-X, 連接利用樓，即從大門面對正德樓的右邊) 至東側 (+X, 靠近厚生樓，即左邊) 排列
      floorsData: {
        1: [
          { code: "WC2", name: "樓梯", type: "stair" },
          { code: "ZD3", name: "享學空間(資源教室)", type: "special" },
          { code: "ZD2", name: "進修部辦公室", type: "office" },
          { code: "307", name: "307 教室", type: "class3" },
          { code: "101", name: "101 教室", type: "class1" },
          { code: "ST2", name: "中央穿堂／樓梯", type: "stair" },
          { code: "102", name: "102 教室", type: "class1" },
          { code: "103", name: "103 教室", type: "class1" },
          { code: "104", name: "104 教室", type: "class1" },
          { code: "ZD1", name: "哺乳室", type: "office" },
          { code: "WC1", name: "女廁／男廁", type: "wc" },
          { code: "ST1", name: "樓梯", type: "stair" }
        ],
        2: [
          { code: "WC2", name: "女廁", type: "wc" },
          { code: "105", name: "105 教室", type: "class1" },
          { code: "106", name: "106 教室", type: "class1" },
          { code: "107", name: "107 教室", type: "class1" },
          { code: "108", name: "108 教室", type: "class1" },
          { code: "109", name: "109 教室", type: "class1" },
          { code: "ST2", name: "樓梯", type: "stair" },
          { code: "110", name: "110 教室", type: "class1" },
          { code: "207", name: "207 教室", type: "class2" },
          { code: "208", name: "208 教室", type: "class2" },
          { code: "209", name: "209 教室", type: "class2" },
          { code: "WC1", name: "女廁／男廁", type: "wc" }
        ],
        3: [
          { code: "WC2", name: "女廁", type: "wc" },
          { code: "203", name: "203 教室", type: "class2" },
          { code: "204", name: "204 教室", type: "class2" },
          { code: "205", name: "205 教室", type: "class2" },
          { code: "206", name: "206 教室", type: "class2" },
          { code: "303", name: "303 教室", type: "class3" },
          { code: "ST2", name: "樓梯", type: "stair" },
          { code: "304", name: "304 教室", type: "class3" },
          { code: "305", name: "305 教室", type: "class3" },
          { code: "308", name: "308 教室", type: "class3" },
          { code: "309", name: "309 教室", type: "class3" },
          { code: "WC1", name: "女廁／男廁", type: "wc" }
        ]
      }
    },

    housheng: { // 南北向：各樓層由北 → 南排列
      name: "厚生樓",
      summary: "中庭教學區東棟（4 層樓新建大樓）。為新建空間，目前暫無班級進駐。外觀採紅磚垂直壁柱搭配 1–3 樓圓弧拱窗，4 樓頂部設有一整排半圓形鏤空拱廊，中庭側有兩座對稱藍色波浪飾板入口門廊。",
      features: ["新建空間（暫無班級）", "紅磚垂直壁柱與 4F 連續半圓形鏤空拱廊", "雙座對稱中庭入口門廊"],
      floorsData: {
        1: [{ code: "HS1", name: "新建空間（暫無班級）", type: "common" }],
        2: [{ code: "HS2", name: "新建空間（暫無班級）", type: "common" }],
        3: [{ code: "HS3", name: "新建空間（暫無班級）", type: "common" }],
        4: [{ code: "HS4", name: "四樓半圓拱廊層（新建空間・暫無班級）", type: "common" }]
      }
    },

    library: { // 南北向：各樓層由北 → 南排列
      name: "圖書館大樓（含資訊應用學程）",
      navLabel: "圖書館（圖書館大樓 2F）",
      summary: "綜合圖書與資訊大樓（3 層樓）：1 樓設有大會議室與一間教室；2 樓為全校圖書館；3 樓為「資訊應用學程」專科教室區。西向 3 樓有深遮陽柱廊，北側門設有「資訊學程」專屬入口與方框凸窗。",
      features: ["1F 大會議室與一間教室", "2F 圖書館閱覽空間", "3F 資訊應用學程（北側專屬入口）"],
      floorsData: {
        1: [
          { code: "LIB1", name: "大會議室", type: "special" },
          { code: "LIB2", name: "一樓教室", type: "special" }
        ],
        2: [
          { code: "LIB3", name: "圖書館閱覽室＆書庫", type: "special" },
          { code: "LIB4", name: "數位學習與自習區", type: "special" }
        ],
        3: [
          { code: "IT1", name: "資訊應用學程專科教室", type: "lab" },
          { code: "IT2", name: "資訊實習電腦教室", type: "lab" },
          { code: "IT3", name: "資訊學程辦公室", type: "office" }
        ]
      }
    },

    old_art: { // 南北向：各樓層由北 → 南排列
      name: "原美術教室（日式斜頂平房）",
      summary: "位於圖書館西側前方的日式斜屋頂歷史感平房（原為舊美術教室，目前用途待確認），西側邊緣與北方烹飪教室左側對齊，覆深灰日本瓦，西向中央設有木造山牆式玄關門廊。",
      features: ["日式深灰文化瓦四坡斜屋頂（正南北向對齊）", "西側與烹飪教室左側對齊", "傳統山牆式木色玄關門廊"],
      floorsData: {
        1: [{ code: "OART", name: "原美術教室（目前用途待確認）", type: "special" }]
      }
    },

    catering: { // 東西向：各樓層由西 → 東排列
      name: "餐飲館",
      summary: "牆題「餐飲科館」，3 層樓現代建築。最顯著特徵為左右兩端對稱的全高「雙圓柱形角樓」，正門口前方有垂直車道將南側林木綠地分為左右兩區。",
      features: ["左右對稱雙圓柱形角樓", "餐飲技術學程實習空間", "正門口前方道路與左右雙綠地"],
      floorsData: {
        1: [{ code: "CAT1", name: "餐飲技術學程一樓實習空間", type: "lab" }],
        2: [{ code: "CAT2", name: "餐飲館二樓專業實習教室", type: "lab" }],
        3: [{ code: "CAT3", name: "餐飲館三樓專科教室", type: "lab" }]
      }
    },

    cooking: { // 東西向：各樓層由西 → 東排列
      name: "烹飪教室",
      summary: "位於樂揚樓西側的 3 層樓建築（兩棟大樓相鄰靠近但未連通，中間無車道），具有淺粉橘色長條陽台女兒牆、兩端外露水泥樓梯，以及頂樓深灰色斜頂鐵皮屋頂。",
      features: ["2–3F 淺粉橘色長廊陽台", "頂層深灰斜屋頂棚架", "與樂揚樓相鄰靠近（中間無道路）"],
      floorsData: {
        1: [{ code: "CK1", name: "中餐烹飪實習教室", type: "lab" }],
        2: [{ code: "CK2", name: "烹飪專科教室（二樓）", type: "lab" }],
        3: [{ code: "CK3", name: "烹飪專科空間（三樓）", type: "lab" }]
      }
    },

    yueyang: { // 南北向：各樓層由北 → 南排列
      name: "樂揚樓",
      summary: "3 層樓音樂與藝術教學大樓。白牆搭配天藍色結構外框，北面與南面正中央皆設有醒目的「雙層樓高天藍色大圓拱門廊」與音符造型「樂揚樓」招牌字體。",
      features: ["北向與南向雙面天藍色大圓拱門廊", "音符造型「樂揚樓」字體", "西南側圓弧轉角造型"],
      floorsData: {
        1: [{ code: "YY1", name: "樂揚樓一樓音樂／藝文空間", type: "special" }],
        2: [{ code: "YY2", name: "樂揚樓二樓合奏／練習室", type: "special" }],
        3: [{ code: "YY3", name: "樂揚樓三樓展演教室", type: "special" }]
      }
    },

    recycling: { // 南北向：各樓層由北 → 南排列
      name: "資源室",
      summary: "東側車道旁 1 樓 5 開間水泥建築，負責全校資源回收與環保分類作業。",
      features: ["5 開間水泥平房與雙鐵捲門", "附設資源回收分類櫃"],
      floorsData: { 1: [{ code: "RC1", name: "全校資源回收與分類室", type: "common" }] }
    },

    food_proc: { // 南北向：各樓層由北 → 南排列
      name: "食品加工館",
      summary: "食品加工學程核心館舍（中央 3 層、左右角塔 4 層）。外牆為溫暖的鮭魚橘紅磚，兩側 4 層高角樓有圓拱頂垂直凹槽，1 樓設圓柱凸出門廊。",
      features: ["左右雙座 4 層圓拱凹槽角樓", "2–3F 階梯狀方型凸出花台", "食品加工學程專業實習空間"],
      floorsData: {
        1: [{ code: "FP1", name: "食品加工學程一樓實習工場／辦公室", type: "lab" }],
        2: [{ code: "FP2", name: "食品檢驗與分析實驗室", type: "lab" }],
        3: [{ code: "FP3", name: "食品加工三樓專科教室", type: "lab" }]
      }
    },

    factory: { // 南北向：各樓層由北 → 南排列
      name: "加工工廠",
      summary: "與食品加工館並排之 2 層樓實習工廠，素水泥灰立面搭配二樓開放長廊與深灰色鐵皮斜屋頂。",
      features: ["2F 開放式走廊與外露樓梯", "深灰鐵皮斜屋頂"],
      floorsData: {
        1: [{ code: "FAC1", name: "食品加工實習工廠（一樓）", type: "lab" }],
        2: [{ code: "FAC2", name: "加工實習空間（二樓）", type: "lab" }]
      }
    },

    book_depot: { // 南北向：各樓層由北 → 南排列
      name: "書庫（原學生宿舍）",
      summary: "4 層樓白牆綠線條現代建築（平面圖舊標示為學生宿舍，現已改為書庫）。左側樓梯間有一排別緻的「圓形舷窗」，4 樓為白色欄杆陽台，西側前方有優美的筆直樹林步道。",
      features: ["純白外牆配萊姆綠水平線條", "左側垂直排列圓形舷窗", "西側筆直樹林步道"],
      floorsData: {
        1: [{ code: "BK1", name: "書庫一樓典藏區", type: "office" }],
        2: [{ code: "BK2", name: "書庫二樓教材區", type: "office" }],
        3: [{ code: "BK3", name: "書庫三樓檔案區", type: "office" }],
        4: [{ code: "BK4", name: "書庫四樓儲藏區", type: "office" }]
      }
    },

    mechanical: { // 南北向：各樓層由北 → 南排列
      name: "機械館",
      summary: "4 層樓現代技術學程對稱式核心館舍（正面朝西）。外觀為丁掛紫紅磚與巨型方柱列，左右兩翼各兩開間高度對稱配置半圓弧外凸波浪陽台；中央為 1F 迎賓穿堂大門及 2–4F 連續三層大圓弧陽台；正面中間偏右設有直通頂樓之長條狀珊瑚粉色無障礙電梯塔（外牆繪有機械齒輪圖騰）；全棟為厚實一體成型實體建築，館內 1–4F 完整配置精密加工、CAD 製圖、CNC 與專題研究實習工場。",
      features: [
        "正面高度對稱結構：左翼 2 開間、右翼 2 開間半圓弧波浪外凸陽台",
        "中央 1F 迎賓門面與 2–4F 連續三層大圓弧陽台",
        "正面中間偏右長條狀「無障礙電梯塔」（珊瑚粉外牆與機械齒輪咬合圖騰）",
        "兩翼巨型磚紅方柱列與嵌鑲斜置白金雙色菱形 ◇ 裝飾磁磚",
        "中央挑高屋頂樓梯機房塔樓與實體丁掛紫紅磚主體",
        "1–4F 完整機械技術實習工場、CNC、電腦教室與專題製作室"
      ],
      floorsData: {
        1: [
          { code: "ME1", name: "機械二場", type: "lab" },
          { code: "ME2", name: "機械科辦公室", type: "office" },
          { code: "ELEV", name: "無障礙電梯／中央門廳", type: "stair" },
          { code: "ME3", name: "機械一場（電腦製圖工場）", type: "lab" }
        ],
        2: [
          { code: "ME4", name: "創意教室", type: "lab" },
          { code: "ME5", name: "CNC 教室", type: "lab" },
          { code: "301", name: "301 教室", type: "class3" },
          { code: "ELEV", name: "無障礙電梯／2F 弧形陽台", type: "stair" },
          { code: "201", name: "201 教室", type: "class2" },
          { code: "ME6", name: "電腦教室（機械館）", type: "lab" }
        ],
        3: [
          { code: "ME7", name: "機械三場", type: "lab" },
          { code: "ME8", name: "測試教室", type: "lab" },
          { code: "ELEV", name: "無障礙電梯／3F 弧形陽台", type: "stair" },
          { code: "ME9", name: "電學教室", type: "lab" }
        ],
        4: [
          { code: "ME10", name: "精密量測實驗室", type: "lab" },
          { code: "ME11", name: "機械多功能專題研習室", type: "lab" },
          { code: "ELEV", name: "無障礙電梯／4F 弧形陽台", type: "stair" },
          { code: "ME12", name: "專題製作教室", type: "lab" }
        ]
      }
    },

    janitor: { // 南北向：各樓層由北 → 南排列
      name: "工友室",
      summary: "位於機械館南側（平面圖右下角）之鵝黃色垂直浪板挑高平房，負責校園營繕與工友庶務，路底右側有一座深褐色架高觀景平台。",
      features: ["鵝黃色垂直浪板立面", "林蔭車道與深褐架高平台"],
      floorsData: { 1: [{ code: "JAN1", name: "工友室＆校園營繕器材區", type: "office" }] }
    },

    animal_sci: { // 南北向：各樓層由北 → 南排列
      name: "畜產館",
      summary: "牆題「畜產保健館」，與西側土木館為雙胞胎建築（4 層樓＋屋頂紅瓦白牆小斜頂）。1 樓有畜產／蛋乳加工室、音樂教室與畜產科辦公室；2 樓為生、物、化實驗室；3 樓為微生物、營養、生技實驗室與 306 教室。",
      features: ["赤陶粉紅磚與 2–4F 梯形凸出陽台盒", "入口門廊上方 4 道高聳垂直圓拱細槽", "屋頂中央紅瓦白牆小山牆"],
      // 依據使用者指正將配置反轉 (由北端 -Z 至南端 +Z)
      floorsData: {
        1: [
          { code: "AS4", name: "畜產加工室", type: "lab" },
          { code: "AS3", name: "音樂教室", type: "special" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "AS2", name: "畜產科辦公室", type: "office" },
          { code: "AS1", name: "蛋乳加工室", type: "lab" }
        ],
        2: [
          { code: "AS7", name: "生物實驗室", type: "lab" },
          { code: "AS6", name: "物理實驗室", type: "lab" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "AS5", name: "化學實驗室", type: "lab" }
        ],
        3: [
          { code: "AS10", name: "微生物實驗室", type: "lab" },
          { code: "AS9", name: "營養實驗室", type: "lab" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "AS8", name: "生技實驗室", type: "lab" },
          { code: "306", name: "306 教室", type: "class3" }
        ],
        4: [
          { code: "AS11", name: "畜產保健四樓專業實習空間", type: "lab" }
        ]
      }
    },

    civil_eng: { // 南北向：各樓層由北 → 南排列
      name: "土木館",
      summary: "營建／土木技術學程館舍（4 層樓），與畜產館為對稱雙胞胎造型。1 樓設有設計、測量與材料試驗室；2 樓為製圖、木工教室與童軍儲藏室；3 樓為 302、202 教室、測量儀器室與電腦教室。",
      features: ["與畜產館對稱之 4 層赤陶粉磚立面", "梯形凸出陽台盒與 1F 水平遮陽百葉", "土木測量與材料試驗專業設備"],
      // 使用者確認土木館方向正確，維持原順序
      floorsData: {
        1: [
          { code: "CE1", name: "設計教室", type: "lab" },
          { code: "CE2", name: "測量教室", type: "lab" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "CE3", name: "土木科辦公室", type: "office" },
          { code: "CE4", name: "材料試驗室", type: "lab" }
        ],
        2: [
          { code: "CE5", name: "製圖教室", type: "lab" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "CE6", name: "童軍儲藏室", type: "special" },
          { code: "CE7", name: "木工教室", type: "lab" }
        ],
        3: [
          { code: "302", name: "302 教室", type: "class3" },
          { code: "202", name: "202 教室", type: "class2" },
          { code: "ST", name: "樓梯", type: "stair" },
          { code: "CE8", name: "測量儀器室", type: "lab" },
          { code: "CE9", name: "電腦教室（土木館）", type: "lab" }
        ],
        4: [
          { code: "CE10", name: "土木館四樓專科實習室", type: "lab" }
        ]
      }
    },

    horticulture: { // 東西向：各樓層由西 → 東排列
      name: "園藝館",
      summary: "園藝技術學程館舍（3 層樓）。象牙白磁磚對稱立面，左右兩翼各有兩道高聳垂直圓拱凹槽，前庭為紅灰連鎖磚廣場與圓形花圃。",
      features: ["兩翼垂直圓拱頂凹槽造型", "前庭圓形植栽花圃廣場", "象牙白磁磚優雅立面"],
      floorsData: {
        1: [{ code: "HT1", name: "園藝技術學程一樓造景與實習空間", type: "lab" }],
        2: [{ code: "HT2", name: "園藝館二樓組織培養／實驗室", type: "lab" }],
        3: [{ code: "HT3", name: "園藝館三樓專科教室", type: "lab" }]
      }
    },

    farm_mgmt: { // 東西向：各樓層由西 → 東排列
      name: "農經館（社團活動空間）",
      summary: "牆題「農場經營館」（2 層樓ㄇ字型配置），目前沒有排課，作為學生社團活動空間使用。酒紅磚外牆搭配清爽的冰藍色圓拱長廊。",
      features: ["ㄇ字型中庭建築配置", "深酒紅磚配冰藍色圓拱窗長廊", "現供各學生社團活動使用"],
      floorsData: {
        1: [{ code: "FM1", name: "農經館一樓社團活動空間", type: "special" }],
        2: [{ code: "FM2", name: "農經館二樓社團練習與集會室", type: "special" }]
      }
    },

    coop_art: { // 東西向：各樓層由西 → 東排列
      name: "合作社大樓（1F 合作社／2F 美術教室）",
      summary: "2 層樓現代建築（舊圖書館原址，門楣仍留有圖書館字樣）：1 樓為「員生消費合作社」，2 樓為「美術教室」。西鄰風雨匹克球場，北臨露天籃球場。",
      features: ["1F 員生消費合作社（含自動販賣機）", "2F 美術教室", "右側高聳圓柱形菱網窗塔樓"],
      floorsData: {
        1: [
          { code: "COOP", name: "員生消費合作社", type: "common" },
          { code: "WASH", name: "洗手台與體育器材室", type: "common" }
        ],
        2: [
          { code: "ART1", name: "美術教室（一）", type: "special" },
          { code: "ART2", name: "美術創作與作品展示空間", type: "special" }
        ]
      }
    },

    swimming: { // 東西向：各樓層由西 → 東排列
      name: "游泳館（游泳池）",
      summary: "挑高室內標準游泳館（正面朝東）。東側正門設有中央挑高迎賓塔樓、二樓 3×4 水泥方格遮陽花格窗與金色「游泳館」牌匾，一樓為三道出入不銹鋼鐵捲門與兩側二樓圓柱深挑外廊；南面與北面皆為平整雙色紅磚色立體牆面（1F 深紅褐磚、2F 粉褐磚＋長條氣窗帶，絕無多餘灰色凸出構造）；內部為挑高單層游泳池，無二樓看台；從北面牆面看過去，一樓左邊為體育組辦公室，一樓中間為體育器材室，右邊為室內標準游泳池水道與更衣淋浴區。",
      features: [
        "正面朝東：中央挑高塔樓、金色「游泳館」牌匾與 3×4 水泥花格窗",
        "一樓正門三道不銹鋼鐵捲門與兩側二樓圓柱深挑外廊",
        "南北雙向對稱平整紅磚色牆面與長條氣窗帶（完全對稱，無灰色凸起）",
        "挑高單層無二樓看台：一樓左側體育組辦公室、中間體育器材室、右側標準泳池",
        "柱頭幾何菱形 ◇ 水泥浮雕與雙色丁掛磚"
      ],
      floorsData: {
        1: [
          { code: "PE", name: "體育組辦公室", type: "office", relX: 9.5, relZ: -10.5 },
          { code: "PE2", name: "體育器材室", type: "special", relX: 0.5, relZ: -10.5 },
          { code: "SW1", name: "室內標準游泳池＆更衣淋浴區", type: "sport", relX: -12.5, relZ: 0.0 }
        ]
      }
    },

    tennis_courts: { // 南北向：各樓層由北 → 南排列
      name: "網球場（露天）",
      summary: "位於彩虹操場南側西半部的露天網球場，紅褐色場地面配置 3 面東西向標準綠色網球場與球網，西側緊鄰網球對牆練習區。",
      features: ["3 面東西向標準露天網球場", "紅褐底色配翠綠球場地面", "西側設有網球練習牆"],
      floorsData: {
        1: [
          { code: "TN1", name: "露天網球場 A～C 場", type: "sport" },
          { code: "TNW", name: "西側網球對牆練習區", type: "sport" }
        ]
      }
    },

    covered_basketball: { // 南北向：各樓層由北 → 南排列
      name: "風雨籃球場",
      summary: "位於露天網球場東側、敬業樓與利用樓西側的挑高太陽能光電風雨籃球場，設有 3 面東西向標準籃球場，不受日曬雨淋影響。",
      features: ["挑高太陽能光電風雨鋼棚", "3 面東西向標準風雨籃球場", "亮蘋果綠防撞安全柱墊"],
      floorsData: {
        1: [
          { code: "CBC1", name: "風雨籃球場 A～C 場", type: "sport" }
        ]
      }
    },

    outdoor_basketball: { // 東西向：各樓層由西 → 東排列
      name: "籃球場（露天）",
      summary: "位於風雨籃球場南側、合作社與風雨匹克球場北側的標準東西向露天籃球場。",
      features: ["標準東西向露天全場籃球場", "紅綠雙色標準球場鋪面與籃架"],
      floorsData: {
        1: [
          { code: "OBC1", name: "露天標準籃球場", type: "sport" }
        ]
      }
    },

    covered_volleyball_n: { // 東西向：各樓層由西 → 東排列
      name: "風雨排球場（北區）",
      summary: "位於風雨匹克球場西側的風雨排球場（北區），橘紅底色配 2 面東西向標準綠色排球場，上方設有太陽能光電風雨鋼棚。",
      features: ["太陽能光電風雨鋼棚", "2 面東西向標準排球場"],
      floorsData: {
        1: [
          { code: "CVN1", name: "北區風雨排球場 A・B 場", type: "sport" }
        ]
      }
    },

    covered_pickleball: { // 南北向：各樓層由北 → 南排列
      name: "風雨匹克球場",
      summary: "位於合作社大樓西側與北區風雨排球場之間的淺灰色風雨匹克球場，上方覆蓋風雨鋼棚，提供新興匹克球運動教學與練習空間。",
      features: ["專屬風雨頂棚遮蔽", "南北向淺灰鋪面標準匹克球場"],
      floorsData: {
        1: [
          { code: "PKB1", name: "風雨匹克球場", type: "sport" }
        ]
      }
    },

    covered_volleyball_s: { // 東西向：各樓層由西 → 東排列
      name: "風雨排球場（南區）",
      summary: "位於游泳館北側、合作社南側的大型風雨排球場（南區），橘紅場地內配置 2×2 共 4 面東西向標準綠色排球場，覆蓋大型太陽能光電風雨鋼棚。",
      features: ["大型太陽能光電風雨大鋼棚", "4 面東西向標準排球場（2×2 配置）"],
      floorsData: {
        1: [
          { code: "CVS1", name: "南區風雨排球場 A～D 場", type: "sport" }
        ]
      }
    },

    track_field: { // 南北向：各樓層由北 → 南排列
      name: "田徑操場",
      summary: "南大附中標準紅褐色 PU 田徑場，外緣設有天藍色排水邊溝，內側環繞翠綠中央草皮，東側設有司令台看台與球門。",
      features: ["標準紅褐 PU 跑道（外緣天藍色邊溝）", "中央天然草皮足球／田徑場", "東側司令台與看台"],
      floorsData: {
        1: [{ code: "TRK", name: "PU 跑道＆東側司令台", type: "sport" }]
      }
    },

    hort_teach_shed: { // 南北向：各樓層由北 → 南排列
      name: "園藝教學區",
      summary: "位於農經館西側草坪之園藝專用高架鋼構教學大棚架，設有銀灰 H 型鋼骨柱列、X 型交叉斜撐、高架實作平台與雙斜金屬光電頂棚，供園藝植物栽培與農作實務操作使用。",
      features: ["挑高雙斜採光鋼構棚架", "銀灰鋼骨結構與 X 型交叉斜撐", "高架教學操作實務平台"],
      floorsData: {
        1: [{ code: "HT1", name: "園藝教學操作場", type: "lab" }]
      }
    }
  }
};
