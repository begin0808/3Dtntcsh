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

  // 建立動態 Canvas 2D 紋理貼圖工具 (用於真實再現校門校名牌匾、LED電子看板、警衛室公佈欄)
  function makeTextCanvas(w, h, drawFn) {
    if (typeof document === "undefined") return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) drawFn(ctx, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      return tex;
    } catch (e) {
      return null;
    }
  }

  // 建立頂樓太陽能光電板陣列（依使用者指示，全校各大樓樓頂太陽能板已全面移除）
  function addSolarPanels(parent, w, d, y, count = 3) {
    return;
  }

  // 工具函式：點 (px, pz) 到線段 (ax, az)-(bx, bz) 的平面距離
  function distToSegment2D(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
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

    // 4b. 校內人行步道 (磚色鋪面，與中庭步道同色系)
    // 頂面 y = 0.10：高於球場廣場鋪面 (0.06)、低於黑色車道 (0.14)，與車道交接處不會共平面閃爍
    // (場景啟用 logarithmicDepthBuffer，polygonOffset 無法分開深度，必須靠實際高度差)
    const walkwayMat = getMat("#B68F66", { roughness: 0.8 });
    (DATA.walkways || []).forEach(r => {
      addPolylineRoad(envGroup, r.points, r.width || 3.5, 0.03, walkwayMat, false, null, 0.14);
    });

    // 5. 平面圖特色地景與廣場還原 (aa190fc6a5da5710e0aea63299779c6c.PNG)
    const whitePlazaMat = getMat("#F0EFEA", { roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const brickPlazaMat = getMat("#B68F66", { roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const gardenPathMat = getMat("#8C8A84", { roughness: 0.85 });
    const darkGreenMat = getMat("#497A3B", { roughness: 0.85 });

    // (a) 行政大樓北側扇形景觀公園與圓形廣場 (x=34, z=-124)
    const neParkBase = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.12, 32), gardenPathMat);
    neParkBase.position.set(34, 0.02, -124);
    envGroup.add(neParkBase);
    const neParkCenter = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.18, 28), getMat("#7C827A"));
    neParkCenter.position.set(34, 0.08, -124);
    envGroup.add(neParkCenter);

    // (b) 樂耕樓北側十字路口中央「圓環花圃」 (0, -75)（依使用者指示放大 1.2 倍）
    const circleCurb = new THREE.Mesh(new THREE.CylinderGeometry(3.12, 3.36, 0.46, 32), getMat("#7B6E75"));
    circleCurb.position.set(0, 0.23, -75);
    envGroup.add(circleCurb);
    const circleBush = new THREE.Mesh(new THREE.CylinderGeometry(2.52, 2.64, 0.58, 32), darkGreenMat);
    circleBush.position.set(0, 0.33, -75);
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
      // 17. 人行步道 (DATA.walkways)，兩側各留 1m 淨空
      const walkways = DATA.walkways || [];
      for (let i = 0; i < walkways.length; i++) {
        const pts = walkways[i].points;
        const half = (walkways[i].width || 3.5) / 2 + 1.0;
        for (let j = 0; j < pts.length - 1; j++) {
          if (distToSegment2D(x, z, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]) < half) return true;
        }
      }
      return false;
    }

    // 嚴格建築物避讓檢查函數：確保任何樹木絕不長在任何大樓或屋頂上 (徹底解決美術教室、資源室、食品加工廠等重疊問題)
    function isPositionOnBuilding(x, z) {
      // 司令台避讓檢查 (位於田徑操場東側衝刺道旁 x = -93.8, z = -170.0，橘色框範圍內嚴格淨空禁植樹)
      if (Math.abs(x - (-93.8)) < 5.5 && Math.abs(z - (-170.0)) < 12.0) {
        return true;
      }
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

    function addTree(x, z, scale = 1.0, style = "mahogany", force = false) {
      // 1. 永平街校外道路完全不種樹 (永平街 x > 175)
      if (x > 174.0) return;
      // 2. 嚴格道路避讓：不壓黑路 (除非特定迎賓椰林步道強制放置)
      if (!force && isPositionOnRoad(x, z)) return;
      // 3. 嚴格建築物避讓：絕不在大樓屋頂或立面長樹
      if (!force && isPositionOnBuilding(x, z)) return;

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
        // 大王椰子樹 (依實景照片精細打造：修長灰白環紋樹幹、頂部翠綠葉鞘與放射狀羽狀椰葉)
        const trunkH = 12.0 * scale;
        // 1. Day
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, trunkH - 1.6 * scale, 12),
          getMat("#9E9A92", { roughness: 0.85 })
        );
        trunk.position.y = (trunkH - 1.6 * scale) / 2;
        trunk.castShadow = true;
        varDay.add(trunk);

        // 頂部翠綠葉鞘 (Crownshaft)
        const crownShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22 * scale, 0.25 * scale, 1.6 * scale, 12),
          getMat("#3A7A28", { roughness: 0.6 })
        );
        crownShaft.position.y = trunkH - 0.8 * scale;
        crownShaft.castShadow = true;
        varDay.add(crownShaft);

        // 放射狀優雅羽狀椰葉 (8 枝向外拱垂羽葉)
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const frond = new THREE.Mesh(
            new THREE.BoxGeometry(0.32 * scale, 0.08 * scale, 3.2 * scale),
            palmLeafMat
          );
          frond.position.set(Math.cos(ang) * 1.4 * scale, trunkH + 0.15 * scale, Math.sin(ang) * 1.4 * scale);
          frond.rotation.y = ang;
          frond.rotation.x = 0.32;
          frond.castShadow = true;
          varDay.add(frond);
        }

        // 中心茂盛葉團
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6 * scale, 1), palmLeafMat);
        crown.scale.set(1.2, 0.65, 1.2);
        crown.position.y = trunkH + 0.45 * scale;
        crown.castShadow = true;
        varDay.add(crown);

        // 2. Brick
        const bTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.44 * scale, trunkH, 12), getMat("#6E4D30", { roughness: 0.16, metalness: 0.15 }));
        bTrunk.position.y = trunkH / 2;
        bTrunk.castShadow = true;
        varBrick.add(bTrunk);
        const bLeafMat = getMat("#228B22", { roughness: 0.16, metalness: 0.15 });
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
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
      } else if (style === "sterculia") {
        // 掌葉蘋婆 (Sterculia foetida) — 學校中庭極具代表性之「非常大」地標老樹 (完美還原使用者上傳照片與紅圈位置)
        // 特色：粗壯挺拔的主幹、大角度橫向平展的輪生粗枝、層次分明且向四周大幅度開展的巨大傘狀廣幅樹冠
        const trunkH = (7.5 + Math.random() * 0.8) * scale;
        const trunkRadiusBottom = 0.65 * scale;
        const trunkRadiusTop = 0.45 * scale;

        // 1. 晴空寫實風格 (Day)
        // (a) 粗壯主樹幹與根部展開
        const sterculiaBarkMat = getMat("#4E443A", { roughness: 0.92 });
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkH, 12),
          sterculiaBarkMat
        );
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        varDay.add(trunk);

        // 根部突起 (板根與樹瘤意象)
        for (let ri = 0; ri < 4; ri++) {
          const rAngle = (ri / 4) * Math.PI * 2 + 0.3;
          const rootFlare = new THREE.Mesh(
            new THREE.BoxGeometry(0.35 * scale, 0.7 * scale, 1.2 * scale),
            sterculiaBarkMat
          );
          rootFlare.position.set(
            Math.cos(rAngle) * (trunkRadiusBottom * 0.85),
            0.35 * scale,
            Math.sin(rAngle) * (trunkRadiusBottom * 0.85)
          );
          rootFlare.rotation.y = rAngle;
          rootFlare.rotation.x = 0.25;
          rootFlare.castShadow = true;
          varDay.add(rootFlare);
        }

        // (b) 西側樹底經典設施：實景照片中的「白色環樹休閒圓椅」 (white circular tree bench)
        if (x < -25) {
          const benchWhiteMat = getMat("#F0F4F8", { roughness: 0.35, metalness: 0.1 });
          const seatInnerR = 1.05 * scale;
          const seatOuterR = 1.75 * scale;
          const seatY = 0.48 * scale;

          // 環形木條/金屬座椅面
          const seatRing = new THREE.Mesh(
            new THREE.RingGeometry(seatInnerR, seatOuterR, 28),
            benchWhiteMat
          );
          seatRing.rotation.x = -Math.PI / 2;
          seatRing.position.y = seatY;
          seatRing.castShadow = true;
          varDay.add(seatRing);

          // 座椅外緣圓形扶手金屬框
          const outerRim = new THREE.Mesh(
            new THREE.TorusGeometry((seatOuterR + seatInnerR) / 2, (seatOuterR - seatInnerR) / 2, 8, 28),
            benchWhiteMat
          );
          outerRim.rotation.x = Math.PI / 2;
          outerRim.position.y = seatY;
          varDay.add(outerRim);

          // 6 根垂直支撐金屬椅腳
          for (let li = 0; li < 6; li++) {
            const legAng = (li / 6) * Math.PI * 2;
            const leg = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, seatY, 8),
              benchWhiteMat
            );
            leg.position.set(
              Math.cos(legAng) * ((seatInnerR + seatOuterR) / 2),
              seatY / 2,
              Math.sin(legAng) * ((seatInnerR + seatOuterR) / 2)
            );
            leg.castShadow = true;
            varDay.add(leg);
          }

          // 白色環形椅背
          const backRest = new THREE.Mesh(
            new THREE.CylinderGeometry(seatOuterR, seatOuterR, 0.4 * scale, 28, 1, true),
            benchWhiteMat
          );
          backRest.position.y = seatY + 0.28 * scale;
          varDay.add(backRest);
        }

        // (c) 5 根大角度水平延展之「巨型輪生粗枝」（掌葉蘋婆代表性特徵）
        const limbMat = sterculiaBarkMat;
        const branchConfigs = [
          { ang: 0.2, len: 5.8 * scale, pitch: 0.32, lobeR: 3.8 * scale },
          { ang: 1.45, len: 5.5 * scale, pitch: 0.28, lobeR: 3.6 * scale },
          { ang: 2.7, len: 6.2 * scale, pitch: 0.30, lobeR: 4.0 * scale },
          { ang: 3.95, len: 5.4 * scale, pitch: 0.26, lobeR: 3.6 * scale },
          { ang: 5.15, len: 6.0 * scale, pitch: 0.34, lobeR: 3.9 * scale }
        ];

        branchConfigs.forEach(b => {
          // 橫向大粗枝
          const limb = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24 * scale, 0.42 * scale, b.len, 8),
            limbMat
          );
          const midDist = (b.len * Math.cos(b.pitch)) / 2;
          const startY = trunkH * 0.72;
          const midY = startY + (b.len * Math.sin(b.pitch)) / 2;
          limb.position.set(Math.cos(b.ang) * midDist, midY, Math.sin(b.ang) * midDist);
          limb.rotation.y = -b.ang + Math.PI / 2;
          limb.rotation.z = Math.PI / 2 - b.pitch;
          limb.castShadow = true;
          varDay.add(limb);

          // 枝頭端點支撐之平展葉球群 (微扁廣卵形傘狀)
          const lobeEndX = Math.cos(b.ang) * (b.len * Math.cos(b.pitch) + 0.5 * scale);
          const lobeEndY = startY + b.len * Math.sin(b.pitch) + 0.8 * scale;
          const lobeEndZ = Math.sin(b.ang) * (b.len * Math.cos(b.pitch) + 0.5 * scale);

          const lobeMat = Math.random() > 0.45 ? leafMatDark : leafMat1;
          const lobe = new THREE.Mesh(
            new THREE.SphereGeometry(b.lobeR, 8, 7),
            lobeMat
          );
          lobe.scale.set(1.4, 0.7, 1.4); // 扁平傘狀
          lobe.position.set(lobeEndX, lobeEndY, lobeEndZ);
          lobe.castShadow = true;
          varDay.add(lobe);

          // 枝上副葉團 (豐富層次感)
          const subLobe = new THREE.Mesh(
            new THREE.DodecahedronGeometry(b.lobeR * 0.65, 1),
            leafMat1
          );
          subLobe.scale.set(1.2, 0.65, 1.2);
          subLobe.position.set(lobeEndX * 0.62, startY + b.len * Math.sin(b.pitch) * 0.5 + 0.6 * scale, lobeEndZ * 0.62);
          subLobe.castShadow = true;
          varDay.add(subLobe);
        });

        // (d) 中央主頂層巨型傘狀樹冠
        const centerCrown = new THREE.Mesh(
          new THREE.SphereGeometry(5.4 * scale, 9, 8),
          leafMatDark
        );
        centerCrown.scale.set(1.45, 0.82, 1.45);
        centerCrown.position.y = trunkH + 3.2 * scale;
        centerCrown.castShadow = true;
        varDay.add(centerCrown);

        const topCanopy = new THREE.Mesh(
          new THREE.DodecahedronGeometry(3.6 * scale, 1),
          leafMat1
        );
        topCanopy.scale.set(1.3, 0.7, 1.3);
        topCanopy.position.y = trunkH + 5.2 * scale;
        topCanopy.castShadow = true;
        varDay.add(topCanopy);

        // 2. 微縮積木世界風格 (Brick) — 巨大階梯積木圓盤樹
        const bTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55 * scale, 0.75 * scale, trunkH, 14),
          getMat("#6E4D30", { roughness: 0.16, metalness: 0.15 })
        );
        bTrunk.position.y = trunkH / 2;
        bTrunk.castShadow = true;
        varBrick.add(bTrunk);

        const bGreenMat = getMat("#1B8738", { roughness: 0.16, metalness: 0.15 });
        const sterculiaDiscs = [
          { r: 7.2 * scale, h: 0.8 * scale, studs: 12 },
          { r: 5.6 * scale, h: 0.8 * scale, studs: 10 },
          { r: 4.0 * scale, h: 0.75 * scale, studs: 8 },
          { r: 2.5 * scale, h: 0.65 * scale, studs: 6 }
        ];
        let bCurY = trunkH + 0.2 * scale;
        sterculiaDiscs.forEach((d, idx) => {
          const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(d.r * 0.95, d.r, d.h, 18),
            bGreenMat
          );
          disc.position.y = bCurY;
          disc.castShadow = true;
          varBrick.add(disc);

          for (let si = 0; si < d.studs; si++) {
            const sa = (si / d.studs) * Math.PI * 2;
            const stud = new THREE.Mesh(
              new THREE.CylinderGeometry(0.24 * scale, 0.24 * scale, 0.20 * scale, 8),
              bGreenMat
            );
            stud.position.set(Math.cos(sa) * (d.r * 0.75), bCurY + d.h * 0.55, Math.sin(sa) * (d.r * 0.75));
            varBrick.add(stud);
          }
          bCurY += d.h;
        });

        // 3. 復古像素冒險風格 (Pixel) — 巨型體素積木方塊大樹
        const pTrunk = new THREE.Mesh(
          new THREE.BoxGeometry(1.0 * scale, trunkH, 1.0 * scale),
          getMat("#4A3525", { roughness: 0.85, flatShading: true })
        );
        pTrunk.position.y = trunkH / 2;
        pTrunk.castShadow = true;
        varPixel.add(pTrunk);

        const pGreenMat = getMat("#22B54C", { roughness: 0.8, flatShading: true });
        const pBoxes = [
          { w: 12.0 * scale, h: 2.0 * scale, y: trunkH + 1.2 * scale },
          { w: 9.0 * scale, h: 1.8 * scale, y: trunkH + 2.8 * scale },
          { w: 6.0 * scale, h: 1.6 * scale, y: trunkH + 4.3 * scale },
          { w: 3.5 * scale, h: 1.4 * scale, y: trunkH + 5.6 * scale }
        ];
        pBoxes.forEach(pb => {
          const pBox = new THREE.Mesh(
            new THREE.BoxGeometry(pb.w, pb.h, pb.w),
            pGreenMat
          );
          pBox.position.y = pb.y;
          pBox.castShadow = true;
          varPixel.add(pBox);
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

    // ================= 1. 沿中山南路校界圍牆內側種植一整排高大茂密景觀樹列 (大葉桃花心木，依指示放大為校園標準 1.25 大樹) =================
    // (依使用者明確指示：校門口兩側，靠近中山南路的圍牆邊那一排樹木，改為和校園其他大部分樹木一樣大)
    // (A) 西北部外圍弧線樹列 (田徑操場北側沿圍牆內側 2.8m，均勻排列)
    [
      [-168.5, -270.6], [-162.1, -275.7], [-155.7, -280.7], [-149.2, -285.8]
    ].forEach(([x, z]) => addTree(x, z, 1.25, "mahogany"));

    // (B) 中山南路西段樹列 (操場北側至校門大門西側，距圍牆內側 2.8m，避開西幹道路口與校車停靠區，均勻間距約 11.5m)
    [
      // 西幹道以西 (操場北側)
      [-139.5, -283.2], [-129.0, -276.5], [-118.5, -269.9], [-108.0, -263.2], [-97.5, -256.6], [-88.5, -250.8],
      // 西幹道以東 (車棚北側至大門西側)
      [-74.5, -242.0], [-64.0, -235.3], [-53.5, -228.6], [-43.0, -222.0], [-32.5, -215.3], [-22.0, -208.6]
    ].forEach(([x, z]) => addTree(x, z, 1.25, "mahogany"));

    // (C) 中山南路東段樹列 (校門大門東側沿圍牆內側一路筆直延伸至東北角，距圍牆內側 2.8m，均勻排列一整排樹木)
    [
      // 大門東側至前段 (x = 20 至 101)
      [20.7, -177.2], [30.7, -170.4], [40.7, -163.7], [50.7, -156.9], [60.8, -150.2],
      [70.8, -143.4], [80.8, -136.7], [90.8, -129.9], [100.8, -123.2],
      // 學生車棚北、餐飲館北至東北角 (x = 110 至 171)
      [110.3, -116.8], [120.3, -110.0], [130.4, -103.3], [140.5, -96.5], [150.6, -89.7],
      [160.6, -83.0], [170.7, -76.2]
    ].forEach(([x, z]) => addTree(x, z, 1.25, "mahogany"));

    // ================= 2. 黃色圈圈：校門圓環往東斜向車道改為「道路兩旁植樹，車道暢通」 =================
    // (A) 車道北側樹列 (路外側草坪，位於斜道北邊 6.5m)
    [
      [22.0, -164.0], [34.0, -156.0], [46.0, -148.0], [58.0, -140.0], [70.0, -132.0]
    ].forEach(([x, z]) => addTree(x, z, 1.1, "mahogany"));

    // (B) 車道南側樹列 (圓環與行政大樓北側草坪邊緣，位於斜道南邊 6.5m)
    [
      [22.0, -151.0], [34.0, -143.0], [46.0, -135.0], [58.0, -127.0]
    ].forEach(([x, z]) => addTree(x, z, 1.1, "mahogany"));

    // ================= 3. 校門進場中央迎賓大道椰林與兩側景觀樹 (依使用者指示調整為道路正中央兩排) =================
    // (A) 迎賓大道正中間兩排大王椰子樹 (西側排 x = -2.2，東側排 x = +2.2，每排 6 棵，共 12 棵對稱佇立於道路中央迎賓步道兩側)
    for (let z = -148; z <= -106; z += 8.4) {
      addTree(-2.2, z, 1.15, "palm", true); // 西側排 (道路中央偏西)
      addTree(2.2, z, 1.15, "palm", true);  // 東側排 (道路中央偏東)
    }

    // (B) 迎賓大道東側景觀樹列 (黃色框框位置：依使用者指示改為小棵樹，scale = 0.6)
    for (let z = -148; z <= -114; z += 8.4) {
      addTree(8.5, z, 0.6, "mahogany");
    }

    // ================= 4. 中庭教學區樹列配置 (依使用者圖二指示：樂耕樓北側、樂耕樓南側、利用樓西側、正德樓北側、正德樓南側各植一排樹) =================
    // (A) 樂耕樓北邊前排樹列 (z = -63.0，位於樂耕樓北牆與道路間綠帶，避開中央穿堂通道)
    [-38, -28, -18, -10].forEach(x => addTree(x, -63.0, 1.25, "mahogany"));
    [10, 18, 28, 38].forEach(x => addTree(x, -63.0, 1.25, "mahogany"));

    // (B) 樂耕樓南側中庭樹列 (z = -28.0，避開中央穿堂中軸步道)
    [-34, -26, -18, -10].forEach(x => addTree(x, -28.0, 1.25, "mahogany"));
    [10, 18, 26, 34].forEach(x => addTree(x, -28.0, 1.25, "mahogany"));

    // (B2) 中庭西南草坪兩棵巨大「掌葉蘋婆」地標老樹 (還原使用者實景照片及圖二紅圈指示：巨型大傘狀樹冠，西側樹底設白色環樹休閒圓椅)
    addTree(-33.0, 0.0, 1.35, "sterculia"); // 西側大掌葉蘋婆 (含白色環樹休閒椅)
    addTree(-18.0, 0.0, 1.35, "sterculia"); // 東側大掌葉蘋婆

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

    // ================= 5. 田徑操場外圍與西北角大綠園 (依指示：西北紅色區域均勻植樹、黃色塗鴉處均勻不擁擠、橘框司令台徹底排除重疊) =================
    // (a) 操場東側直道樹列 (黃色塗鴉處平均種植，間距拉開不擁擠；徹底排除橘色框司令台重疊範圍 z in [-180, -160])
    // 司令台北側 (3 棵均勻排列，間距約 13m)
    [-212.0, -199.0, -186.0].forEach(z => addTree(-88.5, z, 1.2, "mahogany"));
    // (司令台內部 z in [-184, -156] 徹底淨空，嚴禁任何樹木重疊)
    // 司令台南側 (3 棵均勻排列，間距約 12.5m)
    [-154.0, -141.5, -129.0].forEach(z => addTree(-88.5, z, 1.2, "mahogany"));

    // (b) 西側校界圍牆全線長條林帶 (操場西側黃色塗鴉處平均種植，間距擴大至 14m，徹底解決壅擠重疊問題)
    for (let z = -210; z <= 195; z += 14.0) {
      addTree(-167.5, z, 1.2, "mahogany");
    }

    // (c) 操場北側至西北角圍牆大草坪綠園 (依使用者紅色區域指示：整區平均均勻種植景觀樹林，遠離跑道)
    [
      // 第一排 (z = -262.0)
      [-148.0, -262.0, 1.25], [-134.0, -262.0, 1.25], [-120.0, -262.0, 1.25],
      // 第二排 (z = -248.0)
      [-156.0, -248.0, 1.25], [-142.0, -248.0, 1.25], [-128.0, -248.0, 1.25], [-114.0, -248.0, 1.25],
      // 第三排 (z = -236.0)
      [-152.0, -236.0, 1.25], [-138.0, -236.0, 1.25], [-124.0, -236.0, 1.25], [-110.0, -236.0, 1.25],
      // 跑道北弧兩側肩部 (z = -222.0)
      [-156.0, -222.0, 1.25], [-100.0, -222.0, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));
    // (d) 南側半圓外環樹弧 (南弧頂段均勻 5 棵樹，排除兩端與東西直道樹列重疊，徹底解決橘色圈圈重疊問題)
    for (let i = 2; i <= 6; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const tx = -128.0 + 38.5 * Math.cos(a);
      const tz = -140.0 - 38.5 * Math.sin(a);
      addTree(tx, tz, 1.25, "mahogany");
    }

    // ================= 6. 園藝館周邊景觀樹列 (依指示：單排均勻排列，徹底解決紅框與紅圈重疊壅擠問題) =================
    [
      // (A) 園藝館西側景觀樹列 (x = 12.5，距北側 (12, 74.5) 留出 10.5m 淨空，均勻排列不壅擠)
      [12.5, 85.0, 1.25],
      [12.5, 95.0, 1.25],
      [12.5, 105.0, 1.25],
      [12.5, 115.0, 1.25],

      // (B) 園藝館東側景觀樹列 (x = 64.5，距北側 (60, 74.5) 留出 11.4m 淨空，均勻排列不壅擠)
      [64.5, 85.0, 1.25],
      [64.5, 95.0, 1.25],
      [64.5, 105.0, 1.25],
      [64.5, 115.0, 1.25]
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

    // ================= 9b. 車棚北邊圍牆旁樹列 =================
    // (已全數整合入第 1 區 (B) 中山南路西段完整均勻樹列，避免重複種植)

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

    // 書庫西側大草坪綠園 (依使用者黃色框指示：整區平均均勻種植 2×4 景觀林木，徹底填補原單側空白)
    [112.0, 122.0, 132.0, 142.0].forEach(z => {
      [86.0, 98.0].forEach(x => addTree(x, z, 1.25, "mahogany"));
    });

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

    // 特殊場域 2：校門口與警衛室 (`gate`) — 完美還原使用者上傳之正門三張實景照片
    // 門口右側是一面漸降景觀牆，寫著學校名稱「國立臺南大學附中」與石柱題字
    // 門口左側大型電子看板，下面就是警衛室
    if (b.style === "gate") {
      const gGate = new THREE.Group();
      // 轉向 180 度 (Math.PI)：
      // 從校外 (中山南路) 往校內看時：
      // 1. 左手邊：警衛室 ＋ 屋頂大型電子看板
      // 2. 右手邊：疊石題字門柱 ＋ 造型景觀牆（「國立 臺南大學附中」大字）
      // 3. 所有正面設施（LED 螢幕、校名牌匾、值勤觀景窗、綠白遮陽棚）均面朝校外道路，迎接入校師生與訪客
      gGate.rotation.y = Math.PI;

      // --- 動態生成高解析看板與校名貼圖 ---
      // (1) 右側斜面景觀牆立體大字貼圖「國立 臺南大學附中」與英文校名
      const wallNameTex = makeTextCanvas(1024, 512, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.font = "bold 82px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 14;
        ctx.strokeText("國    立", 120, 110);
        ctx.fillStyle = "#0D837D";
        ctx.fillText("國    立", 120, 110);

        ctx.font = "bold 98px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
        ctx.lineWidth = 16;
        ctx.strokeText("臺南大學附中", 120, 235);
        ctx.fillStyle = "#0D837D";
        ctx.fillText("臺南大學附中", 120, 235);

        ctx.font = "bold 32px 'Arial', 'Helvetica', sans-serif";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#FFFFFF";
        ctx.strokeText("THE AFFILIATED SENIOR HIGH SCHOOL", 122, 325);
        ctx.fillStyle = "#109B90";
        ctx.fillText("THE AFFILIATED SENIOR HIGH SCHOOL", 122, 325);
        ctx.strokeText("OF NATIONAL UNIVERSITY OF TAINAN", 122, 370);
        ctx.fillText("OF NATIONAL UNIVERSITY OF TAINAN", 122, 370);
      });

      // (2) 東側粗獷疊石門柱直刻校名「國立臺南大學附屬高級中學」
      const pillarNameTex = makeTextCanvas(256, 1024, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#2D2620";
        ctx.fillRect(16, 16, w - 32, h - 32);
        ctx.strokeStyle = "#8A744A";
        ctx.lineWidth = 6;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        const chars = ["國", "立", "臺", "南", "大", "學", "附", "屬", "高", "級", "中", "學"];
        ctx.font = "bold 56px 'Noto Serif TC', 'DFKai-SB', 'Microsoft JhengHei', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const startY = 80;
        const stepY = 74;
        chars.forEach((ch, idx) => {
          const cy = startY + idx * stepY;
          ctx.fillStyle = "#4A3A1A";
          ctx.fillText(ch, w / 2 + 3, cy + 3);
          ctx.fillStyle = "#F5D472";
          ctx.fillText(ch, w / 2, cy);
        });
      });

      // (3) 左側警衛室屋頂「大型電子看板」LED 戶外全彩電視牆顯示畫面
      const ledScreenTex = makeTextCanvas(1024, 768, (ctx, w, h) => {
        ctx.fillStyle = "#111418";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#181D24";
        for (let y = 8; y < h; y += 16) ctx.fillRect(0, y, w, 2);
        for (let x = 8; x < w; x += 16) ctx.fillRect(x, 0, 2, h);

        ctx.strokeStyle = "#38424E";
        ctx.lineWidth = 12;
        ctx.strokeRect(10, 10, w - 20, h - 20);

        ctx.fillStyle = "#1E2228";
        ctx.fillRect(30, 30, w - 60, 110);
        ctx.strokeStyle = "#E8A824";
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, w - 60, 110);

        ctx.font = "bold 60px 'Microsoft JhengHei', 'Noto Sans TC', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFC425";
        ctx.fillText("【 國立南大附中 歡迎您 】", w / 2, 85);

        ctx.font = "bold 66px 'Microsoft JhengHei', 'Noto Sans TC', sans-serif";
        ctx.fillStyle = "#4DEEEA";
        ctx.fillText("卓越附中・築夢啟航", w / 2, 230);

        ctx.font = "bold 44px 'Microsoft JhengHei', 'Noto Sans TC', sans-serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("115 學年度升學繁星成果輝煌", w / 2, 325);

        ctx.strokeStyle = "#2D3848";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 400);
        ctx.lineTo(w - 60, 400);
        ctx.stroke();

        ctx.font = "bold 38px 'Consolas', 'Microsoft JhengHei', sans-serif";
        ctx.fillStyle = "#46E882";
        ctx.fillText("校園即時資訊 ｜ 氣溫 26°C ｜ 空氣品質 [優]", w / 2, 470);

        ctx.fillStyle = "#1A202A";
        ctx.fillRect(40, 550, w - 80, 140);
        ctx.strokeStyle = "#00A8FF";
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 550, w - 80, 140);

        ctx.font = "bold 42px 'Microsoft JhengHei', sans-serif";
        ctx.fillStyle = "#FFDD55";
        ctx.fillText("● 培育多元專長・實踐全人教育 ●", w / 2, 620);
      });

      // (4) 警衛室公佈欄 (榮譽榜公告海報)
      const bulletinTex = makeTextCanvas(512, 256, (ctx, w, h) => {
        ctx.fillStyle = "#F5F2EB";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#B82228";
        ctx.fillRect(0, 0, w, 56);
        ctx.font = "bold 32px 'Microsoft JhengHei', sans-serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("南大附中 榮譽榜", w / 2, 28);

        ctx.strokeStyle = "#4A4D52";
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#CBD2D9";
        ctx.lineWidth = 2;
        ctx.fillRect(30, 80, 120, 140);
        ctx.strokeRect(30, 80, 120, 140);
        ctx.fillRect(170, 80, 160, 140);
        ctx.strokeRect(170, 80, 160, 140);
        ctx.fillRect(350, 80, 130, 140);
        ctx.strokeRect(350, 80, 130, 140);

        ctx.fillStyle = "#9AA5B1";
        for (let y = 100; y <= 200; y += 18) {
          ctx.fillRect(40, y, 100, 5);
          ctx.fillRect(180, y, 140, 5);
          ctx.fillRect(360, y, 110, 5);
        }
      });

      // (5) 安全島防撞斜紋貼圖
      const hazardTex = makeTextCanvas(256, 256, (ctx, w, h) => {
        ctx.fillStyle = "#F5BA24";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#1E2024";
        ctx.beginPath();
        const stripeW = 48;
        for (let x = -h; x < w + h; x += stripeW * 2) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x + stripeW, 0);
          ctx.lineTo(x + stripeW - h, h);
          ctx.lineTo(x - h, h);
          ctx.closePath();
        }
        ctx.fill();
      });
      if (hazardTex) {
        hazardTex.wrapS = THREE.RepeatWrapping;
        hazardTex.wrapT = THREE.RepeatWrapping;
      }

      // (6) 警衛室正面值勤窗綠白相間條紋斜面遮陽棚貼圖 (還原照片實景)
      const awningTex = makeTextCanvas(256, 128, (ctx, w, h) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#1D7F4B";
        const sw = 28;
        for (let x = 0; x < w; x += sw * 2) {
          ctx.fillRect(x, 0, sw, h);
        }
      });

      // (7) 門柱粗獷疊石紋理貼圖 (還原照片方圓石塔)
      const pylonTex = makeTextCanvas(256, 512, (ctx, w, h) => {
        ctx.fillStyle = "#524436";
        ctx.fillRect(0, 0, w, h);
        const pColors = ["#685442", "#47382B", "#755F4B", "#4D3D2F", "#826B55", "#5C4A3A"];
        for (let y = 0; y < h; y += 22) {
          ctx.strokeStyle = "rgba(20, 15, 10, 0.4)";
          ctx.lineWidth = 2;
          ctx.strokeRect(0, y, w, 22);
          for (let x = 0; x < w; x += 40) {
            ctx.fillStyle = pColors[(x + y) % pColors.length];
            ctx.fillRect(x + 1, y + 1, 38, 20);
          }
        }
      });

      // (8) 造型景觀牆天然暖色砂岩拼貼紋理貼圖
      const wallTileTex = makeTextCanvas(512, 512, (ctx, w, h) => {
        ctx.fillStyle = "#E4D4C5";
        ctx.fillRect(0, 0, w, h);
        const tileColors = ["#E8D9CB", "#DFCABA", "#EADCCE", "#D8BFA9", "#ECC9B3", "#DEC4AF"];
        for (let i = 0; i < 35; i++) {
          const rx = (i * 73) % (w - 60);
          const ry = (i * 97) % (h - 50);
          const rw = 65 + (i * 17) % 55;
          const rh = 40 + (i * 23) % 45;
          ctx.fillStyle = tileColors[i % tileColors.length];
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = "rgba(130, 110, 95, 0.22)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(rx, ry, rw, rh);
        }
      });

      // ================= 1. 門口右側 (東側)：校名石塔碑體 ＋ 漸降造型景觀牆 =================
      // (a) 粗獷疊石方圓門柱 (高 7.6m，寬 2.4m，深 2.2m)
      let pylonMat = getMat("#443A30", { roughness: 0.9 });
      if (pylonTex) {
        pylonMat = new THREE.MeshStandardMaterial({ map: pylonTex, roughness: 0.88 });
      }
      const pylonCrownMat = getMat("#362E26", { roughness: 0.85 });
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.4, 2.2), pylonMat);
      pylon.position.set(4.2, 3.7, 0);
      pylon.castShadow = true;
      pylon.receiveShadow = true;
      gGate.add(pylon);

      const pylonCap = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 2.4), pylonCrownMat);
      pylonCap.position.set(4.2, 7.5, 0);
      gGate.add(pylonCap);

      // 門柱正面「國立臺南大學附屬高級中學」直刻牌匾
      if (pillarNameTex) {
        const pillarSignMat = new THREE.MeshBasicMaterial({
          map: pillarNameTex,
          transparent: true
        });
        const pillarSign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 6.2), pillarSignMat);
        pillarSign.position.set(4.2, 3.7, 1.12);
        gGate.add(pillarSign);
      }

      // (b) 漸降造型景觀牆 (從石塔高 5.0m 向東向漸降至 2.0m，長 14.0m，帶圓形月門鏤空孔)
      const wallShape = new THREE.Shape();
      wallShape.moveTo(0, 0);
      wallShape.lineTo(0, 5.0);
      wallShape.lineTo(14.0, 2.0);
      wallShape.lineTo(14.0, 0);
      wallShape.closePath();

      // 圓形鏤空孔 (月門觀景窗)
      const holePath = new THREE.Path();
      holePath.absarc(3.6, 1.85, 0.92, 0, Math.PI * 2, true);
      wallShape.holes.push(holePath);

      const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
        depth: 0.85,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.05
      });
      let wallStoneMat = getMat("#D8CEBE", { roughness: 0.82 });
      if (wallTileTex) {
        wallStoneMat = new THREE.MeshStandardMaterial({ map: wallTileTex, roughness: 0.82 });
      }
      const rightFeatureWall = new THREE.Mesh(wallGeo, wallStoneMat);
      rightFeatureWall.position.set(5.2, 0, -0.425);
      rightFeatureWall.castShadow = true;
      rightFeatureWall.receiveShadow = true;
      gGate.add(rightFeatureWall);

      // 圓形孔洞外圍裝飾邊框
      const holeRimMat = getMat("#EAE6DF", { roughness: 0.7 });
      const holeRim = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.95, 24, 1, true), holeRimMat);
      holeRim.rotation.x = Math.PI / 2;
      holeRim.position.set(8.8, 1.85, 0);
      gGate.add(holeRim);

      // 斜牆頂部深色石材壓頂壓條 (沿著 (5.2, 5.0) 至 (19.2, 2.0) 斜坡延伸)
      const dxWall = 14.0;
      const dyWall = -3.0;
      const slopeLen = Math.hypot(dxWall, dyWall);
      const slopeAngle = Math.atan2(dyWall, dxWall);
      const wallCoping = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.2, 0.16, 0.96), getMat("#564F46"));
      wallCoping.rotation.z = slopeAngle;
      wallCoping.position.set(5.2 + dxWall / 2, 5.0 + dyWall / 2 + 0.08, 0);
      gGate.add(wallCoping);

      // (c) 牆面藍色大字「國立 臺南大學附中」立體校名標誌
      if (wallNameTex) {
        const wallSignMat = new THREE.MeshBasicMaterial({
          map: wallNameTex,
          transparent: true
        });
        const wallSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 3.2), wallSignMat);
        wallSignMesh.position.set(11.2, 2.5, 0.48);
        gGate.add(wallSignMesh);
      }

      // (d) 景觀牆前方矮灌木綠雕花台 (沿著牆基長度延伸)
      const hedgeBase = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.65, 0.9), getMat("#426E30"));
      hedgeBase.position.set(12.0, 0.325, 0.85);
      hedgeBase.castShadow = true;
      gGate.add(hedgeBase);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.25, 0.18), getMat("#8C877E"));
      curb.position.set(12.0, 0.125, 1.35);
      gGate.add(curb);

      // ================= 2. 門口左側 (西側)：大型電子看板 ＋ 警衛室 =================
      // (a) 單層警衛室本體 (寬 7.2m，深 5.6m，高 3.4m)
      const guardWallMat = getMat("#DDD2C0", { roughness: 0.8 });
      const guardBody = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.4, 5.6), guardWallMat);
      guardBody.position.set(-9.5, 1.7, -0.4);
      guardBody.castShadow = true;
      guardBody.receiveShadow = true;
      gGate.add(guardBody);

      // 警衛室平屋頂延伸雨庇雨棚
      const guardRoofMat = getMat("#52565B", { roughness: 0.75 });
      const guardRoof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.35, 6.8), guardRoofMat);
      guardRoof.position.set(-9.3, 3.45, 0.2);
      guardRoof.castShadow = true;
      gGate.add(guardRoof);

      // 雨庇前緣深色收邊條
      const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(8.25, 0.15, 0.15), getMat("#2D3136"));
      canopyTrim.position.set(-9.3, 3.55, 3.58);
      gGate.add(canopyTrim);

      // 警衛室正向大片值勤觀景窗 (鋁合金白框 + 藍黑透光玻璃)
      const winFrameMat = getMat("#EAECEF", { roughness: 0.6 });
      const winGlassMat = getMat("#1C2C3A", { roughness: 0.3, metalness: 0.4 });
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 0.12), winFrameMat);
      winFrame.position.set(-7.5, 1.8, 2.42);
      gGate.add(winFrame);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.35, 0.08), winGlassMat);
      winGlass.position.set(-7.5, 1.8, 2.45);
      gGate.add(winGlass);

      // 警衛室正面綠白條紋斜面遮陽棚
      let awningMat = getMat("#1D7F4B");
      if (awningTex) {
        awningMat = new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.55 });
      }
      const awningMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.95), awningMat);
      awningMesh.rotation.x = 0.28;
      awningMesh.position.set(-7.5, 2.65, 2.82);
      awningMesh.castShadow = true;
      gGate.add(awningMesh);

      // 警衛室公佈欄 (榮譽榜海報牆)
      if (bulletinTex) {
        const bulletinMat = new THREE.MeshBasicMaterial({ map: bulletinTex });
        const bulletinMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), bulletinMat);
        bulletinMesh.position.set(-11.0, 1.8, 2.42);
        gGate.add(bulletinMesh);
      }

      // 西側銜接弧形石材翼牆 (帶圓形月門孔)
      const westWallShape = new THREE.Shape();
      westWallShape.moveTo(0, 0);
      westWallShape.lineTo(0, 3.2);
      westWallShape.lineTo(-5.0, 1.6);
      westWallShape.lineTo(-5.0, 0);
      westWallShape.closePath();
      const westHole = new THREE.Path();
      westHole.absarc(-2.2, 1.5, 0.75, 0, Math.PI * 2, true);
      westWallShape.holes.push(westHole);
      const westWallGeo = new THREE.ExtrudeGeometry(westWallShape, {
        depth: 0.75,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.04,
        bevelThickness: 0.04
      });
      const westWingWall = new THREE.Mesh(westWallGeo, wallStoneMat);
      westWingWall.position.set(-13.1, 0, -0.4);
      westWingWall.castShadow = true;
      gGate.add(westWingWall);

      // (b) 屋頂「大型電子看板 / LED 戶外全彩電視牆」 (寬 5.8m，高 4.2m，厚 0.65m，立於屋頂上方)
      // 鋼結構支撐立柱 (兩根深黑鋼柱立於屋頂上)
      const steelMat = getMat("#2B2E33", { metalness: 0.7, roughness: 0.4 });
      [-11.2, -7.4].forEach(sx => {
        const pylonLeg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.4, 0.42), steelMat);
        pylonLeg.position.set(sx, 4.1, 0.6);
        pylonLeg.castShadow = true;
        gGate.add(pylonLeg);
      });

      // 大型電子看板金屬箱體
      const billboardBox = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.2, 0.65), getMat("#1D2024", { roughness: 0.6 }));
      billboardBox.position.set(-9.3, 5.9, 0.6);
      billboardBox.castShadow = true;
      gGate.add(billboardBox);

      // 看板黑色金屬窄邊框
      const billboardBezel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 4.3, 0.1), getMat("#121417"));
      billboardBezel.position.set(-9.3, 5.9, 0.92);
      gGate.add(billboardBezel);

      // LED 螢幕正面全彩動態顯示畫面
      if (ledScreenTex) {
        const ledScreenMat = new THREE.MeshStandardMaterial({
          map: ledScreenTex,
          emissive: new THREE.Color("#1A2026"),
          emissiveIntensity: 0.4,
          roughness: 0.4
        });
        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.0), ledScreenMat);
        screenMesh.position.set(-9.3, 5.9, 0.98);
        gGate.add(screenMesh);
      }

      // ================= 3. 中央出入設施 (車道、黃黑警示柱、紅色伸縮大門) =================
      // (a) 車道中央安全島 (防撞島)
      const islandBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 5.2), getMat("#88827A"));
      islandBase.position.set(-2.4, 0.175, 0.6);
      islandBase.castShadow = true;
      gGate.add(islandBase);

      // (b) 黃黑斜斑馬紋安全警示柱 (頂端帶紅色警示燈)
      let hazardMat = getMat("#F5BA24");
      if (hazardTex) {
        hazardMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.5 });
      }
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.45, 18), hazardMat);
      bollard.position.set(-2.4, 1.05, 2.5);
      bollard.castShadow = true;
      gGate.add(bollard);

      // 頂部紅色警示閃光燈
      const beaconMat = getMat("#E02424", { roughness: 0.3 });
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.32, 16), beaconMat);
      beacon.position.set(-2.4, 1.9, 2.5);
      gGate.add(beacon);

      // (c) 紅色電動伸縮鐵捲門 (停靠於車道旁)
      const gateLatticeMat = getMat("#A82226", { metalness: 0.3, roughness: 0.5 });
      const redGate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.35, 4.6), gateLatticeMat);
      redGate.position.set(2.8, 0.68, 0.6);
      redGate.castShadow = true;
      gGate.add(redGate);

      root.add(gGate);
      root.userData.pickMesh = guardBody;
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

    // 特殊場域 4：室內標準游泳館 (`swimming`) — 依使用者指示與實景照片真實還原
    // 1. 正面朝東（面向校園中央聯絡道）：全部結構完整連結，中央挑高塔樓、金色「游泳館」牌匾、3×4 水泥遮陽方格花格窗、一樓三道不銹鋼鐵捲門、二樓左右延伸之圓柱深挑外廊與貫通結構橫樑
    // 2. 北側面與南側面（面向排球場與南側草坪）：南北兩面 100% 鏡像對稱，皆為平整紅磚色立體牆面（下層 6.8m 深紅褐丁掛磚、上層 6.8m 粉褐丁掛磚＋暗色橫向氣窗帶），完全移除凸出外側的深灰色弧頂構造，頂部平整
    // 3. 空間配置：挑高單層室內標準游泳池（無二樓看台）；從北面牆面看過去，一樓左邊為體育組辦公室，一樓中間為體育器材室，右邊為室內標準游泳池水道與更衣淋浴區
    if (b.style === "swimming") {
      const g1 = new THREE.Group();
      const g2 = new THREE.Group();

      const totalH = 13.6;          // 挑高總高度 13.6m
      const halfH = totalH / 2;     // 一樓主基底高度 6.8m
      const poolHallW = 34.0;       // 池體東西總長 (從 x = -22.0 到 x = +12.0)
      const poolHallD = 34.0;       // 池體南北跨距 (從 z = -17.0 到 z = +17.0)
      const poolHallCenterX = -5.0;

      // --- 專屬紅磚材質定義 ---
      const redBrickLowerMat = getMat("#7E352E", { roughness: 0.78 }); // 下層深紅褐丁掛磚
      const redBrickUpperMat = getMat("#B66D64", { roughness: 0.76 }); // 上層粉褐丁掛磚
      const beamMat = getMat("#6A2A24", { roughness: 0.75 });          // 貫穿正面之結構大樑
      const concreteMat = getMat("#C8C2B8", { roughness: 0.85 });      // 水泥樑柱、格子窗外框
      const columnWhiteMat = getMat("#EAECEF", { roughness: 0.6 });    // 二樓圓形挑廊立柱
      const diamondMat = getMat("#F0EDE6", { roughness: 0.6 });        // 柱頭菱形 ◇ 裝飾浮雕

      // --- 動態生成高解析看板與設備貼圖 ---
      // (1) 正面貫通橫樑金色「游泳館」牌匾貼圖
      const swimPlaqueTex = makeTextCanvas(512, 128, (ctx, w, h) => {
        ctx.fillStyle = "#301A18";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#805838";
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, w - 8, h - 8);

        ctx.font = "bold 52px 'Noto Serif TC', 'DFKai-SB', 'Microsoft JhengHei', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#462E12";
        ctx.fillText("游   泳   館", w / 2 + 2, 48 + 2);
        ctx.fillStyle = "#F8D468";
        ctx.fillText("游   泳   館", w / 2, 48);

        ctx.font = "bold 18px 'Arial', 'Helvetica', sans-serif";
        ctx.fillStyle = "#E4BE56";
        ctx.fillText("Swimming Building", w / 2, 98);
      });

      // (2) 正面三道不銹鋼鐵捲門紋理
      const rollupShutterTex = makeTextCanvas(256, 256, (ctx, w, h) => {
        ctx.fillStyle = "#949BA4";
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 10) {
          ctx.fillStyle = "#6F7782";
          ctx.fillRect(0, y, w, 2);
          ctx.fillStyle = "#B0B8C2";
          ctx.fillRect(0, y + 2, w, 2);
        }
        ctx.fillStyle = "#3D444D";
        ctx.fillRect(0, h - 14, w, 14);
        ctx.fillStyle = "#DDE2E8";
        ctx.fillRect(w / 2 - 22, h - 35, 44, 6);
      });

      // =========================== 【一樓 1F 配置】 ===========================
      // (A) 1F 完整紅磚主體基底 (深紅褐磚，高 6.8m，涵蓋室內池體與北面、南面平整紅磚牆)
      // 北面與南面完全平整對稱 (z = -17.0 與 z = +17.0)，絕無灰色或外凸構造
      const base1F = new THREE.Mesh(new THREE.BoxGeometry(poolHallW, halfH, poolHallD), redBrickLowerMat);
      base1F.position.set(poolHallCenterX, halfH / 2, 0);
      base1F.castShadow = true;
      base1F.receiveShadow = true;
      g1.add(base1F);

      // (B) 1F 正門中央塔樓與兩翼向前完全連結 (從 x = 12.0 連接至 x = 21.8)
      // 中央塔樓向前延伸出入口基座
      const towerBase1F = new THREE.Mesh(new THREE.BoxGeometry(9.8, halfH, 11.2), redBrickLowerMat);
      towerBase1F.position.set(16.9, halfH / 2, 0);
      towerBase1F.castShadow = true;
      g1.add(towerBase1F);

      // 左右兩翼 1F 前端完全連通結構 (折角延伸，與中央塔樓和後方主體無縫連接)
      [-1, 1].forEach(side => {
        const wingConnect1F = new THREE.Mesh(new THREE.BoxGeometry(8.2, halfH, 6.4), redBrickLowerMat);
        wingConnect1F.position.set(15.2, halfH / 2, side * 11.2);
        wingConnect1F.rotation.y = -side * 0.35;
        wingConnect1F.castShadow = true;
        g1.add(wingConnect1F);

        // 正門斜坡扶手矮牆 (依照片完全以紅磚砌築)
        const rampWall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 0.42), redBrickLowerMat);
        rampWall.position.set(22.2, 0.55, side * 6.8);
        rampWall.castShadow = true;
        g1.add(rampWall);
      });

      // (C) 1F 正面三道不銹鋼鐵捲門 (面向東方 +X，完全嵌入中央入口立面)
      let shutterMat = getMat("#8E96A0", { metalness: 0.6, roughness: 0.4 });
      if (rollupShutterTex) {
        shutterMat = new THREE.MeshStandardMaterial({ map: rollupShutterTex, metalness: 0.5, roughness: 0.4 });
      }
      // 中央主捲門 (寬 4.4m，高 3.8m)
      const centerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 4.4), shutterMat);
      centerDoor.position.set(21.82, 1.9, 0);
      centerDoor.castShadow = true;
      g1.add(centerDoor);
      // 北側邊門 (寬 2.6m，高 3.6m)
      const northDoor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 2.6), shutterMat);
      northDoor.position.set(21.82, 1.8, -3.4);
      northDoor.castShadow = true;
      g1.add(northDoor);
      // 南側邊門 (寬 2.6m，高 3.6m)
      const southDoor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 2.6), shutterMat);
      southDoor.position.set(21.82, 1.8, 3.4);
      southDoor.castShadow = true;
      g1.add(southDoor);

      // 正門迎賓大階梯平台 (大理石踏階)
      const apron = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 13.2), getMat("#D0CBC0"));
      apron.position.set(23.4, 0.14, 0);
      apron.receiveShadow = true;
      g1.add(apron);
      const step1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 14.0), getMat("#B8B2A6"));
      step1.position.set(25.6, 0.07, 0);
      step1.receiveShadow = true;
      g1.add(step1);

      // (D) 1F 北面外牆立體採光窗與冷氣室外機 (完全貼合紅磚牆，絕無突出之灰色拱頂)
      // 依照片 3：體育組辦公室外牆鋁窗與冷氣室外機（左側 x = 7.0 ~ 12.0）、體育器材室窗戶（中間 x = -1.0 ~ 3.0）
      const winFrameMat = getMat("#4A4E53", { roughness: 0.6 });
      const winGlassMat = getMat("#2C3A47", { roughness: 0.2, metalness: 0.4 });
      const acBodyMat = getMat("#E2DFD8", { roughness: 0.5 });
      // 體育組辦公室北向窗 (左側)
      const peWinFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 0.16), winFrameMat);
      peWinFrame.position.set(9.2, 3.0, -17.06);
      g1.add(peWinFrame);
      const peWinGlass = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.4, 0.18), winGlassMat);
      peWinGlass.position.set(9.2, 3.0, -17.06);
      g1.add(peWinGlass);
      // 體育組辦公室冷氣室外機 (照片 3 經典實景特徵，懸掛於一樓磚牆外)
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.82, 0.52), acBodyMat);
      acUnit.position.set(5.8, 3.0, -17.32);
      acUnit.castShadow = true;
      g1.add(acUnit);

      // 體育器材室北向窗 (中間)
      const eqWinFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 0.16), winFrameMat);
      eqWinFrame.position.set(0.5, 3.0, -17.06);
      g1.add(eqWinFrame);
      const eqWinGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.4, 0.18), winGlassMat);
      eqWinGlass.position.set(0.5, 3.0, -17.06);
      g1.add(eqWinGlass);

      // (E) 1F 室內游泳池標準水面與水道配置 (面向北看時在右側，西側池體)
      const poolDeck = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.18, poolHallD - 4.0), getMat("#E4EEF2"));
      poolDeck.position.set(-11.0, 0.09, 0);
      g1.add(poolDeck);

      const waterMat = new THREE.MeshStandardMaterial({
        color: "#0091EA",
        roughness: 0.15,
        metalness: 0.3,
        transparent: true,
        opacity: 0.82
      });
      const waterSurface = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.12, 14.5), waterMat);
      waterSurface.position.set(-11.0, 0.15, 0);
      g1.add(waterSurface);

      const ropeMatRed = getMat("#E53935");
      [-6.0, -3.6, -1.2, 1.2, 3.6, 6.0].forEach(rz => {
        const laneRope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 18.0, 6), ropeMatRed);
        laneRope.rotation.z = Math.PI / 2;
        laneRope.position.set(-11.0, 0.22, rz);
        g1.add(laneRope);
      });

      // (F) 1F 室內隔間與機能配置 (依北面視角：左邊體育組辦公室、中間體育器材室、右邊標準泳池)
      const partMat = getMat("#E0DAD0", { roughness: 0.85 });
      const officeFloorMat = getMat("#D0C8BD", { roughness: 0.7 });

      // 辦公室與器材室地坪
      const officeFloor = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.2, 11.0), officeFloorMat);
      officeFloor.position.set(4.5, 0.1, -11.0);
      officeFloor.receiveShadow = true;
      g1.add(officeFloor);

      // 南北隔間主牆 (分開北側辦公/器材區與南側泳池)
      const dividerWallSN = new THREE.Mesh(new THREE.BoxGeometry(15.0, halfH - 0.2, 0.28), partMat);
      dividerWallSN.position.set(4.5, halfH / 2, -5.5);
      dividerWallSN.castShadow = true;
      g1.add(dividerWallSN);

      // 東西隔間牆 (分開體育組辦公室與體育器材室，界線在 x = 5.0)
      const dividerWallEW = new THREE.Mesh(new THREE.BoxGeometry(0.28, halfH - 0.2, 11.0), partMat);
      dividerWallEW.position.set(5.0, halfH / 2, -11.0);
      dividerWallEW.castShadow = true;
      g1.add(dividerWallEW);

      // 西側隔間牆 (器材室與泳池大廳分界，界線在 x = -3.0)
      const dividerWallWest = new THREE.Mesh(new THREE.BoxGeometry(0.28, halfH - 0.2, 11.0), partMat);
      dividerWallWest.position.set(-3.0, halfH / 2, -11.0);
      dividerWallWest.castShadow = true;
      g1.add(dividerWallWest);

      // 體育組辦公室內部傢俱 (面向北看時在左邊，x = 5.0 ~ 12.0)
      const deskMat = getMat("#6D4C41");
      const chairMat = getMat("#37474F");
      const cabinetMat = getMat("#90A4AE");
      [7.5, 10.5].forEach(dx => {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.9), deskMat);
        desk.position.set(dx, 0.47, -9.5);
        desk.castShadow = true;
        g1.add(desk);

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), chairMat);
        chair.position.set(dx, 0.55, -8.6);
        g1.add(chair);
      });
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.0, 3.2), cabinetMat);
      cabinet.position.set(11.6, 1.1, -10.5);
      cabinet.castShadow = true;
      g1.add(cabinet);

      // 體育器材室內部設備 (面向北看時在中間，x = -3.0 ~ 5.0)
      const shelfMat = getMat("#546E7A");
      [-1.2, 1.8].forEach(sx => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.8), shelfMat);
        shelf.position.set(sx, 1.2, -10.5);
        shelf.castShadow = true;
        g1.add(shelf);
      });
      const ballCageMat = getMat("#78909C", { wireframe: true });
      const ballCage = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), ballCageMat);
      ballCage.position.set(0.3, 0.6, -7.8);
      g1.add(ballCage);
      const bBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), getMat("#FF6F00"));
      bBall.position.set(0.1, 0.45, -7.8);
      g1.add(bBall);
      const vBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), getMat("#1E88E5"));
      vBall.position.set(0.5, 0.45, -7.8);
      g1.add(vBall);

      // =========================== 【二樓 2F ＋ 屋頂配置】 ===========================
      // (A) 2F 完整紅磚主體外牆 (上層粉褐磚，高 6.8m，北面與南面完全對稱平整)
      const base2F = new THREE.Mesh(new THREE.BoxGeometry(poolHallW, halfH, poolHallD), redBrickUpperMat);
      base2F.position.set(poolHallCenterX, halfH + halfH / 2, 0);
      base2F.castShadow = true;
      g2.add(base2F);

      // 2F 南北兩側排氣採光窗帶 (依實景平整嵌入紅磚牆上端，南北兩側完全相同)
      [-1, 1].forEach(side => {
        const clerestory = new THREE.Mesh(new THREE.BoxGeometry(poolHallW - 4.0, 1.3, 0.12), glassMat);
        clerestory.position.set(poolHallCenterX, halfH + 4.6, side * (poolHallD / 2 + 0.04));
        g2.add(clerestory);
      });

      // (B) 正面貫穿連結之「橫向結構大樑」 (貫通左翼、中央塔樓與右翼，全部連結為一體)
      // 中央大樑段 (寬 11.6m，高 1.6m)
      const centerBeam = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 11.6), beamMat);
      centerBeam.position.set(21.75, halfH + 0.6, 0);
      centerBeam.castShadow = true;
      g2.add(centerBeam);

      // 左右兩翼大樑段 (折角向兩側延伸，完美閉合，與中央大樑零縫隙銜接)
      [-1, 1].forEach(side => {
        const wingBeam = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 12.2), beamMat);
        wingBeam.position.set(17.8, halfH + 0.6, side * 11.2);
        wingBeam.rotation.y = -side * 0.35;
        wingBeam.castShadow = true;
        g2.add(wingBeam);

        // 柱頭菱形 ◇ 水泥浮雕裝飾 (照片經典特色，飾於大樑外側)
        const diamondMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.65), diamondMat);
        diamondMesh.rotation.x = Math.PI / 4;
        diamondMesh.position.set(22.18, halfH + 0.6, side * 5.6);
        g2.add(diamondMesh);
      });

      // 中央橫樑金色「游泳館」牌匾 (面向東方 +X)
      if (swimPlaqueTex) {
        const plaqueMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(6.8, 1.35),
          new THREE.MeshBasicMaterial({ map: swimPlaqueTex })
        );
        plaqueMesh.rotation.y = Math.PI / 2; // 面向東方 +X
        plaqueMesh.position.set(22.20, halfH + 0.6, 0);
        g2.add(plaqueMesh);
      }

      // (C) 2F 東面中央挑高迎賓塔樓 (高達 15.2m，完全與兩翼和後方池體無縫連結)
      const tower2F = new THREE.Mesh(new THREE.BoxGeometry(9.8, halfH + 2.2, 11.2), redBrickUpperMat);
      tower2F.position.set(16.9, halfH + (halfH + 2.2) / 2, 0);
      tower2F.castShadow = true;
      g2.add(tower2F);

      // 2F 正面核心特色：【3×4 水泥方格遮陽花格窗】 (實景照片靈魂特徵，直接嵌入塔樓正面)
      const latticeGroup = new THREE.Group();
      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.0, 5.6), concreteMat);
      frameOuter.position.set(21.75, halfH + 4.2, 0);
      latticeGroup.add(frameOuter);

      const frameHollow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.6, 5.2), getMat("#1D252E"));
      frameHollow.position.set(21.78, halfH + 4.2, 0);
      latticeGroup.add(frameHollow);

      // 3 欄 × 4 列 水泥方格格柵
      const gridCols = 3;
      const gridRows = 4;
      const cellW = 5.2 / gridCols; // 1.73m
      const cellH = 4.6 / gridRows; // 1.15m
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const cy = (halfH + 4.2 - 2.3 + cellH / 2) + r * cellH;
          const cz = (-2.6 + cellW / 2) + c * cellW;
          const boxFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, cellH - 0.14, cellW - 0.14), concreteMat);
          boxFrame.position.set(21.82, cy, cz);
          boxFrame.castShadow = true;
          latticeGroup.add(boxFrame);

          const boxHole = new THREE.Mesh(new THREE.BoxGeometry(0.72, cellH - 0.32, cellW - 0.32), getMat("#111822"));
          boxHole.position.set(21.83, cy, cz);
          latticeGroup.add(boxHole);
        }
      }
      g2.add(latticeGroup);

      // (D) 2F 兩翼折角深挑外廊與圓形白色柱 (全結構與塔樓、頂蓋牢固連接)
      [-1, 1].forEach(side => {
        // 二樓折角外廊頂棚 (與塔樓頂部連續銜接)
        const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.45, 6.4), redBrickUpperMat);
        wingRoof.position.set(15.2, totalH + 0.22, side * 11.2);
        wingRoof.rotation.y = -side * 0.35;
        wingRoof.castShadow = true;
        g2.add(wingRoof);

        // 兩根白色圓形挑廊支柱 (直徑 0.65m，高 4.4m，上接外廊簷，下接 1F 磚底)
        [-1.8, 1.8].forEach(colOff => {
          const roundCol = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 4.4, 16), columnWhiteMat);
          const colX = 17.2 + Math.sin(side * 0.35) * colOff;
          const colZ = side * 11.2 + Math.cos(side * 0.35) * colOff;
          roundCol.position.set(colX, halfH + 2.2, colZ);
          roundCol.castShadow = true;
          g2.add(roundCol);
        });

        // 二樓外廊內凹後牆 (暗色氣窗帶)
        const innerWin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 5.2), glassMat);
        const winX = 13.8;
        const winZ = side * 11.2;
        innerWin.position.set(winX, halfH + 2.6, winZ);
        innerWin.rotation.y = -side * 0.35;
        g2.add(innerWin);
      });

      // (E) 屋頂平整收邊與女兒牆 (與圖一南面完全一致，徹底移除灰色大弧頂)
      // 女兒牆矮欄 (高 0.45m，粉褐磚色)
      const parapetWall = new THREE.Mesh(
        new THREE.BoxGeometry(poolHallW + 0.3, 0.45, poolHallD + 0.3),
        redBrickUpperMat
      );
      parapetWall.position.set(poolHallCenterX, totalH + 0.22, 0);
      g2.add(parapetWall);
      const roofDeckInner = new THREE.Mesh(
        new THREE.BoxGeometry(poolHallW - 0.8, 0.46, poolHallD - 0.8),
        getMat("#B2655C")
      );
      roofDeckInner.position.set(poolHallCenterX, totalH + 0.22, 0);
      g2.add(roofDeckInner);

      root.add(g1);
      root.add(g2);
      root.userData.floorGroups[1] = root;
      root.userData.pickMesh = poolDeck;
      return root;
    }
    // 特殊場域 5：機械館 (`mechanical`) — 依 2026/10/22 實勘照片打造為【對稱式主要外型實體建築】
    // 1. 建築體量：寬 15.0m、長 44.0m、高 16.8m（4 層樓，每層 4.2m），正面朝西
    // 2. 對稱結構本質：
    //    - 中央核心 (z = 0，寬 12.0m)：
    //      * 1F 迎賓穿堂大門與台階（上方由 2F 懸挑圓弧大陽台遮蔽）
    //      * 2F～4F 連續三層懸挑大圓弧陽台，形成連續雄偉弧形立面
    //      * 屋頂中央挑高樓梯機房塔樓（z = 0）
    //    - 左翼（北側，z = -6.0 ～ -22.0，長 16m）：
    //      * 恰好 2 個開間（內開間 z = -10.0、外開間 z = -17.5）
    //      * 3 根垂直實體紫紅磚方柱（z = -6.0, -13.8, -21.4），每層嵌鑲白金菱形磁磚
    //      * 2F～4F 每開間皆設有半圓弧外凸波浪陽台（磚紅矮牆＋深色金屬扶手）
    //    - 右翼（南側，z = +6.0 ～ +22.0，長 16m）：
    //      * 與左翼完全對稱！恰好 2 個開間（內開間 z = +10.5、外開間 z = +18.0）
    //      * 3 根垂直實體紫紅磚方柱（z = +6.0, +13.8, +21.4），每層嵌鑲白金菱形磁磚
    //      * 2F～4F 每開間皆設有半圓弧外凸波浪陽台（磚紅矮牆＋深色金屬扶手）
    // 3. 唯一現代增設非對稱外觀（正面中間偏右無障礙電梯塔）：
    //    - 位於正面中間偏右（z = +7.8，緊鄰中央大雨庇右側）
    //    - 珊瑚粉色長條狀實體電梯塔（#D47A7E，高 18.2m 直達頂樓），外牆繪有機械工程大型齒輪咬合圖騰
    //    - 1F 簡潔電梯門與無障礙專用斜坡道（依使用者指示簡化主要外型，移除路面停車位標線與多餘立牌雜物）
    // 4. 全棟實體一體化綁定（root.userData.floorGroups[1] = root），杜絕中空切片剖面感
    if (b.style === "mechanical") {
      const bldGroup = new THREE.Group();

      const bw = b.w || 15.0;      // 東西寬度 (X 方向，從 x = -7.5 到 +7.5)
      const bd = b.d || 44.0;      // 南北長度 (Z 方向，從 z = -22.0 到 +22.0)
      const numFl = b.floors || 4; // 4 層樓
      const fh = b.floorHeight || 4.2;
      const totalH = numFl * fh;   // 16.8m

      // --- 專屬材質定義 ---
      const brickMat = getMat("#9E5456", { roughness: 0.78 });       // 丁掛紫紅磚 (實體主牆與立柱)
      const brickDarkMat = getMat("#823D3F", { roughness: 0.8 });     // 橫向大樑與女兒牆深色收邊
      const floorMat = getMat("#DDD6CC", { roughness: 0.7 });         // 走廊地坪
      const elevMat = getMat("#D47A7E", { roughness: 0.75 });         // 無障礙電梯珊瑚粉
      const railingMat = getMat("#2C3138", { metalness: 0.7, roughness: 0.3 }); // 深色金屬欄杆
      const glassMat = getMat("#223344", { roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.75 });
      const frameMat = getMat("#42474E", { roughness: 0.6 });
      const diamondGoldMat = getMat("#E8B948", { metalness: 0.4, roughness: 0.5 }); // 菱形磁磚金黃芯
      const diamondWhiteMat = getMat("#F5F3ED", { roughness: 0.6 }); // 菱形磁磚白外框
      const roofMat = getMat(b.colors.roof || "#8C9298", { roughness: 0.8 });
      const shutterMat = getMat("#8E96A0", { roughness: 0.5 });

      // --- 動態生成貼圖 ---
      // 無障礙電梯塔身「機械工程齒輪」彩繪圖騰貼圖
      const gearMuralTex = makeTextCanvas(512, 1024, (ctx, w, h) => {
        ctx.fillStyle = "#D47A7E";
        ctx.fillRect(0, 0, w, h);

        function drawGear(cx, cy, rOuter, rInner, teeth, lw) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.strokeStyle = "rgba(255, 242, 235, 0.7)";
          ctx.lineWidth = lw;
          ctx.beginPath();
          const step = (Math.PI * 2) / teeth;
          for (let i = 0; i < teeth; i++) {
            const a1 = i * step;
            const a2 = a1 + step * 0.35;
            const a3 = a1 + step * 0.5;
            const a4 = a1 + step * 0.85;
            const rTip = rOuter + 14;
            if (i === 0) ctx.moveTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
            else ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
            ctx.lineTo(Math.cos(a2) * rTip, Math.sin(a2) * rTip);
            ctx.lineTo(Math.cos(a3) * rTip, Math.sin(a3) * rTip);
            ctx.lineTo(Math.cos(a4) * rOuter, Math.sin(a4) * rOuter);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, rInner, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, rInner * 0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        drawGear(w * 0.72, h * 0.34, 125, 75, 16, 5);
        drawGear(w * 0.32, h * 0.56, 95, 55, 14, 5);

        ctx.strokeStyle = "rgba(255, 242, 235, 0.45)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w * 0.72, h * 0.34, 168, 0.75 * Math.PI, 1.8 * Math.PI);
        ctx.stroke();
      });

      // =========================== 【一體成形實體主建築量體】 ===========================
      // (1) 完整實心主體建築量體 (覆蓋全寬 bw = 15.0m、全長 bd = 44.0m、全高 16.8m)
      // 確保北牆 (z = -22)、南牆 (z = +22)、東背牆 (x = +7.5) 均為 100% 紮實之丁掛磚牆，絕無中空感
      const mainSolidBody = new THREE.Mesh(new THREE.BoxGeometry(bw, totalH, bd), brickMat);
      mainSolidBody.position.set(0, totalH / 2, 0);
      mainSolidBody.castShadow = true;
      mainSolidBody.receiveShadow = true;
      bldGroup.add(mainSolidBody);

      // (2) 東面後牆窗戶 (採光通風鋁窗陣列)
      for (let f = 1; f <= numFl; f++) {
        const wy = (f - 0.5) * fh;
        [-17.5, -10.0, 0, 10.0, 17.5].forEach(wz => {
          const rearWin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 3.6), glassMat);
          rearWin.position.set(bw / 2 + 0.05, wy, wz);
          bldGroup.add(rearWin);
        });
      }

      // =========================== 【西向正面外觀立體雕琢】 ===========================
      // (3) 西向對稱巨型方柱列 (左翼 3 根、右翼 3 根，0.85m x 0.85m，立體突出 0.22m)
      const colZList = [-21.4, -13.8, -6.0, 6.0, 13.8, 21.4];
      colZList.forEach(cz => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.85, totalH, 0.85), brickMat);
        col.position.set(-bw / 2 - 0.22, totalH / 2, cz);
        col.castShadow = true;
        bldGroup.add(col);

        // 柱面每層交界處嵌鑲斜置白金雙色菱形 ◇ 裝飾磁磚
        [fh, fh * 2, fh * 3].forEach(dy => {
          const diamondFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.52), diamondWhiteMat);
          diamondFrame.rotation.x = Math.PI / 4;
          diamondFrame.position.set(-bw / 2 - 0.66, dy + 0.35, cz);
          bldGroup.add(diamondFrame);

          const diamondInner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.34), diamondGoldMat);
          diamondInner.rotation.x = Math.PI / 4;
          diamondInner.position.set(-bw / 2 - 0.67, dy + 0.35, cz);
          bldGroup.add(diamondInner);
        });
      });

      // (4) 正面層間深樑與各開間立體窗帶
      for (let f = 1; f <= numFl; f++) {
        const yBase = (f - 1) * fh;

        // 層間水平結構橫樑 (深紅褐色收邊)
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, bd + 0.1), brickDarkMat);
        beam.position.set(-bw / 2 - 0.08, yBase + fh - 0.325, 0);
        beam.castShadow = true;
        bldGroup.add(beam);

        // 4 個對稱開間 (左翼 2 開間：-17.5, -10.0；右翼 2 開間：+10.5, +18.0)
        [-17.5, -10.0, 10.5, 18.0].forEach(bz => {
          const winMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 3.6), glassMat);
          winMesh.position.set(-bw / 2 + 0.05, yBase + fh * 0.52, bz);
          bldGroup.add(winMesh);

          const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 3.7), frameMat);
          frameMesh.position.set(-bw / 2 + 0.05, yBase + fh * 0.52, bz);
          bldGroup.add(frameMesh);
        });
      }

      // (5) 兩翼半圓弧波浪外凸陽台 (2F、3F、4F，左翼 2 開間、右翼 2 開間高度對稱)
      function addBowBalcony(bz, yBase) {
        const bSlab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 4.8), floorMat);
        bSlab.position.set(-bw / 2 - 0.55, yBase + 0.14, bz);
        bldGroup.add(bSlab);

        const bowParapet = new THREE.Mesh(
          new THREE.CylinderGeometry(2.5, 2.5, 1.05, 16, 1, false, Math.PI * 0.72, Math.PI * 0.56),
          brickMat
        );
        bowParapet.position.set(-bw / 2 + 1.6, yBase + 0.55, bz);
        bldGroup.add(bowParapet);

        const bowRail = new THREE.Mesh(
          new THREE.CylinderGeometry(2.52, 2.52, 0.16, 16, 1, false, Math.PI * 0.72, Math.PI * 0.56),
          railingMat
        );
        bowRail.position.set(-bw / 2 + 1.6, yBase + 1.15, bz);
        bldGroup.add(bowRail);
      }

      [2, 3, 4].forEach(f => {
        const yBase = (f - 1) * fh;
        // 左翼 (北翼) 2 開間半圓弧波浪陽台
        addBowBalcony(-17.5, yBase);
        addBowBalcony(-10.0, yBase);

        // 右翼 (南翼) 2 開間半圓弧波浪陽台
        addBowBalcony(10.5, yBase);
        addBowBalcony(18.0, yBase);
      });

      // =========================== 【中央大門廳與迎賓階梯 (z = 0)】 ===========================
      // (6) 1F 大門入口採光門與水泥迎賓台階（依使用者指示移除 1F 前方圓柱與懸空門牌，上方由 2F 圓弧大陽台遮蔽）
      const mainDoor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 4.6), glassMat);
      mainDoor.position.set(-bw / 2 - 0.05, 1.6, 0);
      bldGroup.add(mainDoor);

      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.3, 4.8), frameMat);
      doorFrame.position.set(-bw / 2 - 0.05, 1.65, 0);
      bldGroup.add(doorFrame);

      const steps = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 11.0), getMat("#C6C0B5"));
      steps.position.set(-bw / 2 - 1.2, 0.11, 0);
      steps.receiveShadow = true;
      bldGroup.add(steps);

      // (7) 2F、3F、4F 中央懸挑大圓弧陽台 (連續三層雄偉弧形立面)
      [2, 3, 4].forEach(f => {
        const yBase = (f - 1) * fh;

        const cBalconySlab = new THREE.Mesh(
          new THREE.CylinderGeometry(7.2, 7.2, 0.26, 24, 1, false, Math.PI * 0.77, Math.PI * 0.46),
          floorMat
        );
        cBalconySlab.position.set(-bw / 2 + 5.5, yBase + 0.13, 0);
        bldGroup.add(cBalconySlab);

        const cBalconyParapet = new THREE.Mesh(
          new THREE.CylinderGeometry(7.22, 7.22, 1.05, 24, 1, false, Math.PI * 0.77, Math.PI * 0.46),
          brickMat
        );
        cBalconyParapet.position.set(-bw / 2 + 5.5, yBase + 0.55, 0);
        bldGroup.add(cBalconyParapet);

        const cBalconyRail = new THREE.Mesh(
          new THREE.CylinderGeometry(7.24, 7.24, 0.16, 24, 1, false, Math.PI * 0.77, Math.PI * 0.46),
          railingMat
        );
        cBalconyRail.position.set(-bw / 2 + 5.5, yBase + 1.15, 0);
        bldGroup.add(cBalconyRail);
      });

      // =========================== 【中間偏右：長條狀無障礙電梯塔】 ===========================
      // 垂直實體塔身 (正面中間偏右 z = +7.8，高 18.2m 直達頂樓，珊瑚粉色 #D47A7E)
      const elevH = totalH + 1.4; // 18.2m
      const elevTower = new THREE.Mesh(new THREE.BoxGeometry(2.8, elevH, 3.2), elevMat);
      elevTower.position.set(-bw / 2 - 1.4, elevH / 2, 7.8);
      elevTower.castShadow = true;
      bldGroup.add(elevTower);

      // 電梯塔頂部女兒牆收邊
      const elevCap = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.35, 3.5), brickDarkMat);
      elevCap.position.set(-bw / 2 - 1.4, elevH + 0.175, 7.8);
      bldGroup.add(elevCap);

      // 電梯正面外牆「機械工程齒輪咬合」彩繪圖騰
      if (gearMuralTex) {
        const gearMural = new THREE.Mesh(
          new THREE.PlaneGeometry(3.0, elevH - 1.2),
          new THREE.MeshBasicMaterial({ map: gearMuralTex })
        );
        gearMural.rotation.y = -Math.PI / 2;
        gearMural.position.set(-bw / 2 - 2.82, (elevH - 1.2) / 2 + 0.6, 7.8);
        bldGroup.add(gearMural);
      }

      // 1F 電梯不銹鋼進出門
      const elevDoor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 1.4), shutterMat);
      elevDoor.position.set(-bw / 2 - 2.82, 1.2, 7.8);
      bldGroup.add(elevDoor);

      // 1F 簡潔無障礙專用緩坡道（依使用者指示呈現主要外型，移除停車位標線與雜物立牌）
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 1.8), getMat("#B0ABA2"));
      ramp.position.set(-bw / 2 - 3.9, 0.11, 7.8);
      ramp.receiveShadow = true;
      bldGroup.add(ramp);

      // =========================== 【屋頂配置 (Roof Level)】 ===========================
      // (8) 屋頂女兒牆矮牆 (全周高 0.85m)
      const roofParapet = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, 0.85, bd + 0.3), brickMat);
      roofParapet.position.set(0, totalH + 0.425, 0);
      roofParapet.castShadow = true;
      bldGroup.add(roofParapet);

      const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.6, 0.86, bd - 0.6), roofMat);
      roofDeck.position.set(0, totalH + 0.425, 0);
      bldGroup.add(roofDeck);

      // (9) 中央挑高樓梯機房塔樓 (z = 0，對齊中心線，高 2.5m)
      const penthouse = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.5, 7.6), brickMat);
      penthouse.position.set(0, totalH + 1.25, 0);
      penthouse.castShadow = true;
      bldGroup.add(penthouse);

      const penthouseCap = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.3, 8.0), brickDarkMat);
      penthouseCap.position.set(0, totalH + 2.5 + 0.15, 0);
      bldGroup.add(penthouseCap);

      // =========================== 【全棟一體綁定，絕不中空剖切】 ===========================
      root.add(bldGroup);
      root.userData.floorGroups[1] = root;
      root.userData.pickMesh = mainSolidBody;
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

    // 12. 畜產館 & 土木館 (`twin_tech`) — 雙胞胎 4F 赤陶磚 + 屋頂中央紅瓦斜頂 + 南端 3 層樓連通走廊橋 (還原 20261020_125439.jpg)
    if (b.style === "twin_tech") {
      const penthouse = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.5, 7.2), whiteMat);
      penthouse.position.set(0, fh + 1.25, 0);
      topGroup.add(penthouse);

      const redRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.3, 4), getMat("#9E4739"));
      redRoof.rotation.y = Math.PI / 4;
      redRoof.position.set(0, fh + 3.5, 0);
      topGroup.add(redRoof);

      // 依實景照片與使用者指示：土木館正門在西側 (-X 左邊紅星)，畜產館正門在東側 (+X 右邊紅星)
      const entranceSign = (b.id === "civil_eng") ? -1 : 1;
      const entranceBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, totalH + 0.5, 7.5), secMat);
      entranceBox.position.set(entranceSign * (b.w / 2 + 0.8), totalH / 2, 0);
      entranceBox.castShadow = true;
      root.add(entranceBox);

      // 1F 正門挑高玻璃迎賓大門與門楣
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 4.2), glassMat);
      doorMesh.position.set(entranceSign * (b.w / 2 + 2.0), 1.6, 0);
      root.add(doorMesh);

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



    return root;
  }

  return {
    buildCampusGrounds,
    createBuildingMesh,
    setVisualTheme
  };
})();
