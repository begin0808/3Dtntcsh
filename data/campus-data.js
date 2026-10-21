// 國立臺南大學附屬高級中學 (TNTCSH) 3D 校園資料庫
// 依據：OpenStreetMap 實測座標 (way/161510567)、校園平面圖 (aa190fc6a5da5710e0aea63299779c6c.PNG 黑線道路網)、
//       115學年度班級教室配置圖 (d1e8d63ca67ed612bb52f370f34697f4.PNG)、以及現場 43 張實景照片整理

window.CAMPUS_DATA = {
  school: {
    name: "國立臺南大學附屬高級中學",
    shortName: "國立南大附中",
    englishName: "The Affiliated Senior High School of National University of Tainan",
    address: "710034 臺南市永康區中山南路948號",
    academicYear: "115",
    osmWayId: "161510567",
    coordinates: { lat: 23.022048, lon: 120.255318 }
  },

  // 分區快速視角 (移除南校區農場，聚焦主要教學區與周邊道路)
  zones: [
    { id: "all", name: "全校與周邊道路總覽", icon: "🏫", target: [8, 0, 35], camPos: [8, 304, 360] },
    { id: "north", name: "校門口與行政集會區", icon: "🏛️", target: [0, 4, -125], camPos: [25, 85, -30] },
    { id: "quad", name: "中庭教學區", icon: "🌳", target: [0, 5, -5], camPos: [0, 75, 85] },
    { id: "east", name: "圖書・資訊・餐飲・食品", icon: "📚", target: [112, 5, 18], camPos: [35, 80, 55] },
    { id: "south_tech", name: "專門學程館舍區", icon: "⚙️", target: [20, 6, 130], camPos: [20, 90, 235] },
    { id: "west_sport", name: "運動場館與合作社", icon: "🏀", target: [-125, 5, -20], camPos: [-35, 95, 65] }
  ],

  // 校園東南西北方位地標 (供 3D 場景邊界與小地圖標示方向)
  cardinalMarkers: [
    { dir: "N", label: "北 N", sub: "中山南路・校門口側", x: 0, z: -225, color: "#FF595E" },
    { dir: "S", label: "南 S", sub: "永二街側", x: 0, z: 222, color: "#4CC3D9" },
    { dir: "E", label: "東 E", sub: "永平街・圖書與專業館舍側", x: 196, z: 25, color: "#FFD23F" },
    { dir: "W", label: "西 W", sub: "永興路・操場與風雨球場側", x: -198, z: -25, color: "#58C98B" }
  ],

  // 第一人稱「地面實境漫步」快速起點
  walkSpawns: [
    { id: "gate", name: "📍 校門口迎賓廣場", x: 2.0, z: -200, yaw: Math.PI },       // 面向南方 (+Z) 往校門口招牌、警衛室與大門看（正對大門口中央）
    { id: "quad", name: "📍 中庭教學區中心", x: 0, z: 8, yaw: 0 },               // 面向北方 (-Z) 往樂耕樓看
    { id: "east_lib", name: "📍 圖書館＆資訊學程前", x: 82, z: 18, yaw: -Math.PI / 2 }, // 面向東方 (+X) 往圖書館與日式平房看
    { id: "catering_plaza", name: "📍 餐飲館＆雙綠地車道", x: 114, z: -42, yaw: 0 }, // 面向北方 (-Z) 往餐飲館正門看
    { id: "tech_south", name: "📍 土木・畜產・園藝廣場", x: -10, z: 86, yaw: Math.PI }, // 面向南方 (+Z) 往畜產與土木館看
    { id: "sport_west", name: "📍 風雨球場＆合作社前", x: -80, z: 8, yaw: Math.PI / 2 } // 面向西方 (-X) 往合作社與球場看
  ],

  // 國立南大附中特色學程與科館導覽清單
  programs: [
    {
      id: "prog_academic",
      name: "學術學程（自然／社會學程）",
      icon: "📖",
      color: "#58C98B",
      buildings: ["legeng", "liyong", "zhengde", "animal_sci"],
      labs: ["自然科教室（樂耕樓3F）", "社會科教室（樂耕樓3F）", "數學科教室（樂耕樓3F）", "化／物／生實驗室（畜產館2F）"],
      summary: "培養紮實的國、英、數、自然與社會學科素養，結合樂耕樓、利用樓、正德樓普通教室群與專科實驗室，奠定大學升學與跨域探究基礎。"
    },
    {
      id: "prog_it",
      name: "資訊應用學程",
      icon: "💻",
      color: "#3898EC",
      buildings: ["library", "jingye"],
      labs: ["資訊應用學程專科教室（圖書館3F）", "資訊實習電腦教室（圖書館3F）", "電腦教室一～三（敬業樓3F）"],
      summary: "位於圖書館大樓 3 樓（北側設有資訊學程專屬門廊），聚焦程式設計、網路管理、數位科技與多媒體實務應用。"
    },
    {
      id: "prog_catering",
      name: "餐飲技術學程",
      icon: "🍳",
      color: "#FF8A5B",
      buildings: ["catering", "cooking"],
      labs: ["餐飲館 1–3F 專業實習教室", "中餐烹飪實習教室（烹飪教室大樓）"],
      summary: "擁有獨立 3 層樓「餐飲館」與「烹飪教室大樓」，培育中西餐烹調、烘焙伴手禮、飲料調製與餐旅服務專業人才。"
    },
    {
      id: "prog_food",
      name: "食品加工學程",
      icon: "🍞",
      color: "#E07A5F",
      buildings: ["food_proc", "factory"],
      labs: ["食品加工一樓實習工場", "食品檢驗與分析實驗室（2F）", "加工工廠（1–2F 實習工廠）"],
      summary: "結合「食品加工館」與「加工工廠」雙館舍，涵蓋食品製造、烘焙食品、食品化學檢驗與食品安全衛生實務。"
    },
    {
      id: "prog_mech",
      name: "機械技術學程",
      icon: "⚙️",
      color: "#F2C94C",
      buildings: ["mechanical"],
      labs: ["機械一場（電腦製圖工場）", "機械二場／三場", "CNC 教室", "創意教室", "電學與測試教室"],
      summary: "設於乾燥玫瑰粉磚外觀之「機械館」（含新建齒輪圖騰無障礙電梯），配置精密機械加工、CNC 數值控制、電腦輔助製圖（CAD）與機電整合工場。"
    },
    {
      id: "prog_animal",
      name: "畜產保健學程",
      icon: "🐾",
      color: "#EB6B9D",
      buildings: ["animal_sci"],
      labs: ["畜產加工室（1F）", "蛋乳加工室（1F）", "生技實驗室（3F）", "營養與微生物實驗室（3F）"],
      summary: "設於 4 層樓「畜產館」，結合動物飼養管理、寵物照護美容、獸醫衛生保健、生物技術及蛋乳肉品加工實習。"
    },
    {
      id: "prog_civil",
      name: "營建技術學程（土木）",
      icon: "📐",
      color: "#A78BFA",
      buildings: ["civil_eng"],
      labs: ["設計教室（1F）", "測量教室＆測量儀器室（1F/3F）", "材料試驗室（1F）", "製圖與木工教室（2F）"],
      summary: "設於 4 層樓「土木館」，培訓工程測量、電腦建築製圖、土木材料力學試驗、木工造景與空間規劃設計能力。"
    },
    {
      id: "prog_hort",
      name: "園藝技術學程",
      icon: "🌿",
      color: "#6FCF97",
      buildings: ["horticulture"],
      labs: ["園藝造景與實習空間（1F）", "植物組織培養實驗室（2F）", "園藝專科教室（3F）"],
      summary: "設於「園藝館」，涵蓋果樹、蔬菜、花卉栽培、植物組織培養、造園景觀設計與園產品加工處理。"
    }
  ],

  // 版權與資料來源資訊
  copyright: {
    owner: "國立臺南大學附屬高級中學 (The Affiliated Senior High School of National University of Tainan)",
    year: "2026",
    address: "710034 臺南市永康區中山南路 948 號",
    phone: "(06) 232-6251",
    website: "https://www.tntcsh.tn.edu.tw/",
    mapAttribution: "周邊道路與校界地理座標引用自 OpenStreetMap 開放街圖 (© OpenStreetMap contributors, ODbL 授權)",
    photoNote: "115學年度班級教室配置與校園空間配置資料由本校彙整建置。"
  },

  // 校區外圍多邊形頂點 (依據 OpenStreetMap way/161510567 轉換至校園平面圖座標系)
  campusBoundary: [
    [169.6, 190.8],
    [59.9, 191.6],
    [-176.9, 212.3],
    [-177.2, -261.8],
    [-174.4, -269.6],
    [-146.8, -291.2],
    [-9.9, -204.3],
    [-5.2, -182.9],
    [1.2, -181.7],
    [9.4, -180.2],
    [10.8, -187.2],
    [106.2, -122.9],
    [176.5, -75.7]
  ],

  // 周邊外部道路網 (依據 OpenStreetMap 實測路網 https://www.openstreetmap.org/way/161510567)
  externalRoads: [
    {
      id: "rd_zhongshan_s",
      name: "中山南路",
      sub: "台20線・往永康市區／台南市區",
      width: 18,
      isPrimary: true,
      points: [
        [-166.0, -317.6],
        [-142.6, -301.3],
        [-75.2, -257.2],
        [-14.9, -216.9],
        [3.2, -204.1],
        [42.8, -178.8],
        [78.8, -154.4],
        [128.3, -120.4],
        [158.3, -101.0],
        [184.5, -82.9],
        [209.7, -66.7],
        [252.0, -38.5],
        [273.4, -24.6]
      ],
      labelPositions: [
        { x: -85, z: -264, text: "中山南路" },
        { x: 18, z: -195, text: "中山南路（948號校門前）" },
        { x: 145, z: -109, text: "中山南路" }
      ]
    },
    {
      id: "rd_zhengqiang",
      name: "正強街",
      width: 11,
      isPrimary: false,
      points: [
        [78.8, -154.4],
        [98.4, -189.4],
        [122.1, -214.9],
        [144.2, -229.0],
        [228.7, -278.4]
      ],
      labelPositions: [
        { x: 112, z: -204, text: "正強街" }
      ]
    },
    {
      id: "rd_yongping",
      name: "永平街",
      width: 10,
      isPrimary: false,
      points: [
        [184.5, -82.9],
        [181.2, 2.4],
        [179.2, 83.1],
        [177.8, 149.7],
        [175.3, 195.8],
        [174.2, 265.0]
      ],
      labelPositions: [
        { x: 181, z: -25, text: "永平街" },
        { x: 178, z: 115, text: "永平街" }
      ]
    },
    {
      id: "rd_yonger",
      name: "永二街",
      width: 12,
      isPrimary: false,
      points: [
        [265.0, 195.3],
        [175.3, 195.8],
        [76.5, 198.3],
        [-61.5, 210.4],
        [-183.9, 222.8],
        [-265.0, 228.5]
      ],
      labelPositions: [
        { x: 115, z: 198, text: "永二街" },
        { x: -55, z: 210, text: "永二街" }
      ]
    },
    {
      id: "rd_yongxing",
      name: "永興路",
      width: 11,
      isPrimary: false,
      points: [
        [-142.6, -301.3],
        [-175.8, -273.3],
        [-180.9, -259.5],
        [-181.6, -174.5],
        [-180.8, -110.0],
        [-180.9, -47.0],
        [-180.9, 18.0],
        [-183.9, 222.8]
      ],
      labelPositions: [
        { x: -182, z: -155, text: "永興路" },
        { x: -182, z: 55, text: "永興路" }
      ]
    },
    {
      id: "rd_yongsheng",
      name: "永勝街",
      width: 8,
      isPrimary: false,
      points: [
        [-180.9, 18.0],
        [-231.3, 18.5],
        [-275.0, 18.0]
      ],
      labelPositions: [
        { x: -228, z: 18.5, text: "永勝街" }
      ]
    },
    {
      id: "rd_yongxing_397",
      name: "永興路397巷",
      width: 7,
      isPrimary: false,
      points: [
        [-180.8, -110.0],
        [-231.6, -109.3],
        [-266.4, -107.4]
      ],
      labelPositions: [
        { x: -225, z: -109, text: "永興路397巷" }
      ]
    },
    {
      id: "rd_yongxing_355",
      name: "永興路355巷",
      width: 7,
      isPrimary: false,
      points: [
        [-180.9, -47.0],
        [-231.7, -18.8],
        [-231.5, -40.9],
        [-275.0, -39.0]
      ],
      labelPositions: [
        { x: -222, z: -32, text: "永興路355巷" }
      ]
    },
    {
      id: "rd_zhongshan_517",
      name: "中山南路517巷",
      width: 7,
      isPrimary: false,
      points: [
        [42.8, -178.8],
        [63.4, -201.0],
        [81.1, -211.0]
      ],
      labelPositions: [
        { x: 64, z: -198, text: "中山南路517巷" }
      ]
    },
    {
      id: "rd_zhongshan_557",
      name: "中山南路557巷",
      width: 7,
      isPrimary: false,
      points: [
        [128.3, -120.4],
        [160.4, -168.1],
        [122.1, -214.9]
      ],
      labelPositions: [
        { x: 152, z: -158, text: "中山南路557巷" }
      ]
    },
    {
      id: "rd_zhongshan_597",
      name: "中山南路597巷",
      width: 7,
      isPrimary: false,
      points: [
        [209.7, -66.7],
        [240.2, -118.5]
      ],
      labelPositions: [
        { x: 228, z: -96, text: "中山南路597巷" }
      ]
    },
    {
      id: "rd_yongping_45",
      name: "永平街45巷",
      width: 7.5,
      isPrimary: false,
      points: [
        [179.2, 83.1],
        [224.3, 56.7],
        [268.0, 36.0]
      ],
      labelPositions: [
        { x: 224, z: 57, text: "永平街45巷" }
      ]
    },
    {
      id: "rd_zhongshan_1054",
      name: "中山南路1054巷",
      width: 7.5,
      isPrimary: false,
      points: [
        [177.8, 149.7],
        [201.6, 148.1],
        [268.0, 126.0]
      ],
      labelPositions: [
        { x: 225, z: 140, text: "中山南路1054巷" }
      ]
    }
  ],

  // 校內黑色道路網 (嚴格對照 aa190fc6a5da5710e0aea63299779c6c.PNG 中的黑色車道與幹道線條)
  internalRoads: [
    // 1. 校門進場車道與圓形廣場至樂耕樓中央大道
    { points: [[3.2, -200.0], [1.2, -181.0], [0.0, -162.0]], width: 12 },
    { points: [[0.0, -162.0], [0.0, -96.0], [0.0, -64.0]], width: 11 },
    // 2. 校門圓環往西經車棚與活動中心間至西側主幹道
    { points: [[0.0, -162.0], [-14.0, -156.0], [-80.0, -156.0]], width: 7.5 },
    // 3. 校門圓環沿東北圍牆內側斜向至東側主幹道北端 (位於學生車棚西側，絕不與學生車棚重疊)
    { points: [[0.0, -162.0], [14.0, -162.0], [74.0, -122.0], [74.0, -75.0]], width: 7.5 },
    // 4. 西側南北向主幹道 (貫穿操場東側、風雨球場東側、合作社東側、土木館西側至南界車道)
    { points: [[-80.0, -245.0], [-80.0, -156.0], [-80.0, -75.0], [-80.0, 0.0], [-80.0, 62.0], [-80.0, 86.0], [-80.0, 193.3]], width: 8.5 },
    // 5. 敬業樓／行政大樓南側與樂耕樓北側之間東西向校道
    { points: [[-80.0, -75.0], [-36.0, -75.0], [0.0, -75.0], [43.0, -75.0], [74.0, -75.0]], width: 8.0 },
    // 5b. 學生車棚與餐飲館正門口前方東西向道路 (z = -66)
    { points: [[74.0, -66.0], [114.0, -66.0], [136.0, -66.0]], width: 7.5 },
    // 5c. 餐飲館正門口往南直線道路 (僅將餐飲館前方分為左右兩個綠地區域，至 z = -37 為止，不穿過烹飪教室與樂揚樓之間)
    { points: [[114.0, -66.0], [114.0, -37.0]], width: 6.5 },
    // 5d. 兩個綠地區域南側、烹飪教室與樂揚樓北側之東西向道路 (z = -37)
    { points: [[74.0, -37.0], [114.0, -37.0], [136.0, -37.0]], width: 7.0 },
    // 6. 中庭東側與圖書館／食品加工館之間南北向主幹道 (x = 74，南端接南界橫向車道)
    { points: [[74.0, -75.0], [74.0, -66.0], [74.0, -37.0], [74.0, -5.0], [74.0, 62.0], [74.0, 86.0], [74.0, 132.0], [74.0, 181.0]], width: 8.0 },
    // 7. 最東側南北向車道 (餐飲館東南側 → 兩綠地東側 → 樂揚樓與資源室間 → 圖書館與資源室間 → 加工工廠與機械館間 → 書庫與工友室間，南端接南界橫向車道)
    { points: [[136.0, -66.0], [136.0, -37.0], [136.0, -5.0], [136.0, 52.0], [136.0, 110.0], [136.0, 180.5]], width: 8.0 },
    // 8. 東區橫向聯絡道 (烹飪/樂揚南側與圖書館北側之間、圖書館與食品加工/加工工廠之間)
    { points: [[74.0, -5.0], [136.0, -5.0]], width: 6.5 },
    { points: [[74.0, 52.0], [136.0, 52.0]], width: 6.5 },
    // 9. 正德樓南側東西向校道 (原 z=62.0 校道已依需求改為綠地林園，僅保留南向 z=86.0 車道)
    { points: [[-80.0, 86.0], [0.0, 86.0], [74.0, 86.0]], width: 8.0 },
    // 10. 正德樓中央穿堂往南經畜產館東側至南門出入口道路
    { points: [[0.0, 48.0], [0.0, 86.0], [4.0, 110.0], [4.0, 196.5]], width: 7.5 },
    // 11. 游泳館周邊聯絡車道 (北側橫向道與東側迴圈道，依使用者黃色框標示)
    { points: [[-80.0, 65.0], [-150.0, 65.0]], width: 7.0 },
    { points: [[-105.0, 65.0], [-105.0, 88.0], [-80.0, 88.0]], width: 7.0 },
    // 12. 校園南側橫向主幹道 (依使用者指示調整順序：南界最靠近永二街是圍牆，接著校園裡面沿著圍牆種植一排樹木，接著才是這條黑色道路)
    { points: [[-174.0, 201.2], [-80.0, 193.3], [4.0, 186.0], [74.0, 181.0], [136.0, 180.5], [168.0, 180.3]], width: 7.5 }
  ],

  // 建築物與場域清單 (僅保留主要教學校區，座標對齊 OSM 與校園平面圖)
  buildings: [
    // ================= 1. 北側校門與行政集會區 =================
    {
      id: "main_gate",
      name: "校門口與警衛室",
      englishName: "Main Gate & Guardhouse",
      category: "landmark",
      zone: "north",
      x: 1.5, z: -181.5, w: 30, d: 8.5, rotY: -0.58,
      floors: 1, floorHeight: 5.6,
      style: "gate",
      colors: {
        main: "#DDD2C0",
        secondary: "#4A4640",
        accent: "#2C82C9",
        roof: "#6E7275",
        gold: "#C8A248"
      },
      summary: "國立南大附中正門地標（中山南路948號）。門口右側為深褐疊石題字石塔（直書金色「國立臺南大學附屬高級中學」）與漸降造型景觀牆（藍色立體校名大字「國立 臺南大學附中」與圓形月門穿透孔）；門口左側為單層警衛室，屋頂架設大型戶外全彩電子看板（LED 電視牆巨幕）；中央為安全島、黃黑警示防撞柱與伸縮大門。",
      features: ["門口右側：造型景觀牆（孔雀石藍綠立體校名大字＋圓形月門孔）與疊石門柱", "門口左側：大型戶外 LED 電子看板（巨幕電視牆）與下方警衛室（綠白遮陽棚）", "中央出入：車道安全島、黃黑反光警示防撞柱與紅色電動伸縮門"],
      floorsData: {
        1: [
          { code: "GATE", name: "校門警衛室", type: "office" },
          { code: "ENTR", name: "正門出入雙車道", type: "common" }
        ]
      }
    },
    {
      id: "admin",
      name: "行政大樓",
      englishName: "Administration Building",
      category: "admin",
      zone: "north",
      x: 41.0, z: -96.0, w: 48.0, d: 15.0, rotY: 0,
      floors: 3, centerTowerFloors: 4, floorHeight: 5.5,
      style: "admin",
      colors: {
        main: "#EAE8E1",
        secondary: "#D5D2C8",
        accent: "#3B3E3F",
        roof: "#DCDAD2",
        gold: "#C59B27"
      },
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
    {
      id: "jingye",
      name: "敬業樓",
      englishName: "Jing-Ye Building",
      category: "admin",
      zone: "north",
      x: -36.0, z: -96.0, w: 54.0, d: 15.0, rotY: 0,
      floors: 3, floorHeight: 5.5,
      style: "jingye",
      colors: {
        main: "#EDEFF2",
        secondary: "#DCDFE2",
        accent: "#9E2A2B",
        roof: "#D9C5A7"
      },
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
    {
      id: "activity",
      name: "活動中心",
      englishName: "Activity Center",
      category: "sport",
      zone: "north",
      x: -36.0, z: -134.0, w: 52.0, d: 36.0, rotY: 0,
      floors: 2, floorHeight: 8.2,
      style: "activity",
      colors: {
        main: "#F0F3F7",
        secondary: "#8E9299",
        accent: "#B83B2B",
        roof: "#DFDDD2"
      },
      summary: "全校大型集會、典禮與室內體育館。南向正門有灰色垂直高塔（嵌校徽）與 4 道大型斜撐托架；東側有一整排 A 字型水泥斜撐柱與橘、黃、綠、藍彩虹橫樑。",
      features: ["南側校徽高塔與 4 道斜撐托架", "東側 A 字斜撐柱列與彩虹橫樑", "挑高大跨度集會與運動場館"],
      floorsData: {
        1: [{ code: "ACT1", name: "活動中心一樓廣場／穿堂", type: "common" }],
        2: [{ code: "ACT2", name: "大禮堂／室內綜合球場", type: "sport" }]
      }
    },
    {
      id: "west_shed",
      name: "車棚（西北側）",
      englishName: "North-West Parking Shed",
      category: "facility",
      zone: "north",
      x: -54.0, z: -198.0, w: 38.0, d: 15.0, rotY: 0,
      floors: 1, floorHeight: 4.8,
      style: "shed",
      colors: { main: "#CFD6DC", secondary: "#9A9A94", accent: "#4A4E52", roof: "#4A4E52" },
      summary: "位於活動中心北側、校門西側之單層停車棚。",
      features: ["深灰斜頂開放式車棚"],
      floorsData: { 1: [{ code: "PK1", name: "教職員與來賓車棚", type: "common" }] }
    },
    {
      id: "student_shed",
      name: "學生車棚",
      englishName: "Student Scooter & Bike Shed",
      category: "facility",
      zone: "north",
      x: 88.5, z: -92.0, w: 13.0, d: 34.0, rotY: 0,
      floors: 1, floorHeight: 4.8,
      style: "shed_green",
      colors: { main: "#9A9A94", secondary: "#8C8980", accent: "#6E967B", roof: "#9AB8A4" },
      summary: "位於東側南北向主幹道東側、餐飲館西側與北側之 L 型開放式學生單車／機車棚，採用薄荷綠波浪頂棚與波浪滾邊屋簷。",
      features: ["薄荷綠波浪頂棚", "位於道路東側不擋車道之 L 型停車棚區"],
      floorsData: { 1: [{ code: "PK2", name: "學生單車／機車停放區", type: "common" }] }
    },

    // ================= 2. 中庭教學區教學核心區 =================
    {
      id: "legeng",
      name: "樂耕樓",
      englishName: "Le-Geng Building",
      category: "teaching",
      zone: "quad",
      x: -1.875, z: -46.0, w: 93.75, d: 15.0, rotY: 0,
      floors: 3, floorHeight: 5.4,
      style: "legeng",
      colors: {
        main: "#F2F0EA",
        secondary: "#B8B3A8",
        accent: "#8E96A0",
        roof: "#2B323B"
      },
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
    {
      id: "liyong",
      name: "利用樓",
      englishName: "Li-Yong Building",
      category: "teaching",
      zone: "quad",
      x: -56.0, z: -2.375, w: 14.5, d: 72.25, rotY: 0,
      floors: 2, floorHeight: 5.4,
      style: "liyong",
      colors: {
        main: "#E2E6EC",
        secondary: "#7D807D",
        accent: "#689F4E",
        roof: "#DCE0E6"
      },
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
    {
      id: "zhengde",
      name: "正德樓",
      englishName: "Zheng-De Building",
      category: "teaching",
      zone: "quad",
      x: 3.625, z: 42.0, w: 104.75, d: 16.5, rotY: 0,
      floors: 3, floorHeight: 5.4,
      style: "zhengde",
      colors: {
        main: "#EAE5D9",
        secondary: "#8A877E",
        accent: "#C59B27",
        roof: "#2C333A"
      },
      summary: "中庭教學區南棟（3 層樓），西端 1、2 樓與利用樓 1、2 樓直接連通。從大門方向面對正德樓，右邊（西端，連接利用樓）2 樓第一間教室為 105 班，往左（東端，靠近厚生樓）依序為 106–110 及 207–209 班；1 樓西側為享學空間、進修部辦公室、307、101，東側為 102–104 與哺乳室；3 樓西側為 203–206、303，東側為 304–305、308–309。",
      features: ["西端 1–2F 與利用樓 1–2F 轉角直接連通", "從大門面對二樓最右側為 105 班、最左側為 209 班", "1F 中央南北向大穿堂與屋頂太陽能光電陣列"],
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
    {
      id: "housheng",
      name: "厚生樓（新建・待驗收）",
      englishName: "Hou-Sheng Building (Newly Built, Awaiting Inspection)",
      category: "teaching",
      zone: "quad",
      x: 56.0, z: -3.0, w: 14.5, d: 78.0, rotY: 0,
      floors: 4, floorHeight: 5.4,
      style: "housheng",
      colors: {
        main: "#ECE7DF",
        secondary: "#B86B52",
        accent: "#1E78B4",
        roof: "#DFDDD6"
      },
      summary: "中庭教學區東棟（4 層樓新建大樓）。目前剛興建完工、尚未通過驗收程序，因此尚未安排任何班級進駐。外觀採紅磚垂直壁柱搭配 1–3 樓圓弧拱窗，4 樓頂部設有一整排半圓形鏤空拱廊，中庭側有兩座對稱藍色波浪飾板入口門廊。",
      features: ["剛完工尚未通過驗收（目前無班級進駐）", "紅磚垂直壁柱與 4F 連續半圓形鏤空拱廊", "雙座對稱中庭入口門廊"],
      floorsData: {
        1: [{ code: "HS1", name: "新建空間（尚未驗收・暫無班級）", type: "common" }],
        2: [{ code: "HS2", name: "新建空間（尚未驗收・暫無班級）", type: "common" }],
        3: [{ code: "HS3", name: "新建空間（尚未驗收・暫無班級）", type: "common" }],
        4: [{ code: "HS4", name: "四樓半圓拱廊層（尚未驗收・暫無班級）", type: "common" }]
      }
    },

    // ================= 3. 東側圖書、資訊、餐飲與食品加工區 =================
    {
      id: "library",
      name: "圖書館大樓（含資訊應用學程）",
      englishName: "Library & Information Technology Program",
      category: "tech",
      zone: "east",
      x: 118.0, z: 24.0, w: 22.0, d: 48.0, rotY: 0,
      floors: 3, floorHeight: 5.7,
      style: "library",
      colors: {
        main: "#EFECE6",
        secondary: "#DEC0B8",
        accent: "#1A2B6B",
        roof: "#E8DFD1"
      },
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
    {
      id: "old_art",
      name: "原美術教室（日式斜頂平房）",
      englishName: "Historic Japanese-Style Annex",
      category: "landmark",
      zone: "east",
      // 往西移動至 x = 87.5 (w = 9.0)，使其西側左緣 (x = 83.0) 由上往下俯瞰時與烹飪教室左側 (x = 83.0) 完美對齊
      x: 87.5, z: 14.0, w: 9.0, d: 28.0, rotY: 0,
      floors: 1, floorHeight: 5.5,
      style: "japanese_annex",
      colors: {
        main: "#EAEAE4",
        secondary: "#3A2E28",
        accent: "#42241E",
        roof: "#43464B"
      },
      summary: "位於圖書館西側前方的日式斜屋頂歷史感平房（原為舊美術教室，目前用途待確認），西側邊緣與北方烹飪教室左側對齊，覆深灰日本瓦，西向中央設有木造山牆式玄關門廊。",
      features: ["日式深灰文化瓦四坡斜屋頂（正南北向對齊）", "西側與烹飪教室左側對齊", "傳統山牆式木色玄關門廊"],
      floorsData: {
        1: [{ code: "OART", name: "原美術教室（目前用途待確認）", type: "special" }]
      }
    },
    {
      id: "catering",
      name: "餐飲館",
      englishName: "Food & Beverage Dept. Building",
      category: "tech",
      zone: "east",
      x: 118.0, z: -82.0, w: 36.0, d: 16.0, rotY: 0,
      floors: 3, floorHeight: 5.5,
      style: "catering",
      colors: {
        main: "#ECEFF2",
        secondary: "#D8DFE5",
        accent: "#7D8287",
        roof: "#2B323B"
      },
      summary: "牆題「餐飲科館」，3 層樓現代建築。最顯著特徵為左右兩端對稱的全高「雙圓柱形角樓」，屋頂裝設大型太陽能板，正門口前方有垂直車道將南側林木綠地分為左右兩區。",
      features: ["左右對稱雙圓柱形角樓", "餐飲技術學程實習空間", "正門口前方道路與左右雙綠地"],
      floorsData: {
        1: [{ code: "CAT1", name: "餐飲技術學程一樓實習空間", type: "lab" }],
        2: [{ code: "CAT2", name: "餐飲館二樓專業實習教室", type: "lab" }],
        3: [{ code: "CAT3", name: "餐飲館三樓專科教室", type: "lab" }]
      }
    },
    {
      id: "cooking",
      name: "烹飪教室",
      englishName: "Cooking Classroom Building",
      category: "tech",
      zone: "east",
      // 西側左緣位於 x = 97.0 - 14.0 = 83.0 (與原美術教室左側 x = 83.0 對齊)，東側與樂揚樓靠近但不連通、中間無道路
      x: 97.0, z: -21.0, w: 28.0, d: 13.5, rotY: 0,
      floors: 3, floorHeight: 5.4,
      style: "cooking",
      colors: {
        main: "#9B9995",
        secondary: "#DEC0BA",
        accent: "#7D746A",
        roof: "#33373B"
      },
      summary: "位於樂揚樓西側的 3 層樓建築（兩棟大樓相鄰靠近但未連通，中間無車道），具有淺粉橘色長條陽台女兒牆、兩端外露水泥樓梯，以及頂樓深灰色斜頂鐵皮屋頂。",
      features: ["2–3F 淺粉橘色長廊陽台", "頂層深灰斜屋頂棚架", "與樂揚樓相鄰靠近（中間無道路）"],
      floorsData: {
        1: [{ code: "CK1", name: "中餐烹飪實習教室", type: "lab" }],
        2: [{ code: "CK2", name: "烹飪專科教室（二樓）", type: "lab" }],
        3: [{ code: "CK3", name: "烹飪專科空間（三樓）", type: "lab" }]
      }
    },
    {
      id: "yueyang",
      name: "樂揚樓",
      englishName: "Yue Yang Building",
      category: "teaching",
      zone: "east",
      // 往西微移至 x = 120.5 (w = 14.0)，西側 x = 113.5 與烹飪教室東側 (x = 111.0) 相隔 2.5m 靠近但不連通
      x: 120.5, z: -21.0, w: 14.0, d: 19.5, rotY: 0,
      floors: 3, floorHeight: 5.4,
      style: "yueyang",
      colors: {
        main: "#F5F6F2",
        secondary: "#5AA9E6",
        accent: "#7BC0F5",
        roof: "#6CB4EE"
      },
      summary: "3 層樓音樂與藝術教學大樓。白牆搭配天藍色結構外框，北面與南面正中央皆設有醒目的「雙層樓高天藍色大圓拱門廊」與音符造型「樂揚樓」招牌字體。",
      features: ["北向與南向雙面天藍色大圓拱門廊", "音符造型「樂揚樓」字體", "西南側圓弧轉角造型"],
      floorsData: {
        1: [{ code: "YY1", name: "樂揚樓一樓音樂／藝文空間", type: "special" }],
        2: [{ code: "YY2", name: "樂揚樓二樓合奏／練習室", type: "special" }],
        3: [{ code: "YY3", name: "樂揚樓三樓展演教室", type: "special" }]
      }
    },
    {
      id: "recycling",
      name: "資源室",
      englishName: "Resource & Recycling Room",
      category: "facility",
      zone: "east",
      x: 152.0, z: 12.0, w: 14.0, d: 28.0, rotY: 0,
      floors: 1, floorHeight: 5.6,
      style: "flat_util",
      colors: { main: "#96948F", secondary: "#8DA3AD", accent: "#736E68", roof: "#595855" },
      summary: "東側車道旁 1 樓 5 開間水泥建築，負責全校資源回收與環保分類作業。",
      features: ["5 開間水泥平房與雙鐵捲門", "附設資源回收分類櫃"],
      floorsData: { 1: [{ code: "RC1", name: "全校資源回收與分類室", type: "common" }] }
    },
    {
      id: "food_proc",
      name: "食品加工館",
      englishName: "Food Processing Building",
      category: "tech",
      zone: "east",
      x: 96.0, z: 78.0, w: 15.0, d: 38.0, rotY: 0,
      floors: 3, centerTowerFloors: 4, floorHeight: 5.5,
      style: "food_proc",
      colors: {
        main: "#D48C74",
        secondary: "#9E6350",
        accent: "#E5E0D8",
        roof: "#4A525A"
      },
      summary: "食品加工學程核心館舍（中央 3 層、左右角塔 4 層）。外牆為溫暖的鮭魚橘紅磚，兩側 4 層高角樓有圓拱頂垂直凹槽，1 樓設圓柱凸出門廊。",
      features: ["左右雙座 4 層圓拱凹槽角樓", "2–3F 階梯狀方型凸出花台", "食品加工學程專業實習空間"],
      floorsData: {
        1: [{ code: "FP1", name: "食品加工學程一樓實習工場／辦公室", type: "lab" }],
        2: [{ code: "FP2", name: "食品檢驗與分析實驗室", type: "lab" }],
        3: [{ code: "FP3", name: "食品加工三樓專科教室", type: "lab" }]
      }
    },
    {
      id: "factory",
      name: "加工工廠",
      englishName: "Processing Workshop",
      category: "tech",
      zone: "east",
      x: 118.0, z: 78.0, w: 14.0, d: 38.0, rotY: 0,
      floors: 2, floorHeight: 5.6,
      style: "factory",
      colors: {
        main: "#A8AAAC",
        secondary: "#C9CC98",
        accent: "#787A7D",
        roof: "#2F3337"
      },
      summary: "與食品加工館並排之 2 層樓實習工廠，素水泥灰立面搭配二樓開放長廊與深灰色鐵皮斜屋頂。",
      features: ["2F 開放式走廊與外露樓梯", "深灰鐵皮斜屋頂"],
      floorsData: {
        1: [{ code: "FAC1", name: "食品加工實習工廠（一樓）", type: "lab" }],
        2: [{ code: "FAC2", name: "加工實習空間（二樓）", type: "lab" }]
      }
    },
    {
      id: "book_depot",
      name: "書庫（原學生宿舍）",
      englishName: "Book Depository",
      category: "facility",
      zone: "east",
      x: 116.0, z: 128.0, w: 15.0, d: 36.0, rotY: 0,
      floors: 4, floorHeight: 5.3,
      style: "book_depot",
      colors: {
        main: "#FFFFFF",
        secondary: "#B8CF78",
        accent: "#9BB85C",
        roof: "#D8E0DC"
      },
      summary: "4 層樓白牆綠線條現代建築（平面圖舊標示為學生宿舍，現已改為書庫）。左側樓梯間有一排別緻的「圓形舷窗」，4 樓為白色欄杆陽台，西側前方有優美的筆直樹林步道。",
      features: ["純白外牆配萊姆綠水平線條", "左側垂直排列圓形舷窗", "西側筆直樹林步道"],
      floorsData: {
        1: [{ code: "BK1", name: "書庫一樓典藏區", type: "office" }],
        2: [{ code: "BK2", name: "書庫二樓教材區", type: "office" }],
        3: [{ code: "BK3", name: "書庫三樓檔案區", type: "office" }],
        4: [{ code: "BK4", name: "書庫四樓儲藏區", type: "office" }]
      }
    },

    // ================= 4. 南側專業群科館舍區 =================
    {
      id: "mechanical",
      name: "機械館",
      englishName: "Mechanical Engineering Building",
      category: "tech",
      zone: "south_tech",
      // 往東方 (+X) 稍微平移至 x = 161.0，前方無樹木遮擋
      x: 161.0, z: 86.0, w: 15.5, d: 62.0, rotY: 0,
      floors: 3, centerTowerFloors: 4, floorHeight: 5.7,
      style: "mechanical",
      colors: {
        main: "#C98C82",
        secondary: "#EDAFA4",
        accent: "#EAE5DC",
        roof: "#8C9298"
      },
      summary: "機械技術學程核心館舍（兩翼 3 樓、中央與電梯塔 4 樓）。乾燥玫瑰粉磚立面，中央為弧形懸挑門廊，兩翼為半圓形凸出陽台；右側（北端）設有剛建好的淺鮭魚粉色「無障礙電梯」（外牆飾有機械齒輪造型）。",
      features: ["新建機械齒輪造型「無障礙電梯」高塔", "中央弧形門廊與兩翼半圓陽台", "1F 機械工場、2F CNC／創意／301&201、3F 電學／機械三場"],
      // 使用者確認機械館方向正確，維持原順序
      floorsData: {
        1: [
          { code: "ME1", name: "機械二場", type: "lab" },
          { code: "ME2", name: "機械科辦公室", type: "office" },
          { code: "ST", name: "樓梯／無障礙電梯", type: "stair" },
          { code: "ME3", name: "機械一場（電腦製圖工場）", type: "lab" }
        ],
        2: [
          { code: "ME4", name: "創意教室", type: "lab" },
          { code: "ME5", name: "CNC教室", type: "lab" },
          { code: "301", name: "301 教室", type: "class3" },
          { code: "ST", name: "樓梯／無障礙電梯", type: "stair" },
          { code: "201", name: "201 教室", type: "class2" },
          { code: "ME6", name: "電腦教室（機械館）", type: "lab" }
        ],
        3: [
          { code: "ME7", name: "機械三場", type: "lab" },
          { code: "ME8", name: "測試教室", type: "lab" },
          { code: "ST", name: "樓梯／無障礙電梯", type: "stair" },
          { code: "ME9", name: "電學教室", type: "lab" }
        ]
      }
    },
    {
      id: "janitor",
      name: "工友室",
      englishName: "Campus Maintenance & Janitor Office",
      category: "facility",
      zone: "south_tech",
      x: 160.0, z: 152.0, w: 13.0, d: 28.0, rotY: 0,
      floors: 1, floorHeight: 5.8,
      style: "janitor",
      colors: { main: "#DFD6AE", secondary: "#A6A49B", accent: "#6E7378", roof: "#4A4B46" },
      summary: "位於機械館南側（平面圖右下角）之鵝黃色垂直浪板挑高平房，負責校園營繕與工友庶務，路底右側有一座深褐色架高觀景平台。",
      features: ["鵝黃色垂直浪板立面", "林蔭車道與深褐架高平台"],
      floorsData: { 1: [{ code: "JAN1", name: "工友室＆校園營繕器材區", type: "office" }] }
    },
    {
      id: "animal_sci",
      name: "畜產館",
      englishName: "Animal Science Building",
      category: "tech",
      zone: "south_tech",
      x: -22.0, z: 146.0, w: 20.0, d: 64.0, rotY: 0,
      floors: 4, floorHeight: 5.5,
      style: "twin_tech",
      colors: {
        main: "#C8837B",
        secondary: "#B36A62",
        accent: "#F2F3F0",
        roof: "#9E4739"
      },
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
    {
      id: "civil_eng",
      name: "土木館",
      englishName: "Civil Engineering Building",
      category: "tech",
      zone: "south_tech",
      x: -56.0, z: 146.0, w: 20.0, d: 64.0, rotY: 0,
      floors: 4, floorHeight: 5.5,
      style: "twin_tech",
      colors: {
        main: "#CE8574",
        secondary: "#A86456",
        accent: "#F2F3F0",
        roof: "#9E4739"
      },
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
    {
      id: "horticulture",
      name: "園藝館",
      englishName: "Horticulture Building",
      category: "tech",
      zone: "south_tech",
      x: 38.0, z: 110.0, w: 42.0, d: 15.0, rotY: 0,
      floors: 3, floorHeight: 5.5,
      style: "horticulture",
      colors: {
        main: "#EAE8E3",
        secondary: "#C4C8CC",
        accent: "#9E6B66",
        roof: "#2B323B"
      },
      summary: "園藝技術學程館舍（3 層樓）。象牙白磁磚對稱立面，左右兩翼各有兩道高聳垂直圓拱凹槽，屋頂設有 3 組大型太陽能板，前庭為紅灰連鎖磚廣場與圓形花圃。",
      features: ["兩翼垂直圓拱頂凹槽造型", "前庭圓形植栽花圃廣場", "屋頂 3 組太陽能光電板"],
      floorsData: {
        1: [{ code: "HT1", name: "園藝技術學程一樓造景與實習空間", type: "lab" }],
        2: [{ code: "HT2", name: "園藝館二樓組織培養／實驗室", type: "lab" }],
        3: [{ code: "HT3", name: "園藝館三樓專科教室", type: "lab" }]
      }
    },
    {
      id: "farm_mgmt",
      name: "農經館（社團活動空間）",
      englishName: "Farm Management Building (Student Clubs)",
      category: "teaching",
      zone: "south_tech",
      x: 50.0, z: 158.0, w: 28.0, d: 26.0, rotY: 0,
      floors: 2, floorHeight: 5.5,
      style: "farm_mgmt",
      colors: {
        main: "#6E352C",
        secondary: "#9CC2D6",
        accent: "#BFDDF0",
        roof: "#2E353D"
      },
      summary: "牆題「農場經營館」（2 層樓ㄇ字型配置），目前沒有排課，作為學生社團活動空間使用。酒紅磚外牆搭配清爽的冰藍色圓拱長廊，屋頂架設大型太陽能光電棚架。",
      features: ["ㄇ字型中庭建築配置", "深酒紅磚配冰藍色圓拱窗長廊", "現供各學生社團活動使用"],
      floorsData: {
        1: [{ code: "FM1", name: "農經館一樓社團活動空間", type: "special" }],
        2: [{ code: "FM2", name: "農經館二樓社團練習與集會室", type: "special" }]
      }
    },

    // ================= 5. 西側運動與合作社／美術區 =================
    {
      id: "coop_art",
      name: "合作社大樓（1F 合作社／2F 美術教室）",
      englishName: "Co-op & Art Classroom Building",
      category: "facility",
      zone: "west_sport",
      x: -97.0, z: 5.0, w: 22.0, d: 15.0, rotY: 0,
      floors: 2, floorHeight: 5.6,
      style: "coop_art",
      colors: {
        main: "#CACCCF",
        secondary: "#3F5D46",
        accent: "#B89D4F",
        roof: "#9FA4A8"
      },
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
    {
      id: "swimming",
      name: "游泳館（游泳池）",
      englishName: "Swimming Building",
      category: "sport",
      zone: "west_sport",
      x: -138.0, z: 90.0, w: 44.0, d: 34.0, rotY: 0,
      floors: 2, floorHeight: 6.8,
      style: "swimming",
      colors: {
        main: "#C48880",
        secondary: "#7D4842",
        accent: "#8E9296",
        roof: "#7B828A"
      },
      summary: "2 層挑高室內標準游泳館（正面朝東）。東側正門設有中央挑高塔樓，二樓配置 3×4 水泥方格遮陽花格窗與金色「游泳館」牌匾，一樓為三道出入不銹鋼鐵捲門，兩翼設有二樓圓柱深挑外廊；南面與北面皆為平整雙色紅磚色立體牆面（1F 深紅褐磚、2F 粉褐磚＋長條氣窗帶）；館內一樓配置室內標準游泳池水道與體育組辦公室，二樓為看台觀眾席。",
      features: ["正面朝東：中央挑高塔樓、金色「游泳館」牌匾與 3×4 水泥花格窗", "一樓正門三道不銹鋼鐵捲門與兩側二樓圓柱深挑外廊", "南北雙向對稱平整紅磚色牆面與長條氣窗帶", "柱頭幾何菱形 ◇ 水泥浮雕與雙色丁掛磚"],
      floorsData: {
        1: [
          { code: "PE", name: "體育組辦公室", type: "office" },
          { code: "PE2", name: "體育器材室", type: "special" },
          { code: "SW1", name: "室內標準游泳池＆更衣淋浴區", type: "sport" }
        ],
        2: [
          { code: "SW2", name: "二樓看台觀眾席與機房層", type: "sport" }
        ]
      }
    },
    {
      id: "tennis_courts",
      name: "網球場（露天）",
      englishName: "Outdoor Tennis Courts",
      category: "sport",
      zone: "west_sport",
      x: -142.0, z: -71.0, w: 34.0, d: 46.0, rotY: 0,
      floors: 1, floorHeight: 1.2,
      style: "sport_court",
      courtLayout: "tennis_3",
      covered: false,
      colors: {
        main: "#9D2F2A",
        secondary: "#3F8A4F",
        accent: "#F4F6F8",
        roof: "#9D2F2A"
      },
      summary: "位於彩虹操場南側西半部的露天網球場，紅褐色場地面配置 3 面東西向標準綠色網球場與球網，西側緊鄰網球對牆練習區。",
      features: ["3 面東西向標準露天網球場", "紅褐底色配翠綠球場地面", "西側設有網球練習牆"],
      floorsData: {
        1: [
          { code: "TN1", name: "露天網球場 A～C 場", type: "sport" },
          { code: "TNW", name: "西側網球對牆練習區", type: "sport" }
        ]
      }
    },
    {
      id: "covered_basketball",
      name: "風雨籃球場",
      englishName: "Covered Solar Canopy Basketball Courts",
      category: "sport",
      zone: "west_sport",
      x: -105.0, z: -71.0, w: 34.0, d: 46.0, rotY: 0,
      floors: 1, floorHeight: 16.0,
      style: "sport_court",
      courtLayout: "basketball_3",
      covered: true,
      colors: {
        main: "#9D2F2A",
        secondary: "#65A877",
        accent: "#2F353B",
        roof: "#2B3238"
      },
      summary: "位於露天網球場東側、敬業樓與利用樓西側的挑高太陽能光電風雨籃球場，設有 3 面東西向標準籃球場，不受日曬雨淋影響。",
      features: ["挑高太陽能光電風雨鋼棚", "3 面東西向標準風雨籃球場", "亮蘋果綠防撞安全柱墊"],
      floorsData: {
        1: [
          { code: "CBC1", name: "風雨籃球場 A～C 場", type: "sport" }
        ]
      }
    },
    {
      id: "outdoor_basketball",
      name: "籃球場（露天）",
      englishName: "Outdoor Basketball Court",
      category: "sport",
      zone: "west_sport",
      x: -110.0, z: -29.0, w: 26.0, d: 16.0, rotY: 0,
      floors: 1, floorHeight: 1.2,
      style: "sport_court",
      courtLayout: "basketball_1",
      covered: false,
      colors: {
        main: "#9D2F2A",
        secondary: "#65A877",
        accent: "#F4F6F8",
        roof: "#9D2F2A"
      },
      summary: "位於風雨籃球場南側、合作社與風雨匹克球場北側的標準東西向露天籃球場。",
      features: ["標準東西向露天全場籃球場", "紅綠雙色標準球場鋪面與籃架"],
      floorsData: {
        1: [
          { code: "OBC1", name: "露天標準籃球場", type: "sport" }
        ]
      }
    },
    {
      id: "covered_volleyball_n",
      name: "風雨排球場（北區）",
      englishName: "North Covered Volleyball Courts",
      category: "sport",
      zone: "west_sport",
      x: -143.0, z: 3.0, w: 32.0, d: 30.0, rotY: 0,
      floors: 1, floorHeight: 15.6,
      style: "sport_court",
      courtLayout: "volleyball_2",
      covered: true,
      colors: {
        main: "#CD5B45",
        secondary: "#3E9252",
        accent: "#2F353B",
        roof: "#2A3038"
      },
      summary: "位於風雨匹克球場西側的風雨排球場（北區），橘紅底色配 2 面東西向標準綠色排球場，上方設有太陽能光電風雨鋼棚。",
      features: ["太陽能光電風雨鋼棚", "2 面東西向標準排球場"],
      floorsData: {
        1: [
          { code: "CVN1", name: "北區風雨排球場 A・B 場", type: "sport" }
        ]
      }
    },
    {
      id: "covered_pickleball",
      name: "風雨匹克球場",
      englishName: "Covered Pickleball Court",
      category: "sport",
      zone: "west_sport",
      x: -118.5, z: 3.0, w: 12.0, d: 26.0, rotY: 0,
      floors: 1, floorHeight: 15.0,
      style: "sport_court",
      courtLayout: "pickleball_1",
      covered: true,
      colors: {
        main: "#B8BFC6",
        secondary: "#8C98A4",
        accent: "#2F353B",
        roof: "#343C46"
      },
      summary: "位於合作社大樓西側與北區風雨排球場之間的淺灰色風雨匹克球場，上方覆蓋風雨鋼棚，提供新興匹克球運動教學與練習空間。",
      features: ["專屬風雨頂棚遮蔽", "南北向淺灰鋪面標準匹克球場"],
      floorsData: {
        1: [
          { code: "PKB1", name: "風雨匹克球場", type: "sport" }
        ]
      }
    },
    {
      id: "covered_volleyball_s",
      name: "風雨排球場（南區）",
      englishName: "South Covered Volleyball Courts",
      category: "sport",
      zone: "west_sport",
      x: -122.5, z: 41.0, w: 73.0, d: 30.0, rotY: 0,
      floors: 1, floorHeight: 16.0,
      style: "sport_court",
      courtLayout: "volleyball_4",
      covered: true,
      colors: {
        main: "#CD5B45",
        secondary: "#3E9252",
        accent: "#2F353B",
        roof: "#2A3038"
      },
      summary: "位於游泳館北側、合作社南側的大型風雨排球場（南區），橘紅場地內配置 2×2 共 4 面東西向標準綠色排球場，覆蓋大型太陽能光電風雨鋼棚。",
      features: ["大型太陽能光電風雨大鋼棚", "4 面東西向標準排球場（2×2 配置）"],
      floorsData: {
        1: [
          { code: "CVS1", name: "南區風雨排球場 A～D 場", type: "sport" }
        ]
      }
    },
    {
      id: "track_field",
      name: "田徑操場",
      englishName: "Athletics Track & Field",
      category: "sport",
      zone: "west_sport",
      x: -128.0, z: -170.0, w: 58.0, d: 118.0, rotY: 0,
      floors: 1, floorHeight: 1.0,
      style: "track",
      colors: {
        main: "#9D3528",
        secondary: "#4A92C8",
        accent: "#558C45",
        roof: "#F4F4F0"
      },
      summary: "南大附中標準紅褐色 PU 田徑場，外緣設有天藍色排水邊溝，內側環繞翠綠中央草皮，東側設有司令台看台與球門。",
      features: ["標準紅褐 PU 跑道（外緣天藍色邊溝）", "中央天然草皮足球／田徑場", "東側司令台與看台"],
      floorsData: {
        1: [{ code: "TRK", name: "PU 跑道＆東側司令台", type: "sport" }]
      }
    },
    {
      id: "hort_teach_shed",
      name: "園藝教學區",
      englishName: "Horticulture Teaching Area",
      category: "teaching",
      zone: "south_tech",
      x: 19.5, z: 157.0, w: 17.0, d: 24.0, rotY: 0,
      floors: 1, floorHeight: 7.2,
      style: "hort_teach_shed",
      colors: {
        main: "#A6B1B8",
        secondary: "#687580",
        accent: "#C5A059",
        roof: "#4E5A65"
      },
      summary: "位於農經館西側草坪之園藝專用高架鋼構教學大棚架，設有銀灰 H 型鋼骨柱列、X 型交叉斜撐、高架實作平台與雙斜金屬光電頂棚，供園藝植物栽培與農作實務操作使用。",
      features: ["挑高雙斜採光鋼構棚架", "銀灰鋼骨結構與 X 型交叉斜撐", "高架教學操作實務平台"],
      floorsData: {
        1: [{ code: "HT1", name: "園藝教學操作場", type: "lab" }]
      }
    }
  ],

  // 校園道路與行人導航路網節點 (完全貼合 aa190fc6a5da5710e0aea63299779c6c.PNG 中的黑色道路線)
  navNodes: {
    "n_gate": { x: 0, z: -176, label: "校門口警衛室" },
    "n_roundabout": { x: 0, z: -162, label: "校門圓形廣場" },
    "n_blvd_m": { x: 0, z: -125, label: "中央迎賓大道" },
    "n_blvd_s": { x: 0, z: -96, label: "行政／敬業穿堂圓環" },
    "n_legeng_n": { x: 0, z: -75, label: "樂耕樓北門道路" },
    "n_admin": { x: 42, z: -75, label: "行政大樓前" },
    "n_jingye": { x: -36, z: -75, label: "敬業樓前" },
    "n_act": { x: -36, z: -156, label: "活動中心北門車道" },
    "n_wshed": { x: -54, z: -188, label: "西側車棚前" },
    "n_ne_diag": { x: 45, z: -138, label: "東北側斜向車道" },
    "n_sshed": { x: 76, z: -92, label: "學生車棚旁" },
    "n_catering": { x: 108, z: -75, label: "餐飲館前" },
    "n_quad_c": { x: 0, z: -3, label: "中庭十字步道中心" },
    "n_liyong": { x: -42, z: -3, label: "利用樓中庭走廊" },
    "n_housheng": { x: 42, z: -3, label: "厚生樓中庭走廊" },
    "n_zhengde_n": { x: 0, z: 28, label: "正德樓中庭側" },
    "n_zhengde_s": { x: 0, z: 62, label: "正德樓南側穿堂口" },
    "n_zhengde_s2": { x: 0, z: 86, label: "正德樓南側第二車道" },
    "n_west_rd_n": { x: -80, z: -156, label: "西側主幹道北段" },
    "n_west_rd_m1": { x: -80, z: -75, label: "西側主幹道（敬業樓口）" },
    "n_west_rd_m2": { x: -80, z: -3, label: "西側主幹道（利用樓口）" },
    "n_west_rd_s1": { x: -80, z: 62, label: "西側主幹道（正德樓南口）" },
    "n_west_rd_s2": { x: -80, z: 86, label: "西側主幹道（游泳館口）" },
    "n_west_rd_end": { x: -80, z: 193, label: "西側主幹道南端" },
    "n_track": { x: -95, z: -156, label: "彩虹操場入口" },
    "n_ncourts": { x: -92, z: -68, label: "北座風雨球場入口" },
    "n_coop": { x: -84, z: 8, label: "合作社／美術教室入口" },
    "n_scourts": { x: -96, z: 32, label: "南座風雨球場入口" },
    "n_swim": { x: -112, z: 86, label: "游泳館正門" },
    "n_east_rd_n": { x: 76, z: -75, label: "東側主幹道北口" },
    "n_east_rd_m1": { x: 76, z: -5, label: "東側主幹道（烹飪／日式平房口）" },
    "n_east_rd_m2": { x: 76, z: 62, label: "東側主幹道（正德樓東口）" },
    "n_east_rd_s1": { x: 76, z: 86, label: "東側主幹道（食品加工館口）" },
    "n_east_rd_s2": { x: 76, z: 132, label: "東側主幹道（書庫／農經館口）" },
    "n_east_rd_end": { x: 74, z: 181, label: "東側主幹道南端" },
    "n_far_east_n": { x: 136, z: -60, label: "東外環車道北段" },
    "n_far_east_m1": { x: 136, z: -5, label: "東外環車道（樂揚／資源室口）" },
    "n_far_east_m2": { x: 136, z: 52, label: "東外環車道（圖書館／機械館北口）" },
    "n_far_east_s1": { x: 136, z: 95, label: "東外環車道（機械館／加工工廠口）" },
    "n_far_east_s2": { x: 136, z: 150, label: "東外環車道（工友室／書庫口）" },
    "n_hort": { x: 38, z: 86, label: "園藝館前庭廣場" },
    "n_animal": { x: -22, z: 86, label: "畜產館北口廣場" },
    "n_civil": { x: -56, z: 86, label: "土木館北口廣場" },
    "n_farm_mgmt": { x: 50, z: 132, label: "農經館前道路" },
    "n_hort_shed": { x: 4, z: 157, label: "園藝教學區前道路" }
  },

  navEdges: [
    ["n_gate", "n_roundabout"],
    ["n_roundabout", "n_blvd_m"],
    ["n_blvd_m", "n_blvd_s"],
    ["n_blvd_s", "n_legeng_n"],
    ["n_roundabout", "n_wshed"],
    ["n_wshed", "n_act"],
    ["n_act", "n_west_rd_n"],
    ["n_roundabout", "n_ne_diag"],
    ["n_ne_diag", "n_sshed"],
    ["n_sshed", "n_east_rd_n"],
    ["n_west_rd_n", "n_track"],
    ["n_west_rd_n", "n_west_rd_m1"],
    ["n_west_rd_m1", "n_jingye"],
    ["n_jingye", "n_legeng_n"],
    ["n_legeng_n", "n_admin"],
    ["n_admin", "n_east_rd_n"],
    ["n_east_rd_n", "n_catering"],
    ["n_catering", "n_far_east_n"],
    ["n_west_rd_m1", "n_ncourts"],
    ["n_west_rd_m1", "n_west_rd_m2"],
    ["n_west_rd_m2", "n_coop"],
    ["n_coop", "n_scourts"],
    ["n_west_rd_m2", "n_west_rd_s1"],
    ["n_west_rd_s1", "n_west_rd_s2"],
    ["n_west_rd_s2", "n_swim"],
    ["n_west_rd_s2", "n_civil"],
    ["n_west_rd_s2", "n_west_rd_end"],
    ["n_legeng_n", "n_quad_c"],
    ["n_quad_c", "n_liyong"],
    ["n_quad_c", "n_housheng"],
    ["n_quad_c", "n_zhengde_n"],
    ["n_zhengde_n", "n_zhengde_s"],
    ["n_zhengde_s", "n_zhengde_s2"],
    ["n_west_rd_s1", "n_zhengde_s"],
    ["n_zhengde_s", "n_east_rd_m2"],
    ["n_civil", "n_animal"],
    ["n_animal", "n_zhengde_s2"],
    ["n_zhengde_s2", "n_hort"],
    ["n_hort", "n_east_rd_s1"],
    ["n_east_rd_n", "n_east_rd_m1"],
    ["n_east_rd_m1", "n_east_rd_m2"],
    ["n_east_rd_m2", "n_east_rd_s1"],
    ["n_east_rd_s1", "n_east_rd_s2"],
    ["n_east_rd_s2", "n_east_rd_end"],
    ["n_east_rd_m1", "n_far_east_m1"],
    ["n_far_east_n", "n_far_east_m1"],
    ["n_far_east_m1", "n_far_east_m2"],
    ["n_east_rd_m2", "n_far_east_m2"],
    ["n_far_east_m2", "n_far_east_s1"],
    ["n_far_east_s1", "n_far_east_s2"],
    ["n_east_rd_s2", "n_farm_mgmt"],
    ["n_farm_mgmt", "n_hort_shed"],
    ["n_zhengde_s2", "n_hort_shed"],
    ["n_west_rd_end", "n_east_rd_end"],
    ["n_east_rd_end", "n_far_east_s2"]
  ],

  // 建築物對應導航節點
  buildingNavNode: {
    main_gate: "n_gate",
    admin: "n_admin",
    jingye: "n_jingye",
    activity: "n_act",
    west_shed: "n_wshed",
    student_shed: "n_sshed",
    legeng: "n_legeng_n",
    liyong: "n_liyong",
    zhengde: "n_zhengde_n",
    housheng: "n_housheng",
    library: "n_far_east_m2",
    old_art: "n_east_rd_m1",
    catering: "n_catering",
    cooking: "n_east_rd_m1",
    yueyang: "n_far_east_m1",
    recycling: "n_far_east_m1",
    food_proc: "n_east_rd_s1",
    factory: "n_far_east_s1",
    book_depot: "n_east_rd_s2",
    mechanical: "n_far_east_s1",
    janitor: "n_far_east_s2",
    animal_sci: "n_animal",
    civil_eng: "n_civil",
    horticulture: "n_hort",
    farm_mgmt: "n_farm_mgmt",
    coop_art: "n_coop",
    swimming: "n_swim",
    tennis_courts: "n_ncourts",
    covered_basketball: "n_ncourts",
    outdoor_basketball: "n_coop",
    covered_volleyball_n: "n_scourts",
    covered_pickleball: "n_coop",
    covered_volleyball_s: "n_scourts",
    track_field: "n_track",
    hort_teach_shed: "n_hort_shed"
  }
};
