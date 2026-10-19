// 國立臺南大學附屬高級中學 (TNTCSH) 3D 校園場景與程序化建築生成器
// 完全原創開發 — 依據 OpenStreetMap (way/161510567)、平面圖黑色道路網 (aa190fc6a5da5710e0aea63299779c6c.PNG) 與 43 張實景照片建置

window.CampusBuilder3D = (function () {
  const matCache = new Map();

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
    const pathEW = new THREE.Mesh(new THREE.BoxGeometry(92, 0.16, 5.5), brickPlazaMat);
    pathEW.position.set(0, 0.07, -3);
    envGroup.add(pathEW);
    const quadCenterPlaza = new THREE.Mesh(new THREE.BoxGeometry(16, 0.20, 18), brickPlazaMat);
    quadCenterPlaza.position.set(0, 0.09, -3);
    envGroup.add(quadCenterPlaza);

    // (f) 正德樓南側對稱花圃區 (z=62 與 z=86 兩條黑線道路之間的長條花圃綠帶)
    [-38, 38].forEach(gx => {
      const stripBed = new THREE.Mesh(new THREE.BoxGeometry(62, 0.24, 13), darkGreenMat);
      stripBed.position.set(gx, 0.12, 74);
      envGroup.add(stripBed);
    });

    // (g) 土木館與畜產館北側白色圓形廣場 (-39, 102) 及園藝館北側粉紅圓形花圃廣場 (38, 97)
    const techRoundPlaza = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, 0.22, 28), whitePlazaMat);
    techRoundPlaza.position.set(-39, 0.11, 102);
    envGroup.add(techRoundPlaza);

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

    const depotCourt = new THREE.Mesh(new THREE.BoxGeometry(24, 0.14, 34), brickPlazaMat);
    depotCourt.position.set(96, 0.04, 150);
    envGroup.add(depotCourt);

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

    // 6. 植栽與樹木群 (椰林大道、中庭大樹、書庫西側筆直樹林步道、校園行道樹)
    const trunkMat = getMat("#5C4332", { roughness: 0.9 });
    const leafMat1 = getMat("#3E6E35", { roughness: 0.8 });
    const leafMat2 = getMat("#4E8240", { roughness: 0.8 });
    const palmLeafMat = getMat("#4A7C36", { roughness: 0.75 });

    function addTree(x, z, scale = 1.0, style = "broad") {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      if (style === "palm") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 7.8 * scale, 8), getMat("#8A857A"));
        trunk.position.y = 3.9 * scale;
        trunk.castShadow = true;
        g.add(trunk);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3 * scale, 1), palmLeafMat);
        crown.scale.set(1.35, 0.55, 1.35);
        crown.position.y = 7.9 * scale;
        crown.castShadow = true;
        g.add(crown);
      } else if (style === "tall_grove") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 9.5 * scale, 7), trunkMat);
        trunk.position.y = 4.75 * scale;
        trunk.castShadow = true;
        g.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.3 * scale, 8, 7), leafMat2);
        crown.scale.set(0.9, 1.35, 0.9);
        crown.position.y = 9.5 * scale;
        crown.castShadow = true;
        g.add(crown);
      } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * scale, 0.48 * scale, 3.2 * scale, 7), trunkMat);
        trunk.position.y = 1.6 * scale;
        trunk.castShadow = true;
        g.add(trunk);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6 * scale, 1), Math.random() > 0.5 ? leafMat1 : leafMat2);
        crown.scale.set(1.1, 0.82, 1.1);
        crown.position.y = 4.2 * scale;
        crown.castShadow = true;
        g.add(crown);
      }
      envGroup.add(g);
    }

    // 中央迎賓大道兩側椰子樹
    for (let z = -148; z <= -106; z += 8.5) {
      addTree(-3.4, z, 1.05, "palm");
      addTree(3.4, z, 1.05, "palm");
    }

    // 西側主幹道行道樹 (操場與活動中心／敬業樓／利用樓之間)
    for (let z = -220; z <= 180; z += 16) {
      addTree(-86, z, 1.0, "broad");
    }

    // 中庭教學區大樹群
    [
      [-22, -18, 1.4], [22, -18, 1.4], [-26, 12, 1.3], [26, 12, 1.3],
      [-36, -6, 1.15], [36, -6, 1.15], [-16, 22, 1.05], [16, 22, 1.05]
    ].forEach(([x, z, s]) => addTree(x, z, s, "broad"));

    // 書庫（原學生宿舍）西側筆直樹林步道 (`160532.jpg`)
    for (let z = 108; z <= 146; z += 6.5) {
      addTree(92, z, 1.1, "tall_grove");
      addTree(98, z, 1.15, "tall_grove");
    }

    // 餐飲館正門口前方道路左右兩個綠地區域內的樹群 (對照平面圖)
    [
      // 左側綠地樹群 (x = 83..105, z = -58..-45)
      [84, -57, 1.05], [91, -56, 1.15], [98, -57, 1.0], [104, -55, 1.1],
      [85, -49, 1.1], [93, -48, 1.2], [101, -49, 1.05],
      [88, -44, 0.95], [96, -44, 1.05], [104, -45, 1.0],
      // 右側綠地樹群 (x = 122..128, z = -58..-45)
      [123, -57, 1.0], [127, -54, 1.05], [123, -49, 1.1], [127, -45, 1.0]
    ].forEach(([x, z, s]) => addTree(x, z, s, "broad"));

    // 畜產館、土木館、園藝館與操場北端林木 (已移除機械館前方 x=144 之樹木)
    for (let z = 112; z <= 180; z += 14) {
      addTree(-39, z, 1.05, "broad");
      addTree(-72, z, 1.05, "broad");
    }
    [
      [-148, -248, 1.3], [-132, -258, 1.35], [-115, -245, 1.25],
      [22, 128, 1.2], [58, 128, 1.2]
    ].forEach(([x, z, s]) => addTree(x, z, s, "broad"));

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

    const fh = b.floorHeight || 3.6;
    const totalH = b.floors * fh;
    const mainMat = getMat(b.colors.main);
    const secMat = getMat(b.colors.secondary);
    const accMat = getMat(b.colors.accent);
    const roofMat = getMat(b.colors.roof);
    const glassMat = getMat("#2B3D4F", { roughness: 0.2, metalness: 0.7 });
    const whiteMat = getMat("#F4F4F0");

    // 特殊場域 1：彩虹田徑操場
    if (b.style === "track") {
      const rainbowColors = ["#D8433A", "#F2C94C", "#4E9F50", "#2F80ED"];
      rainbowColors.forEach((col, i) => {
        const pad = i * 1.45;
        const h = 0.12 + i * 0.06;
        const lane = new THREE.Mesh(
          new THREE.BoxGeometry(b.w - pad * 2, h, b.d - pad * 2),
          getMat(col, { roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -i - 1, polygonOffsetUnits: -i - 1 })
        );
        lane.position.y = h / 2;
        lane.receiveShadow = true;
        root.add(lane);
      });
      const infield = new THREE.Mesh(
        new THREE.BoxGeometry(b.w - 15, 0.42, b.d - 22),
        getMat("#4C8C4A", { roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })
      );
      infield.position.y = 0.21;
      infield.receiveShadow = true;
      root.add(infield);

      // 東側司令台
      const stage = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.0, 16), whiteMat);
      stage.position.set(b.w / 2 - 1.5, 2.0, 0);
      stage.castShadow = true;
      root.add(stage);

      root.userData.floorGroups[1] = root;
      root.userData.pickMesh = infield;
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

    // 特殊場域 3：太陽能光電風雨球場 (`solar_courts`) — 還原 `160903.jpg` & `161117.jpg`
    if (b.style === "solar_courts") {
      const g1 = new THREE.Group();
      const courtBase = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, 0.16, b.d),
        getMat("#4F785A", { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
      );
      courtBase.position.y = 0.08;
      courtBase.receiveShadow = true;
      g1.add(courtBase);

      for (let i = -1; i <= 1; i += 2) {
        const innerCourt = new THREE.Mesh(
          new THREE.BoxGeometry(b.w * 0.42, 0.26, b.d * 0.82),
          getMat(b.courtType === "basketball" ? "#4B77A3" : "#5D8BB0", { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
        );
        innerCourt.position.set(i * b.w * 0.24, 0.13, 0);
        innerCourt.receiveShadow = true;
        g1.add(innerCourt);
      }

      // 深炭灰 H 型鋼柱 + 亮蘋果綠安全防撞柱墊 (`#78BE75`)
      const colMat = getMat("#2F353B", { metalness: 0.5, roughness: 0.4 });
      const padMat = getMat("#78BE75", { roughness: 0.6 });
      const colsX = [-b.w / 2 + 1.2, 0, b.w / 2 - 1.2];
      const colsZ = [-b.d / 2 + 1.5, -b.d / 6, b.d / 6, b.d / 2 - 1.5];
      colsX.forEach(cx => {
        colsZ.forEach(cz => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, b.floorHeight, 0.45), colMat);
          post.position.set(cx, b.floorHeight / 2, cz);
          post.castShadow = true;
          g1.add(post);

          const safetyPad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.3, 12), padMat);
          safetyPad.position.set(cx, 1.15, cz);
          g1.add(safetyPad);
        });
      });

      // 南座球場專屬：綠色水泥網球練習牆 (`160937.jpg`)
      if (b.courtType === "volley_tennis") {
        const practiceWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, b.d * 0.65), getMat("#466645"));
        practiceWall.position.set(b.w * 0.46, 2.1, 0);
        practiceWall.castShadow = true;
        g1.add(practiceWall);
      }

      // 挑高太陽能光電雙斜大屋頂
      const roofGroup = new THREE.Group();
      roofGroup.position.y = b.floorHeight;
      const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(b.w + 2.5, 0.45, b.d + 2.5), getMat("#A8B0B5", { metalness: 0.4 }));
      roofDeck.rotation.z = 0.06;
      roofDeck.castShadow = true;
      roofGroup.add(roofDeck);

      const solarTop = new THREE.Mesh(new THREE.BoxGeometry(b.w + 2.0, 0.2, b.d + 2.0), getMat("#26313E", { roughness: 0.25, metalness: 0.65 }));
      solarTop.position.y = 0.28;
      solarTop.rotation.z = 0.06;
      roofGroup.add(solarTop);
      g1.add(roofGroup);

      root.add(g1);
      root.userData.floorGroups[1] = g1;
      return root;
    }

    // ================= 一般與特色多層建築物 (逐層建立以支援樓層剖面切換) =================
    for (let f = 1; f <= b.floors; f++) {
      const yBase = (f - 1) * fh;
      const fg = buildFloorInterior(b, f, yBase, fh);

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

      root.add(fg);
      root.userData.floorGroups[f] = fg;
    }

    // ================= 各棟大樓專屬地標造型細節 (從 43 張實景照片提取) =================
    const topGroup = root.userData.floorGroups[b.floors];

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

    // 2. 活動中心 (`activity`) — 南側灰色垂直校徽塔 + 東側 A 字斜撐與彩虹橫樑 (`161309.jpg`, `161435.jpg`)
    if (b.style === "activity") {
      const southTower = new THREE.Mesh(new THREE.BoxGeometry(5.6, totalH + 3.2, 2.4), secMat);
      southTower.position.set(0, (totalH + 3.2) / 2, b.d / 2 + 0.8);
      southTower.castShadow = true;
      root.add(southTower);

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

    // 3. 樂耕樓 (`legeng`) — 西端 1–2F 轉角直接連通利用樓 1–2F + 北向圓角凸出門廊 + 南向中庭雙座冷灰高塔 + 屋頂太陽能 (`161208.jpg`, `161549.jpg`)
    if (b.style === "legeng") {
      const centerOffsetX = -b.x; // 對齊世界座標 x = 0 中軸線
      const northPortico = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, totalH, 18), mainMat);
      northPortico.position.set(centerOffsetX, totalH / 2, -b.d / 2 - 1.2);
      northPortico.castShadow = true;
      root.add(northPortico);

      [-6.0, 6.0].forEach(tx => {
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

    // 12. 畜產館 & 土木館 (`twin_tech`) — 雙胞胎 4F 赤陶粉紅磚 + 屋頂中央紅瓦白牆小斜頂 (`160652.jpg`, `160814.jpg`)
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
    }

    // 13. 園藝館 (`horticulture`) & 農經館 (`farm_mgmt`) — 屋頂太陽能光電板
    if (b.style === "horticulture" || b.style === "farm_mgmt") {
      addSolarPanels(topGroup, b.w, b.d, fh, 3);
    }

    // 14. 合作社大樓 (`coop_art`) — 入口右側高聳圓柱形塔樓 + 北側 1F 洗手台與器材平房 (`161014.jpg`, `161031.jpg`, `161059.jpg`)
    if (b.style === "coop_art") {
      const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, totalH + 2.4, 20), mainMat);
      rotunda.position.set(b.w * 0.22, (totalH + 2.4) / 2, -b.d / 2 - 1.0);
      rotunda.castShadow = true;
      root.add(rotunda);

      const washHouse = new THREE.Mesh(new THREE.BoxGeometry(11, 3.2, 7.0), getMat("#DFDDD4"));
      washHouse.position.set(-2, 1.6, -b.d / 2 - 7.0);
      washHouse.castShadow = true;
      root.add(washHouse);
      const washRoof = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.45, 7.8), getMat("#506E5B"));
      washRoof.position.set(-2, 3.3, -b.d / 2 - 7.0);
      root.add(washRoof);
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
    createBuildingMesh
  };
})();
