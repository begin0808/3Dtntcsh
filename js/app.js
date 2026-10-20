// 國立臺南大學附屬高級中學 (TNTCSH) 3D 互動校園主程式
// 包含：3D 視角控制、第一人稱地面實境漫步、動態 3D 羅盤指北針與方位標示、特色學程導覽、樓層剖面檢視、A* 路線導航与實景照片對照

(function () {
  const DATA = window.CAMPUS_DATA;
  const BUILDER = window.CampusBuilder3D;

  // 狀態管理
  const state = {
    theme: "day",          // 'day' | 'blueprint' | 'sunset'
    activeFloor: 0,        // 0 = 全樓層, 1..4 = 指定樓層剖面
    selectedBuilding: null,
    selectedRoom: null,
    activeProgramId: null,
    navStartId: "main_gate",
    navEndId: null,
    navWalking: false,
    navProgress: 0,
    navCurve: null,
    walkMode: false,       // 第一人稱地面實境漫步模式
    walkPos: new THREE.Vector3(0, 1.75, -170),
    walkYaw: Math.PI,      // 0 = 朝北(-Z), Math.PI = 朝南(+Z), -Math.PI/2 = 朝東(+X), Math.PI/2 = 朝西(-X)
    walkPitch: 0.04,
    walkBobPhase: 0,
    walkHoldActions: {}
  };

  // Three.js 核心物件 (啟用 logarithmicDepthBuffer 對數深度緩衝，徹底消除遠距鳥瞰時的 Z-fighting 路面閃爍)
  const canvas = document.getElementById("campusCanvas");
  const labelsContainer = document.getElementById("labelsOverlay");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#CFE5F5");
  scene.fog = new THREE.FogExp2("#CFE5F5", 0.00065);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 2.0, 1300);

  // 光源設定
  const hemiLight = new THREE.HemisphereLight("#FFFFFF", "#6E8562", 0.75);
  hemiLight.position.set(0, 220, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight("#FFF8E7", 1.05);
  sunLight.position.set(120, 185, 110);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 650;
  const d = 240;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  // 校園場景與道路建立
  const envGroup = BUILDER.buildCampusGrounds(scene);
  scene.add(envGroup);

  const buildingsGroup = new THREE.Group();
  buildingsGroup.name = "BuildingsGroup";
  scene.add(buildingsGroup);

  const buildingMeshes = new Map();
  const roomEntries = []; // 供全校教室搜尋與標籤定位使用
  const buildingLabels = new Map();
  const roadLabels = [];     // 周邊 OpenStreetMap 街道名牌
  const cardinalLabels = []; // 東南西北方位大標籤

  // 建立周邊外部道路浮動路名牌
  (DATA.externalRoads || []).forEach(rd => {
    (rd.labelPositions || []).forEach(lp => {
      const el = document.createElement("div");
      el.className = "road-label" + (rd.isPrimary ? " primary" : "");
      el.innerHTML = `<span>🛣️ ${lp.text}</span>`;
      labelsContainer.appendChild(el);
      roadLabels.push({
        el,
        pos: new THREE.Vector3(lp.x, 1.8, lp.z)
      });
    });
  });

  // 建立 3D 場景邊界「北N、南S、東E、西W」方位標示牌
  (DATA.cardinalMarkers || []).forEach(cm => {
    const el = document.createElement("div");
    el.className = "cardinal-label";
    el.style.borderColor = cm.color;
    el.innerHTML = `<span style="color:${cm.color}">🧭 ${cm.label}</span><small>${cm.sub}</small>`;
    labelsContainer.appendChild(el);
    cardinalLabels.push({
      el,
      pos: new THREE.Vector3(cm.x, 8.0, cm.z)
    });
  });

  // 建立建築物模型、房間索引與浮動標籤
  DATA.buildings.forEach(b => {
    const meshGroup = BUILDER.createBuildingMesh(b);
    buildingsGroup.add(meshGroup);
    buildingMeshes.set(b.id, meshGroup);

    // 收集房間索引 (西->東 為 -X -> +X；北->南 為 -Z -> +Z)
    if (b.floorsData) {
      Object.keys(b.floorsData).forEach(flStr => {
        const fl = parseInt(flStr, 10);
        const rooms = b.floorsData[fl] || [];
        const count = rooms.length;
        const isEW = b.w >= b.d;
        const span = (isEW ? b.w - 1.2 : b.d - 1.2) / Math.max(count, 1);

        rooms.forEach((rm, idx) => {
          const rx = isEW ? (-b.w / 2 + 0.6 + span * (idx + 0.5)) : 0;
          const rz = isEW ? 0 : (-b.d / 2 + 0.6 + span * (idx + 0.5));
          const wy = (fl - 1) * (b.floorHeight || 3.6) + (b.floorHeight || 3.6) * 0.65;
          roomEntries.push({
            buildingId: b.id,
            buildingName: b.name,
            floor: fl,
            code: rm.code,
            name: rm.name,
            type: rm.type,
            worldPos: new THREE.Vector3(b.x + rx, wy, b.z + rz)
          });
        });
      });
    }

    // 建立建築物浮動標籤 DOM
    const el = document.createElement("button");
    el.type = "button";
    el.className = `b-label cat-${b.category}`;
    el.innerHTML = `<span class="b-dot"></span><span class="b-txt">${b.name.replace(/（.*）/, "")}</span><small class="b-fl">${b.floors}F</small>`;
    el.addEventListener("click", e => {
      e.stopPropagation();
      selectBuilding(b.id, !state.walkMode);
    });
    labelsContainer.appendChild(el);
    buildingLabels.set(b.id, {
      el,
      pos: new THREE.Vector3(b.x, b.floors * (b.floorHeight || 3.6) + 3.5, b.z),
      data: b
    });
  });

  // 房間標籤容器 (當切換單一樓層或選取特定建築時顯示)
  const roomLabelPool = [];
  function updateRoomLabelsDOM() {
    roomLabelPool.forEach(item => item.el.remove());
    roomLabelPool.length = 0;

    if (state.activeFloor === 0 && !state.selectedBuilding) return;

    roomEntries.forEach(rm => {
      const matchFloor = state.activeFloor === 0 || rm.floor === state.activeFloor;
      const matchBld = !state.selectedBuilding || rm.buildingId === state.selectedBuilding.id;
      if (!matchFloor || !matchBld) return;
      if (state.activeFloor === 0 && state.selectedBuilding && rm.buildingId !== state.selectedBuilding.id) return;

      const el = document.createElement("div");
      el.className = `r-label rtype-${rm.type}` + (state.selectedRoom && state.selectedRoom.code === rm.code && state.selectedRoom.buildingId === rm.buildingId ? " active" : "");
      el.innerHTML = `<span class="r-fl">${rm.floor}F</span><b>${rm.name}</b>`;
      el.addEventListener("click", e => {
        e.stopPropagation();
        focusOnRoom(rm);
      });
      labelsContainer.appendChild(el);
      roomLabelPool.push({ el, pos: rm.worldPos.clone(), rm });
    });
  }

  // 選取高亮外框與學程多建築高亮群組
  const highlightRing = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.8, 32),
    new THREE.MeshBasicMaterial({ color: "#FFD23F", side: THREE.DoubleSide })
  );
  highlightRing.rotation.x = -Math.PI / 2;
  highlightRing.position.y = 0.28;
  highlightRing.visible = false;
  scene.add(highlightRing);

  const programRingsGroup = new THREE.Group();
  scene.add(programRingsGroup);

  // 導航路線 3D 物件群組
  const routeGroup = new THREE.Group();
  scene.add(routeGroup);

  const walkerMesh = new THREE.Group();
  const walkerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 2.4, 16),
    new THREE.MeshStandardMaterial({ color: "#FF6B35", emissive: "#B83B14", emissiveIntensity: 0.35 })
  );
  walkerBody.position.y = 1.2;
  const walkerHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 16, 16),
    new THREE.MeshStandardMaterial({ color: "#FFE5D9" })
  );
  walkerHead.position.y = 2.9;
  walkerMesh.add(walkerBody, walkerHead);
  walkerMesh.visible = false;
  scene.add(walkerMesh);

  // ================= 軌道與平滑相機控制器 =================
  const DEFAULT_OVERVIEW = {
    target: [8, 0, 35],
    radius: 445,
    phi: 0.82,
    theta: 0.0
  };

  const camControl = {
    target: new THREE.Vector3(...DEFAULT_OVERVIEW.target),
    spherical: { radius: DEFAULT_OVERVIEW.radius, phi: DEFAULT_OVERVIEW.phi, theta: DEFAULT_OVERVIEW.theta },
    targetGoal: new THREE.Vector3(...DEFAULT_OVERVIEW.target),
    sphericalGoal: { radius: DEFAULT_OVERVIEW.radius, phi: DEFAULT_OVERVIEW.phi, theta: DEFAULT_OVERVIEW.theta },
    isDragging: false,
    leftMouseAction: "pan", // 預設左鍵按住拖曳＝前後左右平移 ('pan' | 'rotate')
    dragMode: "pan",        // 'rotate' | 'pan'
    lastX: 0,
    lastY: 0,
    keys: {},
    panHold: {}             // 螢幕十字平移按鈕按住狀態
  };

  function flyTo(targetArr, camPosArr) {
    if (state.walkMode) toggleWalkMode(false);
    camControl.targetGoal.set(targetArr[0], targetArr[1], targetArr[2]);
    const dx = camPosArr[0] - targetArr[0];
    const dy = camPosArr[1] - targetArr[1];
    const dz = camPosArr[2] - targetArr[2];
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    camControl.sphericalGoal.radius = Math.max(18, Math.min(700, r));
    camControl.sphericalGoal.phi = Math.max(0.18, Math.min(Math.PI / 2 - 0.06, Math.acos(dy / r)));
    camControl.sphericalGoal.theta = Math.atan2(dx, dz);
  }

  // 一鍵回到預設全校最佳全覽畫面（最佳角度、置中位置、正北朝上）
  function resetToBestOverview() {
    if (state.walkMode) toggleWalkMode(false);
    setFloorFilter(0);
    document.getElementById("detailDrawer").hidden = true;
    document.getElementById("programsDrawer").hidden = true;
    document.getElementById("programsToggleBtn").classList.remove("active");
    state.selectedBuilding = null;
    highlightRing.visible = false;
    updateRoomLabelsDOM();

    document.querySelectorAll("#zoneBar .zone-btn").forEach((b, idx) => {
      b.classList.toggle("active", idx === 0);
    });

    camControl.targetGoal.set(...DEFAULT_OVERVIEW.target);
    camControl.sphericalGoal.radius = DEFAULT_OVERVIEW.radius;
    camControl.sphericalGoal.phi = DEFAULT_OVERVIEW.phi;
    camControl.sphericalGoal.theta = DEFAULT_OVERVIEW.theta;
    showToast("🏠 已回到預設全校最佳全覽畫面（按住滑鼠左鍵可直接前後左右平移）");
  }

  // 滑鼠與觸控事件
  let pointerDownPos = { x: 0, y: 0 };
  canvas.addEventListener("pointerdown", e => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
    camControl.isDragging = true;
    // 若處於「✋ 左鍵平移」模式：左鍵＝平移，右鍵／Shift+左鍵＝旋轉
    // 若處於「🔄 左鍵旋轉」模式：左鍵＝旋轉，右鍵／中鍵／Shift+左鍵＝平移
    const isAltButton = (e.button === 2 || e.button === 1 || e.shiftKey);
    if (camControl.leftMouseAction === "pan") {
      camControl.dragMode = isAltButton ? "rotate" : "pan";
    } else {
      camControl.dragMode = isAltButton ? "pan" : "rotate";
    }
    camControl.lastX = e.clientX;
    camControl.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", e => {
    if (!camControl.isDragging) return;
    const dx = e.clientX - camControl.lastX;
    const dy = e.clientY - camControl.lastY;
    camControl.lastX = e.clientX;
    camControl.lastY = e.clientY;

    if (state.walkMode) {
      // 第一人稱地面漫步：滑鼠拖曳環視四周
      state.walkYaw -= dx * 0.0045;
      state.walkPitch = Math.max(-0.45, Math.min(0.55, state.walkPitch - dy * 0.0035));
      return;
    }

    if (camControl.dragMode === "rotate") {
      camControl.sphericalGoal.theta -= dx * 0.0055;
      camControl.sphericalGoal.phi = Math.max(0.18, Math.min(Math.PI / 2 - 0.05, camControl.sphericalGoal.phi - dy * 0.0045));
    } else {
      // 1:1 螢幕空間地面平移：滑鼠往哪拉，校園地面就往哪移動（適用任何旋轉角度 theta）
      const panSpeed = camControl.spherical.radius * 0.0017;
      const sinT = Math.sin(camControl.spherical.theta);
      const cosT = Math.cos(camControl.spherical.theta);
      // 螢幕右方向量 R = (cosT, 0, -sinT)；螢幕上方向量 U = (-sinT, 0, -cosT)
      camControl.targetGoal.x += (-dx * cosT - dy * sinT) * panSpeed;
      camControl.targetGoal.z += (dx * sinT - dy * cosT) * panSpeed;
    }
  });

  canvas.addEventListener("pointerup", e => {
    camControl.isDragging = false;
    const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (moveDist < 5 && e.button === 0) {
      handleCanvasClick(e);
    }
  });

  canvas.addEventListener("contextmenu", e => e.preventDefault());

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    if (state.walkMode) return;
    camControl.sphericalGoal.radius = Math.max(18, Math.min(700, camControl.sphericalGoal.radius * (1 + Math.sign(e.deltaY) * 0.1)));
  }, { passive: false });

  window.addEventListener("keydown", e => {
    if (document.activeElement && ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    camControl.keys[e.code] = true;
  });
  window.addEventListener("keyup", e => {
    camControl.keys[e.code] = false;
  });

  // Raycaster 點擊 3D 建築物
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);

    const intersects = raycaster.intersectObjects(buildingsGroup.children, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.buildingId) {
        obj = obj.parent;
      }
      if (obj && obj.userData.buildingId) {
        selectBuilding(obj.userData.buildingId, !state.walkMode);
      }
    }
  }

  // ================= 第一人稱「地面實境漫步模式」 =================
  function toggleWalkMode(enable, spawnId = "gate") {
    state.walkMode = enable;
    const walkBtn = document.getElementById("walkModeBtn");
    const walkHud = document.getElementById("walkHudBar");
    walkBtn.classList.toggle("active", enable);
    walkHud.hidden = !enable;

    if (enable) {
      camera.fov = 60;
      camera.near = 0.4;
      camera.far = 650;
      camera.updateProjectionMatrix();
      teleportWalkSpawn(spawnId);
      showToast("🚶 已進入「地面實境漫步模式」！可使用 W/A/S/D、方向鍵或底部按鈕漫步校園");
    } else {
      camera.fov = 45;
      camera.near = 2.0;
      camera.far = 1300;
      camera.updateProjectionMatrix();
      camControl.targetGoal.set(state.walkPos.x, 0, state.walkPos.z);
      camControl.sphericalGoal.radius = 165;
      camControl.sphericalGoal.phi = 0.85;
    }
  }

  function teleportWalkSpawn(spawnId) {
    const sp = (DATA.walkSpawns || []).find(s => s.id === spawnId) || DATA.walkSpawns[0];
    if (!sp) return;
    state.walkPos.set(sp.x, 1.75, sp.z);
    state.walkYaw = sp.yaw;
    state.walkPitch = 0.04;
    document.querySelectorAll(".spawn-chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.spid === sp.id);
    });
  }

  // ================= 綜合高中「特色學程與科館導覽」 =================
  function highlightProgram(progId) {
    state.activeProgramId = progId;
    while (programRingsGroup.children.length) {
      programRingsGroup.remove(programRingsGroup.children[0]);
    }

    const prog = (DATA.programs || []).find(p => p.id === progId);
    if (!prog) return;

    document.querySelectorAll(".prog-card").forEach(card => {
      card.classList.toggle("active", card.dataset.pid === progId);
    });

    let sumX = 0;
    let sumZ = 0;
    let count = 0;

    prog.buildings.forEach(bid => {
      const b = DATA.buildings.find(item => item.id === bid);
      if (!b) return;
      sumX += b.x;
      sumZ += b.z;
      count++;

      const r = Math.max(b.w, b.d) * 0.58;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 2.0, 36),
        new THREE.MeshBasicMaterial({ color: prog.color || "#FFD23F", side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(b.x, 0.35, b.z);
      programRingsGroup.add(ring);
    });

    if (count > 0) {
      const cx = sumX / count;
      const cz = sumZ / count;
      const dist = count === 1 ? 85 : 145;
      flyTo([cx, 6, cz], [cx + dist * 0.38, dist * 0.78, cz + dist * 0.82]);
      if (prog.buildings.length === 1) {
        selectBuilding(prog.buildings[0], false);
      }
      showToast(`${prog.icon} 已標示「${prog.name}」所屬館舍`);
    }
  }

  // ================= 建築物選取與資訊面板 =================
  function selectBuilding(buildingId, moveCamera = true) {
    const b = DATA.buildings.find(item => item.id === buildingId);
    if (!b) return;
    state.selectedBuilding = b;
    state.selectedRoom = null;

    // 關閉學程面板避免重疊
    document.getElementById("programsDrawer").hidden = true;
    document.getElementById("programsToggleBtn").classList.remove("active");

    const r = Math.max(b.w, b.d) * 0.58;
    highlightRing.geometry.dispose();
    highlightRing.geometry = new THREE.RingGeometry(r, r + 1.5, 36);
    highlightRing.position.set(b.x, 0.3, b.z);
    highlightRing.visible = true;

    if (moveCamera && !state.walkMode) {
      const dist = Math.max(45, Math.max(b.w, b.d) * 1.45);
      const topY = b.floors * (b.floorHeight || 3.6) * 0.5;
      flyTo([b.x, topY, b.z], [b.x + dist * 0.5, topY + dist * 0.72, b.z + dist * 0.85]);
    }

    renderBuildingCard(b);
    updateRoomLabelsDOM();
  }

  function focusOnRoom(rm) {
    const b = DATA.buildings.find(item => item.id === rm.buildingId);
    if (!b) return;
    state.selectedBuilding = b;
    state.selectedRoom = rm;

    setFloorFilter(rm.floor);

    highlightRing.geometry.dispose();
    highlightRing.geometry = new THREE.RingGeometry(3.4, 4.5, 32);
    highlightRing.position.set(rm.worldPos.x, 0.32, rm.worldPos.z);
    highlightRing.visible = true;

    if (!state.walkMode) {
      flyTo(
        [rm.worldPos.x, rm.worldPos.y, rm.worldPos.z],
        [rm.worldPos.x + 20, rm.worldPos.y + 25, rm.worldPos.z + 32]
      );
    }

    renderBuildingCard(b, rm);
    updateRoomLabelsDOM();
  }

  // 渲染右側建築與教室詳情抽屜
  function renderBuildingCard(b, highlightRoom = null) {
    const panel = document.getElementById("detailDrawer");
    panel.hidden = false;

    const categoryNames = {
      landmark: "校園地標",
      admin: "行政與教學支援",
      teaching: "普通與綜合教學大樓",
      tech: "專業群科與實習館舍",
      sport: "運動與集會場館",
      facility: "校園生活與服務設施"
    };

    const isEW = b.w >= b.d;
    const dirNote = isEW
      ? `🧭 空間排列順序：由 <b>西側（敬業／利用樓側，大門進來右方）</b> ➔ <b>東側（行政／厚生樓側，大門進來左方）</b>`
      : `🧭 空間排列順序：由 <b>北端（靠近校門／樂耕樓側）</b> ➔ <b>南端（靠近正德樓／永二街側）</b>`;

    let floorsHtml = "";
    for (let f = b.floors; f >= 1; f--) {
      const rooms = (b.floorsData && b.floorsData[f]) || [];
      floorsHtml += `
        <div class="floor-row ${state.activeFloor === f ? "active-fl" : ""}">
          <button type="button" class="fl-badge" data-fl="${f}" title="切換至 ${f}F 剖面視角">${f}F</button>
          <div class="fl-rooms">
            ${rooms.map(r => {
              const isSel = highlightRoom && highlightRoom.code === r.code && highlightRoom.floor === f;
              return `<button type="button" class="rm-chip rtype-${r.type} ${isSel ? "sel" : ""}" data-fl="${f}" data-code="${r.code}">${r.name}</button>`;
            }).join("")}
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="drawer-head">
        <div>
          <span class="cat-pill cat-${b.category}">${categoryNames[b.category] || "校園建築"} ・ ${b.floors} 層樓</span>
          <h2>${b.name}</h2>
          <small class="en-sub">${b.englishName || ""}</small>
        </div>
        <button type="button" class="close-btn" id="closeDrawerBtn" aria-label="關閉">✕</button>
      </div>

      <p class="b-summary">${b.summary}</p>

      <div class="feature-tags">
        ${(b.features || []).map(ft => `<span class="ft-tag">✦ ${ft}</span>`).join("")}
      </div>

      <div class="drawer-actions">
        <button type="button" class="act-btn pri" id="navToHereBtn">🧭 導航帶路到此棟</button>
        <button type="button" class="act-btn" id="setStartHereBtn">🚩 設為導航起點</button>
      </div>

      <div class="floors-section">
        <div class="sec-title">
          <span>🏢 各樓層空間與教室配置（點擊切換剖面）</span>
          <button type="button" class="reset-fl-btn" id="resetFloorInCard">顯示全樓層</button>
        </div>
        <div class="dir-hint">${dirNote}</div>
        <div class="floors-grid">
          ${floorsHtml}
        </div>
      </div>
    `;

    document.getElementById("closeDrawerBtn").addEventListener("click", () => {
      panel.hidden = true;
      state.selectedBuilding = null;
      highlightRing.visible = false;
      updateRoomLabelsDOM();
    });

    document.getElementById("navToHereBtn").addEventListener("click", () => {
      startNavigation(state.navStartId || "main_gate", b.id);
    });

    document.getElementById("setStartHereBtn").addEventListener("click", () => {
      state.navStartId = b.id;
      const startSel = document.getElementById("navStartSelect");
      if (startSel) startSel.value = b.id;
      showToast(`已將「${b.name}」設為導航起點`);
    });

    document.getElementById("resetFloorInCard").addEventListener("click", () => {
      setFloorFilter(0);
    });

    panel.querySelectorAll(".fl-badge").forEach(btn => {
      btn.addEventListener("click", () => {
        const fl = parseInt(btn.dataset.fl, 10);
        setFloorFilter(state.activeFloor === fl ? 0 : fl);
        renderBuildingCard(b, highlightRoom);
      });
    });

    panel.querySelectorAll(".rm-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const fl = parseInt(chip.dataset.fl, 10);
        const code = chip.dataset.code;
        const targetRm = roomEntries.find(r => r.buildingId === b.id && r.floor === fl && r.code === code);
        if (targetRm) focusOnRoom(targetRm);
      });
    });
  }

  // ================= 樓層剖面檢視器 (1F / 2F / 3F / 4F) =================
  function setFloorFilter(floorNum) {
    state.activeFloor = floorNum;
    document.querySelectorAll("#floorSwitcher button").forEach(btn => {
      btn.classList.toggle("active", parseInt(btn.dataset.floor, 10) === floorNum);
    });

    buildingMeshes.forEach(meshGroup => {
      const fGroups = meshGroup.userData.floorGroups || {};
      Object.keys(fGroups).forEach(fKey => {
        const f = parseInt(fKey, 10);
        const fg = fGroups[f];
        if (!fg || fg === meshGroup) return;
        fg.visible = (floorNum === 0) || (f <= floorNum);
      });
    });

    updateRoomLabelsDOM();
  }

  // ================= 三種原創視覺風格切換 =================
  function applyVisualTheme(themeName) {
    state.theme = themeName;
    document.querySelectorAll("#themeSwitcher button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === themeName);
    });

    if (themeName === "day") {
      scene.background.set("#CFE5F5");
      scene.fog.color.set("#CFE5F5");
      hemiLight.color.set("#FFFFFF");
      hemiLight.groundColor.set("#6E8562");
      hemiLight.intensity = 0.75;
      sunLight.color.set("#FFF8E7");
      sunLight.intensity = 1.05;
      sunLight.position.set(120, 185, 110);
    } else if (themeName === "blueprint") {
      scene.background.set("#0E2338");
      scene.fog.color.set("#0E2338");
      hemiLight.color.set("#6BB8FF");
      hemiLight.groundColor.set("#1B3B5C");
      hemiLight.intensity = 0.95;
      sunLight.color.set("#A8DAFF");
      sunLight.intensity = 0.85;
      sunLight.position.set(70, 190, 70);
    } else if (themeName === "sunset") {
      scene.background.set("#281E32");
      scene.fog.color.set("#382438");
      hemiLight.color.set("#FF9A62");
      hemiLight.groundColor.set("#242038");
      hemiLight.intensity = 0.65;
      sunLight.color.set("#FF7B3D");
      sunLight.intensity = 1.15;
      sunLight.position.set(-160, 65, 110);
    }
  }

  // ================= A* 校園步道導航引擎 =================
  function findShortestPath(startNodeId, endNodeId) {
    const nodes = DATA.navNodes;
    const adj = {};
    Object.keys(nodes).forEach(k => { adj[k] = []; });
    DATA.navEdges.forEach(([a, b]) => {
      if (nodes[a] && nodes[b]) {
        const dist = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
        adj[a].push({ id: b, cost: dist });
        adj[b].push({ id: a, cost: dist });
      }
    });

    const distMap = {};
    const prevMap = {};
    const visited = new Set();
    Object.keys(nodes).forEach(k => { distMap[k] = Infinity; });
    distMap[startNodeId] = 0;

    while (true) {
      let u = null;
      let best = Infinity;
      Object.keys(nodes).forEach(k => {
        if (!visited.has(k) && distMap[k] < best) {
          best = distMap[k];
          u = k;
        }
      });
      if (!u || u === endNodeId) break;
      visited.add(u);

      adj[u].forEach(edge => {
        const alt = distMap[u] + edge.cost;
        if (alt < distMap[edge.id]) {
          distMap[edge.id] = alt;
          prevMap[edge.id] = u;
        }
      });
    }

    const path = [];
    let curr = endNodeId;
    while (curr) {
      path.unshift(curr);
      curr = prevMap[curr];
    }
    return { path, distance: Math.round(distMap[endNodeId] || 0) };
  }

  function startNavigation(fromBuildingId, toBuildingId, roomLabel = "") {
    state.navStartId = fromBuildingId;
    state.navEndId = toBuildingId;

    const startNode = DATA.buildingNavNode[fromBuildingId] || "n_gate";
    const endNode = DATA.buildingNavNode[toBuildingId] || "n_quad_c";
    const fromBld = DATA.buildings.find(b => b.id === fromBuildingId);
    const toBld = DATA.buildings.find(b => b.id === toBuildingId);

    const res = findShortestPath(startNode, endNode);

    while (routeGroup.children.length) {
      routeGroup.remove(routeGroup.children[0]);
    }

    const pts = [];
    if (fromBld) pts.push(new THREE.Vector3(fromBld.x, 0.7, fromBld.z));
    res.path.forEach(nid => {
      const n = DATA.navNodes[nid];
      if (n) pts.push(new THREE.Vector3(n.x, 0.7, n.z));
    });
    if (toBld) pts.push(new THREE.Vector3(toBld.x, 0.7, toBld.z));

    if (pts.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(pts);
      state.navCurve = curve;
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.65, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: "#FFD23F" });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      routeGroup.add(tubeMesh);

      const startPin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.6, 20), new THREE.MeshBasicMaterial({ color: "#4CC3D9" }));
      startPin.position.copy(pts[0]);
      const endPin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.7, 20), new THREE.MeshBasicMaterial({ color: "#FF595E" }));
      endPin.position.copy(pts[pts.length - 1]);
      routeGroup.add(startPin, endPin);
    }

    const totalMeters = Math.max(25, res.distance + 18);
    const walkMins = Math.max(1, Math.round(totalMeters / 68));

    const navBar = document.getElementById("navStatusBar");
    navBar.hidden = false;
    document.getElementById("navRouteTitle").textContent = `${fromBld ? fromBld.name.replace(/（.*）/, "") : "起點"} ➔ ${toBld ? toBld.name.replace(/（.*）/, "") : "終點"}${roomLabel ? " (" + roomLabel + ")" : ""}`;
    document.getElementById("navRouteMeta").textContent = `預估步行距離約 ${totalMeters} 公尺 ・ 步行時間約 ${walkMins} 分鐘`;

    if (fromBld && toBld && !state.walkMode) {
      const midX = (fromBld.x + toBld.x) / 2;
      const midZ = (fromBld.z + toBld.z) / 2;
      const span = Math.max(85, Math.hypot(fromBld.x - toBld.x, fromBld.z - toBld.z) * 1.15);
      flyTo([midX, 2, midZ], [midX + span * 0.35, span * 0.85, midZ + span * 0.78]);
    }
  }

  function startSimulatedWalk() {
    if (!state.navCurve) return;
    if (state.walkMode) toggleWalkMode(false);
    state.navWalking = true;
    state.navProgress = 0;
    walkerMesh.visible = true;
  }

  // ================= 搜尋引擎 =================
  function performSearch(query) {
    const q = (query || "").trim().toLowerCase();
    const listEl = document.getElementById("searchResults");
    if (!q) {
      listEl.hidden = true;
      return;
    }

    const matches = [];
    DATA.buildings.forEach(b => {
      if (b.name.toLowerCase().includes(q) || (b.englishName && b.englishName.toLowerCase().includes(q)) || b.summary.toLowerCase().includes(q)) {
        matches.push({
          kind: "building",
          title: b.name,
          sub: `${b.floors}F ・ ${b.summary.slice(0, 32)}...`,
          buildingId: b.id
        });
      }
    });

    roomEntries.forEach(rm => {
      if (rm.name.toLowerCase().includes(q) || rm.code.toLowerCase().includes(q)) {
        matches.push({
          kind: "room",
          title: `${rm.name}`,
          sub: `位於：${rm.buildingName} — ${rm.floor} 樓`,
          rm
        });
      }
    });

    listEl.innerHTML = matches.slice(0, 12).map((m, idx) => `
      <li data-idx="${idx}">
        <span class="s-badge ${m.kind}">${m.kind === "building" ? "🏛️ 建築" : "🚪 空間"}</span>
        <div class="s-info">
          <b>${m.title}</b>
          <small>${m.sub}</small>
        </div>
        <span class="s-go">前往 ➔</span>
      </li>
    `).join("") || `<li class="s-empty">找不到符合「${query}」的教室或建築</li>`;

    listEl.hidden = false;

    listEl.querySelectorAll("li[data-idx]").forEach(li => {
      li.addEventListener("click", () => {
        const item = matches[parseInt(li.dataset.idx, 10)];
        listEl.hidden = true;
        if (item.kind === "building") {
          selectBuilding(item.buildingId, true);
        } else if (item.kind === "room") {
          focusOnRoom(item.rm);
          startNavigation(state.navStartId || "main_gate", item.rm.buildingId, `${item.rm.floor}F ${item.rm.name}`);
        }
      });
    });
  }

  // ================= 3D 動態羅盤指北針與左下角小地圖繪製 =================
  const compassDialEl = document.getElementById("compassDial");
  const compassHeadingEl = document.getElementById("compassHeadingTxt");
  const miniCanvas = document.getElementById("minimapCanvas");
  const miniCtx = miniCanvas.getContext("2d");

  function updateCompassAndMinimap() {
    // 計算相機目前的水平視線角 (0 = 朝北 -Z, 90° = 朝東 +X, 180° = 朝南 +Z, -90° = 朝西 -X)
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const headingRad = Math.atan2(camDir.x, -camDir.z); // 0 when looking toward -Z (North)
    const headingDeg = THREE.MathUtils.radToDeg(headingRad);

    // 旋轉右上角羅盤錶盤：當鏡頭轉向東方(+90°)時，北方(N)指針在螢幕上應指向左方(-90°)
    if (compassDialEl) {
      compassDialEl.style.transform = `rotate(${-headingDeg.toFixed(1)}deg)`;
    }

    if (compassHeadingEl) {
      const normDeg = (headingDeg + 360) % 360;
      let dirTxt = "⬆️ 面向：北方 N（校門側）";
      if (normDeg >= 45 && normDeg < 135) dirTxt = "➡️ 面向：東方 E（永平街側）";
      else if (normDeg >= 135 && normDeg < 225) dirTxt = "⬇️ 面向：南方 S（永二街側）";
      else if (normDeg >= 225 && normDeg < 315) dirTxt = "⬅️ 面向：西方 W（永興路側）";
      compassHeadingEl.textContent = dirTxt;
    }

    // 繪製左下角 2D 小地圖 (上方固定為北方 -Z)
    const w = miniCanvas.width;
    const h = miniCanvas.height;
    miniCtx.clearRect(0, 0, w, h);

    const mapX = x => ((x + 210) / 420) * w;
    const mapZ = z => ((z + 305) / 540) * h;

    miniCtx.fillStyle = "#16222B";
    miniCtx.fillRect(0, 0, w, h);

    if (DATA.campusBoundary && DATA.campusBoundary.length) {
      miniCtx.fillStyle = "#2A4730";
      miniCtx.beginPath();
      DATA.campusBoundary.forEach(([bx, bz], i) => {
        if (i === 0) miniCtx.moveTo(mapX(bx), mapZ(bz));
        else miniCtx.lineTo(mapX(bx), mapZ(bz));
      });
      miniCtx.closePath();
      miniCtx.fill();
    }

    miniCtx.strokeStyle = "#62727E";
    miniCtx.lineWidth = 2.2;
    (DATA.externalRoads || []).forEach(rd => {
      miniCtx.beginPath();
      rd.points.forEach(([rx, rz], i) => {
        if (i === 0) miniCtx.moveTo(mapX(rx), mapZ(rz));
        else miniCtx.lineTo(mapX(rx), mapZ(rz));
      });
      miniCtx.stroke();
    });

    miniCtx.strokeStyle = "#181C20";
    miniCtx.lineWidth = 1.6;
    (DATA.internalRoads || []).forEach(r => {
      miniCtx.beginPath();
      r.points.forEach(([rx, rz], i) => {
        if (i === 0) miniCtx.moveTo(mapX(rx), mapZ(rz));
        else miniCtx.lineTo(mapX(rx), mapZ(rz));
      });
      miniCtx.stroke();
    });

    DATA.buildings.forEach(b => {
      const bx = mapX(b.x - b.w / 2);
      const bz = mapZ(b.z - b.d / 2);
      const bw = Math.max(3, (b.w / 420) * w);
      const bd = Math.max(3, (b.d / 540) * h);

      if (state.selectedBuilding && state.selectedBuilding.id === b.id) {
        miniCtx.fillStyle = "#FFD23F";
      } else if (b.category === "sport") {
        miniCtx.fillStyle = "#58C98B";
      } else {
        miniCtx.fillStyle = "#DCE4EC";
      }
      miniCtx.fillRect(bx, bz, bw, bd);
    });

    // 繪製目前觀測位置與視線扇形
    const focusPt = state.walkMode ? state.walkPos : camControl.target;
    const tx = mapX(focusPt.x);
    const tz = mapZ(focusPt.z);

    // 視線方向扇形
    miniCtx.fillStyle = "rgba(255, 210, 63, 0.28)";
    miniCtx.beginPath();
    miniCtx.moveTo(tx, tz);
    const canvasAngle = Math.atan2(camDir.z, camDir.x);
    miniCtx.arc(tx, tz, 18, canvasAngle - 0.45, canvasAngle + 0.45);
    miniCtx.closePath();
    miniCtx.fill();

    miniCtx.strokeStyle = "#FF595E";
    miniCtx.lineWidth = 2;
    miniCtx.beginPath();
    miniCtx.arc(tx, tz, 4.2, 0, Math.PI * 2);
    miniCtx.stroke();

    // 小地圖四邊 N / S / E / W 標記
    miniCtx.font = "bold 10px sans-serif";
    miniCtx.textAlign = "center";
    miniCtx.fillStyle = "#FF595E";
    miniCtx.fillText("▲北N", w / 2, 11);
    miniCtx.fillStyle = "#9EB1C4";
    miniCtx.fillText("南S", w / 2, h - 4);
    miniCtx.fillText("西W", 12, h / 2 + 3);
    miniCtx.fillText("東E", w - 12, h / 2 + 3);
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("campusToast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  // ================= 初始化 UI 與事件綁定 =================
  function initUI() {
    // 1. 分區快速跳轉按鈕
    const zoneBar = document.getElementById("zoneBar");
    zoneBar.innerHTML = DATA.zones.map((z, idx) => `
      <button type="button" class="zone-btn ${idx === 0 ? "active" : ""}" data-zid="${z.id}">
        <span>${z.icon}</span> ${z.name}
      </button>
    `).join("");

    zoneBar.querySelectorAll(".zone-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        zoneBar.querySelectorAll(".zone-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const z = DATA.zones.find(item => item.id === btn.dataset.zid);
        if (z) {
          if (z.id === "all") {
            resetToBestOverview();
          } else {
            flyTo(z.target, z.camPos);
          }
        }
      });
    });

    // 2. 右上角指北針按鈕與「🏠 最佳全覽視角」按鈕
    document.getElementById("compassResetBtn").addEventListener("click", () => {
      if (state.walkMode) {
        state.walkYaw = 0; // 面向北方 (-Z)
        state.walkPitch = 0.04;
      } else {
        camControl.sphericalGoal.theta = 0; // 從南方往北方 (-Z) 看，使螢幕上方為正北方
      }
      showToast("🧭 已對齊正北方朝上視角（北＝中山南路校門口側）");
    });

    document.getElementById("resetBestViewBtn").addEventListener("click", () => {
      resetToBestOverview();
    });
    document.getElementById("panCenterHomeBtn").addEventListener("click", () => {
      resetToBestOverview();
    });

    // 2b. 滑鼠左鍵模式切換：「✋ 左鍵平移」 vs 「🔄 左鍵旋轉」
    const leftPanBtn = document.getElementById("leftDragPanBtn");
    const leftRotBtn = document.getElementById("leftDragRotBtn");
    leftPanBtn.addEventListener("click", () => {
      camControl.leftMouseAction = "pan";
      leftPanBtn.classList.add("active");
      leftRotBtn.classList.remove("active");
      showToast("✋ 已切換為「左鍵平移模式」：按住滑鼠左鍵拖曳即可前後左右平移畫面（右鍵拖曳可旋轉）");
    });
    leftRotBtn.addEventListener("click", () => {
      camControl.leftMouseAction = "rotate";
      leftRotBtn.classList.add("active");
      leftPanBtn.classList.remove("active");
      showToast("🔄 已切換為「左鍵旋轉模式」：按住滑鼠左鍵拖曳可 360° 旋轉視角（右鍵拖曳可平移）");
    });

    // 2c. 右上角十字方向平移與縮放按鈕 (支援點擊與按住連續平滑移動)
    document.querySelectorAll(".pan-dpad-grid .pan-btn[data-pan]").forEach(btn => {
      const act = btn.dataset.pan;
      const startHold = e => {
        e.preventDefault();
        camControl.panHold[act] = true;
      };
      const endHold = () => {
        camControl.panHold[act] = false;
      };
      btn.addEventListener("pointerdown", startHold);
      btn.addEventListener("pointerup", endHold);
      btn.addEventListener("pointerleave", endHold);
      btn.addEventListener("pointercancel", endHold);
    });

    // 3. 第一人稱「地面實境漫步」按鈕與面板
    document.getElementById("walkModeBtn").addEventListener("click", () => {
      toggleWalkMode(!state.walkMode, "gate");
    });
    document.getElementById("exitWalkBtn").addEventListener("click", () => {
      toggleWalkMode(false);
    });

    const spawnContainer = document.getElementById("walkSpawnBtns");
    spawnContainer.innerHTML = (DATA.walkSpawns || []).map((sp, i) => `
      <button type="button" class="spawn-chip ${i === 0 ? "active" : ""}" data-spid="${sp.id}">${sp.name}</button>
    `).join("");
    spawnContainer.querySelectorAll(".spawn-chip").forEach(btn => {
      btn.addEventListener("click", () => teleportWalkSpawn(btn.dataset.spid));
    });

    document.querySelectorAll(".walk-dpad .w-btn").forEach(btn => {
      const act = btn.dataset.wact;
      const startHold = e => {
        e.preventDefault();
        state.walkHoldActions[act] = true;
      };
      const endHold = () => {
        state.walkHoldActions[act] = false;
      };
      btn.addEventListener("pointerdown", startHold);
      btn.addEventListener("pointerup", endHold);
      btn.addEventListener("pointerleave", endHold);
      btn.addEventListener("pointercancel", endHold);
    });

    // 4. 綜合高中「特色學程導覽」面板初始化
    const progDrawer = document.getElementById("programsDrawer");
    const progBtn = document.getElementById("programsToggleBtn");
    const progList = document.getElementById("programsList");

    progList.innerHTML = (DATA.programs || []).map(p => {
      const bNames = p.buildings
        .map(bid => {
          const b = DATA.buildings.find(x => x.id === bid);
          return b ? b.name.replace(/（.*）/, "") : "";
        })
        .filter(Boolean)
        .join("、");
      return `
        <div class="prog-card" data-pid="${p.id}" style="border-left-color:${p.color}">
          <div class="prog-head">
            <b>${p.icon} ${p.name}</b>
            <span>🏛️ ${bNames}</span>
          </div>
          <p class="prog-desc">${p.summary}</p>
          <div class="prog-labs">
            ${(p.labs || []).map(lb => `<span class="prog-lab-tag">✦ ${lb}</span>`).join("")}
          </div>
        </div>
      `;
    }).join("");

    progList.querySelectorAll(".prog-card").forEach(card => {
      card.addEventListener("click", () => {
        highlightProgram(card.dataset.pid);
      });
    });

    progBtn.addEventListener("click", () => {
      const willOpen = progDrawer.hidden;
      progDrawer.hidden = !willOpen;
      progBtn.classList.toggle("active", willOpen);
      if (willOpen) {
        document.getElementById("detailDrawer").hidden = true;
      } else {
        while (programRingsGroup.children.length) {
          programRingsGroup.remove(programRingsGroup.children[0]);
        }
      }
    });

    document.getElementById("closeProgramsBtn").addEventListener("click", () => {
      progDrawer.hidden = true;
      progBtn.classList.remove("active");
      while (programRingsGroup.children.length) {
        programRingsGroup.remove(programRingsGroup.children[0]);
      }
    });

    // 5. 搜尋框與快速熱門標籤
    const searchInput = document.getElementById("campusSearchInput");
    searchInput.addEventListener("input", e => performSearch(e.target.value));
    searchInput.addEventListener("focus", e => {
      if (e.target.value.trim()) performSearch(e.target.value);
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".search-box")) {
        document.getElementById("searchResults").hidden = true;
      }
    });

    document.querySelectorAll(".quick-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const q = chip.dataset.q;
        searchInput.value = q;
        performSearch(q);
      });
    });

    // 6. 樓層切換器
    document.querySelectorAll("#floorSwitcher button").forEach(btn => {
      btn.addEventListener("click", () => {
        const fl = parseInt(btn.dataset.floor, 10);
        setFloorFilter(fl);
      });
    });

    // 7. 視覺風格切換器
    document.querySelectorAll("#themeSwitcher button").forEach(btn => {
      btn.addEventListener("click", () => {
        applyVisualTheme(btn.dataset.theme);
      });
    });

    // 8. 導航起終點選單初始化
    const startSel = document.getElementById("navStartSelect");
    const endSel = document.getElementById("navEndSelect");
    const optsHtml = DATA.buildings.map(b => `<option value="${b.id}">${b.name}</option>`).join("");
    startSel.innerHTML = optsHtml;
    endSel.innerHTML = `<option value="">-- 選擇目的地建築 --</option>` + optsHtml;
    startSel.value = "main_gate";

    document.getElementById("runNavBtn").addEventListener("click", () => {
      if (!endSel.value) {
        showToast("請先選擇目的地建築！");
        return;
      }
      startNavigation(startSel.value, endSel.value);
    });

    document.getElementById("simWalkBtn").addEventListener("click", () => {
      startSimulatedWalk();
    });

    document.getElementById("clearNavBtn").addEventListener("click", () => {
      while (routeGroup.children.length) routeGroup.remove(routeGroup.children[0]);
      walkerMesh.visible = false;
      state.navWalking = false;
      document.getElementById("navStatusBar").hidden = true;
    });

    // 9. 版權視窗關閉
    const copyModal = document.getElementById("copyrightModal");
    document.getElementById("openCopyModalBtn").addEventListener("click", () => {
      copyModal.hidden = false;
    });
    document.getElementById("closeCopyModalBtn").addEventListener("click", () => {
      copyModal.hidden = true;
    });
    document.getElementById("okCopyModalBtn").addEventListener("click", () => {
      copyModal.hidden = true;
    });
    copyModal.addEventListener("click", e => {
      if (e.target.id === "copyrightModal") copyModal.hidden = true;
    });

    // 10. 視窗縮放處理
    window.addEventListener("resize", onWindowResize);
    onWindowResize();
  }

  function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ================= 投影 3D 標籤至螢幕座標 =================
  const tempV = new THREE.Vector3();
  function updateFloatingLabels() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 1. 周邊道路路名牌
    roadLabels.forEach(item => {
      tempV.copy(item.pos);
      tempV.project(camera);
      if (tempV.z > 1 || tempV.z < -1) {
        item.el.style.display = "none";
        return;
      }
      const x = (tempV.x * 0.5 + 0.5) * w;
      const y = (-tempV.y * 0.5 + 0.5) * h;
      item.el.style.display = "inline-flex";
      item.el.style.transform = `translate(-50%, -50%) translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });

    // 2. 東西南北方位大標籤
    cardinalLabels.forEach(item => {
      tempV.copy(item.pos);
      tempV.project(camera);
      if (tempV.z > 1 || tempV.z < -1) {
        item.el.style.display = "none";
        return;
      }
      const x = (tempV.x * 0.5 + 0.5) * w;
      const y = (-tempV.y * 0.5 + 0.5) * h;
      item.el.style.display = "inline-flex";
      item.el.style.transform = `translate(-50%, -50%) translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });

    // 3. 建築物標籤
    buildingLabels.forEach(item => {
      tempV.copy(item.pos);
      tempV.project(camera);
      if (tempV.z > 1 || tempV.z < -1) {
        item.el.style.display = "none";
        return;
      }
      const x = (tempV.x * 0.5 + 0.5) * w;
      const y = (-tempV.y * 0.5 + 0.5) * h;
      item.el.style.display = "inline-flex";
      item.el.style.transform = `translate(-50%, -50%) translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      item.el.classList.toggle("selected", !!(state.selectedBuilding && state.selectedBuilding.id === item.data.id));
    });

    // 4. 教室標籤
    roomLabelPool.forEach(item => {
      tempV.copy(item.pos);
      tempV.project(camera);
      if (tempV.z > 1 || tempV.z < -1) {
        item.el.style.display = "none";
        return;
      }
      const x = (tempV.x * 0.5 + 0.5) * w;
      const y = (-tempV.y * 0.5 + 0.5) * h;
      item.el.style.display = "inline-flex";
      item.el.style.transform = `translate(-50%, -50%) translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });
  }

  // ================= 主動畫迴圈 =================
  function animate() {
    requestAnimationFrame(animate);

    if (state.walkMode) {
      // 第一人稱地面實境漫步控制
      const walkSpeed = 0.72;
      const turnSpeed = 0.026;
      let isMoving = false;

      if (camControl.keys["KeyA"] || camControl.keys["ArrowLeft"] || state.walkHoldActions.turnLeft) {
        state.walkYaw += turnSpeed;
      }
      if (camControl.keys["KeyD"] || camControl.keys["ArrowRight"] || state.walkHoldActions.turnRight) {
        state.walkYaw -= turnSpeed;
      }

      const lookDirX = -Math.sin(state.walkYaw);
      const lookDirZ = -Math.cos(state.walkYaw);

      if (camControl.keys["KeyW"] || camControl.keys["ArrowUp"] || state.walkHoldActions.forward) {
        state.walkPos.x += lookDirX * walkSpeed;
        state.walkPos.z += lookDirZ * walkSpeed;
        isMoving = true;
      }
      if (camControl.keys["KeyS"] || camControl.keys["ArrowDown"] || state.walkHoldActions.backward) {
        state.walkPos.x -= lookDirX * walkSpeed;
        state.walkPos.z -= lookDirZ * walkSpeed;
        isMoving = true;
      }

      if (isMoving) {
        state.walkBobPhase += 0.18;
      }
      const bobY = isMoving ? Math.sin(state.walkBobPhase) * 0.06 : 0;

      camera.position.set(state.walkPos.x, 1.75 + bobY, state.walkPos.z);
      const lookTarget = new THREE.Vector3(
        state.walkPos.x + lookDirX * 20,
        1.75 + bobY + Math.sin(state.walkPitch) * 20,
        state.walkPos.z + lookDirZ * 20
      );
      camera.lookAt(lookTarget);
    } else {
      // 鳥瞰軌道模式：支援鍵盤 WASD／方向鍵 與 右上角十字平移按鈕 (panHold) 前後左右平移與縮放
      const moveSpeed = Math.max(1.1, camControl.spherical.radius * 0.0055);
      const forward = new THREE.Vector3(Math.sin(camControl.spherical.theta), 0, Math.cos(camControl.spherical.theta));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      if (camControl.keys["KeyW"] || camControl.keys["ArrowUp"] || camControl.panHold.up) {
        camControl.targetGoal.addScaledVector(forward, -moveSpeed);
      }
      if (camControl.keys["KeyS"] || camControl.keys["ArrowDown"] || camControl.panHold.down) {
        camControl.targetGoal.addScaledVector(forward, moveSpeed);
      }
      if (camControl.keys["KeyA"] || camControl.keys["ArrowLeft"] || camControl.panHold.left) {
        camControl.targetGoal.addScaledVector(right, -moveSpeed);
      }
      if (camControl.keys["KeyD"] || camControl.keys["ArrowRight"] || camControl.panHold.right) {
        camControl.targetGoal.addScaledVector(right, moveSpeed);
      }
      if (camControl.panHold.zoomIn) {
        camControl.sphericalGoal.radius = Math.max(18, camControl.sphericalGoal.radius * 0.975);
      }
      if (camControl.panHold.zoomOut) {
        camControl.sphericalGoal.radius = Math.min(700, camControl.sphericalGoal.radius * 1.025);
      }

      if (state.navWalking && state.navCurve) {
        state.navProgress += 0.0028;
        if (state.navProgress >= 1) {
          state.navProgress = 1;
          state.navWalking = false;
          showToast("🎉 已抵達目的地！");
        }
        const pt = state.navCurve.getPointAt(state.navProgress);
        walkerMesh.position.copy(pt);
        camControl.targetGoal.set(pt.x, 2.5, pt.z);
        camControl.sphericalGoal.radius = 46;
      }

      camControl.target.lerp(camControl.targetGoal, 0.1);
      camControl.spherical.radius += (camControl.sphericalGoal.radius - camControl.spherical.radius) * 0.1;
      camControl.spherical.phi += (camControl.sphericalGoal.phi - camControl.spherical.phi) * 0.1;
      camControl.spherical.theta += (camControl.sphericalGoal.theta - camControl.spherical.theta) * 0.1;

      const r = camControl.spherical.radius;
      const sinPhi = Math.sin(camControl.spherical.phi);
      camera.position.set(
        camControl.target.x + r * sinPhi * Math.sin(camControl.spherical.theta),
        camControl.target.y + r * Math.cos(camControl.spherical.phi),
        camControl.target.z + r * sinPhi * Math.cos(camControl.spherical.theta)
      );
      camera.lookAt(camControl.target);
    }

    renderer.render(scene, camera);
    updateFloatingLabels();
    updateCompassAndMinimap();
  }

  initUI();
  animate();
})();
