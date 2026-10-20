// 國立臺南大學附屬高級中學 (TNTCSH) 3D 校園場景與程序化建築生成器
// 完全原創開發 — 依據 OpenStreetMap (way/161510567)、平面圖黑色道路網 (aa190fc6a5da5710e0aea63299779c6c.PNG) 與 43 張實景照片建置

window.CampusBuilder3D = (function () {
  const matCache = new Map();

  const themeObjects = {
    day: [],
    brick: [],
    pixel: []
  };

  function registerThemeObject(theme, obj) {
    if (themeObjects[theme]) {
      themeObjects[theme].push(obj);
    }
  }

  function setVisualTheme(themeName) {
    (themeObjects.day || []).forEach(o => { o.visible = (themeName === "day"); });
    (themeObjects.brick || []).forEach(o => { o.visible = (themeName === "brick"); });
    (themeObjects.pixel || []).forEach(o => { o.visible = (themeName === "pixel"); });
  }

  function getMat(colorHex, opts = {}) {
    const key = colorHex + JSON.stringify(opts);
    if (matCache.has(key)) return matCache.get(key);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: opts.roughness !== undefined ? opts.roughness : 0.72,
      metalness: opts.metalness !== undefined ? opts.metalness : 0.08,
      transparent: !!opts.transparent,
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      polygonOffset: !!opts.polygonOffset,
      polygonOffsetFactor: opts.polygonOffsetFactor || 0,
      polygonOffsetUnits: opts.polygonOffsetUnits || 0
    });
    matCache.set(key, mat);
    return mat;
  }

  // 建立頂樓太陽能光電板陣列
  function addSolarPanels(parent, w, d, y, count = 3) {
    const solarGroup = new THREE.Group();
    const panelMat = getMat("#26313F", { roughness: 0.25, metalness: 0.6 });
    const frameMat = getMat("#9BA4AE", { roughness: 0.5, metalness: 0.5 });
    const spanW = (w * 0.72) / count;
    for (let i = 0; i < count; i++) {
      const px = -w * 0.36 + spanW * (i + 0.5);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(spanW * 0.82, 0.12, d * 0.45), panelMat);
      panel.position.set(px, y + 0.65, 0);
      panel.rotation.x = 0.22;
      panel.castShadow = true;
      solarGroup.add(panel);

      const leg = new THREE.Mesh(new THREE.BoxGeometry(spanW * 0.76, 0.5, 0.15), frameMat);
      leg.position.set(px, y + 0.28, -d * 0.14);
      solarGroup.add(leg);
    }
    parent.add(solarGroup);
  }

  // 工具函式：依據折線頂點建立平滑連接的 3D 道路帶與轉角圓盤
  // 透過微小高度步進 (microStep) 確保轉角圓盤與直線段、交叉路口絕不共平面，徹底消除 Z-fighting 閃爍
  let roadPartCounter = 0;
  function addPolylineRoad(parent, points, width, y, mat, addCenterLine = false, lineMat = null, thickness = 0.14) {
    const jointGeo = new THREE.CylinderGeometry(width * 0.5, width * 0.5, thickness, 20);
    for (let i = 0; i < points.length; i++) {
      const [x1, z1] = points[i];
      const jointY = y - 0.003 + (roadPartCounter++ % 17) * 0.00012;
      const joint = new THREE.Mesh(jointGeo, mat);
      joint.position.set(x1, jointY, z1);
      joint.receiveShadow = true;
      parent.add(joint);

      if (i < points.length - 1) {
        const [x2, z2] = points[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const len = Math.hypot(dx, dz);
        if (len < 0.1) continue;
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const angle = -Math.atan2(dz, dx);

        const segY = y + (roadPartCounter++ % 19) * 0.00015;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(len, thickness, width), mat);
        seg.position.set(midX, segY, midZ);
        seg.rotation.y = angle;
        seg.receiveShadow = true;
        parent.add(seg);

        // 外部主要道路中線標線
        if (addCenterLine && lineMat && len > 6) {
          const lineMesh = new THREE.Mesh(new THREE.BoxGeometry(len * 0.92, thickness + 0.04, 0.35), lineMat);
          lineMesh.position.set(midX, segY + 0.03, midZ);
          lineMesh.rotation.y = angle;
          parent.add(lineMesh);
        }
      }
    }
  }

  // 建立校園地面、校界多邊形、內部黑線道路網、周邊 OpenStreetMap 街道與景觀綠地
  function buildCampusGrounds() {
    const DATA = window.CAMPUS_DATA;
    const envGroup = new THREE.Group();
    envGroup.name = "CampusEnvironment";
    roadPartCounter = 0;

    // 1. 永康周邊街區大地基底 (Layer 0: y = -0.65)
    const baseGeo = new THREE.PlaneGeometry(900, 900);
    const baseMat = getMat("#DCE2DC", { roughness: 0.94, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.set(0, -0.65, -20);
    baseMesh.receiveShadow = true;
    envGroup.add(baseMesh);

    // 2. 國立南大附中主校區多邊形綠地底板 (Layer 1: 頂面位於 y = -0.06)
    if (DATA.campusBoundary && DATA.campusBoundary.length >= 3) {
      const shape = new THREE.Shape();
      DATA.campusBoundary.forEach(([x, z], idx) => {
        if (idx === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      shape.closePath();

      const campusGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.20, bevelEnabled: false });
      const grassMat = getMat("#78A262", { roughness: 0.88, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
      const campusMesh = new THREE.Mesh(campusGeo, grassMat);
      campusMesh.rotation.x = -Math.PI / 2;
      campusMesh.position.y = -0.26; // 底面 -0.26，頂面 -0.06
      campusMesh.receiveShadow = true;
      envGroup.add(campusMesh);

      // 2b. 全校四周圍牆 (依使用者需求：四周加上一人高度約 1.85m 圍牆，含水泥基座、米白抿石牆體與頂部壓頂線板)
      const wallBaseMat = getMat("#9A958C", { roughness: 0.86 });
      const wallMainMat = getMat("#EAE6DC", { roughness: 0.78 });
      const wallCapMat = getMat("#78726A", { roughness: 0.75 });
      const wallThickness = 0.38;
      const wallH = 1.85;

      const pts = DATA.campusBoundary;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];

        // 判斷是否為校門口出入車道範圍 (中山南路大門口 x 介於 -14 至 14，保留進出大門淨空，絕不以圍牆封堵校門)
        const isMainGateArea = (p1[0] >= -14 && p1[0] <= 14 && p2[0] >= -14 && p2[0] <= 14 && p1[1] < -170 && p2[1] < -170);
        if (isMainGateArea) {
          continue; // 大門口車道完全暢通通透
        }

        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const segLen = Math.hypot(dx, dz);
        if (segLen < 0.5) continue;

        const midX = (p1[0] + p2[0]) / 2;
        const midZ = (p1[1] + p2[1]) / 2;
        const rotY = -Math.atan2(dz, dx);

        // 永二街側南門車道出入口淨空 (x 介於 0 至 12，z > 185)
        const isSouthGate = (midZ > 185 && midX > -2 && midX < 14);
        if (isSouthGate) {
          continue;
        }

        const segGroup = new THREE.Group();
        segGroup.position.set(midX, 0, midZ);
        segGroup.rotation.y = rotY;

        // 水泥基礎基座 (高 0.45m)
        const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.45, wallThickness), wallBaseMat);
        baseMesh.position.y = 0.225;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        segGroup.add(baseMesh);

        // 米白立面牆體 (高 1.25m)
        const mainWall = new THREE.Mesh(new THREE.BoxGeometry(segLen, 1.25, wallThickness * 0.82), wallMainMat);
        mainWall.position.y = 0.45 + 0.625;
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        segGroup.add(mainWall);

        // 頂部壓頂防水分水線板 (高 0.15m)
        const capMesh = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.1, 0.15, wallThickness + 0.08), wallCapMat);
        capMesh.position.y = 1.70 + 0.075;
        capMesh.castShadow = true;
        segGroup.add(capMesh);

        // 每隔約 14m 設立圍牆構造方柱
        const pillarStep = 14.0;
        const pillarCount = Math.floor(segLen / pillarStep);
        if (pillarCount > 0) {
          for (let pi = 0; pi <= pillarCount; pi++) {
            const px = -segLen / 2 + pi * (segLen / pillarCount);
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 2.02, 0.52), wallCapMat);
            pillar.position.set(px, 1.01, 0);
            pillar.castShadow = true;
            segGroup.add(pillar);
          }
        }

        envGroup.add(segGroup);
      }
    }

    // 3. 周邊 OpenStreetMap 街道網 (中山南路、正強街、永平街、永二街、永興路、永勝街及各巷道)
    const extPrimaryMat = getMat("#586068", { roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const extStreetMat = getMat("#69717A", { roughness: 0.86, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const yellowLineMat = getMat("#E8B931", { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const whiteLineMat = getMat("#E2E6EA", { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });

    (DATA.externalRoads || []).forEach(rd => {
      addPolylineRoad(
        envGroup,
        rd.points,
        rd.width || 10,
        -0.36,
        rd.isPrimary ? extPrimaryMat : extStreetMat,
        true,
        rd.isPrimary ? yellowLineMat : whiteLineMat,
        0.14
      );
    });

    // 4. 校園內部道路網 (嚴格對照 aa190fc6a5da5710e0aea63299779c6c.PNG 中的黑色線條)
    // 移除原先墊在底層的淺灰白外框 (roadBorderMat)，並將黑色柏油路頂面抬高至 y = 0.14 (高出草地頂面 20 公分)，徹底根除轉動視角時的白紋閃爍
    const internalRoadMat = getMat("#2B3036", {
      roughness: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    (DATA.internalRoads || []).forEach(r => {
      addPolylineRoad(envGroup, r.points, r.width || 8, 0.07, internalRoadMat, false, null, 0.14);
    });

    // 5. 平面圖特色地景與廣場還原 (aa190fc6a5da5710e0aea63299779c6c.PNG)
    const whitePlazaMat = getMat("#F0EFEA", { roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const brickPlazaMat = getMat("#B68F66", { roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const gardenPathMat = getMat("#8C8A84", { roughness: 0.85 });
    const darkGreenMat = getMat("#497A3B", { roughness: 0.85 });

    // (a) 校門口進門後的「白色圓形迎賓廣場」中央圓島 (0, -162)，半徑設為 7.0m 位於圓環內側不與黑路重疊
    const entryWhiteCircle = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.2, 0.22, 36), whitePlazaMat);
    entryWhiteCircle.position.set(0, 0.11, -162);
    entryWhiteCircle.receiveShadow = true;
    envGroup.add(entryWhiteCircle);

    // (b) 中央迎賓大道雙排植栽綠島 (圓形廣場 z=-150 至 行政/敬業穿堂 z=-102)
    [-3.4, 3.4].forEach(mx => {
      const median = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.32, 46), getMat("#528742"));
      median.position.set(mx, 0.16, -126);
      envGroup.add(median);
    });

    // (c) 行政大樓北側扇形景觀公園與圓形廣場 (x=34, z=-124)
    const neParkBase = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.12, 32), gardenPathMat);
    neParkBase.position.set(34, 0.02, -124);
    envGroup.add(neParkBase);
    const neParkCenter = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.18, 28), getMat("#7C827A"));
    neParkCenter.position.set(34, 0.08, -124);
    envGroup.add(neParkCenter);

    // (d) 敬業樓與行政大樓中間、樂耕樓北側的「圓環花圃」 (0, -96)
    const circleCurb = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 0.52, 32), getMat("#7B6E75"));
    circleCurb.position.set(0, 0.26, -96);
    envGroup.add(circleCurb);
    const circleBush = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.0, 0.68, 32), darkGreenMat);
    circleBush.position.set(0, 0.36, -96);
    envGroup.add(circleBush);

    // (e) 中庭教學區景觀 (中央草坪 + 十字土橘色步道 + 中央方形集會廣場)
    const quadLawn = new THREE.Mesh(new THREE.BoxGeometry(92, 0.12, 68), getMat("#6FA055", { roughness: 0.86 }));
    quadLawn.position.set(0, 0.01, -3);
    quadLawn.receiveShadow = true;
    envGroup.add(quadLawn);

    const pathNS = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.16, 70), brickPlazaMat);
    pathNS.position.set(0, 0.06, -3);
    envGroup.add(pathNS);
    // (依使用者黃色框指示：中庭橫向步道移除改為純綠色草地，完全不保留土黃色線條)
    // const pathEW = new THREE.Mesh(new THREE.BoxGeometry(92, 0.16, 5.5), brickPlazaMat);
    // pathEW.position.set(0, 0.07, -3);
    // envGroup.add(pathEW);
    const quadCenterPlaza = new THREE.Mesh(new THREE.BoxGeometry(16, 0.20, 18), brickPlazaMat);
    quadCenterPlaza.position.set(0, 0.09, -3);
    envGroup.add(quadCenterPlaza);

    // (f) 正德樓南側對稱花圃綠園 (原 z=62 道路已全數改為綠地，深達 28m 覆蓋全區)
    [-38, 38].forEach(gx => {
      const stripBed = new THREE.Mesh(new THREE.BoxGeometry(62, 0.16, 28), darkGreenMat);
      stripBed.position.set(gx, 0.08, 66.5);
      envGroup.add(stripBed);
    });

    // (g) 園藝館北側粉紅圓形花圃廣場 (38, 97) (土木與畜產北側白色圓形廣場已依指示移除)

    const hortPlaza = new THREE.Mesh(new THREE.BoxGeometry(34, 0.14, 11), getMat("#D8ABB0"));
    hortPlaza.position.set(38, 0.04, 97);
    envGroup.add(hortPlaza);
    const hortCircle = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.2, 0.44, 24), darkGreenMat);
    hortCircle.position.set(38, 0.22, 97);
    envGroup.add(hortCircle);

    // (h) 游泳館南側大草坪區 (-126, 152) 與書庫南側棕色球場／曬場 (96, 150)
    const swimSouthLawn = new THREE.Mesh(new THREE.BoxGeometry(72, 0.12, 68), getMat("#6A9953"));
    swimSouthLawn.position.set(-126, 0.02, 152);
    envGroup.add(swimSouthLawn);

    // (書庫南側曬場已依指示改為均勻植樹綠地公園)

    // (i) 餐飲館正門口前方道路 (x=114) 左右兩側的兩個獨立綠地區域 (對照平面圖)
    // 左側（西側）綠地區域：位於 x=79..109, z=-61..-42 (烹飪教室北側、餐飲館西南側)
    const cateringGreenWest = new THREE.Mesh(new THREE.BoxGeometry(29.5, 0.24, 19.5), getMat("#5B9247", { roughness: 0.85 }));
    cateringGreenWest.position.set(94.0, 0.12, -51.5);
    cateringGreenWest.receiveShadow = true;
    envGroup.add(cateringGreenWest);

    // 右側（東側）綠地區域：位於 x=118.5..131.5, z=-61..-42 (樂揚樓北側、餐飲館東南側)
    const cateringGreenEast = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.24, 19.5), getMat("#5B9247", { roughness: 0.85 }));
    cateringGreenEast.position.set(125.0, 0.12, -51.5);
    cateringGreenEast.receiveShadow = true;
    envGroup.add(cateringGreenEast);

    // (j) 西側運動場區鋪面細節（對照球場配置圖：淺米灰廣場底、網球場南側深灰車棚／器材區、露天籃球場東側棕色平台）
    const westSportPlaza = new THREE.Mesh(
      new THREE.BoxGeometry(75.0, 0.10, 72.0),
      getMat("#E2D6CE", { roughness: 0.88, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    );
    westSportPlaza.position.set(-122.0, 0.01, -10.0);
    westSportPlaza.receiveShadow = true;
    envGroup.add(westSportPlaza);

    // 網球場與北區風雨排球場之間的深灰黑色棚架／鋪面區 (-143, -29)
    const westDarkPad = new THREE.Mesh(
      new THREE.BoxGeometry(31.0, 0.45, 17.5),
      getMat("#2C3034", { roughness: 0.8 })
    );
    westDarkPad.position.set(-143.0, 0.22, -29.0);
    westDarkPad.castShadow = true;
    westDarkPad.receiveShadow = true;
    envGroup.add(westDarkPad);

    // 露天籃球場東側（行道樹西側）的淺棕色長方平台／亭 (-90, -29)
    const eastBasketballDeck = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.36, 14.5),
      getMat("#A67B4B", { roughness: 0.82 })
    );
    eastBasketballDeck.position.set(-90.0, 0.18, -29.0);
    eastBasketballDeck.castShadow = true;
    eastBasketballDeck.receiveShadow = true;
    envGroup.add(eastBasketballDeck);

    // 6. 植栽與樹木群 (最新指示：永平街外圍無樹、原美術教室/資源室/食品加工館及全校大樓絕不重疊、紅線種植一排黃花風鈴木、黃圈道路兩旁植樹留出車道)
    const trunkMat = getMat("#543D2B", { roughness: 0.9 });
    const leafMatDark = getMat("#274D24", { roughness: 0.85 }); // 深綠色桃花心木／樟樹葉色
    const leafMat1 = getMat("#35632E", { roughness: 0.82 });
    const leafMat2 = getMat("#467A3B", { roughness: 0.8 });
    const palmLeafMat = getMat("#4A7C36", { roughness: 0.75 });
    // 風鈴木盛開黃花材質 (南大附中中山南路校門代表性花木：黃花風鈴木)
    const trumpetFlowerMat = getMat("#F2B824", { roughness: 0.65 });
    const trumpetFlowerMat2 = getMat("#E8A51D", { roughness: 0.62 });

    // 嚴格道路避讓檢查函數：確保任何樹木絕不擋到或蓋住校內黑色道路 (internalRoads)
    function isPositionOnRoad(x, z) {
      // 1. 中央迎賓大道 (x = -6.0 .. +6.0, z = -215 .. -64)
      if (Math.abs(x) < 6.0 && z >= -215 && z <= -64) return true;
      // 2. 校門口圓環 (圓心 0, -162，半徑 15.5m 範圍)
      if (Math.hypot(x - 0, z - (-162)) < 15.5) return true;
      // 3. 圓環往西聯絡道 (z = -160.0 .. -152.0, x = -85 .. 0)
      if (z >= -160.0 && z <= -152.0 && x >= -85.0 && x <= 0) return true;
      // 4. 校門圓環往東斜向幹道 (自 (14, -162) 至 (74, -122)，寬 7.5m)
      if (x >= 14.0 && x <= 74.0) {
        const roadCenterZ = -162.0 + ((x - 14.0) / 60.0) * 40.0;
        if (Math.abs(z - roadCenterZ) < 4.2) return true; // 車道淨空 8.4m
      }
      // 5. 西側南北向主幹道 (x = -85.0 .. -75.0, z = -250 .. 194.5)
      if (x >= -85.0 && x <= -75.0 && z >= -250 && z <= 194.5) return true;
      // 6. 敬業樓/行政大樓南側東西向道路 (z = -79.5 .. -70.5, x = -85 .. 78)
      if (z >= -79.5 && z <= -70.5 && x >= -85.0 && x <= 78.0) return true;
      // 7. 東側南北向主幹道 (x = 69.5 .. 78.5, z = -80 .. 182.5)
      if (x >= 69.5 && x <= 78.5 && z >= -80 && z <= 182.5) return true;
      // 8. 餐飲館前方東西向道路 (z = -70.0 .. -62.0, x = 74 .. 138)
      if (z >= -70.0 && z <= -62.0 && x >= 74.0 && x <= 138.0) return true;
      // 9. 烹飪/樂揚北側東西向道路 (z = -40.5 .. -33.5, x = 74 .. 138)
      if (z >= -40.5 && z <= -33.5 && x >= 74.0 && x <= 138.0) return true;
      // 10. 圖書館北側東西向道路 (z = -8.5 .. -1.5, x = 74 .. 138)
      if (z >= -8.5 && z <= -1.5 && x >= 74.0 && x <= 138.0) return true;
      // 11. 最東側南北向道路 (x = 131.5 .. 140.5, z = -70 .. 182.0)
      if (x >= 131.5 && x <= 140.5 && z >= -70 && z <= 182.0) return true;
      // 12. 圖書館與加工廠間橫向道 (z = 48.5 .. 55.5, x = 74 .. 138)
      if (z >= 48.5 && z <= 55.5 && x >= 74.0 && x <= 138.0) return true;
      // 13. 正德樓南側東西向車道 (z = 81.5 .. 90.5，原 z=62.0 車道已改為綠地林園)
      if (z >= 81.5 && z <= 90.5 && x >= -85.0 && x <= 78.0) return true;
      // 14. 正德樓中央穿堂往南經畜產館東側道路至南門出入口 (z = 48.0 .. 197.0, 寬 7.5m)
      if (z >= 48.0 && z <= 86.0 && Math.abs(x - 0.0) < 4.2) return true;
      if (z >= 86.0 && z <= 110.0) {
        const rcX = ((z - 86.0) / 24.0) * 4.0;
        if (Math.abs(x - rcX) < 4.2) return true;
      }
      if (z >= 110.0 && z <= 197.0 && Math.abs(x - 4.0) < 4.2) return true;
      // 15. 游泳館周邊聯絡車道 (北側橫向道與東側迴圈道，依使用者黃色框標示)
      if (z >= 61.5 && z <= 68.5 && x >= -152.0 && x <= -78.0) return true;
      if (x >= -109.0 && x <= -101.0 && z >= 65.0 && z <= 90.0) return true;
      if (z >= 84.5 && z <= 91.5 && x >= -107.0 && x <= -78.0) return true;
      // 16. 校園南側橫向主幹道 (依指示設於圍牆樹列北側，寬 7.5m)
      if (x >= -176.0 && x <= -80.0) {
        const rz = 193.3 - 0.084 * (x - (-80.0));
        if (Math.abs(z - rz) < 4.2) return true;
      }
      if (x >= -80.0 && x <= 4.0) {
        const rz = 186.0 - 0.0869 * (x - 4.0);
        if (Math.abs(z - rz) < 4.2) return true;
      }
      if (x >= 4.0 && x <= 74.0) {
        const rz = 181.0 - 0.0714 * (x - 74.0);
        if (Math.abs(z - rz) < 4.2) return true;
      }
      if (x >= 74.0 && x <= 172.0) {
        if (Math.abs(z - 180.5) < 4.2) return true;
      }
      return false;
    }

    // 嚴格建築物避讓檢查函數：確保任何樹木絕不長在任何大樓或屋頂上 (徹底解決美術教室、資源室、食品加工廠等重疊問題)
    function isPositionOnBuilding(x, z) {
      const bldgs = window.CAMPUS_DATA && window.CAMPUS_DATA.buildings;
      if (!bldgs) return false;
      for (let i = 0; i < bldgs.length; i++) {
        const b = bldgs[i];
        if (Math.abs(x - b.x) < (b.w / 2 + 1.6) && Math.abs(z - b.z) < (b.d / 2 + 1.6)) {
          return true;
        }
      }
      return false;
    }

    function addTree(x, z, scale = 1.0, style = "mahogany") {
      // 1. 永平街校外道路完全不種樹 (永平街 x > 175)
      if (x > 174.0) return;
      // 2. 嚴格道路避讓：不壓黑路
      if (isPositionOnRoad(x, z)) return;
      // 3. 嚴格建築物避讓：絕不在大樓屋頂或立面長樹
      if (isPositionOnBuilding(x, z)) return;

      const g = new THREE.Group();
      g.position.set(x, 0, z);

      // (A) 晴空寫實風格 (有機圓潤樹木)
      const varDay = new THREE.Group();
      varDay.name = "var-day";
      g.add(varDay);
      registerThemeObject("day", varDay);

      // (B) 微縮積木世界風格 (階梯圓形積木盤樹與圓柱凸粒)
      const varBrick = new THREE.Group();
      varBrick.name = "var-brick";
      varBrick.visible = false;
      g.add(varBrick);
      registerThemeObject("brick", varBrick);

      // (C) 復古像素冒險風格 (體素階梯方塊樹 Minecraft/Crossy Road)
      const varPixel = new THREE.Group();
      varPixel.name = "var-pixel";
      varPixel.visible = false;
      g.add(varPixel);
      registerThemeObject("pixel", varPixel);

      if (style === "palm") {
        const trunkH = 8.5 * scale;
        // 1. Day
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, trunkH, 8), getMat("#8A857A"));
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        varDay.add(trunk);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 * scale, 1), palmLeafMat);
        crown.scale.set(1.35, 0.55, 1.35);
        crown.position.y = trunkH + 0.6 * scale;
        crown.castShadow = true;
        varDay.add(crown);

        // 2. Brick
        const bTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.44 * scale, trunkH, 12), getMat("#6E4D30", { roughness: 0.16, metalness: 0.15 }));
        bTrunk.position.y = trunkH / 2;
        bTrunk.castShadow = true;
        varBrick.add(bTrunk);
        const bLeafMat = getMat("#228B22", { roughness: 0.16, metalness: 0.15 });
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.12 * scale, 3.2 * scale), bLeafMat);
          leaf.position.set(Math.cos(ang) * 1.5 * scale, trunkH - 0.2 * scale, Math.sin(ang) * 1.5 * scale);
          leaf.rotation.y = ang;
          leaf.rotation.x = 0.28;
          leaf.castShadow = true;
          varBrick.add(leaf);
        }
        const palmTopStud = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.25 * scale, 12), bLeafMat);
        palmTopStud.position.y = trunkH + 0.15 * scale;
        varBrick.add(palmTopStud);

        // 3. Pixel
        const pTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, trunkH, 0.55 * scale), getMat("#4A3525", { roughness: 0.85, flatShading: true }));
        pTrunk.position.y = trunkH / 2;
        pTrunk.castShadow = true;
        varPixel.add(pTrunk);
        const pLeafMat = getMat("#00E676", { roughness: 0.8, flatShading: true });
        [-1, 1].forEach(dx => {
          const bArm = new THREE.Mesh(new THREE.BoxGeometry(3.6 * scale, 0.4 * scale, 1.2 * scale), pLeafMat);
          bArm.position.set(dx * 1.0 * scale, trunkH + 0.2 * scale, 0);
          varPixel.add(bArm);
        });
        [-1, 1].forEach(dz => {
          const bArm = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.4 * scale, 3.6 * scale), pLeafMat);
          bArm.position.set(0, trunkH + 0.2 * scale, dz * 1.0 * scale);
          varPixel.add(bArm);
        });
        const pTopBox = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 0.8 * scale, 1.4 * scale), pLeafMat);
        pTopBox.position.y = trunkH + 0.5 * scale;
        varPixel.add(pTopBox);
      } else if (style === "trumpet_tree") {
        // 風鈴木 (依使用者需求：全數改為翠綠茂盛樹冠，絕無黃葉)
        const trunkH = (6.0 + Math.random() * 0.8) * scale;
        // 1. Day (翠綠色樹冠)
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.40 * scale, trunkH, 8), getMat("#6B6258"));
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        varDay.add(trunk);
        const fMat = Math.random() > 0.4 ? leafMatDark : leafMat1;
        const mainCrown = new THREE.Mesh(new THREE.SphereGeometry((2.8 + Math.random() * 0.4) * scale, 8, 7), fMat);
        mainCrown.scale.set(1.2, 1.15, 1.2);
        mainCrown.position.y = trunkH + 1.8 * scale;
        mainCrown.castShadow = true;
        varDay.add(mainCrown);
        [-1.1, 1.1].forEach((ox, i) => {
          const subCrown = new THREE.Mesh(new THREE.DodecahedronGeometry((1.7 + i * 0.2) * scale, 1), fMat);
          subCrown.position.set(ox * scale, trunkH + (1.2 + i * 0.3) * scale, (Math.random() - 0.5) * 1.5 * scale);
          subCrown.castShadow = true;
          varDay.add(subCrown);
        });

        // 2. Brick (亮綠積木盤)
        const bTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.40 * scale, trunkH, 12), getMat("#6E4D30", { roughness: 0.16, metalness: 0.15 }));
        bTrunk.position.y = trunkH / 2;
        bTrunk.castShadow = true;
        varBrick.add(bTrunk);
        const bGreenMat = getMat("#1B8738", { roughness: 0.16, metalness: 0.15 });
        const discRadii = [3.0 * scale, 2.2 * scale, 1.4 * scale];
        const discH = 0.65 * scale;
        let curY = trunkH + 0.3 * scale;
        discRadii.forEach((r, idx) => {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, discH, 16), bGreenMat);
          disc.position.y = curY;
          disc.castShadow = true;
          varBrick.add(disc);
          const studCount = idx === 0 ? 8 : (idx === 1 ? 6 : 4);
          for (let si = 0; si < studCount; si++) {
            const sa = (si / studCount) * Math.PI * 2;
            const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.20 * scale, 0.20 * scale, 0.18 * scale, 8), bGreenMat);
            stud.position.set(Math.cos(sa) * (r * 0.72), curY + discH * 0.55, Math.sin(sa) * (r * 0.72));
            varBrick.add(stud);
          }
          curY += discH;
        });
        const topStud = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.42 * scale, 0.35 * scale, 12), bGreenMat);
        topStud.position.y = curY + 0.15 * scale;
        varBrick.add(topStud);

        // 3. Pixel (鮮綠體素方塊)
        const pTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, trunkH, 0.55 * scale), getMat("#4A3525", { roughness: 0.85, flatShading: true }));
        pTrunk.position.y = trunkH / 2;
        pTrunk.castShadow = true;
        varPixel.add(pTrunk);
        const pGreenMat = getMat("#20BA4B", { roughness: 0.8, flatShading: true });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(3.6 * scale, 1.6 * scale, 3.6 * scale), pGreenMat);
        b1.position.y = trunkH + 1.0 * scale;
        b1.castShadow = true;
        varPixel.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.6 * scale, 1.4 * scale, 2.6 * scale), pGreenMat);
        b2.position.y = trunkH + 2.3 * scale;
        b2.castShadow = true;
        varPixel.add(b2);
        const b3 = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, 1.2 * scale, 1.6 * scale), pGreenMat);
        b3.position.y = trunkH + 3.4 * scale;
        b3.castShadow = true;
        varPixel.add(b3);
        [ [-1.5, 1.4, -1.5], [1.5, 1.4, 1.5], [-1.5, 1.4, 1.5], [1.5, 1.4, -1.5] ].forEach(([vx, vy, vz]) => {
          const vc = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.9 * scale, 0.9 * scale), pGreenMat);
          vc.position.set(vx * scale, trunkH + vy * scale, vz * scale);
          vc.castShadow = true;
          varPixel.add(vc);
        });
      } else {
        const trunkH = (7.5 + Math.random() * 1.5) * scale;
        // 1. Day
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.58 * scale, trunkH, 8), trunkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        varDay.add(trunk);
        const fMat = Math.random() > 0.4 ? leafMatDark : leafMat1;
        const mainCrown = new THREE.Mesh(new THREE.SphereGeometry((3.4 + Math.random() * 0.6) * scale, 8, 7), fMat);
        mainCrown.scale.set(1.15, 1.25, 1.15);
        mainCrown.position.y = trunkH + 2.4 * scale;
        mainCrown.castShadow = true;
        varDay.add(mainCrown);
        [-1.4, 1.4].forEach((ox, i) => {
          const subCrown = new THREE.Mesh(new THREE.DodecahedronGeometry((2.2 + i * 0.3) * scale, 1), fMat);
          subCrown.position.set(ox * scale, trunkH + (1.6 + i * 0.5) * scale, (Math.random() - 0.5) * 2.2 * scale);
          subCrown.castShadow = true;
          varDay.add(subCrown);
        });

        // 2. Brick
        const bTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.54 * scale, trunkH, 12), getMat("#6E4D30", { roughness: 0.16, metalness: 0.15 }));
        bTrunk.position.y = trunkH / 2;
        bTrunk.castShadow = true;
        varBrick.add(bTrunk);
        const bGreenMat = getMat("#1B8738", { roughness: 0.16, metalness: 0.15 });
        const discRadii = [3.8 * scale, 2.9 * scale, 2.0 * scale, 1.2 * scale];
        const discH = 0.75 * scale;
        let curY = trunkH + 0.3 * scale;
        discRadii.forEach((r, idx) => {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, discH, 16), bGreenMat);
          disc.position.y = curY;
          disc.castShadow = true;
          varBrick.add(disc);
          const studCount = idx === 0 ? 10 : (idx === 1 ? 8 : 5);
          for (let si = 0; si < studCount; si++) {
            const sa = (si / studCount) * Math.PI * 2;
            const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.20 * scale, 8), bGreenMat);
            stud.position.set(Math.cos(sa) * (r * 0.72), curY + discH * 0.55, Math.sin(sa) * (r * 0.72));
            varBrick.add(stud);
          }
          curY += discH;
        });
        const topStud = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * scale, 0.48 * scale, 0.38 * scale, 12), bGreenMat);
        topStud.position.y = curY + 0.18 * scale;
        varBrick.add(topStud);

        // 3. Pixel
        const pTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.68 * scale, trunkH, 0.68 * scale), getMat("#423020", { roughness: 0.85, flatShading: true }));
        pTrunk.position.y = trunkH / 2;
        pTrunk.castShadow = true;
        varPixel.add(pTrunk);
        const pGreenMat = getMat("#20BA4B", { roughness: 0.8, flatShading: true });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(4.6 * scale, 2.0 * scale, 4.6 * scale), pGreenMat);
        b1.position.y = trunkH + 1.2 * scale;
        b1.castShadow = true;
        varPixel.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(3.4 * scale, 1.8 * scale, 3.4 * scale), pGreenMat);
        b2.position.y = trunkH + 2.8 * scale;
        b2.castShadow = true;
        varPixel.add(b2);
        const b3 = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 1.5 * scale, 2.2 * scale), pGreenMat);
        b3.position.y = trunkH + 4.2 * scale;
        b3.castShadow = true;
        varPixel.add(b3);
        [ [-2.0, 2.2, -2.0], [2.0, 2.2, 2.0], [-2.0, 2.2, 2.0], [2.0, 2.2, -2.0] ].forEach(([vx, vy, vz]) => {
          const vc = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 1.2 * scale, 1.2 * scale), pGreenMat);
          vc.position.set(vx * scale, trunkH + vy * scale, vz * scale);
          vc.castShadow = true;
          varPixel.add(vc);
        });
      }
      envGroup.add(g);
    }

    // ================= 1. 紅色線條：沿中山南路校界圍牆內側種植一排風鈴木 (黃花風鈴木) =================
    // (A) 西段 (操場東北角至圍牆內側，車棚與活動中心之間徹底淨空不種樹，保留校車停靠區)
    [
      [-115.0, -208.0], [-102.0, -201.5], [-89.0, -195.0], [-76.0, -189.0]
    ].forEach(([x, z]) => addTree(x, z, 1.15, "trumpet_tree"));

    // (B) 東段 (校門口東側沿中山南路圍牆內側，經圓環北、學生車棚北、餐飲館北，延伸至東北角)
    [
      [20.0, -161.0], [34.0, -152.0], [48.0, -143.0], [62.0, -134.0],
      [76.0, -125.0], [90.0, -116.0], [104.0, -107.0], [118.0, -98.0],
      [132.0, -89.0], [146.0, -80.0], [158.0, -68.0], [164.0, -52.0], [166.0, -36.0]
    ].forEach(([x, z]) => addTree(x, z, 1.15, "trumpet_tree"));

    // ================= 2. 黃色圈圈：校門圓環往東斜向車道改為「道路兩旁植樹，車道暢通」 =================
    // (A) 車道北側樹列 (路外側草坪，位於斜道北邊 6.5m)
    [
      [22.0, -164.0], [34.0, -156.0], [46.0, -148.0], [58.0, -140.0], [70.0, -132.0]
    ].forEach(([x, z]) => addTree(x, z, 1.1, "mahogany"));

    // (B) 車道南側樹列 (圓環與行政大樓北側草坪邊緣，位於斜道南邊 6.5m)
    [
      [22.0, -151.0], [34.0, -143.0], [46.0, -135.0], [58.0, -127.0]
    ].forEach(([x, z]) => addTree(x, z, 1.1, "mahogany"));

    // ================= 3. 校門進場中央迎賓大道椰林 (位於 11m 大道兩側草坪 x = ±8.5m) =================
    for (let z = -148; z <= -106; z += 8.5) {
      addTree(-8.5, z, 1.1, "palm");
      addTree(8.5, z, 1.1, "palm");
    }

    // ================= 4. 中庭教學區樹列配置 (依使用者圖二指示：樂耕樓北側、樂耕樓南側、利用樓西側、正德樓北側、正德樓南側各植一排樹) =================
    // (A) 樂耕樓北邊前排樹列 (z = -63.0，位於樂耕樓北牆與道路間綠帶，避開中央穿堂通道)
    [-38, -28, -18, -10].forEach(x => addTree(x, -63.0, 1.25, "mahogany"));
    [10, 18, 28, 38].forEach(x => addTree(x, -63.0, 1.25, "mahogany"));

    // (B) 樂耕樓南側中庭樹列 (z = -28.0，避開中央穿堂中軸步道)
    [-34, -26, -18, -10].forEach(x => addTree(x, -28.0, 1.25, "mahogany"));
    [10, 18, 26, 34].forEach(x => addTree(x, -28.0, 1.25, "mahogany"));

    // (C) 利用樓西邊樹列 (x = -72.0，位於利用樓西側與西幹道之間長條綠帶，南北貫穿)
    [-22.0, -11.5, -1.0, 9.5, 20.0, 30.5, 41.0].forEach(z => addTree(-72.0, z, 1.25, "mahogany"));

    // (D) 正德樓北側中庭樹列 (z = 24.0，避開中央中軸步道)
    [-34, -26, -18, -10].forEach(x => addTree(x, 24.0, 1.25, "mahogany"));
    [10, 18, 26, 34].forEach(x => addTree(x, 24.0, 1.25, "mahogany"));

    // (E) 正德樓南側大綠園樹林 (依使用者紅色框指示：原 z=62 道路已全數改為綠地，3 排均勻對稱種植，避開中央穿堂走道)
    [56.5, 65.5, 74.5].forEach(z => {
      [-60, -48, -36, -24, -12].forEach(x => addTree(x, z, 1.25, "mahogany"));
      [12, 24, 36, 48, 60].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });

    // ================= 5. 田徑操場外圍一圈高大樹木 (依使用者需求：徹底拉開距離，離跑道更遠一點) =================
    // (a) 東側直道樹列 (移至西主幹道西緣綠帶 x = -88.5，距離跑道達 10m)
    for (let z = -205; z <= -135; z += 11.0) {
      addTree(-88.5, z, 1.25, "mahogany");
    }
    // (b) 西側校界圍牆全線長條林帶 (依使用者紅色框指示：沿西圍牆內側 x = -167.5 由北到南貫穿種植)
    for (let z = -205; z <= 195; z += 11.5) {
      addTree(-167.5, z, 1.25, "mahogany");
    }
    // (c) 北側半圓外環樹弧 (半徑擴大至 39.5m，北頂點達 z = -239.5，徹底遠離北弧跑道)
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      const tx = -128.0 + 39.5 * Math.cos(a);
      const tz = -200.0 - 39.5 * Math.sin(a);
      addTree(tx, tz, 1.3, "mahogany");
    }
    // (d) 南側半圓外環樹弧 (半徑擴大至 38.5m，南頂點達 z = -101.5，徹底遠離南弧跑道)
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const tx = -128.0 + 38.5 * Math.cos(a);
      const tz = -140.0 - 38.5 * Math.sin(a);
      addTree(tx, tz, 1.3, "mahogany");
    }

    // ================= 6. 園藝館周邊深綠大森林區 (路外草坪，嚴格避開園藝館建物輪廓) =================
    [
      // 園藝館西側森林帶 (x = 10..14, z = 76..116)
      [11, 76, 1.35], [14, 75, 1.4], [11, 84, 1.45], [14, 83, 1.4],
      [11, 92, 1.4], [14, 91, 1.4], [11, 100, 1.35], [14, 99, 1.35],
      [11, 108, 1.3], [14, 107, 1.3], [11, 116, 1.35], [14, 115, 1.35],
      // 園藝館東側森林帶 (x = 63..66, z = 76..116，避開園藝館東牆 x = 59)
      [64, 76, 1.35], [66, 84, 1.4], [64, 92, 1.4], [66, 100, 1.35],
      [64, 108, 1.3], [66, 116, 1.35],
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 園藝館南側綠園樹林 (依使用者紅色框指示：原東西向道路已全數改為綠地，均勻種植兩排景觀樹)
    // 第一排 (z = 126.0)
    [14, 24, 34, 44, 54, 64].forEach(x => addTree(x, 126.0, 1.25, "mahogany"));
    // 第二排 (z = 135.5，位於原道路區間中央)
    [14, 24, 34, 44, 54, 64].forEach(x => addTree(x, 135.5, 1.25, "mahogany"));

    // ================= 7. 土木館與畜產館北側綠園（黃色框全數種樹）與西側林帶 =================
    // (A) 土木館與畜產館北側綠園樹林 (依使用者黃色框指示：原白色圓圈已移除，整區均勻種植兩排茂密景觀樹)
    [96.5, 106.0].forEach(z => {
      [-60, -48, -36, -24, -14].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });

    // (B) 土木館西側沿路林帶 (依使用者紅色框指示：x = -72.0 與 x = -89.0 兩側對稱均勻種植)
    for (let z = 92; z <= 188; z += 12.0) {
      addTree(-72.0, z, 1.25, "mahogany");
    }
    for (let z = 142; z <= 186; z += 11.0) {
      addTree(-89.0, z, 1.25, "mahogany");
    }

    // (C) 畜產館東側與道路間綠帶林帶 (x = -5.0，道路西側路旁草坪)
    for (let z = 92; z <= 165; z += 12.0) {
      addTree(-5.0, z, 1.3, "mahogany");
    }

    // (D) 游泳館東側兩大綠地區塊 (依使用者紅色框指示：道路北側與南側各均勻種植)
    // 北區塊 (Red 2)
    [73.0, 81.0].forEach(z => {
      [-96, -86].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });
    // 南區塊 (Red 3)
    [96.0, 104.0].forEach(z => {
      [-96, -86].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });

    // ================= 8. 正德樓南側大綠園 (已整合於第 4 區 (E) 均勻對稱種植三排高大喬木) =================

    // ================= 9. 車棚與活動中心之間空地 (依使用者圖一指示：全數淨空無任何樹木，專供校車停靠與迴轉) =================
    // (已徹底移除原先位於車棚與活動中心之間的所有樹木)

    // ================= 9b. 車棚北邊圍牆旁樹列 (依使用者圖一指示：緊靠中山南路圍牆排列一排，倆倆間隔適中不緊密，共四棵) =================
    [
      [-72.0, -240.0, 1.25],
      [-54.0, -228.0, 1.25],
      [-36.0, -217.0, 1.25],
      [-18.0, -206.0, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // ================= 10. 東側各專科館舍路旁綠帶 (徹底避開原美術教室、資源室、食品加工館等建築) =================
    // 厚生樓東側綠帶 (x = 68.0，位於厚生樓與烹飪教室之間路旁草坪)
    for (let z = -32; z <= -12; z += 10.0) {
      addTree(68.0, z, 1.2, "mahogany");
    }

    // 圖書館周邊綠蔭林木 (位於圖書館西側、南側空地草坪，避開圖書館與美術教室)
    [
      [82, 30, 1.25], [82, 40, 1.25],
      [96, 44, 1.3], [105, 44, 1.3]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 書庫西側筆直樹林步道 (x = 84, 88，避開書庫建物)
    for (let z = 110; z <= 145; z += 9.0) {
      addTree(84.0, z, 1.15, "tall_grove");
    }

    // 餐飲館正門口前方道路左右兩個獨立綠地區域 (路外綠地)
    [
      [86, -57, 1.15], [92, -56, 1.2], [98, -57, 1.1],
      [86, -49, 1.2], [92, -48, 1.25], [98, -49, 1.15],
      [123, -57, 1.1], [127, -54, 1.15], [123, -49, 1.2]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // (E) 游泳館正南方長條大綠地 (依使用者紅色框指示：z = 118 與 z = 129 均勻排列兩排景觀樹)
    [118.0, 129.0].forEach(z => {
      [-148, -136, -124, -112, -100, -88].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });

    // 游泳館南側大草坪遠端景觀樹林 (x = -155..-95, z = 178..188)
    for (let x = -155; x <= -95; x += 15.0) {
      addTree(x, 178.0, 1.3, "mahogany");
      addTree(x + 7.5, 186.0, 1.25, "mahogany");
    }

    // (F) 沿永二街南界圍牆內側種植一整排茂密景觀樹列 (依使用者明確指示：最靠近永二街是圍牆，接著校園裡面沿著圍牆種植一排樹木，接著才是黑色的道路)
    // 西段 (x = -170 至 -9，距圍牆內側 2.8m，避開 x 介於 -4 至 14 的南門出入車道)
    [
      [-170.0, 208.9], [-158.5, 207.9], [-147.0, 206.9], [-135.5, 205.9], [-124.0, 204.9],
      [-112.5, 203.9], [-101.0, 202.9], [-89.5, 201.9], [-78.0, 200.9], [-66.5, 199.8],
      [-55.0, 198.8], [-43.5, 197.8], [-32.0, 196.8], [-20.5, 195.8], [-9.0, 194.8]
    ].forEach(([x, z]) => addTree(x, z, 1.25, "mahogany"));

    // 東段 (x = 16 至 165.5，避開南門出入口，沿圍牆一路延伸至東南角)
    [
      [16.0, 192.6], [27.5, 191.6], [39.0, 190.6], [50.5, 189.6], [62.0, 188.8],
      [73.5, 188.7], [85.0, 188.6], [96.5, 188.5], [108.0, 188.4], [119.5, 188.4],
      [131.0, 188.3], [142.5, 188.2], [154.0, 188.1], [165.5, 188.0]
    ].forEach(([x, z]) => addTree(x, z, 1.25, "mahogany"));

    // (G) 書庫南側大草坪綠園 (均勻種植 3×3 景觀林木，位於道路北側公園綠地)
    [152, 162, 172].forEach(z => {
      [90, 104, 118].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });

    // (H) 工友室西側綠帶 (工友室西側道路綠帶均勻種樹)
    [138, 147, 156, 165].forEach(z => addTree(145.0, z, 1.25, "mahogany"));

    // ================= 11. 東北角大草坪綠園與東側永平街圍牆長條綠帶 (依使用者紅色塗鴉指示：全區均勻植樹) =================
    // (A) 東北角大草坪綠園 (餐飲館東側至東界圍牆大草坪，均勻種植 3×5 景觀林木)
    [
      // 第一排 (z = -66.0)
      [146.0, -66.0, 1.25], [156.0, -66.0, 1.25], [166.0, -66.0, 1.25],
      // 第二排 (z = -53.0)
      [146.0, -53.0, 1.25], [156.0, -53.0, 1.25], [166.0, -53.0, 1.25],
      // 第三排 (z = -40.0)
      [146.0, -40.0, 1.25], [156.0, -40.0, 1.25], [166.0, -40.0, 1.25],
      // 第四排 (z = -27.0)
      [146.0, -27.0, 1.25], [156.0, -27.0, 1.25], [166.0, -27.0, 1.25],
      // 第五排 (z = -15.0)
      [146.0, -15.0, 1.25], [156.0, -15.0, 1.25], [166.0, -15.0, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // (B) 東側永平街圍牆內側長條綠帶與機械館南側草坪 (依指示移除資源室南側2棵及機械館西側6棵樹木)
    [
      // 沿永平街圍牆內側 (資源室東側長條綠帶，距圍牆約 2.8m，南北均勻排列)
      [171.5, -4.0, 1.25],
      [171.2, 7.5, 1.25],
      [170.9, 19.0, 1.25],
      [170.6, 30.5, 1.25],
      [170.3, 42.0, 1.25],
      // 機械館南側與工友室北側草坪綠帶
      [156.0, 126.0, 1.25],
      [168.0, 126.0, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    return envGroup;
  }

  // 為每棟大樓建立樓層房間分割與門牌資料
  // 座標方向約定：
  // - 東西向建築 (isEW = b.w >= b.d)：rooms 陣列索引 0..N-1 由西側 (-X) 排至東側 (+X)
  // - 南北向建築 (isEW = false)：rooms 陣列索引 0..N-1 由北側 (-Z) 排至南側 (+Z)
  function buildFloorInterior(b, floorIndex, yBase, fh) {
    const fg = new THREE.Group();
    fg.position.y = yBase;
    fg.userData = { floor: floorIndex, buildingId: b.id };

    const isEW = b.w >= b.d;
    const slabMat = getMat("#D8D4CA", { roughness: 0.85 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(b.w - 0.3, 0.24, b.d - 0.3), slabMat);
    slab.position.y = 0.12;
    slab.receiveShadow = true;
    fg.add(slab);

    const rooms = (b.floorsData && b.floorsData[floorIndex]) || [];
    if (rooms.length > 0 && b.category !== "sport" && b.style !== "gate") {
      const count = rooms.length;
      const roomColors = {
        class1: "#58B957", // 高一綠 (對照 115 學年度配置圖)
        class2: "#4CC3D9", // 高二青藍 (對照 115 學年度配置圖)
        class3: "#F2D03B", // 高三黃 (對照 115 學年度配置圖)
        lab: "#E08A4B",    // 專科實驗／工場橘
        office: "#8E9AAF", // 行政辦公室灰藍
        special: "#B589D6",// 特殊與社團空間紫
        wc: "#7FA6B8",     // 廁所
        stair: "#A0A4A8",  // 樓梯
        common: "#9BB0A5"
      };

      const span = (isEW ? b.w - 1.2 : b.d - 1.2) / count;
      rooms.forEach((rm, idx) => {
        // 樂耕樓 1F 中央玄關穿堂通道徹底打通：絕不在穿堂走廊中央生成任何 roomBlock 障礙方塊！
        if (b.style === "legeng" && floorIndex === 1) {
          const rxCheck = isEW ? (-b.w / 2 + 0.6 + span * (idx + 0.5)) : 0;
          const hallCenter = -b.x;
          if (rm.code === "LG4" || rm.type === "common" || rm.name.includes("穿堂") || rm.name.includes("玄關") || Math.abs(rxCheck - hallCenter) < 6.8) {
            return; // 穿堂範圍完全淨空通透，絕無任何障礙！
          }
        }
        const cHex = roomColors[rm.type] || "#CFD4D8";
        const rMat = getMat(cHex, { roughness: 0.65 });
        const rw = isEW ? span * 0.9 : (b.w - 2.6);
        const rd = isEW ? (b.d - 2.6) : span * 0.9;
        const rx = isEW ? (-b.w / 2 + 0.6 + span * (idx + 0.5)) : 0;
        const rz = isEW ? 0 : (-b.d / 2 + 0.6 + span * (idx + 0.5));

        const roomBlock = new THREE.Mesh(new THREE.BoxGeometry(rw, fh * 0.45, rd), rMat);
        roomBlock.position.set(rx, 0.25 + fh * 0.225, rz);
        roomBlock.castShadow = true;
        roomBlock.receiveShadow = true;
        roomBlock.userData = {
          isRoom: true,
          buildingId: b.id,
          buildingName: b.name,
          floor: floorIndex,
          roomCode: rm.code,
          roomName: rm.name,
          roomType: rm.type,
          worldOffset: new THREE.Vector3(rx, yBase + fh * 0.5, rz)
        };
        fg.add(roomBlock);
      });
    }

    return fg;
  }

  // 主建築程序化外觀生成器 (根據 b.style 打造真實特徵)
  function createBuildingMesh(b) {
    const root = new THREE.Group();
    root.position.set(b.x, 0, b.z);
    if (b.rotY) root.rotation.y = b.rotY;
    root.userData = { buildingId: b.id, buildingData: b, floorGroups: {} };

    const fh = b.floorHeight || 5.4;
    const totalH = b.floors * fh;
    const mainMat = getMat(b.colors.main);
    const secMat = getMat(b.colors.secondary);
    const accMat = getMat(b.colors.accent);
    const roofMat = getMat(b.colors.roof);
    const glassMat = getMat("#2B3D4F", { roughness: 0.2, metalness: 0.7 });
    const whiteMat = getMat("#F4F4F0");

    // 特殊場域 1：田徑操場 (標準長條橢圓形體育田徑操場跑道 + 外圍天藍排水溝 + 紅褐 PU 跑道 + 6 道白色分道標線 + 中央草皮足球場 + 東側司令台看台)
    if (b.style === "track") {
      const g1 = new THREE.Group();

      // 標準田徑場長條橢圓 (Stadium / Capsule) Shape 生成函數
      // 兩端為半徑 r = width / 2 的半圓，中間為直道長度 2s (depth - width)
      function makeStadiumShape(w, d) {
        const shape = new THREE.Shape();
        const r = w / 2;
        const s = Math.max(0, d / 2 - r);
        shape.moveTo(r, -s);
        shape.lineTo(r, s);
        shape.absarc(0, s, r, 0, Math.PI, false);
        shape.lineTo(-r, -s);
        shape.absarc(0, -s, r, Math.PI, Math.PI * 2, false);
        return shape;
      }

      // 1. 外緣天藍色洗石子排水邊溝 (長條橢圓形)
      const curbMat = getMat("#4A92C8", { roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const curbShape = makeStadiumShape(b.w, b.d);
      const curbGeo = new THREE.ExtrudeGeometry(curbShape, { depth: 0.12, bevelEnabled: false });
      const blueCurb = new THREE.Mesh(curbGeo, curbMat);
      blueCurb.rotation.x = -Math.PI / 2;
      blueCurb.position.y = 0.02;
      blueCurb.receiveShadow = true;
      g1.add(blueCurb);

      // 2. 標準紅褐色 PU 跑道鋪面 (長條橢圓形)
      const trackMat = getMat("#9D3528", { roughness: 0.82, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const trackShape = makeStadiumShape(b.w - 1.8, b.d - 1.8);
      const trackGeo = new THREE.ExtrudeGeometry(trackShape, { depth: 0.16, bevelEnabled: false });
      const puTrack = new THREE.Mesh(trackGeo, trackMat);
      puTrack.rotation.x = -Math.PI / 2;
      puTrack.position.y = 0.04;
      puTrack.receiveShadow = true;
      g1.add(puTrack);

      // 3. 跑道 6 道標準白色分道標線 (長條橢圓同心環線)
      const laneLineMat = new THREE.LineBasicMaterial({ color: 0xF5F7FA, linewidth: 2 });
      const numLanes = 6;
      const laneWidth = 1.45;
      for (let i = 1; i <= numLanes; i++) {
        const lw = (b.w - 1.8) - i * (laneWidth * 2);
        const ld = (b.d - 1.8) - i * (laneWidth * 2);
        if (lw <= 6 || ld <= 6) break;
        const lShape = makeStadiumShape(lw, ld);
        const pts2d = lShape.getPoints(96);
        const pts3d = pts2d.map(p => new THREE.Vector3(p.x, 0.22, -p.y));
        const laneGeo = new THREE.BufferGeometry().setFromPoints(pts3d);
        const laneLoop = new THREE.LineLoop(laneGeo, laneLineMat);
        g1.add(laneLoop);
      }

      // 4. 中央天然綠草皮足球／田徑場 (長條橢圓形內場)
      const infieldMat = getMat("#558C45", { roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      const infieldW = b.w - 1.8 - numLanes * (laneWidth * 2) - 1.2;
      const infieldD = b.d - 1.8 - numLanes * (laneWidth * 2) - 1.2;
      const infieldShape = makeStadiumShape(infieldW, infieldD);
      const infieldGeo = new THREE.ExtrudeGeometry(infieldShape, { depth: 0.20, bevelEnabled: false });
      const infield = new THREE.Mesh(infieldGeo, infieldMat);
      infield.rotation.x = -Math.PI / 2;
      infield.position.y = 0.06;
      infield.receiveShadow = true;
      g1.add(infield);

      // 4b. 足球場白色邊線與球門
      const pitchLineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 });
      const pW = infieldW * 0.72;
      const pD = infieldD * 0.65;
      const pitchPts = [
        new THREE.Vector3(-pW / 2, 0.27, -pD / 2),
        new THREE.Vector3(pW / 2, 0.27, -pD / 2),
        new THREE.Vector3(pW / 2, 0.27, pD / 2),
        new THREE.Vector3(-pW / 2, 0.27, pD / 2),
        new THREE.Vector3(-pW / 2, 0.27, -pD / 2)
      ];
      g1.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pitchPts), pitchLineMat));
      const midLinePts = [
        new THREE.Vector3(-pW / 2, 0.27, 0),
        new THREE.Vector3(pW / 2, 0.27, 0)
      ];
      g1.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(midLinePts), pitchLineMat));
      const centerCirclePts = [];
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 16) {
        centerCirclePts.push(new THREE.Vector3(Math.cos(a) * 5.0, 0.27, Math.sin(a) * 5.0));
      }
      g1.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(centerCirclePts), pitchLineMat));

      const goalMat = getMat("#FFFFFF");
      [-pD / 2, pD / 2].forEach(gz => {
        const goalBar = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 0.16), goalMat);
        goalBar.position.set(0, 1.8, gz);
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), goalMat);
        postL.position.set(-2.4, 0.9, gz);
        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), goalMat);
        postR.position.set(2.4, 0.9, gz);
        g1.add(goalBar, postL, postR);
      });

      // 3b. 東側 100 公尺直道衝刺跑道延伸段 (依圖一實景與地圖設計：右側靠近司令台直道向南北兩端筆直延伸，呈現正統體育田徑場 D 字衝刺跑道形狀)
      const sprintExtLen = 19.5; // 南北各向外延伸約 19.5m，達成全直道 100 公尺長度
      const sprintTrackW = numLanes * laneWidth; // 8.7m
      const sprintCenterX = b.w / 2 - 0.9 - sprintTrackW / 2; // 對齊東直道 6 道中心

      // (A) 北側直道起跑衝刺延伸段 (PU + 藍色洗石子排水邊溝)
      const northSprintPU = new THREE.Mesh(new THREE.BoxGeometry(sprintTrackW, 0.16, sprintExtLen), trackMat);
      northSprintPU.position.set(sprintCenterX, 0.12, -b.d / 2 + sprintExtLen / 2);
      northSprintPU.receiveShadow = true;
      g1.add(northSprintPU);

      const northSprintCurb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, sprintExtLen + 0.5), curbMat);
      northSprintCurb.position.set(b.w / 2 - 0.27, 0.10, -b.d / 2 + sprintExtLen / 2);
      g1.add(northSprintCurb);

      // (B) 南側直道終點衝刺延伸緩衝段 (PU + 藍色排水邊溝)
      const southSprintPU = new THREE.Mesh(new THREE.BoxGeometry(sprintTrackW, 0.16, sprintExtLen), trackMat);
      southSprintPU.position.set(sprintCenterX, 0.12, b.d / 2 - sprintExtLen / 2);
      southSprintPU.receiveShadow = true;
      g1.add(southSprintPU);

      const southSprintCurb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, sprintExtLen + 0.5), curbMat);
      southSprintCurb.position.set(b.w / 2 - 0.27, 0.10, b.d / 2 - sprintExtLen / 2);
      g1.add(southSprintCurb);

      // (C) 100公尺延伸段 6 道直道白色分道標線 (貫穿南北延伸段)
      for (let i = 0; i <= numLanes; i++) {
        const lx = (b.w / 2 - 0.9) - i * laneWidth;
        // 北延伸段直道標線
        const nLinePts = [
          new THREE.Vector3(lx, 0.23, -b.d / 2),
          new THREE.Vector3(lx, 0.23, -b.d / 2 + sprintExtLen)
        ];
        g1.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(nLinePts), laneLineMat));
        // 南延伸段直道標線
        const sLinePts = [
          new THREE.Vector3(lx, 0.23, b.d / 2 - sprintExtLen),
          new THREE.Vector3(lx, 0.23, b.d / 2)
        ];
        g1.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sLinePts), laneLineMat));
      }

      // (D) 100 公尺起跑線與終點線橫向白線
      [-b.d / 2 + 1.2, b.d / 2 - 1.2].forEach(zy => {
        const markPts = [
          new THREE.Vector3(b.w / 2 - 0.9, 0.24, zy),
          new THREE.Vector3(b.w / 2 - 0.9 - sprintTrackW, 0.24, zy)
        ];
        g1.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(markPts), laneLineMat));
      });

      // 5. 東側司令台 (位於 100 公尺直道延伸跑道外側草坪 x = b.w / 2 + 5.2，面向田徑場西側)
      const stageGroup = new THREE.Group();
      stageGroup.position.set(b.w / 2 + 5.2, 0, 0);

      const stageBase = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 18.0), whiteMat);
      stageBase.position.y = 1.6;
      stageBase.castShadow = true;
      stageGroup.add(stageBase);

      const blueSeats = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 15.0), getMat("#28669E"));
      blueSeats.position.set(-0.4, 2.4, 0);
      stageGroup.add(blueSeats);

      const stageCanopy = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.55, 20.0), whiteMat);
      stageCanopy.position.y = 6.2;
      stageCanopy.castShadow = true;
      stageGroup.add(stageCanopy);

      const flagBoard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 2.4), getMat("#E03A3E"));
      flagBoard.position.set(2.4, 4.4, 0);
      stageGroup.add(flagBoard);

      [-1, 1].forEach(dir => {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.2), whiteMat);
        ramp.rotation.y = dir * 0.42;
        ramp.position.set(-2.8, 0.9, dir * 5.2);
        stageGroup.add(ramp);
      });

      g1.add(stageGroup);

      root.add(g1);
      root.userData.floorGroups[1] = g1;
      root.userData.pickMesh = infield;
      return root;
    }

    // 特殊場域 1b：園藝教學區高架鋼棚 (銀灰鋼構、X 型交叉斜撐、高架實作平台與雙斜光電頂棚)
    if (b.style === "hort_teach_shed") {
      const g1 = new THREE.Group();
      const steelMat = getMat("#8C97A0", { metalness: 0.6, roughness: 0.4 });
      const braceMat = getMat("#9CA7B0", { metalness: 0.5, roughness: 0.45 });
      const platMat = getMat("#4E565E", { roughness: 0.8 });
      const roofMat = getMat("#364048", { metalness: 0.5, roughness: 0.3 });

      // 高架操作平台 (y = 1.1m)
      const plat = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.35, b.d), platMat);
      plat.position.y = 1.1;
      plat.receiveShadow = true;
      g1.add(plat);

      // 銀灰 H 型鋼骨立柱 (3×3 網格)
      const xs = [-b.w / 2 + 0.6, 0, b.w / 2 - 0.6];
      const zs = [-b.d / 2 + 0.6, 0, b.d / 2 - 0.6];
      xs.forEach(px => {
        zs.forEach(pz => {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.48, b.floorHeight, 0.48), steelMat);
          col.position.set(px, b.floorHeight / 2, pz);
          col.castShadow = true;
          g1.add(col);
        });
      });

      // 周邊 X 型交叉斜撐 (X-bracing)
      [-b.d / 2 + 0.6, b.d / 2 - 0.6].forEach(pz => {
        [-b.w / 4, b.w / 4].forEach(bx => {
          const spanW = b.w / 2 - 1.2;
          const diagLen = Math.hypot(spanW, b.floorHeight);
          const diagAngle = Math.atan2(b.floorHeight, spanW);

          const brace1 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.15, 0.15), braceMat);
          brace1.rotation.z = diagAngle;
          brace1.position.set(bx, b.floorHeight / 2, pz);
          const brace2 = new THREE.Mesh(new THREE.BoxGeometry(diagLen, 0.15, 0.15), braceMat);
          brace2.rotation.z = -diagAngle;
          brace2.position.set(bx, b.floorHeight / 2, pz);
          g1.add(brace1, brace2);
        });
      });

      // 雙斜採光大鋼棚屋頂
      const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.8, 0.38, b.d + 1.8), roofMat);
      canopyRoof.position.y = b.floorHeight;
      canopyRoof.castShadow = true;
      g1.add(canopyRoof);

      root.add(g1);
      root.userData.floorGroups[1] = g1;
      root.userData.pickMesh = plat;
      return root;
    }

    // 特殊場域 2：校門口與警衛室 (`gate`) — 還原 `161337.jpg` & `161347.jpg`
    if (b.style === "gate") {
      // 1. 東側深褐疊石大圓柱門柱 (高 6.8m)
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 6.8, 20), secMat);
      pillar.position.set(5.5, 3.4, 0);
      pillar.castShadow = true;
      root.add(pillar);

      // 2. 東側斜坡三角亂石牆 + 圓形月門鏤空 ○
      const wallRight = new THREE.Mesh(new THREE.BoxGeometry(11, 3.2, 0.85), mainMat);
      wallRight.position.set(11.5, 1.6, 0);
      wallRight.castShadow = true;
      root.add(wallRight);
      const moonHole = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.92, 24), getMat("#2C82C9"));
      moonHole.rotation.x = Math.PI / 2;
      moonHole.position.set(9.2, 1.7, 0);
      root.add(moonHole);

      // 3. 西側圓角警衛室 + 屋頂黑色 LED 跑馬燈看板 (`161347.jpg`)
      const guard = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.6, 4.8), mainMat);
      guard.position.set(-8.5, 1.8, 0);
      guard.castShadow = true;
      root.add(guard);
      const guardCanopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 5.8), roofMat);
      guardCanopy.position.set(-8.2, 3.7, 0);
      root.add(guardCanopy);
      const ledBoard = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 0.45), getMat("#22252A"));
      ledBoard.position.set(-8.0, 4.45, 1.6);
      root.add(ledBoard);

      // 4. 中央分隔島與黃黑警示柱
      const island = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 5.5), getMat("#EBC137"));
      island.position.set(-1.5, 0.45, 0);
      root.add(island);

      root.userData.floorGroups[1] = root;
      return root;
    }

    // 特殊場域 3：西側各類運動球場 (`sport_court`) — 區分「露天球場（無頂棚）」與「風雨球場（附鋼棚頂蓋）」
    if (b.style === "sport_court") {
      const g1 = new THREE.Group();
      const baseMat = getMat(b.colors.main, {
        roughness: 0.82,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
      const courtGreenMat = getMat(b.colors.secondary, {
        roughness: 0.78,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
      });
      const lineWhiteMat = getMat("#F5F7FA", {
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5
      });
      const netMat = getMat("#262A2E", { roughness: 0.5 });
      const hoopMat = getMat("#E65C2E", { roughness: 0.4 });

      // 球場底層大色塊鋪面 (紅褐／橘紅／淺灰)
      const courtBase = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.18, b.d), baseMat);
      courtBase.position.y = 0.09;
      courtBase.receiveShadow = true;
      g1.add(courtBase);

      // 工具函式：建立一面東西向標準綠色球場 (含白色外框線、中線、球網或籃球架)
      function addEWGreenCourt(cx, cz, cw, cd, kind) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.24, cd), courtGreenMat);
        pad.position.set(cx, 0.12, cz);
        pad.receiveShadow = true;
        g1.add(pad);

        // 四周白色邊線與中央分界線
        const lw = 0.22;
        const nLine = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.27, lw), lineWhiteMat);
        nLine.position.set(cx, 0.135, cz - cd / 2 + lw / 2);
        const sLine = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.27, lw), lineWhiteMat);
        sLine.position.set(cx, 0.135, cz + cd / 2 - lw / 2);
        const wLine = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.27, cd), lineWhiteMat);
        wLine.position.set(cx - cw / 2 + lw / 2, 0.135, cz);
        const eLine = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.27, cd), lineWhiteMat);
        eLine.position.set(cx + cw / 2 - lw / 2, 0.135, cz);
        const midLine = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.27, cd), lineWhiteMat);
        midLine.position.set(cx, 0.135, cz);
        g1.add(nLine, sLine, wLine, eLine, midLine);

        if (kind === "tennis") {
          // 網球雙打邊線、發球線與中線 + 3D 球網
          [-cd * 0.34, cd * 0.34].forEach(sz => {
            const singleLine = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.27, 0.16), lineWhiteMat);
            singleLine.position.set(cx, 0.135, cz + sz);
            g1.add(singleLine);
          });
          [-cw * 0.27, cw * 0.27].forEach(sx => {
            const servLine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.27, cd * 0.68), lineWhiteMat);
            servLine.position.set(cx + sx, 0.135, cz);
            g1.add(servLine);
          });
          const centerServ = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.54, 0.27, 0.16), lineWhiteMat);
          centerServ.position.set(cx, 0.135, cz);
          g1.add(centerServ);

          // 網球球網與網柱
          const net = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, cd + 0.6), netMat);
          net.position.set(cx, 0.68, cz);
          const netTopBand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, cd + 0.6), lineWhiteMat);
          netTopBand.position.set(cx, 1.15, cz);
          g1.add(net, netTopBand);
        } else if (kind === "volleyball") {
          // 排球三米攻擊線 + 排球高網
          [-cw * 0.18, cw * 0.18].forEach(ax => {
            const atkLine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.27, cd), lineWhiteMat);
            atkLine.position.set(cx + ax, 0.135, cz);
            g1.add(atkLine);
          });
          const vNet = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.0, cd + 0.6), netMat);
          vNet.position.set(cx, 1.85, cz);
          const vTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, cd + 0.6), lineWhiteMat);
          vTop.position.set(cx, 2.35, cz);
          [-cd / 2 - 0.3, cd / 2 + 0.3].forEach(pz => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.45, 8), netMat);
            pole.position.set(cx, 1.22, cz + pz);
            g1.add(pole);
          });
          g1.add(vNet, vTop);
        } else if (kind === "basketball") {
          // 籃球禁區線、中圈與東西兩端籃球架
          const centerCircle = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.72, 24), lineWhiteMat);
          centerCircle.rotation.x = -Math.PI / 2;
          centerCircle.position.set(cx, 0.28, cz);
          g1.add(centerCircle);

          [-1, 1].forEach(dir => {
            const keyBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 3.6), baseMat);
            keyBox.position.set(cx + dir * (cw / 2 - 2.2), 0.133, cz);
            g1.add(keyBox);

            // 籃球柱、籃板與橘色籃框
            const postX = cx + dir * (cw / 2 + 0.6);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 10), netMat);
            post.position.set(postX, 1.6, cz);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.15), netMat);
            arm.position.set(postX - dir * 0.5, 3.05, cz);
            const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 1.8), lineWhiteMat);
            board.position.set(postX - dir * 1.0, 3.05, cz);
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 16), hoopMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(postX - dir * 1.3, 2.85, cz);
            g1.add(post, arm, board, rim);
          });
        }
      }

      // 依據不同球場配置繪製場地面
      if (b.courtLayout === "tennis_3") {
        // 3 面東西向露天網球場 + 西側白色練習牆／看台
        [-14.2, 0, 14.2].forEach(cz => addEWGreenCourt(1.2, cz, 24.5, 11.2, "tennis"));
        [-9.5, -1.5].forEach(wz => {
          const whiteWall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.8, 7.2), lineWhiteMat);
          whiteWall.position.set(-b.w / 2 + 2.5, 1.4, wz);
          whiteWall.castShadow = true;
          g1.add(whiteWall);
        });
      } else if (b.courtLayout === "basketball_3") {
        // 3 面東西向風雨籃球場
        [-14.2, 0, 14.2].forEach(cz => addEWGreenCourt(0, cz, 25.5, 11.6, "basketball"));
      } else if (b.courtLayout === "basketball_1") {
        // 1 面東西向露天標準籃球場
        addEWGreenCourt(0, 0, 22.0, 12.6, "basketball");
      } else if (b.courtLayout === "volleyball_2") {
        // 北區 2 面東西向風雨排球場
        [-7.2, 7.2].forEach(cz => addEWGreenCourt(0, cz, 22.5, 10.6, "volleyball"));
      } else if (b.courtLayout === "volleyball_4") {
        // 南區 2×2 共 4 面東西向風雨排球場 + 中央南北向黑線分隔
        const midDiv = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, b.d), netMat);
        midDiv.position.set(0, 0.13, 0);
        g1.add(midDiv);
        [-18.0, 18.0].forEach(cx => {
          [-7.2, 7.2].forEach(cz => addEWGreenCourt(cx, cz, 24.5, 10.6, "volleyball"));
        });
      } else if (b.courtLayout === "pickleball_1") {
        // 南北向淺灰風雨匹克球場
        const pCourt = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.24, 18.8), courtGreenMat);
        pCourt.position.set(0, 0.12, 0);
        g1.add(pCourt);
        const pNet = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.88, 0.12), netMat);
        pNet.position.set(0, 0.56, 0);
        const pTop = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.10, 0.14), lineWhiteMat);
        pTop.position.set(0, 0.98, 0);
        g1.add(pNet, pTop);
      }

      root.add(g1);
      root.userData.floorGroups[1] = g1;
      root.userData.pickMesh = courtBase;

      // 若為「風雨球場」(b.covered === true)，建立鋼構立柱與半透光太陽能風雨鋼棚頂蓋
      if (b.covered) {
        const canopyGroup = new THREE.Group();
        const colMat = getMat("#2F353B", { metalness: 0.5, roughness: 0.4 });
        const padMat = getMat("#78BE75", { roughness: 0.6 });
        const colsX = b.w > 45 ? [-b.w / 2 + 1.2, 0, b.w / 2 - 1.2] : [-b.w / 2 + 0.8, b.w / 2 - 0.8];
        const colsZ = [-b.d / 2 + 1.2, 0, b.d / 2 - 1.2];

        colsX.forEach(cx => {
          colsZ.forEach(cz => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, b.floorHeight, 0.42), colMat);
            post.position.set(cx, b.floorHeight / 2, cz);
            post.castShadow = true;
            canopyGroup.add(post);

            const safetyPad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 10), padMat);
            safetyPad.position.set(cx, 1.1, cz);
            canopyGroup.add(safetyPad);
          });
        });

        // 風雨鋼棚頂蓋（採用微透光深藍灰太陽能光電板材質，讓鳥瞰時既能清楚辨識「風雨頂棚」，又能隱約透視下方球場配置；切換至 1F 時可隱藏頂棚）
        const roofFrame = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 1.6, 0.36, b.d + 1.6),
          getMat("#39424C", { roughness: 0.35, metalness: 0.55, transparent: true, opacity: 0.62 })
        );
        roofFrame.position.y = b.floorHeight;
        roofFrame.castShadow = true;
        canopyGroup.add(roofFrame);

        // 屋頂四周實心金屬邊框樑，強化風雨球場立體結構感
        const beamH = 0.52;
        const nBeam = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.8, beamH, 0.55), colMat);
        nBeam.position.set(0, b.floorHeight, -b.d / 2 - 0.6);
        const sBeam = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.8, beamH, 0.55), colMat);
        sBeam.position.set(0, b.floorHeight, b.d / 2 + 0.6);
        const wBeam = new THREE.Mesh(new THREE.BoxGeometry(0.55, beamH, b.d + 1.8), colMat);
        wBeam.position.set(-b.w / 2 - 0.6, b.floorHeight, 0);
        const eBeam = new THREE.Mesh(new THREE.BoxGeometry(0.55, beamH, b.d + 1.8), colMat);
        eBeam.position.set(b.w / 2 + 0.6, b.floorHeight, 0);
        canopyGroup.add(nBeam, sBeam, wBeam, eBeam);

        root.add(canopyGroup);
        root.userData.floorGroups[2] = canopyGroup;
      }

      return root;
    }

    // ================= 一般與特色多層建築物 (逐層建立以支援樓層剖面切換) =================
    for (let f = 1; f <= b.floors; f++) {
      const yBase = (f - 1) * fh;
      const fg = buildFloorInterior(b, f, yBase, fh);

      if (b.style === "legeng" && f === 1) {
        // 樂耕樓 1F：中央穿堂玄關通道 (寬 12.0m 貫穿南北，行人可直接穿堂進出中庭，絕非實體牆壁)
        const hallCenter = -b.x; // 對齊世界座標 x = 0 中軸線
        const hallHalfW = 6.0;

        // 西翼實體建築外殼
        const wLeft = (hallCenter - hallHalfW) - (-b.w / 2);
        const xLeft = -b.w / 2 + wLeft / 2;
        const leftShell = new THREE.Mesh(new THREE.BoxGeometry(wLeft, fh - 0.18, b.d), mainMat);
        leftShell.position.set(xLeft, fh / 2, 0);
        leftShell.castShadow = true;
        leftShell.receiveShadow = true;
        fg.add(leftShell);

        // 東翼實體建築外殼
        const wRight = (b.w / 2) - (hallCenter + hallHalfW);
        const xRight = (hallCenter + hallHalfW) + wRight / 2;
        const rightShell = new THREE.Mesh(new THREE.BoxGeometry(wRight, fh - 0.18, b.d), mainMat);
        rightShell.position.set(xRight, fh / 2, 0);
        rightShell.castShadow = true;
        rightShell.receiveShadow = true;
        fg.add(rightShell);

        // 穿堂貫通通道花崗石地坪與挑高天花板
        const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(hallHalfW * 2, 0.22, b.d + 1.2), getMat("#D4D0C8"));
        hallFloor.position.set(hallCenter, 0.11, 0);
        hallFloor.receiveShadow = true;
        fg.add(hallFloor);

        const hallCeiling = new THREE.Mesh(new THREE.BoxGeometry(hallHalfW * 2, 0.24, b.d), mainMat);
        hallCeiling.position.set(hallCenter, fh - 0.12, 0);
        fg.add(hallCeiling);

        // 穿堂兩側門面構造柱
        [-hallHalfW, hallHalfW].forEach(px => {
          const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.8, fh - 0.18, b.d), secMat);
          pCol.position.set(hallCenter + px, fh / 2, 0);
          fg.add(pCol);
        });

        // 東西兩翼玻璃窗帶與窗台 (穿堂區完全挑空開放)
        [ [wLeft, xLeft], [wRight, xRight] ].forEach(([w, x]) => {
          const win = new THREE.Mesh(new THREE.BoxGeometry(w - 1.2, fh * 0.38, b.d + 0.14), glassMat);
          win.position.set(x, fh * 0.56, 0);
          fg.add(win);
          const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, fh * 0.28, b.d + 0.36), secMat);
          ledge.position.set(x, fh * 0.22, 0);
          fg.add(ledge);
        });
      } else {
        const wallShell = new THREE.Mesh(new THREE.BoxGeometry(b.w, fh - 0.18, b.d), mainMat);
        wallShell.position.y = fh / 2;
        wallShell.castShadow = true;
        wallShell.receiveShadow = true;
        fg.add(wallShell);

        const isEW = b.w >= b.d;
        const winBand = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? b.w - 1.4 : b.w + 0.14, fh * 0.38, isEW ? b.d + 0.14 : b.d - 1.4),
          glassMat
        );
        winBand.position.y = fh * 0.56;
        fg.add(winBand);

        let railMat = secMat;
        if (b.style === "liyong") railMat = getMat("#689F4E");     // 利用樓招牌蘋果綠腰帶 (`161523.jpg`)
        if (b.style === "book_depot") railMat = getMat("#B8CF78"); // 書庫萊姆綠窗台線 (`160532.jpg`)
        if (b.style === "library") railMat = getMat("#DEC0B8");    // 圖書館粉褐腰帶 (`160422.jpg`)
        if (b.style === "farm_mgmt") railMat = getMat("#9CC2D6");  // 農經館冰藍拱廊 (`160514.jpg`)

        const ledge = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.36, fh * 0.28, b.d + 0.36),
          railMat
        );
        ledge.position.y = fh * 0.22;
        ledge.castShadow = true;
        fg.add(ledge);
      }

      root.add(fg);
      root.userData.floorGroups[f] = fg;
    }
    // ================= 各棟大樓專屬地標造型細節 (從 43 張實景照片提取) =================
    const topGroup = root.userData.floorGroups[b.floors];

    // 為各棟建築頂樓增添「微縮積木 Stud 凸粒陣列」與「像素冒險體素階梯女兒牆」
    if (topGroup && b.style !== "track" && b.style !== "sport_court" && b.w > 6 && b.d > 6) {
      // (1) 微縮積木風格：屋頂均勻排列的圓形凸粒陣列 (Brick Studs)
      const brickStudsGrp = new THREE.Group();
      brickStudsGrp.name = "var-brick";
      brickStudsGrp.visible = false;
      const studMat = getMat(b.colors.roof || "#AAB4C0", { roughness: 0.16, metalness: 0.15 });
      const studGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 10);
      const step = 2.6;
      for (let sx = -b.w / 2 + 1.4; sx <= b.w / 2 - 1.4; sx += step) {
        for (let sz = -b.d / 2 + 1.4; sz <= b.d / 2 - 1.4; sz += step) {
          const stud = new THREE.Mesh(studGeo, studMat);
          stud.position.set(sx, fh + 0.12, sz);
          stud.castShadow = true;
          brickStudsGrp.add(stud);
        }
      }
      topGroup.add(brickStudsGrp);
      registerThemeObject("brick", brickStudsGrp);

      // (2) 復古像素冒險風格：屋頂四周邊緣的體素方塊女兒牆 (Voxel Battlements)
      const voxelEdgesGrp = new THREE.Group();
      voxelEdgesGrp.name = "var-pixel";
      voxelEdgesGrp.visible = false;
      const vEdgeMat = getMat(b.colors.accent || "#00E5FF", { roughness: 0.85, flatShading: true });
      const vCubeGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
      const vStep = 1.6;
      for (let vx = -b.w / 2 + 0.4; vx <= b.w / 2; vx += vStep) {
        [-b.d / 2 + 0.4, b.d / 2 - 0.4].forEach(vz => {
          const cube = new THREE.Mesh(vCubeGeo, vEdgeMat);
          cube.position.set(vx, fh + 0.36, vz);
          cube.castShadow = true;
          voxelEdgesGrp.add(cube);
        });
      }
      for (let vz = -b.d / 2 + 0.4 + vStep; vz <= b.d / 2 - 0.4 - vStep; vz += vStep) {
        [-b.w / 2 + 0.4, b.w / 2 - 0.4].forEach(vx => {
          const cube = new THREE.Mesh(vCubeGeo, vEdgeMat);
          cube.position.set(vx, fh + 0.36, vz);
          cube.castShadow = true;
          voxelEdgesGrp.add(cube);
        });
      }
      topGroup.add(voxelEdgesGrp);
      registerThemeObject("pixel", voxelEdgesGrp);
    }

        // 敬業樓 (`jingye`) — 東南側入口圓弧陽台 + 金色「敬業樓」牌匾 (還原 20261020_125209.jpg)
    if (b.style === "jingye") {
      const goldMat = getMat("#C59B27", { metalness: 0.4, roughness: 0.3 });
      // 東南角 1F～3F 圓弧露台
      for (let f = 1; f <= 3; f++) {
        const balcony = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, fh * 0.45, 16, 1, false, 0, Math.PI), whiteMat);
        balcony.rotation.y = Math.PI / 2;
        balcony.position.set(b.w / 2 - 1.2, (f - 0.5) * fh, b.d / 2 + 0.8);
        balcony.castShadow = true;
        root.add(balcony);
      }
      // 懸挑門廊「敬 業 樓」金色牌匾
      const jySign = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 5.5), goldMat);
      jySign.position.set(b.w / 2 + 0.2, fh * 1.35, b.d / 2 - 1.2);
      root.add(jySign);
    }
    // 1. 行政大樓 (`admin`) — 中央 4F 高塔 + 東側半圓弧形梯塔 (`161410.jpg`, `161635.jpg`)
    if (b.style === "admin") {
      const centerPavilion = new THREE.Mesh(new THREE.BoxGeometry(12.0, fh * 1.15, b.d + 1.2), mainMat);
      centerPavilion.position.set(0, fh * 0.55, 0);
      centerPavilion.castShadow = true;
      topGroup.add(centerPavilion);

      const eastCylinder = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, totalH + fh * 0.9, 20), mainMat);
      eastCylinder.position.set(b.w / 2 - 1.5, (totalH + fh * 0.9) / 2, 0);
      eastCylinder.castShadow = true;
      root.add(eastCylinder);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.5, 4.5), mainMat);
      canopy.position.set(0, fh * 0.95, -b.d / 2 - 1.8);
      root.add(canopy);
    }

    // 2. 活動中心 (`activity`) — 南側高塔題字「活動中心」與校徽 + 東側 A 字斜撐與彩虹橫樑 + 入口花台 (還原 20261020_125151.jpg)
    if (b.style === "activity") {
      // 南向中央高聳淺藍灰磁磚高塔 (嵌有校徽與「活動中心」大字)
      const southTower = new THREE.Mesh(new THREE.BoxGeometry(7.2, totalH + 3.6, 2.6), getMat("#7E8D9B"));
      southTower.position.set(0, (totalH + 3.6) / 2, b.d / 2 + 0.9);
      southTower.castShadow = true;
      root.add(southTower);

      // 高塔圓形紅底校徽浮雕
      const crestPlaque = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.35, 20), getMat("#8B263E"));
      crestPlaque.rotation.x = Math.PI / 2;
      crestPlaque.position.set(0, totalH + 1.1, b.d / 2 + 2.2);
      root.add(crestPlaque);

      // 南側 1F 入口對稱側柱與迎賓綠籬矮灌木花台
      [-5.5, 5.5].forEach(bx => {
        const buttressCol = new THREE.Mesh(new THREE.BoxGeometry(1.2, fh * 1.05, 1.8), getMat("#A8B2BA"));
        buttressCol.position.set(bx, fh * 0.52, b.d / 2 + 0.9);
        root.add(buttressCol);
      });
      const hedgeBed = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.85, 2.2), getMat("#3A6E32"));
      hedgeBed.position.set(0, 0.42, b.d / 2 + 4.5);
      hedgeBed.receiveShadow = true;
      root.add(hedgeBed);

      const rainbowCols = ["#D96B27", "#E5B828", "#4A934A", "#2E6FB0"];
      for (let i = 0; i < 6; i++) {
        const tz = -b.d * 0.38 + i * (b.d * 0.76 / 5);
        const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.6, totalH * 0.85, 0.65), getMat("#B8B4AC"));
        buttress.position.set(b.w / 2 + 0.8, totalH * 0.42, tz);
        buttress.rotation.z = 0.14;
        root.add(buttress);
      }
      rainbowCols.forEach((rc, idx) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, b.d * 0.88), getMat(rc));
        beam.position.set(b.w / 2 + 0.65, 3.6 + idx * 0.48, 0);
        root.add(beam);
      });

      const redStair = new THREE.Mesh(new THREE.BoxGeometry(2.2, totalH * 0.75, 4.5), accMat);
      redStair.position.set(b.w / 2 + 1.2, totalH * 0.38, b.d / 2 - 3);
      root.add(redStair);
    }

    // 3. 樂耕樓 (`legeng`) — 北向正面玄關入口穿堂門廊 + 金色「樂 耕 樓」大字 + 西端 1–2F 轉角連通利用樓 + 南向雙梯塔 (還原 20261020_125222.jpg)
    if (b.style === "legeng") {
      const centerOffsetX = -b.x; // 對齊世界座標 x = 0 中軸線
      const goldMat = getMat("#C59B27", { metalness: 0.5, roughness: 0.25 });

      // (a) 北立面 1F 門廊雨庇 (寬 14m，懸挑 3.6m，中央 8m 寬闊玄關通道入口完全暢通)
      const canopyW = 14.2;
      const canopyD = 3.6;
      const canopyY = fh;
      const northCanopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.45, canopyD), mainMat);
      northCanopy.position.set(centerOffsetX, canopyY, -b.d / 2 - canopyD / 2);
      northCanopy.castShadow = true;
      root.add(northCanopy);

      // 門廊支撐柱 (左側 2 柱、右側 2 柱，中間完全留空為通暢走道)
      [-5.6, -3.8, 3.8, 5.6].forEach(px => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, canopyY, 0.55), whiteMat);
        col.position.set(centerOffsetX + px, canopyY / 2, -b.d / 2 - canopyD + 0.35);
        col.castShadow = true;
        root.add(col);
      });

      // 1F 正門入口石階地坪 (通往穿堂通道)
      const stepsBase = new THREE.Mesh(new THREE.BoxGeometry(canopyW - 0.8, 0.24, canopyD), getMat("#DCD8D0"));
      stepsBase.position.set(centerOffsetX, 0.12, -b.d / 2 - canopyD / 2);
      stepsBase.receiveShadow = true;
      root.add(stepsBase);

      // (b) 2F 與 3F 中央立面露台與景觀深色窗帶 (立體通透，絕非封閉白牆)
      [2, 3].forEach(f => {
        const fg = root.userData.floorGroups[f];
        if (!fg) return;
        const balcony = new THREE.Mesh(new THREE.BoxGeometry(13.6, fh * 0.32, 1.4), whiteMat);
        balcony.position.set(centerOffsetX, fh * 0.22, -b.d / 2 - 0.7);
        balcony.castShadow = true;
        fg.add(balcony);

        const win = new THREE.Mesh(new THREE.BoxGeometry(12.8, fh * 0.52, 0.2), glassMat);
        win.position.set(centerOffsetX, fh * 0.58, -b.d / 2 + 0.05);
        fg.add(win);
      });

      // (c) 屋頂女兒牆正面立體金色大字「樂」「耕」「樓」三字獨立招牌
      const signBase = new THREE.Mesh(new THREE.BoxGeometry(12.0, 1.35, 0.32), mainMat);
      signBase.position.set(centerOffsetX, totalH + 0.65, -b.d / 2 - 0.16);
      root.add(signBase);

      [-3.8, 0, 3.8].forEach(sx => {
        const charPlaque = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.42), goldMat);
        charPlaque.position.set(centerOffsetX + sx, totalH + 0.65, -b.d / 2 - 0.22);
        charPlaque.castShadow = true;
        root.add(charPlaque);
      });

      // (d) 南向中庭兩側樓梯高塔
      [-6.5, 6.5].forEach(tx => {
        const greyTower = new THREE.Mesh(new THREE.BoxGeometry(3.6, totalH + 1.2, 2.5), getMat("#8E96A0"));
        greyTower.position.set(centerOffsetX + tx, (totalH + 1.2) / 2, b.d / 2 + 0.9);
        greyTower.castShadow = true;
        root.add(greyTower);
      });
      // 西北角 1F & 2F 轉角連通建築體：將樂耕樓 1F、2F (315 教室端) 往西延伸 14.5m 與利用樓北端 (215 教室端) 無縫連通
      const connW = 14.5;
      const connX = -b.w / 2 - connW / 2;
      const liyongGreenMat = getMat("#689F4E");
      const slabMat = getMat("#D8D4CA", { roughness: 0.85 });
      const connRoomMat = getMat("#9BB0A5", { roughness: 0.65 });

      [1, 2].forEach(f => {
        const fg = root.userData.floorGroups[f];
        if (!fg) return;

        // 轉角連通層樓板
        const cSlab = new THREE.Mesh(new THREE.BoxGeometry(connW, 0.24, b.d - 0.3), slabMat);
        cSlab.position.set(connX, 0.12, 0);
        cSlab.receiveShadow = true;
        fg.add(cSlab);

        // 轉角連通室內走廊空間塊 (剖面檢視時清楚呈現 315 轉彎通往 215 之連通道)
        const cCorridor = new THREE.Mesh(new THREE.BoxGeometry(connW - 1.6, fh * 0.45, b.d - 2.6), connRoomMat);
        cCorridor.position.set(connX, 0.25 + fh * 0.225, 0);
        fg.add(cCorridor);

        // 轉角連通外牆殼
        const cWall = new THREE.Mesh(new THREE.BoxGeometry(connW, fh - 0.18, b.d), mainMat);
        cWall.position.set(connX, fh / 2, 0);
        cWall.castShadow = true;
        cWall.receiveShadow = true;
        fg.add(cWall);

        // 轉角窗帶
        const cWin = new THREE.Mesh(new THREE.BoxGeometry(connW + 0.12, fh * 0.38, b.d + 0.12), glassMat);
        cWin.position.set(connX, fh * 0.56, 0);
        fg.add(cWin);

        // 轉角走廊腰帶 (銜接利用樓蘋果綠腰帶與樂耕樓腰帶)
        const cLedge = new THREE.Mesh(new THREE.BoxGeometry(connW + 0.34, fh * 0.28, b.d + 0.34), liyongGreenMat);
        cLedge.position.set(connX, fh * 0.22, 0);
        cLedge.castShadow = true;
        fg.add(cLedge);
      });

      addSolarPanels(topGroup, b.w, b.d, fh, 5);
    }

    // 4. 正德樓 (`zhengde`) — 西端 1–2F 轉角直接連通利用樓 1–2F + 屋頂太陽能板 (`161518.jpg`, `161523.jpg`)
    if (b.style === "zhengde") {
      // 西南角 1F & 2F 轉角連通建築體：將正德樓 1F、2F (105 教室端) 往西延伸 14.5m 與利用樓南端 (111/210 教室端) 無縫連通
      const connW = 14.5;
      const connX = -b.w / 2 - connW / 2;
      const liyongGreenMat = getMat("#689F4E");
      const slabMat = getMat("#D8D4CA", { roughness: 0.85 });
      const connRoomMat = getMat("#9BB0A5", { roughness: 0.65 });

      [1, 2].forEach(f => {
        const fg = root.userData.floorGroups[f];
        if (!fg) return;

        const cSlab = new THREE.Mesh(new THREE.BoxGeometry(connW, 0.24, b.d - 0.3), slabMat);
        cSlab.position.set(connX, 0.12, 0);
        cSlab.receiveShadow = true;
        fg.add(cSlab);

        const cCorridor = new THREE.Mesh(new THREE.BoxGeometry(connW - 1.6, fh * 0.45, b.d - 2.6), connRoomMat);
        cCorridor.position.set(connX, 0.25 + fh * 0.225, 0);
        fg.add(cCorridor);

        const cWall = new THREE.Mesh(new THREE.BoxGeometry(connW, fh - 0.18, b.d), mainMat);
        cWall.position.set(connX, fh / 2, 0);
        cWall.castShadow = true;
        cWall.receiveShadow = true;
        fg.add(cWall);

        const cWin = new THREE.Mesh(new THREE.BoxGeometry(connW + 0.12, fh * 0.38, b.d + 0.12), glassMat);
        cWin.position.set(connX, fh * 0.56, 0);
        fg.add(cWin);

        const cLedge = new THREE.Mesh(new THREE.BoxGeometry(connW + 0.34, fh * 0.28, b.d + 0.34), liyongGreenMat);
        cLedge.position.set(connX, fh * 0.22, 0);
        cLedge.castShadow = true;
        fg.add(cLedge);
      });

      addSolarPanels(topGroup, b.w, b.d, fh, 6);
    }

    // 5. 厚生樓 (`housheng`) — 紅磚垂直壁柱 + 4F 頂層半圓形鏤空拱廊 + 雙座藍波浪入口門廊 (`161527.jpg`)
    if (b.style === "housheng") {
      const brickMat = getMat("#B86B52");
      for (let pz = -b.d * 0.44; pz <= b.d * 0.44; pz += 6.2) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.5, totalH + 0.4, 0.75), brickMat);
        pilaster.position.set(0, totalH / 2, pz);
        root.add(pilaster);
      }
      [-14, 14].forEach(pz => {
        const portico = new THREE.Mesh(new THREE.BoxGeometry(2.8, fh, 4.8), getMat("#1E78B4"));
        portico.position.set(-b.w / 2 - 1.2, fh / 2, pz);
        root.add(portico);
      });
    }

    // 6. 餐飲館 (`catering`) — 左右對稱全高「雙圓柱形角樓」+ 屋頂太陽能 (`160241.jpg`)
    if (b.style === "catering") {
      [-b.w / 2 + 1.2, b.w / 2 - 1.2].forEach(cx => {
        const cylTower = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, totalH + 0.8, 24), mainMat);
        cylTower.position.set(cx, (totalH + 0.8) / 2, 0);
        cylTower.castShadow = true;
        root.add(cylTower);
      });
      addSolarPanels(topGroup, b.w * 0.7, b.d, fh, 3);
    }

    // 7. 樂揚樓 (`yueyang`) — 北向 (`160257.jpg`) 與南向 (`160345.jpg`) 雙面皆設有天藍色結構外框與中央雙層高天藍色大圓拱門廊
    if (b.style === "yueyang") {
      const blueMat = getMat("#5AA9E6");
      const lightBlueMat = getMat("#78BCEF");

      // 屋頂天藍色女兒牆冠頂外框 (加在 topGroup 上，相對高度為 fh)
      const topCrown = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.9, 0.75, b.d + 0.9), blueMat);
      topCrown.position.set(0, fh + 0.15, 0);
      topCrown.castShadow = true;
      topGroup.add(topCrown);

      // 西南角圓弧白色轉角造型 (`160345.jpg` 左側與烹飪教室相鄰之圓角柱樓)
      const swRoundCorner = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, totalH + 0.6, 20), mainMat);
      swRoundCorner.position.set(-b.w / 2 + 1.2, (totalH + 0.6) / 2, b.d / 2 - 1.2);
      swRoundCorner.castShadow = true;
      root.add(swRoundCorner);

      // 北面 (dir = -1, 朝北 -Z, 對應實景1 `160257.jpg`) 與 南面 (dir = +1, 朝南 +Z, 對應實景2 `160345.jpg`) 雙面天藍色圓拱結構
      [-1, 1].forEach(dir => {
        const zFace = dir * (b.d / 2 + 0.85);

        // 中央挑高天藍色門廊左右雙立柱
        [-2.3, 2.3].forEach(px => {
          const archPillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, fh * 2.25, 1.8), blueMat);
          archPillar.position.set(px, fh * 1.125, zFace);
          archPillar.castShadow = true;
          root.add(archPillar);
        });

        // 門廊二樓「樂揚樓」天藍色橫匾招牌板
        const signPlaque = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.25, 2.0), lightBlueMat);
        signPlaque.position.set(0, fh * 1.35, zFace);
        signPlaque.castShadow = true;
        root.add(signPlaque);

        // 門廊頂部天藍色鏤空半圓拱 (XY 平面半圓拱連接 x = ±2.3 雙柱，正面朝北 -Z 與朝南 +Z)
        const archTop = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.5, 12, 24, Math.PI), blueMat);
        archTop.scale.set(1, 1, 1.85);
        archTop.position.set(0, fh * 2.25, zFace);
        archTop.castShadow = true;
        root.add(archTop);

        // 南北立面兩側天藍色垂直結構框柱
        [-b.w * 0.44, b.w * 0.44].forEach(cx => {
          const sideCol = new THREE.Mesh(new THREE.BoxGeometry(0.75, totalH + 0.4, 0.75), blueMat);
          sideCol.position.set(cx, (totalH + 0.4) / 2, dir * (b.d / 2 + 0.2));
          root.add(sideCol);
        });
      });

      addSolarPanels(topGroup, b.w * 0.7, b.d * 0.55, fh, 2);
    }

    // 8. 原美術教室（圖書館前日式斜頂平房 `japanese_annex`）— 修正為正南北向對齊之深灰日本瓦斜屋頂 (`160405.jpg`)
    if (b.style === "japanese_annex") {
      const roofTileMat = getMat("#43464B", { roughness: 0.78 });
      const ridgeMat = getMat("#2D3034", { roughness: 0.7 });
      const woodMat = getMat("#3A2E28", { roughness: 0.85 });

      // 使用 ExtrudeGeometry 建立與建築物長寬 (w 沿 X 軸、d 沿 Z 軸) 100% 平行對齊的深灰瓦斜屋頂，避免 ConeGeometry 旋轉縮放造成歪斜
      const overhangX = 0.85;
      const overhangZ = 0.85;
      const halfW = b.w / 2 + overhangX;
      const roofH = 2.35;
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-halfW, 0);
      roofShape.lineTo(0, roofH);
      roofShape.lineTo(halfW, 0);
      roofShape.closePath();

      const roofLen = b.d + overhangZ * 2;
      const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: roofLen, bevelEnabled: false });
      const mainRoof = new THREE.Mesh(roofGeo, roofTileMat);
      mainRoof.position.set(0, fh - 0.1, -roofLen / 2);
      mainRoof.castShadow = true;
      mainRoof.receiveShadow = true;
      topGroup.add(mainRoof);

      // 屋脊深灰瓦脊線 (南北向貫穿屋頂中央)
      const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, roofLen + 0.2), ridgeMat);
      ridgeBeam.position.set(0, fh + roofH - 0.05, 0);
      ridgeBeam.castShadow = true;
      topGroup.add(ridgeBeam);

      // 西側中央傳統木造山牆式玄關門廊 (朝西 -X，含獨立小斜頂與木柱)
      const porchW = 2.6;
      const porchD = 4.2;
      const porchBase = new THREE.Mesh(new THREE.BoxGeometry(porchW, fh * 0.78, porchD), woodMat);
      porchBase.position.set(-b.w / 2 - porchW / 2 + 0.2, fh * 0.39, 0);
      porchBase.castShadow = true;
      root.add(porchBase);

      const porchRoofShape = new THREE.Shape();
      porchRoofShape.moveTo(-porchD / 2 - 0.4, 0);
      porchRoofShape.lineTo(0, 1.15);
      porchRoofShape.lineTo(porchD / 2 + 0.4, 0);
      porchRoofShape.closePath();
      const porchRoofGeo = new THREE.ExtrudeGeometry(porchRoofShape, { depth: porchW + 0.6, bevelEnabled: false });
      const porchRoof = new THREE.Mesh(porchRoofGeo, roofTileMat);
      porchRoof.rotation.y = -Math.PI / 2;
      porchRoof.position.set(-b.w / 2 + 0.3, fh * 0.78, 0);
      porchRoof.castShadow = true;
      topGroup.add(porchRoof);
    }

    // 9. 食品加工館 (`food_proc`) — 雙側 4 層高圓拱凹槽角樓 + 屋頂太陽能 (`160446.jpg`)
    if (b.style === "food_proc") {
      [-b.d / 2 + 3.2, b.d / 2 - 3.2].forEach(tz => {
        const cornerTower = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.2, totalH + fh * 0.85, 6.4), mainMat);
        cornerTower.position.set(0, (totalH + fh * 0.85) / 2, tz);
        cornerTower.castShadow = true;
        root.add(cornerTower);
      });
      addSolarPanels(topGroup, b.w, b.d * 0.55, fh, 2);
    }

    // 10. 書庫（原學生宿舍 `book_depot`）— 左側樓梯間圓形舷窗 (`160532.jpg`)
    if (b.style === "book_depot") {
      const stairCore = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.6, totalH + 0.8, 4.8), whiteMat);
      stairCore.position.set(0, (totalH + 0.8) / 2, -b.d / 2 + 2.5);
      root.add(stairCore);
      for (let f = 1; f <= 4; f++) {
        const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, b.w + 0.8, 16), glassMat);
        porthole.rotation.z = Math.PI / 2;
        porthole.position.set(0, (f - 0.45) * fh, -b.d / 2 + 2.5);
        root.add(porthole);
      }
    }

    // 11. 機械館 (`mechanical`) — 中央弧形門廊 + 新建淺鮭魚粉色「無障礙電梯」（含機械齒輪造型） (`160127.jpg`, `160146.jpg`)
    if (b.style === "mechanical") {
      const centerCore = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, totalH + fh * 0.8, 20), mainMat);
      centerCore.position.set(-b.w / 2 + 1.5, (totalH + fh * 0.8) / 2, 0);
      centerCore.castShadow = true;
      root.add(centerCore);

      const elevTower = new THREE.Mesh(new THREE.BoxGeometry(4.8, totalH + fh * 0.95, 5.2), getMat("#EDAFA4"));
      elevTower.position.set(-b.w / 2 - 1.2, (totalH + fh * 0.95) / 2, -b.d * 0.28);
      elevTower.castShadow = true;
      root.add(elevTower);

      [totalH * 0.62, totalH * 0.88].forEach((gy, gi) => {
        const gear = new THREE.Mesh(new THREE.TorusGeometry(1.1 - gi * 0.25, 0.28, 8, 12), getMat("#9E9B95", { metalness: 0.4 }));
        gear.rotation.y = Math.PI / 2;
        gear.position.set(-b.w / 2 - 3.65, gy, -b.d * 0.28 + (gi * 0.8));
        root.add(gear);
      });
    }

    // 12. 畜產館 & 土木館 (`twin_tech`) — 雙胞胎 4F 赤陶磚 + 屋頂中央紅瓦斜頂 + 南端 3 層樓連通走廊橋 (還原 20261020_125439.jpg)
    if (b.style === "twin_tech") {
      const penthouse = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.5, 7.2), whiteMat);
      penthouse.position.set(0, fh + 1.25, 0);
      topGroup.add(penthouse);

      const redRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.3, 4), getMat("#9E4739"));
      redRoof.rotation.y = Math.PI / 4;
      redRoof.position.set(0, fh + 3.5, 0);
      topGroup.add(redRoof);

      const entranceBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, totalH + 0.5, 7.5), secMat);
      entranceBox.position.set(-b.w / 2 - 0.8, totalH / 2, 0);
      root.add(entranceBox);

      // 土木館與畜產館中央 1F～3F 連通走廊廊橋 (依 20261020_125439.jpg 實景：位於兩棟大樓正中央 connZ = 0.0，跨距 12m、深 7.2m，1F 設有挑高拱門通道供行人穿過草坪)
      if (b.id === "civil_eng") {
        const connSpanX = 12.0;
        const connD = 7.2;
        const connZ = 0.0; // 位於兩棟大樓正中間！
        const connH = fh * 3;
        const bridgeGroup = new THREE.Group();
        bridgeGroup.position.set(b.w / 2 + connSpanX / 2, 0, connZ);

        // 1F～3F 樓板與雙側紅磚外牆
        for (let cf = 1; cf <= 3; cf++) {
          const cyBase = (cf - 1) * fh;
          const cFloor = new THREE.Mesh(new THREE.BoxGeometry(connSpanX, 0.35, connD), getMat("#D8D4CA"));
          cFloor.position.y = cyBase + 0.18;
          cFloor.receiveShadow = true;
          bridgeGroup.add(cFloor);

          if (cf === 1) {
            // 1F 地面層：中央留有寬闊挑高穿堂通道，行人與視線可由南北向草坪直接穿透 (還原 125439.jpg 實景)
            [-connD / 2 + 0.45, connD / 2 - 0.45].forEach(wz => {
              // 兩側門柱
              [-connSpanX / 2 + 1.2, connSpanX / 2 - 1.2].forEach(wx => {
                const col = new THREE.Mesh(new THREE.BoxGeometry(2.2, fh - 0.2, 0.65), mainMat);
                col.position.set(wx, cyBase + fh / 2, wz);
                col.castShadow = true;
                bridgeGroup.add(col);
              });
              // 門樑
              const lintel = new THREE.Mesh(new THREE.BoxGeometry(connSpanX, 1.1, 0.65), mainMat);
              lintel.position.set(0, cyBase + fh - 0.55, wz);
              bridgeGroup.add(lintel);
            });
          } else {
            // 2F & 3F 廊橋封閉式紅磚外立面與景觀採光連窗
            [-connD / 2 + 0.45, connD / 2 - 0.45].forEach(wz => {
              const lowWall = new THREE.Mesh(new THREE.BoxGeometry(connSpanX, 1.25, 0.55), mainMat);
              lowWall.position.set(0, cyBase + 0.65, wz);
              lowWall.castShadow = true;
              bridgeGroup.add(lowWall);

              const winBand = new THREE.Mesh(new THREE.BoxGeometry(connSpanX - 1.2, fh * 0.42, 0.3), glassMat);
              winBand.position.set(0, cyBase + fh * 0.58, wz);
              bridgeGroup.add(winBand);

              const topWall = new THREE.Mesh(new THREE.BoxGeometry(connSpanX, 0.85, 0.55), mainMat);
              topWall.position.set(0, cyBase + fh - 0.42, wz);
              bridgeGroup.add(topWall);
            });
          }
        }

        // 4F 頂部平斜連通金屬鋼構頂棚 (還原 125439.jpg)
        const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(connSpanX + 0.8, 0.45, connD + 0.8), roofMat);
        bridgeRoof.position.y = connH + 0.22;
        bridgeRoof.castShadow = true;
        bridgeGroup.add(bridgeRoof);

        root.add(bridgeGroup);
      }
    }

    // 13. 園藝館 (`horticulture`) & 農經館 (`farm_mgmt`) — 屋頂太陽能光電板
    if (b.style === "horticulture" || b.style === "farm_mgmt") {
      addSolarPanels(topGroup, b.w, b.d, fh, 3);
    }

    // 14. 合作社大樓 (`coop_art`) — 入口右側高聳圓柱形塔樓 + 南側圓角咖啡褐附屬門廊（對照平面圖）
    if (b.style === "coop_art") {
      const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, totalH + 2.4, 20), mainMat);
      rotunda.position.set(b.w * 0.22, (totalH + 2.4) / 2, -b.d / 2 - 0.8);
      rotunda.castShadow = true;
      root.add(rotunda);

      const southPorch = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.72, 3.4, 4.2), getMat("#8C6239"));
      southPorch.position.set(b.w * 0.12, 1.7, b.d / 2 + 2.1);
      southPorch.castShadow = true;
      root.add(southPorch);
    }

    // 15. 游泳館 (`swimming`) — 中央挑高塔樓與 4×4 水泥方格遮陽花格窗 (`160848.jpg`)
    if (b.style === "swimming") {
      const centerBay = new THREE.Mesh(new THREE.BoxGeometry(10.5, totalH + 2.0, b.d + 1.4), mainMat);
      centerBay.position.set(0, (totalH + 2.0) / 2, 0);
      centerBay.castShadow = true;
      root.add(centerBay);

      const gridScreen = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.2, b.d + 1.8), getMat("#8E9296"));
      gridScreen.position.set(0, totalH * 0.72, 0);
      root.add(gridScreen);
    }

    return root;
  }

  return {
    buildCampusGrounds,
    createBuildingMesh,
    setVisualTheme
  };
})();
