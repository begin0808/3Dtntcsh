// 國立臺南大學附屬高級中學 (TNTCSH) 3D 校園資料庫：建築位置與外觀、道路、校界、導航路網
// 依據：OpenStreetMap 實測座標 (way/161510567)、校園平面圖 (aa190fc6a5da5710e0aea63299779c6c.PNG 黑線道路網)、
//       115學年度班級教室配置圖 (d1e8d63ca67ed612bb52f370f34697f4.PNG)、以及現場 43 張實景照片整理
// 每學年會變動的建築名稱、介紹與各樓層教室配置在 data/school-year.js (需在本檔之前載入)

window.CAMPUS_DATA = {
  school: {
    name: "國立臺南大學附屬高級中學",
    shortName: "國立南大附中",
    englishName: "The Affiliated Senior High School of National University of Tainan",
    address: "710034 臺南市永康區中山南路948號",
    academicYear: "", // 由 data/school-year.js 填入
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
      summary: "設於 4 層樓丁掛紫紅磚外觀之「機械館」（中央懸挑大弧形門廳、中間偏右設有新建齒輪圖騰無障礙電梯），配置精密機械加工、CNC 數值控制、電腦輔助製圖（CAD）與機電整合工場。"
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
    photoNote: "班級教室配置與校園空間配置資料由本校彙整建置。"
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

  // 校內人行步道 (以磚色鋪面繪製，與黑色車道區分；導航節點見 navNodes 7b)
  // 西側球場區兩條東西向步道，讓每座球場都有自己的入口：
  //   北步道 z = -42.5：風雨球場南側與露天籃球場北側之間 → 網球場、露天籃球場
  //   南步道 z = -16.5：露天籃球場南側與北排球場北側之間 → 北排球場、匹克球場
  // 步道起點設在西側主幹道內緣 (x = -82)，端點圓角藏在車道下方，不與車道重疊在同一平面
  walkways: [
    { points: [[-82.0, -42.5], [-156.0, -42.5], [-156.0, -48.0]], width: 3.5 },
    { points: [[-110.0, -42.5], [-110.0, -37.0]], width: 3.5 },
    { points: [[-82.0, -16.5], [-143.0, -16.5], [-143.0, -12.0]], width: 3.5 },
    { points: [[-118.5, -16.5], [-118.5, -10.0]], width: 3.5 },
    // 東側主幹道 (z = 40) 斜向至圖書館西側正門，經原美術教室南端外側
    { points: [[76.0, 40.0], [107.0, 23.0]], width: 3.0 },
    // 圖書館北側道路至資訊應用學程北側入口
    { points: [[122.0, -3.0], [122.0, 0.0]], width: 3.0 }
  ],

  // 同一棟建築的其他入口：在導航選單中與建築並列為獨立項目；搜尋到 floors 所列樓層的教室時也改走此入口
  extraNavTargets: [
    { id: "library_info", building: "library", node: "n_info_entrance", name: "資訊應用學程（圖書館北側入口 3F）", floors: [3] }
  ],

  // 建築物與場域清單 (僅保留主要教學校區，座標對齊 OSM 與校園平面圖)
  buildings: [
    // ================= 1. 北側校門與行政集會區 =================
    {
      id: "main_gate",
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
    },
    {
      id: "admin",
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
    },
    {
      id: "jingye",
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
    },
    {
      id: "activity",
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
    },
    {
      id: "west_shed",
      englishName: "North-West Parking Shed",
      category: "facility",
      zone: "north",
      x: -54.0, z: -198.0, w: 38.0, d: 15.0, rotY: 0,
      floors: 1, floorHeight: 4.8,
      style: "shed",
      colors: { main: "#CFD6DC", secondary: "#9A9A94", accent: "#4A4E52", roof: "#4A4E52" },
    },
    {
      id: "student_shed",
      englishName: "Student Scooter & Bike Shed",
      category: "facility",
      zone: "north",
      x: 88.5, z: -92.0, w: 13.0, d: 34.0, rotY: 0,
      floors: 1, floorHeight: 4.8,
      style: "shed_green",
      colors: { main: "#9A9A94", secondary: "#8C8980", accent: "#6E967B", roof: "#9AB8A4" },
    },

    // ================= 2. 中庭教學區教學核心區 =================
    {
      id: "legeng",
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
    },
    {
      id: "liyong",
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
    },
    {
      id: "zhengde",
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
    },
    {
      id: "housheng",
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
    },

    // ================= 3. 東側圖書、資訊、餐飲與食品加工區 =================
    {
      id: "library",
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
    },
    {
      id: "old_art",
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
    },
    {
      id: "catering",
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
    },
    {
      id: "cooking",
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
    },
    {
      id: "yueyang",
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
    },
    {
      id: "recycling",
      englishName: "Resource & Recycling Room",
      category: "facility",
      zone: "east",
      x: 152.0, z: 12.0, w: 14.0, d: 28.0, rotY: 0,
      floors: 1, floorHeight: 5.6,
      style: "flat_util",
      colors: { main: "#96948F", secondary: "#8DA3AD", accent: "#736E68", roof: "#595855" },
    },
    {
      id: "food_proc",
      englishName: "Food Processing Building",
      category: "tech",
      zone: "east",
      x: 100.0, z: 78.0, w: 15.0, d: 38.0, rotY: 0,
      floors: 3, centerTowerFloors: 4, floorHeight: 5.5,
      style: "food_proc",
      colors: {
        main: "#D48C74",
        secondary: "#9E6350",
        accent: "#E5E0D8",
        roof: "#4A525A"
      },
    },
    {
      id: "factory",
      englishName: "Processing Workshop",
      category: "tech",
      zone: "east",
      x: 122.0, z: 78.0, w: 14.0, d: 38.0, rotY: 0,
      floors: 2, floorHeight: 5.6,
      style: "factory",
      colors: {
        main: "#A8AAAC",
        secondary: "#C9CC98",
        accent: "#787A7D",
        roof: "#2F3337"
      },
    },
    {
      id: "book_depot",
      englishName: "Book Depository",
      category: "facility",
      zone: "east",
      x: 120.0, z: 128.0, w: 15.0, d: 36.0, rotY: 0,
      floors: 4, floorHeight: 5.3,
      style: "book_depot",
      colors: {
        main: "#FFFFFF",
        secondary: "#B8CF78",
        accent: "#9BB85C",
        roof: "#D8E0DC"
      },
    },

    // ================= 4. 南側專業群科館舍區 =================
    {
      id: "mechanical",
      englishName: "Mechanical Engineering Building",
      category: "tech",
      zone: "south_tech",
      x: 161.0, z: 86.0, w: 15.0, d: 44.0, rotY: 0,
      floors: 4, floorHeight: 4.2,
      badgeText: "4F",
      style: "mechanical",
      colors: {
        main: "#9E5456",
        secondary: "#D47A7E",
        accent: "#F0EDE6",
        roof: "#8C9298"
      },
    },
    {
      id: "janitor",
      englishName: "Campus Maintenance & Janitor Office",
      category: "facility",
      zone: "south_tech",
      x: 160.0, z: 152.0, w: 13.0, d: 28.0, rotY: 0,
      floors: 1, floorHeight: 5.8,
      style: "janitor",
      colors: { main: "#DFD6AE", secondary: "#A6A49B", accent: "#6E7378", roof: "#4A4B46" },
    },
    {
      id: "animal_sci",
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
    },
    {
      id: "civil_eng",
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
    },
    {
      id: "horticulture",
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
    },
    {
      id: "farm_mgmt",
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
    },

    // ================= 5. 西側運動與合作社／美術區 =================
    {
      id: "coop_art",
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
    },
    {
      id: "swimming",
      englishName: "Swimming Building",
      category: "sport",
      zone: "west_sport",
      x: -138.0, z: 90.0, w: 44.0, d: 34.0, rotY: 0,
      floors: 1, floorHeight: 13.6,
      badgeText: "挑高 1F",
      style: "swimming",
      colors: {
        main: "#C48880",
        secondary: "#7D4842",
        accent: "#8E9296",
        roof: "#C48880"
      },
    },
    {
      id: "tennis_courts",
      englishName: "Outdoor Tennis Courts",
      category: "sport",
      zone: "west_sport",
      x: -142.0, z: -71.0, w: 34.0, d: 46.0, rotY: 0,
      floors: 1, floorHeight: 1.2,
      style: "sport_court",
      courtLayout: "tennis_3",
      covered: false,
      // 露天網球場四周高圍網 (防止球打出場外)；大門在南側靠西端 (gateAt 為大門中心的本地 x 座標，對齊導航入口 n_tennis_entrance)
      fence: { height: 4.0, gateSide: "south", gateAt: -14.0, gateWidth: 3.0 },
      colors: {
        main: "#9D2F2A",
        secondary: "#3F8A4F",
        accent: "#F4F6F8",
        roof: "#9D2F2A"
      },
    },
    {
      id: "covered_basketball",
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
    },
    {
      id: "outdoor_basketball",
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
    },
    {
      id: "covered_volleyball_n",
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
    },
    {
      id: "covered_pickleball",
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
    },
    {
      id: "covered_volleyball_s",
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
    },
    {
      id: "track_field",
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
    },
    {
      id: "hort_teach_shed",
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
    }
  ],

  // 校園道路與行人導航路網節點 (嚴格貼合 internalRoads 黑色車道網與各建築迎賓玄關，絕不切過草皮或大樓邊角)
  navNodes: {
    // 1. 北側校門與行政集會區
    "n_gate": { x: 0, z: -176, label: "校門口警衛室前" },
    "n_roundabout": { x: 0, z: -162, label: "校門圓形廣場中央" },
    "n_roundabout_w": { x: -14, z: -156, label: "活動中心東北車道" },
    "n_roundabout_e": { x: 14, z: -162, label: "校門圓環東側出入口" },
    "n_ne_diag": { x: 74, z: -122, label: "東北斜向車道轉折點" },
    "n_sshed": { x: 74, z: -92, label: "學生車棚旁（東幹道）" },
    "n_blvd_m": { x: 0, z: -125, label: "中央迎賓大道" },
    "n_blvd_s": { x: 0, z: -96, label: "迎賓大道行政大樓路口" },
    "n_act": { x: -36, z: -156, label: "活動中心北門車道" },
    "n_wshed": { x: -54, z: -188, label: "西側車棚前" },

    // 2. 敬業／樂耕／行政 東西向校道 (z = -75)
    "n_west_rd_m1": { x: -80, z: -75, label: "西側主幹道（敬業樓口）" },
    "n_jingye": { x: -36, z: -75, label: "敬業樓前" },
    "n_legeng_n": { x: 0, z: -75, label: "樂耕樓北門道路" },
    "n_admin": { x: 43, z: -75, label: "行政大樓前" },
    "n_east_rd_n": { x: 74, z: -75, label: "東側主幹道北路口" },

    // 3. 東側主幹道 (x = 74)
    "n_east_rd_66": { x: 74, z: -66, label: "東側主幹道（餐飲館西口）" },
    "n_east_rd_37": { x: 74, z: -37, label: "東側主幹道（烹飪教室西北口）" },
    "n_east_rd_m1": { x: 74, z: -5, label: "東側主幹道（烹飪南／圖書館西北口）" },
    "n_cooking_road": { x: 74, z: -21, label: "烹飪教室西側道路" },
    "n_lib_walk_road": { x: 74, z: 40, label: "東側主幹道（圖書館步道口）" },
    "n_library_entrance": { x: 107, z: 23, label: "圖書館大樓西側正門" },
    "n_east_rd_52": { x: 74, z: 52, label: "東側主幹道（圖書館西南口）" },
    "n_east_rd_s1": { x: 74, z: 86, label: "東側主幹道（食品加工館西口）" },
    "n_food_road": { x: 74, z: 78, label: "食品加工館西側車道" },
    "n_food_entrance": { x: 92.5, z: 78, label: "食品加工館正門" },
    "n_east_rd_s2": { x: 74, z: 132, label: "東側主幹道（書庫西口）" },
    "n_book_road": { x: 74, z: 128, label: "書庫大樓西側車道" },
    "n_book_entrance": { x: 112.5, z: 128, label: "書庫大樓正門" },
    "n_east_rd_end": { x: 74, z: 181, label: "東側主幹道南端" },

    // 4. 餐飲館與烹飪／樂揚周邊車道
    "n_catering_n": { x: 114, z: -66, label: "餐飲館正門前車道" },
    "n_catering_entrance": { x: 114, z: -74, label: "餐飲館正門迎賓階梯" },
    "n_far_east_66": { x: 136, z: -66, label: "東北車道北口（餐飲館東）" },
    "n_catering_s": { x: 114, z: -37, label: "綠地區南側車道中段" },
    "n_far_east_37": { x: 136, z: -37, label: "東外環車道（樂揚樓東北）" },

    // 5. 最東側南北向主幹道 (x = 136)
    "n_yueyang_road": { x: 136, z: -21, label: "東外環車道（樂揚樓東）" },
    "n_far_east_m1": { x: 136, z: -5, label: "東外環車道（資源室西門）" },
    "n_library_road": { x: 136, z: 24, label: "東外環車道（圖書館東側）" },
    "n_info_road": { x: 122, z: -5, label: "圖書館北側道路（資訊學程門口）" },
    "n_info_entrance": { x: 122, z: 0, label: "資訊應用學程北側入口" },
    "n_far_east_m2": { x: 136, z: 52, label: "東外環車道（圖書館東南口）" },
    "n_factory_road": { x: 136, z: 78, label: "東外環車道（加工工廠東口）" },
    "n_factory_entrance": { x: 129, z: 78, label: "加工工廠正門" },
    "n_mech_road": { x: 136, z: 86, label: "東外環車道（機械館正門口）" },
    "n_mech_entrance": { x: 153.5, z: 86, label: "機械館正門迎賓大廳" },
    "n_far_east_110": { x: 136, z: 110, label: "東外環車道（機械館西南口）" },
    "n_far_east_s2": { x: 136, z: 150, label: "東外環車道（工友室／書庫東口）" },
    "n_janitor_entrance": { x: 153.5, z: 152, label: "工友室正門" },
    "n_far_east_end": { x: 136, z: 180.5, label: "東外環車道南端" },

    // 6. 中庭教學區步道
    "n_quad_c": { x: 0, z: -3, label: "中庭十字步道中心" },
    "n_liyong": { x: -42, z: -3, label: "利用樓中庭走廊" },
    "n_housheng": { x: 42, z: -3, label: "厚生樓中庭走廊" },
    "n_zhengde_n": { x: 0, z: 28, label: "正德樓中庭穿堂北口" },
    "n_zhengde_s": { x: 0, z: 48, label: "正德樓南側穿堂口" },
    "n_zhengde_s2": { x: 0, z: 86, label: "正德樓南側車道口" },

    // 7. 西側南北向主幹道 (x = -80)
    "n_west_rd_n": { x: -80, z: -156, label: "西側主幹道（活動中心路口）" },
    "n_track_n": { x: -80, z: -245, label: "西側主幹道北端（操場北）" },
    "n_track": { x: -95, z: -156, label: "田徑操場東側入口" },
    "n_west_rd_71": { x: -80, z: -71, label: "西側主幹道（風雨籃球場東口）" },
    "n_cbasket_entrance": { x: -88, z: -71, label: "風雨籃球場東側入口" },
    "n_west_rd_42": { x: -80, z: -42.5, label: "西側主幹道（球場北步道口）" },
    "n_west_rd_16": { x: -80, z: -16.5, label: "西側主幹道（球場南步道口）" },
    "n_west_rd_m2": { x: -80, z: 0, label: "西側主幹道（利用樓西口）" },
    "n_west_rd_8": { x: -80, z: 8, label: "西側主幹道（合作社東口）" },
    "n_coop": { x: -86, z: 8, label: "合作社東側入口" },
    "n_west_rd_41": { x: -80, z: 41, label: "西側主幹道（南排球場東口）" },
    "n_vball_s_entrance": { x: -86, z: 41, label: "南座風雨排球場東側入口" },
    "n_west_rd_62": { x: -80, z: 62, label: "西側主幹道（游泳館北口）" },

    // 7b. 西側球場區人行步道 (walkways)：每座球場各自的入口
    "n_lane_n_110": { x: -110, z: -42.5, label: "球場北步道（露天籃球場北口）" },
    "n_obasket_entrance": { x: -110, z: -37, label: "露天籃球場北側入口" },
    "n_lane_n_156": { x: -156, z: -42.5, label: "球場北步道西端" },
    "n_tennis_entrance": { x: -156, z: -48, label: "網球場西南角入口" },
    "n_lane_s_118": { x: -118.5, z: -16.5, label: "球場南步道（匹克球場北口）" },
    "n_pickle_entrance": { x: -118.5, z: -10, label: "匹克球場北側入口" },
    "n_lane_s_143": { x: -143, z: -16.5, label: "球場南步道西端" },
    "n_vball_n_entrance": { x: -143, z: -12, label: "北座風雨排球場北側入口" },
    "n_west_rd_s2": { x: -80, z: 86, label: "西側主幹道（游泳館南口）" },
    "n_swim_loop": { x: -105, z: 88, label: "游泳館聯絡車道" },
    "n_swim": { x: -116, z: 86, label: "游泳館正門" },
    "n_west_rd_end": { x: -80, z: 193.3, label: "西側主幹道南端" },

    // 8. 正德樓南側橫向車道 (z = 86) 與土木館／畜產館專屬正門口 (土木館西側紅色星星、畜產館東側紅色星星)
    "n_civil_road": { x: -80, z: 146, label: "西側主幹道（土木館西口）" },
    "n_civil_entrance": { x: -66, z: 146, label: "土木館西側正門入口" },
    "n_animal_road": { x: 4, z: 146, label: "中央南幹道（畜產館東口）" },
    "n_animal_entrance": { x: -12, z: 146, label: "畜產館東側正門入口" },
    "n_hort": { x: 38, z: 86, label: "園藝館北口車道" },
    "n_hort_entrance": { x: 38, z: 102.5, label: "園藝館正門" },

    // 9. 正德樓往南中央通道與農經／園藝區
    "n_south_path_110": { x: 4, z: 110, label: "畜產館東側道路" },
    "n_farm_mgmt": { x: 50, z: 132, label: "農經館前道路" },
    "n_farm_entrance": { x: 50, z: 145, label: "農經館正門" },
    "n_hort_shed": { x: 4, z: 157, label: "園藝教學區前道路" },
    "n_south_gate": { x: 4, z: 186, label: "南門出入口道路" },

    // 10. 南界橫向主幹道
    "n_south_rd_w": { x: -174, z: 201.2, label: "南界圍牆西端車道" },
    "n_south_rd_e": { x: 168, z: 180.3, label: "南界圍牆東端車道" }
  },

  navEdges: [
    // 1. 校門進場與迎賓大道
    ["n_gate", "n_roundabout"],
    ["n_roundabout", "n_blvd_m"],
    ["n_blvd_m", "n_blvd_s"],
    ["n_blvd_s", "n_legeng_n"],
    ["n_roundabout", "n_roundabout_w"],
    ["n_roundabout_w", "n_act"],
    ["n_act", "n_west_rd_n"],
    ["n_roundabout_w", "n_wshed"],
    ["n_roundabout", "n_roundabout_e"],
    ["n_roundabout_e", "n_ne_diag"],
    ["n_ne_diag", "n_sshed"],
    ["n_sshed", "n_east_rd_n"],

    // 2. 西側主幹道 (x = -80)
    ["n_track_n", "n_west_rd_n"],
    ["n_west_rd_n", "n_track"],
    ["n_west_rd_n", "n_west_rd_m1"],
    ["n_west_rd_m1", "n_west_rd_71"],
    ["n_west_rd_71", "n_cbasket_entrance"],
    ["n_west_rd_71", "n_west_rd_42"],
    ["n_west_rd_42", "n_west_rd_16"],
    ["n_west_rd_16", "n_west_rd_m2"],
    ["n_west_rd_m2", "n_west_rd_8"],
    ["n_west_rd_8", "n_coop"],
    ["n_west_rd_8", "n_west_rd_41"],
    ["n_west_rd_41", "n_vball_s_entrance"],
    ["n_west_rd_41", "n_west_rd_62"],
    ["n_west_rd_62", "n_west_rd_s2"],

    // 2b. 西側球場區人行步道
    ["n_west_rd_42", "n_lane_n_110"],
    ["n_lane_n_110", "n_obasket_entrance"],
    ["n_lane_n_110", "n_lane_n_156"],
    ["n_lane_n_156", "n_tennis_entrance"],
    ["n_west_rd_16", "n_lane_s_118"],
    ["n_lane_s_118", "n_pickle_entrance"],
    ["n_lane_s_118", "n_lane_s_143"],
    ["n_lane_s_143", "n_vball_n_entrance"],
    ["n_west_rd_s2", "n_swim_loop"],
    ["n_swim_loop", "n_swim"],
    ["n_west_rd_s2", "n_west_rd_end"],

    // 3. 敬業／樂耕／行政 東西向校道 (z = -75)
    ["n_west_rd_m1", "n_jingye"],
    ["n_jingye", "n_legeng_n"],
    ["n_legeng_n", "n_admin"],
    ["n_admin", "n_east_rd_n"],

    // 4. 東側主幹道 (x = 74)
    ["n_east_rd_n", "n_east_rd_66"],
    ["n_east_rd_66", "n_east_rd_37"],
    ["n_east_rd_37", "n_cooking_road"],
    ["n_cooking_road", "n_east_rd_m1"],
    ["n_east_rd_m1", "n_lib_walk_road"],
    ["n_lib_walk_road", "n_east_rd_52"],
    ["n_lib_walk_road", "n_library_entrance"], // 斜向人行步道至圖書館西側正門
    ["n_east_rd_52", "n_food_road"],
    ["n_food_road", "n_east_rd_s1"],
    ["n_food_road", "n_food_entrance"],
    ["n_east_rd_s1", "n_book_road"],
    ["n_book_road", "n_east_rd_s2"],
    ["n_book_road", "n_book_entrance"],
    ["n_east_rd_s2", "n_east_rd_end"],

    // 5. 餐飲館與烹飪／樂揚車道
    ["n_east_rd_66", "n_catering_n"],
    ["n_catering_n", "n_catering_entrance"],
    ["n_catering_n", "n_far_east_66"],
    ["n_catering_n", "n_catering_s"],
    ["n_catering_s", "n_east_rd_37"],
    ["n_catering_s", "n_far_east_37"],

    // 6. 最東側南北向主幹道 (x = 136)
    ["n_far_east_66", "n_far_east_37"],
    ["n_far_east_37", "n_yueyang_road"],
    ["n_yueyang_road", "n_far_east_m1"],
    ["n_east_rd_m1", "n_info_road"],
    ["n_info_road", "n_far_east_m1"],
    ["n_info_road", "n_info_entrance"],
    ["n_far_east_m1", "n_library_road"],
    ["n_library_road", "n_far_east_m2"],
    ["n_east_rd_52", "n_far_east_m2"],
    ["n_far_east_m2", "n_factory_road"],
    ["n_factory_road", "n_factory_entrance"],
    ["n_factory_road", "n_mech_road"],
    ["n_mech_road", "n_mech_entrance"],
    ["n_mech_road", "n_far_east_110"],
    ["n_far_east_110", "n_far_east_s2"],
    ["n_far_east_s2", "n_janitor_entrance"],
    ["n_far_east_s2", "n_far_east_end"],

    // 7. 中庭教學區步道
    ["n_legeng_n", "n_quad_c"],
    ["n_quad_c", "n_liyong"],
    ["n_quad_c", "n_housheng"],
    ["n_quad_c", "n_zhengde_n"],
    ["n_zhengde_n", "n_zhengde_s"],
    ["n_zhengde_s", "n_zhengde_s2"],

    // 8. 正德樓南側橫向車道 (z = 86) 與土木館西側正門 (左側紅色星星)
    ["n_west_rd_s2", "n_zhengde_s2"],
    ["n_west_rd_s2", "n_civil_road"],
    ["n_civil_road", "n_civil_entrance"],
    ["n_civil_road", "n_west_rd_end"],
    ["n_zhengde_s2", "n_hort"],
    ["n_hort", "n_hort_entrance"],
    ["n_hort", "n_east_rd_s1"],

    // 9. 正德樓往南中央通道與畜產館東側正門 (右側紅色星星)／農經／園藝區
    ["n_zhengde_s2", "n_south_path_110"],
    ["n_south_path_110", "n_animal_road"],
    ["n_animal_road", "n_animal_entrance"],
    ["n_animal_road", "n_hort_shed"],
    ["n_animal_road", "n_farm_mgmt"],
    ["n_farm_mgmt", "n_farm_entrance"],
    ["n_farm_mgmt", "n_east_rd_s2"],
    ["n_hort_shed", "n_south_gate"],

    // 10. 南界橫向主幹道
    ["n_south_rd_w", "n_west_rd_end"],
    ["n_west_rd_end", "n_south_gate"],
    ["n_south_gate", "n_east_rd_end"],
    ["n_east_rd_end", "n_far_east_end"],
    ["n_far_east_end", "n_south_rd_e"]
  ],

  // 建築物對應導航節點 (直達建築正門入口／路口迎賓玄關，絕不射入建築中央或斜切草坪)
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
    library: "n_library_entrance",
    old_art: "n_east_rd_m1",
    catering: "n_catering_entrance",
    cooking: "n_cooking_road",
    yueyang: "n_yueyang_road",
    recycling: "n_far_east_m1",
    food_proc: "n_food_entrance",
    factory: "n_factory_entrance",
    book_depot: "n_book_entrance",
    mechanical: "n_mech_entrance",
    janitor: "n_janitor_entrance",
    animal_sci: "n_animal_entrance",
    civil_eng: "n_civil_entrance",
    horticulture: "n_hort_entrance",
    farm_mgmt: "n_farm_entrance",
    coop_art: "n_coop",
    swimming: "n_swim",
    tennis_courts: "n_tennis_entrance",
    covered_basketball: "n_cbasket_entrance",
    outdoor_basketball: "n_obasket_entrance",
    covered_volleyball_n: "n_vball_n_entrance",
    covered_pickleball: "n_pickle_entrance",
    covered_volleyball_s: "n_vball_s_entrance",
    track_field: "n_track",
    hort_teach_shed: "n_hort_shed"
  }
};

// ================= 合併每學年資料 (data/school-year.js，需先載入) =================
// 建築的名稱、介紹、特色標籤與各樓層空間配置放在 school-year.js，方便每學年更新
(function mergeSchoolYearData() {
  const D = window.CAMPUS_DATA;
  const Y = window.SCHOOL_YEAR_DATA;
  if (!Y) {
    console.error("找不到 data/school-year.js，建築名稱與教室配置將無法顯示");
    return;
  }

  D.school.academicYear = Y.academicYear;
  D.school.welcomeBannerText = Y.welcomeBannerText || "";

  const ids = new Set(D.buildings.map(b => b.id));
  Object.keys(Y.buildings || {}).forEach(id => {
    if (!ids.has(id)) console.warn(`school-year.js 中的建築代碼「${id}」不存在於 campus-data.js，已忽略`);
  });

  D.buildings.forEach(b => {
    const yearInfo = (Y.buildings || {})[b.id];
    if (yearInfo) Object.assign(b, yearInfo);
    if (!b.name) {
      console.warn(`建築「${b.id}」在 school-year.js 中沒有名稱`);
      b.name = b.id;
    }
    b.summary = b.summary || "";
    b.features = b.features || [];
  });
})();
