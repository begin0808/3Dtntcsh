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

    // 6. 植栽與樹木群 (依據圖一平面圖深綠色區塊全面強化：高大桃花心木、樟樹、大葉欖仁與椰林大道)
    const trunkMat = getMat("#543D2B", { roughness: 0.9 });
    const leafMatDark = getMat("#274D24", { roughness: 0.85 }); // 深綠色桃花心木／樟樹葉色
    const leafMat1 = getMat("#35632E", { roughness: 0.82 });
    const leafMat2 = getMat("#467A3B", { roughness: 0.8 });
    const palmLeafMat = getMat("#4A7C36", { roughness: 0.75 });

    function addTree(x, z, scale = 1.0, style = "mahogany") {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      if (style === "palm") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 8.8 * scale, 8), getMat("#8A857A"));
        trunk.position.y = 4.4 * scale;
        trunk.castShadow = true;
        g.add(trunk);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5 * scale, 1), palmLeafMat);
        crown.scale.set(1.35, 0.55, 1.35);
        crown.position.y = 8.9 * scale;
        crown.castShadow = true;
        g.add(crown);
      } else if (style === "tall_grove") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 10.5 * scale, 7), trunkMat);
        trunk.position.y = 5.25 * scale;
        trunk.castShadow = true;
        g.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.6 * scale, 8, 7), leafMat2);
        crown.scale.set(0.95, 1.45, 0.95);
        crown.position.y = 10.5 * scale;
        crown.castShadow = true;
        g.add(crown);
      } else {
        // 高大挺拔的桃花心木／樟樹（樹高 12m～18m，粗幹配多層次繁茂深綠樹冠）
        const trunkH = (7.5 + Math.random() * 1.5) * scale;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.58 * scale, trunkH, 8), trunkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        g.add(trunk);

        const fMat = Math.random() > 0.4 ? leafMatDark : leafMat1;
        const mainCrown = new THREE.Mesh(new THREE.SphereGeometry((3.4 + Math.random() * 0.6) * scale, 8, 7), fMat);
        mainCrown.scale.set(1.15, 1.25, 1.15);
        mainCrown.position.y = trunkH + 2.4 * scale;
        mainCrown.castShadow = true;
        g.add(mainCrown);

        [-1.4, 1.4].forEach((ox, i) => {
          const subCrown = new THREE.Mesh(new THREE.DodecahedronGeometry((2.2 + i * 0.3) * scale, 1), fMat);
          subCrown.position.set(ox * scale, trunkH + (1.6 + i * 0.5) * scale, (Math.random() - 0.5) * 2.2 * scale);
          subCrown.castShadow = true;
          g.add(subCrown);
        });
      }
      envGroup.add(g);
    }

    // (1) 中央迎賓大道兩側高聳椰林 (中山南路大門直通行政/敬業)
    for (let z = -148; z <= -106; z += 8.0) {
      addTree(-3.5, z, 1.1, "palm");
      addTree(3.5, z, 1.1, "palm");
    }

    // (2) 中庭教學區雙大深綠森林群 (圖一平面圖中庭草坪左右兩大巨型深綠森林樹叢)
    // 西北側大森林 (樂耕樓南側西半部、中庭十字步道西側)
    [
      [-30, -26, 1.35], [-24, -28, 1.45], [-18, -26, 1.3], [-13, -27, 1.4],
      [-32, -20, 1.4], [-26, -21, 1.5], [-20, -19, 1.55], [-14, -20, 1.35],
      [-29, -14, 1.35], [-23, -15, 1.4], [-17, -13, 1.3], [-12, -14, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 東北側大森林 (樂耕樓南側東半部、中庭十字步道東側)
    [
      [13, -27, 1.4], [18, -26, 1.35], [24, -28, 1.45], [30, -26, 1.35],
      [14, -20, 1.35], [20, -19, 1.55], [26, -21, 1.5], [32, -20, 1.4],
      [12, -14, 1.25], [17, -13, 1.3], [23, -15, 1.4], [29, -14, 1.35]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 中庭內圍步道樹列 (沿利用樓東側、厚生樓西側、正德樓北側)
    for (let z = -6; z <= 22; z += 7.0) {
      addTree(-36.5, z, 1.2, "mahogany");
      addTree(36.5, z, 1.2, "mahogany");
    }
    for (let x = -30; x <= 30; x += 8.5) {
      addTree(x, 22.0, 1.2, "mahogany");
    }

    // (3) 園藝館周邊深綠大森林區 (圖一平面圖園藝館四周密佈之深綠高大林帶)
    [
      // 園藝館西側森林帶 (x = 10..22, z = 74..120)
      [12, 76, 1.35], [18, 75, 1.4], [13, 84, 1.45], [19, 83, 1.5],
      [12, 92, 1.4], [18, 91, 1.5], [13, 100, 1.35], [19, 99, 1.4],
      [14, 108, 1.3], [18, 107, 1.35], [13, 116, 1.35], [19, 115, 1.4],
      // 園藝館東側森林帶 (x = 54..66, z = 74..120)
      [55, 76, 1.35], [62, 75, 1.4], [56, 84, 1.45], [63, 83, 1.4],
      [55, 92, 1.4], [62, 91, 1.5], [56, 100, 1.35], [63, 99, 1.4],
      [55, 108, 1.3], [62, 107, 1.35], [56, 116, 1.35], [63, 115, 1.4],
      // 園藝館南側與農經館周邊林木 (z = 118..145)
      [26, 122, 1.35], [34, 123, 1.4], [42, 121, 1.45], [50, 123, 1.35],
      [24, 134, 1.3], [32, 135, 1.4], [40, 133, 1.35], [48, 135, 1.3],
      [36, 145, 1.3], [44, 144, 1.35], [52, 146, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // (4) 土木館與畜產館北側半圓森林群、西側與中夾林帶 (圖一平面圖深綠區塊)
    // 北側半圓拱形林帶 (x = -62..-14, z = 66..82)
    [
      [-58, 68, 1.35], [-50, 67, 1.4], [-42, 69, 1.45], [-34, 68, 1.4], [-26, 67, 1.35], [-18, 69, 1.3],
      [-56, 76, 1.3], [-48, 77, 1.4], [-40, 75, 1.45], [-32, 76, 1.4], [-24, 77, 1.35], [-16, 75, 1.3]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 土木館西側沿校牆林帶 (x = -70..-74, z = 92..175)
    for (let z = 92; z <= 175; z += 11.5) {
      addTree(-72.0, z, 1.25, "mahogany");
    }

    // 畜產館與園藝館之間的深綠林帶 (x = 0..8, z = 92..165)
    for (let z = 92; z <= 165; z += 11.5) {
      addTree(2.0, z, 1.3, "mahogany");
    }

    // (5) 正德樓南側花圃區高大行道樹 (z = 62 與 z = 86 兩條道路間的長條綠帶)
    [-54, -42, -30, -18].forEach(x => addTree(x, 74.0, 1.15, "mahogany"));
    [18, 30, 42, 54].forEach(x => addTree(x, 74.0, 1.15, "mahogany"));

    // (6) 操場周邊深綠大森林區 (圖一平面圖操場北端與東側深綠森林)
    // 操場北端大森林 (x = -160..-105, z = -238..-185)
    [
      [-155, -232, 1.4], [-145, -235, 1.5], [-135, -233, 1.45], [-125, -236, 1.4], [-115, -232, 1.35],
      [-152, -222, 1.35], [-142, -224, 1.5], [-132, -221, 1.55], [-122, -225, 1.45], [-112, -220, 1.35],
      [-150, -210, 1.35], [-140, -212, 1.45], [-130, -209, 1.5], [-120, -213, 1.4], [-110, -208, 1.3],
      [-148, -198, 1.3], [-138, -200, 1.4], [-128, -197, 1.45], [-118, -201, 1.35]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 操場與活動中心／車棚之間的行道樹列 (x = -96, z = -215..-125)
    for (let z = -215; z <= -125; z += 10.0) {
      addTree(-96.0, z, 1.25, "mahogany");
    }

    // (7) 西側主幹道行道樹 (球場與利用樓／正德樓之間, x = -86)
    for (let z = -120; z <= 175; z += 12.0) {
      addTree(-86.0, z, 1.2, "mahogany");
    }

    // (8) 北校門與行政大樓周邊森林
    // 活動中心北側與迎賓車道弧形林地 (x = -62..-15, z = -162..-145)
    [
      [-58, -158, 1.3], [-50, -160, 1.35], [-42, -157, 1.4], [-34, -159, 1.45], [-26, -157, 1.35], [-18, -158, 1.3],
      [-54, -150, 1.3], [-46, -152, 1.35], [-38, -149, 1.4], [-30, -151, 1.4], [-22, -149, 1.35]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 校門圓環東北弧形林帶與行政大樓周邊 (x = 18..65, z = -158..-135)
    [
      [22, -155, 1.35], [30, -157, 1.4], [38, -154, 1.45], [46, -156, 1.4], [54, -153, 1.35],
      [26, -145, 1.3], [34, -147, 1.4], [42, -144, 1.45], [50, -146, 1.4], [58, -143, 1.35],
      // 行政大樓東側與學生車棚旁 (x = 66..82, z = -115..-85)
      [68, -112, 1.3], [75, -110, 1.35], [69, -100, 1.35], [76, -98, 1.4], [70, -88, 1.3], [77, -86, 1.35]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // (9) 東側各專科館舍間深綠樹林帶 (厚生樓、烹飪教室、樂揚樓、圖書館、書庫、機械館)
    // 厚生樓與烹飪教室／樂揚樓之間的綠廊 (x = 60..72, z = -35..25)
    for (let z = -32; z <= 24; z += 9.5) {
      addTree(64.0, z, 1.25, "mahogany");
      addTree(70.0, z, 1.2, "mahogany");
    }

    // 圖書館周邊綠蔭林木 (x = 88..106, z = 0..45)
    [
      [88, 5, 1.3], [96, 4, 1.35], [104, 6, 1.3],
      [89, 16, 1.35], [97, 15, 1.4], [105, 17, 1.35],
      [88, 28, 1.3], [96, 27, 1.35], [104, 29, 1.3],
      [89, 40, 1.35], [97, 39, 1.4], [105, 41, 1.3]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 書庫（原學生宿舍）西側筆直樹林步道 (`160532.jpg`)
    for (let z = 108; z <= 146; z += 6.5) {
      addTree(92, z, 1.15, "tall_grove");
      addTree(98, z, 1.2, "tall_grove");
    }

    // 加工工廠與書庫周邊深綠林帶 (x = 88..104, z = 78..104)
    [
      [89, 82, 1.3], [97, 80, 1.35], [103, 83, 1.25],
      [88, 94, 1.35], [96, 92, 1.4], [104, 95, 1.3]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 樂揚樓、資源室以東果園／林地 (x = 145..172, z = -35..45)
    [
      [148, -30, 1.25], [158, -32, 1.3], [168, -29, 1.25],
      [146, -15, 1.3], [156, -16, 1.35], [166, -14, 1.3],
      [148, 0, 1.3], [158, -1, 1.35], [168, 1, 1.25],
      [146, 15, 1.25], [156, 14, 1.3], [166, 16, 1.25],
      [148, 30, 1.25], [158, 28, 1.3], [168, 31, 1.25]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // 東側校界（永平街側）筆直綠蔭防風林 (x = 176..188, z = 15..155)
    for (let z = 15; z <= 155; z += 14.0) {
      addTree(180.0, z, 1.25, "mahogany");
      addTree(186.0, z, 1.2, "mahogany");
    }

    // (10) 餐飲館正門口前方道路左右兩個獨立綠地區域 (對照平面圖)
    [
      // 左側綠地樹群 (x = 83..105, z = -58..-45)
      [84, -57, 1.15], [91, -56, 1.25], [98, -57, 1.1], [104, -55, 1.2],
      [85, -49, 1.2], [93, -48, 1.3], [101, -49, 1.15],
      [88, -44, 1.05], [96, -44, 1.15], [104, -45, 1.1],
      // 右側綠地樹群 (x = 122..128, z = -58..-45)
      [123, -57, 1.1], [127, -54, 1.15], [123, -49, 1.2], [127, -45, 1.1]
    ].forEach(([x, z, s]) => addTree(x, z, s, "mahogany"));

    // (11) 游泳館南側大草坪樹林 (x = -155..-95, z = 172..188)
    for (let x = -155; x <= -95; x += 15.0) {
      addTree(x, 178.0, 1.3, "mahogany");
      addTree(x + 7.5, 186.0, 1.25, "mahogany");
    }

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

    const fh = b.floorHeight || 5.4;
    const totalH = b.floors * fh;
    const mainMat = getMat(b.colors.main);
    const secMat = getMat(b.colors.secondary);
    const accMat = getMat(b.colors.accent);
    const roofMat = getMat(b.colors.roof);
    const glassMat = getMat("#2B3D4F", { roughness: 0.2, metalness: 0.7 });
    const whiteMat = getMat("#F4F4F0");

    // 特殊場域 1：田徑操場 (還原 20261020_124957.jpg ~ 125032.jpg 實景：標準紅褐 PU 跑道、外緣天藍排水邊溝與東側司令台看台)
    if (b.style === "track") {
      const g1 = new THREE.Group();
      // 1. 外緣天藍色排水邊溝
      const curbMat = getMat("#4A92C8", { roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const blueCurb = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.14, b.d), curbMat);
      blueCurb.position.y = 0.07;
      blueCurb.receiveShadow = true;
      g1.add(blueCurb);

      // 2. 標準紅褐色 PU 跑道鋪面
      const trackMat = getMat("#9D3528", { roughness: 0.82, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const puTrack = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1.8, 0.20, b.d - 1.8), trackMat);
      puTrack.position.y = 0.10;
      puTrack.receiveShadow = true;
      g1.add(puTrack);

      // 3. 跑道白色分道標線 (6 道標準線)
      const lineMat = getMat("#F5F7FA", { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      for (let i = 1; i <= 6; i++) {
        const span = i * 1.55;
        const laneLine = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1.8 - span * 2, 0.23, b.d - 1.8 - span * 2), lineMat);
        laneLine.position.y = 0.115;
        g1.add(laneLine);
        const laneInner = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1.8 - span * 2 - 0.24, 0.26, b.d - 1.8 - span * 2 - 0.24), trackMat);
        laneInner.position.y = 0.13;
        g1.add(laneInner);
      }

      // 4. 中央天然草皮足球／田徑場
      const infieldMat = getMat("#558C45", { roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
      const infield = new THREE.Mesh(new THREE.BoxGeometry(b.w - 22, 0.36, b.d - 26), infieldMat);
      infield.position.y = 0.18;
      infield.receiveShadow = true;
      g1.add(infield);

      // 5. 東側司令台 (還原 20261020_125032.jpg 實景：白色平頂雨遮、藍色看台階梯、正中國旗與前方球門)
      const stageGroup = new THREE.Group();
      stageGroup.position.set(b.w / 2 - 3.2, 0, 0);

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

      const goalMat = getMat("#FFFFFF");
      const goalBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 5.5), goalMat);
      goalBar.position.set(-4.8, 2.2, 0);
      const goalPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), goalMat);
      goalPost1.position.set(-4.8, 1.1, -2.75);
      const goalPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), goalMat);
      goalPost2.position.set(-4.8, 1.1, 2.75);
      stageGroup.add(goalBar, goalPost1, goalPost2);

      g1.add(stageGroup);

      root.add(g1);
      root.userData.floorGroups[1] = g1;
      root.userData.pickMesh = infield;
      return root;
    }

    // 特殊場域 1b：園藝學程教學區高架鋼棚 (還原 20261020_125500.jpg 實景：銀灰鋼構、X 型交叉斜撐、高架實作平台與雙斜光電頂棚)
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

    // 3. 樂耕樓 (`legeng`) — 北向正面「樂耕樓」金色牌匾 + 三層圓弧露台門廊 + 西端 1–2F 轉角連通利用樓 + 南向雙高塔 (還原 20261020_125222.jpg)
    if (b.style === "legeng") {
      const centerOffsetX = -b.x; // 對齊世界座標 x = 0 中軸線
      const goldMat = getMat("#C59B27", { metalness: 0.4, roughness: 0.3 });

      // 北立面中央懸挑三層樓門廊與陽台 (1F 門廊、2F 與 3F 白色橫條露台)
      const porticoW = 15.0;
      const porticoD = 4.2;
      const northPortico = new THREE.Mesh(new THREE.BoxGeometry(porticoW, totalH * 0.92, porticoD), mainMat);
      northPortico.position.set(centerOffsetX, totalH * 0.46, -b.d / 2 - porticoD / 2 + 0.5);
      northPortico.castShadow = true;
      root.add(northPortico);

      // 屋頂女兒牆正面金色大字「樂 耕 樓」標誌板
      const nameSign = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.2, 0.4), goldMat);
      nameSign.position.set(centerOffsetX, totalH + 0.45, -b.d / 2 - 0.2);
      root.add(nameSign);

      // 1F 正門前方圓形花台
      const frontRoundBed = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.6, 0.65, 24), getMat("#4E8240"));
      frontRoundBed.position.set(centerOffsetX, 0.32, -b.d / 2 - porticoD - 3.2);
      frontRoundBed.receiveShadow = true;
      root.add(frontRoundBed);

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

      // 土木館與畜產館南端 1F～3F 連通走廊廊橋 (跨距 12m、深 5.5m，由土木館向東銜接畜產館)
      if (b.id === "civil_eng") {
        const connSpanX = 12.0;
        const connD = 5.6;
        const connZ = b.d / 2 - connD / 2 - 3.0;
        const connH = fh * 3;
        const bridgeGroup = new THREE.Group();
        bridgeGroup.position.set(b.w / 2 + connSpanX / 2, 0, connZ);

        for (let cf = 1; cf <= 3; cf++) {
          const cyBase = (cf - 1) * fh;
          const cFloor = new THREE.Mesh(new THREE.BoxGeometry(connSpanX, 0.35, connD), getMat("#D8D4CA"));
          cFloor.position.y = cyBase + 0.18;
          cFloor.receiveShadow = true;
          bridgeGroup.add(cFloor);

          [-connD / 2 + 0.35, connD / 2 - 0.35].forEach(wz => {
            const lowWall = new THREE.Mesh(new THREE.BoxGeometry(connSpanX, 1.25, 0.45), mainMat);
            lowWall.position.set(0, cyBase + 0.65, wz);
            lowWall.castShadow = true;
            bridgeGroup.add(lowWall);
          });
        }

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
    createBuildingMesh
  };
})();
