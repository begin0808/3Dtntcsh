// 國立臺南大學附屬高級中學 (TNTCSH) 3D 互動校園主程式
// 包含：3D 視角控制、第一人稱地面實境漫步、動態 3D 羅盤指北針與方位標示、特色學程導覽、樓層剖面檢視、A* 路線導航与實景照片對照

(function () {
  const DATA = window.CAMPUS_DATA;
  const BUILDER = window.CampusBuilder3D;

  // 狀態管理
  const state = {
    theme: "day",          // 'day' | 'pixel' | 'brick'
    activeFloor: 0,        // 0 = 全樓層, 1..4 = 指定樓層剖面
    selectedBuilding: null,
    selectedRoom: null,
    activeProgramId: null,
    navStartId: "main_gate",
    navEndId: null,
    navWalking: false,
    navPaused: false,
    navProgress: 0,
    navCurve: null,
    navDistance: 300,
    navSpeedMultiplier: 1.0,
    navCamHeightLevel: 0,
    walkMode: false,       // 地面漫步模式
    walkChar: "boy",       // 'boy' | 'girl'
    walkView: "third_person", // 'third_person' | 'first_person'
    walkPace: "run",       // 'run' | 'walk'
    walkJoy: { x: 0, y: 0 }, // 觸控搖桿輸入，x = 轉向、y = 前後 (-1..1)
    walkPos: new THREE.Vector3(2.0, 0, -200),
    walkYaw: Math.PI,      // 0 = 朝北(-Z), Math.PI = 朝南(+Z), -Math.PI/2 = 朝東(+X), Math.PI/2 = 朝西(-X)
    walkPitch: 0.04,
    walkBobPhase: 0,
    walkLimbPhase: 0,
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
          const rx = rm.relX !== undefined ? rm.relX : (isEW ? (-b.w / 2 + 0.6 + span * (idx + 0.5)) : 0);
          const rz = rm.relZ !== undefined ? rm.relZ : (isEW ? 0 : (-b.d / 2 + 0.6 + span * (idx + 0.5)));
          const fh = b.floorHeight || 5.4;
          const wy = (fl - 1) * fh + fh * 0.62;
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
    const showFlBadge = b.style !== "sport_court" && b.category !== "sport" && (b.badgeText || b.floors > 0);
    const flBadgeHtml = showFlBadge ? `<small class="b-fl">${b.badgeText || (b.floors + "F")}</small>` : "";
    el.innerHTML = `<span class="b-dot"></span><span class="b-txt">${b.name.replace(/（.*）/, "")}</span>${flBadgeHtml}`;
    el.addEventListener("click", e => {
      e.stopPropagation();
      selectBuilding(b.id, !state.walkMode);
    });
    labelsContainer.appendChild(el);
    buildingLabels.set(b.id, {
      el,
      pos: new THREE.Vector3(b.x, b.floors * (b.floorHeight || 5.4) + 4.2, b.z),
      data: b
    });
  });

  // 房間標籤與每棟大樓各樓層指標標籤容器 (大樓每層僅標一個 1F/2F/3F，個別教室不再重複 [3F] 前綴)
  const roomLabelPool = [];
  const floorMarkerPool = [];

  function updateRoomLabelsDOM() {
    roomLabelPool.forEach(item => item.el.remove());
    roomLabelPool.length = 0;
    floorMarkerPool.forEach(item => item.el.remove());
    floorMarkerPool.length = 0;

    if (state.activeFloor === 0 && !state.selectedBuilding) return;

    // 1. 若有點選特定建築，在該棟大樓各層樓旁呈現單一獨立的「1F、2F、3F」樓層指標
    const b = state.selectedBuilding;
    if (b && b.floorsData) {
      const isEW = b.w >= b.d;
      const fh = b.floorHeight || 5.4;

      Object.keys(b.floorsData).forEach(flStr => {
        const fl = parseInt(flStr, 10);
        if (state.activeFloor !== 0 && state.activeFloor !== fl) return;

        const flEl = document.createElement("button");
        flEl.type = "button";
        flEl.className = "fl-marker-label" + (state.activeFloor === fl ? " active" : "");
        flEl.innerHTML = `<span>🏢 ${fl}F</span>`;
        flEl.title = `點擊切換至 ${b.name} ${fl}F 剖面`;
        flEl.addEventListener("click", e => {
          e.stopPropagation();
          setFloorFilter(state.activeFloor === fl ? 0 : fl);
        });
        labelsContainer.appendChild(flEl);

        // 樓層標記定位在該層樓外端（東西向置於西側外端、南北向置於北側外端）
        const fx = isEW ? (b.x - b.w / 2 - 3.2) : b.x;
        const fz = isEW ? (b.z + b.d * 0.12) : (b.z - b.d / 2 - 3.2);
        const fy = (fl - 1) * fh + fh * 0.62;
        floorMarkerPool.push({ el: flEl, pos: new THREE.Vector3(fx, fy, fz), floor: fl });
      });
    }

    // 2. 呈現各教室標籤（移除原本每間教室前面重複的 [3F] 樓層前綴，讓 105、106、203、303 等教室號碼更清晰一目了然）
    roomEntries.forEach(rm => {
      const matchFloor = state.activeFloor === 0 || rm.floor === state.activeFloor;
      const matchBld = !state.selectedBuilding || rm.buildingId === state.selectedBuilding.id;
      if (!matchFloor || !matchBld) return;
      if (state.activeFloor === 0 && state.selectedBuilding && rm.buildingId !== state.selectedBuilding.id) return;

      const el = document.createElement("div");
      el.className = `r-label rtype-${rm.type}` + (state.selectedRoom && state.selectedRoom.code === rm.code && state.selectedRoom.buildingId === rm.buildingId ? " active" : "");
      el.title = `${rm.floor}F ・ ${rm.name}`;
      el.innerHTML = `<b>${rm.name}</b>`;
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

  // 直向螢幕 (手機) 水平視野很窄：加大視角並把全覽鏡頭拉遠，讓東西兩側校界都能入鏡
  const CAMPUS_HALF_WIDTH = 175; // 校界東西半寬 (公尺)
  const MAX_ORBIT_RADIUS = 700;

  function getBirdFov() {
    return camera.aspect < 1 ? 55 : 45;
  }

  // 直向螢幕改用較接近正上方的俯角，南北狹長的校園可填滿畫面高度
  function getOverviewPhi() {
    return camera.aspect < 1 ? 0.5 : DEFAULT_OVERVIEW.phi;
  }

  function getOverviewRadius() {
    const halfHFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(getBirdFov()) / 2) * camera.aspect);
    const needed = CAMPUS_HALF_WIDTH / Math.tan(halfHFov);
    return Math.min(MAX_ORBIT_RADIUS, Math.max(DEFAULT_OVERVIEW.radius, needed));
  }

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
    const reopenPill = document.getElementById("reopenDrawerPill");
    if (reopenPill) reopenPill.hidden = true;
    document.getElementById("programsDrawer").hidden = true;
    document.getElementById("programsToggleBtn").classList.remove("active");
    state.selectedBuilding = null;
    highlightRing.visible = false;
    updateRoomLabelsDOM();



    camControl.targetGoal.set(...DEFAULT_OVERVIEW.target);
    camControl.sphericalGoal.radius = getOverviewRadius();
    camControl.sphericalGoal.phi = getOverviewPhi();
    camControl.sphericalGoal.theta = DEFAULT_OVERVIEW.theta;
    showToast("🏠 已回到預設全校最佳全覽畫面（按住滑鼠左鍵可直接前後左右平移）");
  }

  // 滑鼠與觸控事件
  // 單指／滑鼠：拖曳平移或旋轉；雙指：捏合縮放、旋轉手勢轉動視角、上下滑動調整俯角
  let pointerDownPos = { x: 0, y: 0 };
  const activePointers = new Map(); // pointerId -> { x, y }
  let pinchState = null;            // 雙指手勢上一幀的距離、角度與中點
  let gestureWasMulti = false;      // 本次觸控曾出現雙指，放開時不視為點擊

  function measurePinch() {
    const [a, b] = Array.from(activePointers.values());
    return {
      dist: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      midY: (a.y + b.y) / 2
    };
  }

  canvas.addEventListener("pointerdown", e => {
    canvas.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size >= 2) {
      gestureWasMulti = true;
      camControl.isDragging = false;
      pinchState = measurePinch();
      return;
    }

    gestureWasMulti = false;
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
  });

  canvas.addEventListener("pointermove", e => {
    const tracked = activePointers.get(e.pointerId);
    if (tracked) {
      tracked.x = e.clientX;
      tracked.y = e.clientY;
    }

    if (activePointers.size >= 2 && pinchState) {
      const cur = measurePinch();
      if (!state.walkMode) {
        camControl.sphericalGoal.radius = Math.max(18, Math.min(700, camControl.sphericalGoal.radius * (pinchState.dist / cur.dist)));
        let dAngle = cur.angle - pinchState.angle;
        if (dAngle > Math.PI) dAngle -= Math.PI * 2;
        if (dAngle < -Math.PI) dAngle += Math.PI * 2;
        camControl.sphericalGoal.theta += dAngle;
        camControl.sphericalGoal.phi = Math.max(0.18, Math.min(Math.PI / 2 - 0.05, camControl.sphericalGoal.phi - (cur.midY - pinchState.midY) * 0.004));
      }
      pinchState = cur;
      return;
    }

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

  function endPointer(e, isCancel) {
    activePointers.delete(e.pointerId);

    if (activePointers.size === 1) {
      // 雙指放開其中一指：以剩下的手指接續單指拖曳，避免畫面跳動
      pinchState = null;
      const rest = activePointers.values().next().value;
      camControl.isDragging = true;
      camControl.dragMode = camControl.leftMouseAction;
      camControl.lastX = rest.x;
      camControl.lastY = rest.y;
      return;
    }
    if (activePointers.size > 1) {
      pinchState = measurePinch();
      return;
    }

    pinchState = null;
    camControl.isDragging = false;
    if (isCancel || gestureWasMulti) return;
    const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (moveDist < 5 && e.button === 0) {
      handleCanvasClick(e);
    }
  }

  canvas.addEventListener("pointerup", e => endPointer(e, false));
  canvas.addEventListener("pointercancel", e => endPointer(e, true));

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

  // ================= 3D 附中學生角色公仔（支援男同學／女同學、寫實／微縮積木／復古像素切換） =================
  let studentAvatarGroup = null;
  let avatarLimbParts = { leftArm: null, rightArm: null, leftLeg: null, rightLeg: null, body: null };

  function buildStudentAvatar(gender = "boy", themeStyle = "day") {
    if (studentAvatarGroup) {
      scene.remove(studentAvatarGroup);
      studentAvatarGroup = null;
    }

    const grp = new THREE.Group();
    grp.name = "StudentAvatar";

    const isBrick = themeStyle === "brick";
    const isPixel = themeStyle === "pixel";
    const roughness = isBrick ? 0.16 : (isPixel ? 0.85 : 0.68);
    const metalness = isBrick ? 0.15 : 0.06;

    // 材質庫
    const skinColor = isBrick ? "#FFD034" : "#F8D5C2";
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness, metalness, flatShading: isPixel });
    const hairColor = gender === "boy" ? (isBrick ? "#2B1D14" : (isPixel ? "#1A1A1A" : "#2B211B")) : (isBrick ? "#5C381E" : "#3B2A20");
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness, metalness, flatShading: isPixel });
    const shirtMat = new THREE.MeshStandardMaterial({ color: "#F8F9FA", roughness, metalness, flatShading: isPixel }); // 附中白襯衫
    const purpleMat = new THREE.MeshStandardMaterial({ color: "#7B1F34", roughness, metalness, flatShading: isPixel }); // 附中校服紫紅領／蝴蝶結
    const pantsColor = gender === "boy" ? "#243342" : "#1B2631"; // 深藍制服短褲／裙
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness, metalness, flatShading: isPixel });
    const shoesMat = new THREE.MeshStandardMaterial({ color: "#2B3542", roughness, metalness, flatShading: isPixel });
    const bagMat = new THREE.MeshStandardMaterial({ color: "#2E5540", roughness, metalness, flatShading: isPixel }); // 附中深綠書包

    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0;
    grp.add(bodyGroup);

    // 1. 骨盆與下身 (Pelvis / Shorts / Skirt)
    const pelvis = new THREE.Mesh(
      isBrick ? new THREE.BoxGeometry(0.40, 0.16, 0.22) : (isPixel ? new THREE.BoxGeometry(0.38, 0.16, 0.22) : new THREE.BoxGeometry(0.36, 0.16, 0.20)),
      pantsMat
    );
    pelvis.position.y = 0.82;
    pelvis.castShadow = true;
    bodyGroup.add(pelvis);

    if (gender === "girl" && !isBrick && !isPixel) {
      // 寫實女同學百褶裙擺
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.22, 16), pantsMat);
      skirt.position.y = 0.78;
      skirt.castShadow = true;
      bodyGroup.add(skirt);
    } else if (gender === "girl" && (isBrick || isPixel)) {
      // 積木／像素百褶裙 (直筒方裙)
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.26), pantsMat);
      skirt.position.y = 0.78;
      skirt.castShadow = true;
      bodyGroup.add(skirt);
    }

    // 2. 軀幹與上衣 (Torso with School Uniform)
    const torso = new THREE.Mesh(
      isBrick ? new THREE.BoxGeometry(0.42, 0.48, 0.24) : (isPixel ? new THREE.BoxGeometry(0.40, 0.46, 0.24) : new THREE.BoxGeometry(0.38, 0.46, 0.22)),
      shirtMat
    );
    torso.position.y = 1.12;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 附中紫紅領飾／領巾
    const collar = new THREE.Mesh(
      gender === "boy" ? new THREE.BoxGeometry(0.24, 0.10, 0.24) : new THREE.BoxGeometry(0.18, 0.12, 0.24),
      purpleMat
    );
    collar.position.set(0, 1.30, 0.02);
    bodyGroup.add(collar);

    // 左胸前南大附中校徽徽章小圓牌
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 12), purpleMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(-0.11, 1.22, 0.12);
    bodyGroup.add(badge);

    // 側背斜肩書包 (附中綠色書包)
    const schoolBag = new THREE.Mesh(
      isPixel ? new THREE.BoxGeometry(0.28, 0.24, 0.12) : new THREE.BoxGeometry(0.26, 0.22, 0.09),
      bagMat
    );
    schoolBag.position.set(0.22, 0.95, -0.04);
    schoolBag.rotation.z = -0.15;
    schoolBag.castShadow = true;
    bodyGroup.add(schoolBag);
    const bagStrap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.26), bagMat);
    bagStrap.position.set(0.06, 1.18, 0.01);
    bagStrap.rotation.z = 0.52;
    bodyGroup.add(bagStrap);

    // 3. 頭部與髮型 (Head & Hair)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.48;
    bodyGroup.add(headGroup);

    if (isBrick) {
      // 微縮積木經典圓柱頭與頂部圓凸點 (Stud)
      const brickHead = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.25, 16), skinMat);
      brickHead.castShadow = true;
      headGroup.add(brickHead);
      const topStud = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12), skinMat);
      topStud.position.y = 0.16;
      headGroup.add(topStud);
    } else if (isPixel) {
      // 體素像素風格：正立方體方塊頭 (Minecraft / Crossy Road)
      const pixelHead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), skinMat);
      pixelHead.castShadow = true;
      headGroup.add(pixelHead);
      // 方塊體素髮型
      const pixelHairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.38), hairMat);
      pixelHairTop.position.set(0, 0.14, -0.01);
      headGroup.add(pixelHairTop);
    } else {
      // 寫實圓潤頭部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.26), skinMat);
      head.castShadow = true;
      headGroup.add(head);
    }

    // 髮型細節
    if (gender === "boy") {
      if (!isPixel) {
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.14, 0.28), hairMat);
        hair.position.set(0, 0.11, -0.01);
        hair.castShadow = true;
        headGroup.add(hair);
      }
    } else {
      if (!isPixel) {
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.30), hairMat);
        hair.position.set(0, 0.09, -0.02);
        hair.castShadow = true;
        headGroup.add(hair);
        // 女同學側邊馬尾
        const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.24, 8), hairMat);
        ponytail.rotation.x = -0.55;
        ponytail.position.set(0, 0.04, -0.20);
        headGroup.add(ponytail);
      } else {
        // 像素女同學方塊馬尾
        const pixelPonytail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.18), hairMat);
        pixelPonytail.position.set(0, 0.04, -0.24);
        headGroup.add(pixelPonytail);
      }
      const hairpin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), purpleMat);
      hairpin.position.set(0.14, 0.08, 0.08);
      headGroup.add(hairpin);
    }

    // 臉部五官 (黑眼珠)
    const eyeMat = new THREE.MeshBasicMaterial({ color: "#1A1A1A" });
    const eyeZ = isPixel ? 0.185 : 0.14;
    [-0.065, 0.065].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(isPixel ? 0.05 : 0.035, isPixel ? 0.05 : 0.05, 0.02), eyeMat);
      eye.position.set(ex, 0.02, eyeZ);
      headGroup.add(eye);
    });

    // 4. 左手臂與右手臂 (具有肩膀旋轉關節軸心)
    const armGeo = isPixel
      ? new THREE.BoxGeometry(0.12, 0.42, 0.12)
      : (isBrick ? new THREE.BoxGeometry(0.10, 0.42, 0.10) : new THREE.CylinderGeometry(0.055, 0.05, 0.42, 8));

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.25, 1.30, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
    leftArmMesh.position.y = -0.19;
    leftArmMesh.castShadow = true;
    leftArmPivot.add(leftArmMesh);
    const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.13), shirtMat);
    leftSleeve.position.y = -0.06;
    leftArmPivot.add(leftSleeve);

    if (isBrick) {
      // 微縮積木經典 C 形圓夾手 (C-clamp Hand)
      const cHand = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 8, 16, Math.PI * 1.5), skinMat);
      cHand.position.set(0, -0.42, 0);
      cHand.rotation.z = Math.PI / 2;
      leftArmPivot.add(cHand);
    }
    bodyGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.25, 1.30, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    rightArmMesh.position.y = -0.19;
    rightArmMesh.castShadow = true;
    rightArmPivot.add(rightArmMesh);
    const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.13), shirtMat);
    rightSleeve.position.y = -0.06;
    rightArmPivot.add(rightSleeve);

    if (isBrick) {
      // 微縮積木經典 C 形圓夾手 (C-clamp Hand)
      const cHand = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 8, 16, Math.PI * 1.5), skinMat);
      cHand.position.set(0, -0.42, 0);
      cHand.rotation.z = -Math.PI / 2;
      rightArmPivot.add(cHand);
    }
    bodyGroup.add(rightArmPivot);

    // 5. 左腿與右腿 (具有髖關節旋轉軸心，延長腿部至 0.64m 並調整比例，確保跑步動態與雙腿鞋襪完整清晰可見)
    const legLength = 0.64;
    const legGeo = isPixel
      ? new THREE.BoxGeometry(0.13, legLength, 0.13)
      : (isBrick ? new THREE.BoxGeometry(0.13, legLength, 0.13) : new THREE.CylinderGeometry(0.055, 0.05, legLength, 10));

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, 0.74, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, skinMat);
    leftLegMesh.position.y = -legLength / 2;
    leftLegMesh.castShadow = true;
    leftLegPivot.add(leftLegMesh);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.23), shoesMat);
    leftShoe.position.set(0, -legLength + 0.02, 0.04);
    leftShoe.castShadow = true;
    leftLegPivot.add(leftShoe);
    bodyGroup.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, 0.74, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, skinMat);
    rightLegMesh.position.y = -legLength / 2;
    rightLegMesh.castShadow = true;
    rightLegPivot.add(rightLegMesh);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.23), shoesMat);
    rightShoe.position.set(0, -legLength + 0.02, 0.04);
    rightShoe.castShadow = true;
    rightLegPivot.add(rightShoe);
    bodyGroup.add(rightLegPivot);

    avatarLimbParts = {
      body: bodyGroup,
      leftArm: leftArmPivot,
      rightArm: rightArmPivot,
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot
    };

    grp.visible = false;
    scene.add(grp);
    studentAvatarGroup = grp;
    return grp;
  }

  // ================= 漫步碰撞：建築物與校界圍牆 =================
  // 可直接走入的場地 (操場、球場、校門拱門) 不列為障礙物
  const WALK_PASSABLE_STYLES = new Set(["sport_court", "track", "gate"]);
  const WALK_BODY_RADIUS = 0.8;    // 角色與建築外牆保留的距離
  const WALK_WALL_MARGIN = 1.2;    // 角色與校界圍牆保留的距離
  const WALK_PASSAGE_RADIUS = 2.2; // 導航路線兩側可通行的半寬：穿堂與建築入口因此可以走進去
  const WALK_MAX_SUBSTEP = 1.0;    // 單次碰撞檢查的最大移動距離，避免高速時穿透薄牆

  // 校門口前廣場 (位於校界多邊形外的內凹處)，可自由走動
  const GATE_FORECOURT = { minX: -8, maxX: 10.5, minZ: -206, maxZ: -180 };

  function distToSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  const walkObstacles = DATA.buildings
    .filter(b => !WALK_PASSABLE_STYLES.has(b.style))
    .map(b => ({
      x: b.x,
      z: b.z,
      halfW: b.w / 2 + WALK_BODY_RADIUS,
      halfD: b.d / 2 + WALK_BODY_RADIUS,
      cos: Math.cos(b.rotY || 0),
      sin: Math.sin(b.rotY || 0)
    }));

  const walkPassages = DATA.navEdges
    .filter(([a, b]) => DATA.navNodes[a] && DATA.navNodes[b])
    .map(([a, b]) => [DATA.navNodes[a], DATA.navNodes[b]]);

  // 校界圍牆線段；校門口內凹處沒有圍牆 (與 buildings-3d.js 建立圍牆時的判斷一致)
  const boundaryPts = DATA.campusBoundary || [];
  const boundaryWalls = boundaryPts
    .map((p1, i) => [p1, boundaryPts[(i + 1) % boundaryPts.length]])
    .filter(([p1, p2]) => !(p1[0] >= -14 && p1[0] <= 14 && p2[0] >= -14 && p2[0] <= 14 && p1[1] < -170 && p2[1] < -170));

  function isInsideCampus(x, z) {
    let inside = false;
    for (let i = 0, j = boundaryPts.length - 1; i < boundaryPts.length; j = i++) {
      const [xi, zi] = boundaryPts[i];
      const [xj, zj] = boundaryPts[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  function isInGateForecourt(x, z) {
    return x >= GATE_FORECOURT.minX && x <= GATE_FORECOURT.maxX && z >= GATE_FORECOURT.minZ && z <= GATE_FORECOURT.maxZ;
  }

  function isNearPassage(x, z) {
    return walkPassages.some(([a, b]) => distToSegment(x, z, a.x, a.z, b.x, b.z) < WALK_PASSAGE_RADIUS);
  }

  function isWalkable(x, z) {
    if (!isInGateForecourt(x, z)) {
      if (boundaryPts.length >= 3 && !isInsideCampus(x, z)) return false;
      if (boundaryWalls.some(([p1, p2]) => distToSegment(x, z, p1[0], p1[1], p2[0], p2[1]) < WALK_WALL_MARGIN)) return false;
    }
    for (let i = 0; i < walkObstacles.length; i++) {
      const o = walkObstacles[i];
      const dx = x - o.x;
      const dz = z - o.z;
      // 轉換至建築本地座標 (Three.js rotation.y 為逆時針)
      const lx = dx * o.cos - dz * o.sin;
      const lz = dx * o.sin + dz * o.cos;
      if (Math.abs(lx) < o.halfW && Math.abs(lz) < o.halfD && !isNearPassage(x, z)) return false;
    }
    return true;
  }

  // 依碰撞結果移動角色；撞牆時分別嘗試 X、Z 方向，讓角色沿牆面滑動
  function moveWalker(dx, dz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / WALK_MAX_SUBSTEP));
    const sx = dx / steps;
    const sz = dz / steps;
    const p = state.walkPos;
    // 若目前位置已在障礙物內 (例如舊版起點)，放行移動以便離開
    const stuck = !isWalkable(p.x, p.z);
    for (let i = 0; i < steps; i++) {
      if (stuck || isWalkable(p.x + sx, p.z + sz)) {
        p.x += sx;
        p.z += sz;
      } else if (isWalkable(p.x + sx, p.z)) {
        p.x += sx;
      } else if (isWalkable(p.x, p.z + sz)) {
        p.z += sz;
      } else {
        break;
      }
    }
  }

  // ================= 地面漫步冒險模式（第三人稱角色探索與第一人稱切換） =================
  function toggleWalkMode(enable, spawnId = "gate") {
    state.walkMode = enable;
    document.body.classList.toggle("walk-active", enable);
    if (!enable) {
      state.walkJoy.x = 0;
      state.walkJoy.y = 0;
    }
    const walkBtn = document.getElementById("walkModeBtn");
    const walkHud = document.getElementById("walkHudBar");
    walkBtn.classList.toggle("active", enable);
    walkHud.hidden = !enable;

    if (enable) {
      camera.fov = 55;
      camera.near = 0.3;
      camera.far = 700;
      camera.updateProjectionMatrix();

      if (!studentAvatarGroup) {
        buildStudentAvatar(state.walkChar, state.theme);
      }
      studentAvatarGroup.visible = (state.walkView === "third_person");

      teleportWalkSpawn(spawnId);
      showToast("🎮 已進入「地面漫步冒險模式」！使用 W/A/S/D 或方向鍵操控附中同學跑動");
    } else {
      if (studentAvatarGroup) studentAvatarGroup.visible = false;
      camera.fov = getBirdFov();
      camera.near = 2.0;
      camera.far = 1300;
      camera.updateProjectionMatrix();
      camControl.targetGoal.set(state.walkPos.x, 0, state.walkPos.z);
      camControl.sphericalGoal.radius = 165;
      camControl.sphericalGoal.phi = 0.85;
    }
    syncDock();
  }

  function teleportWalkSpawn(spawnId) {
    const sp = (DATA.walkSpawns || []).find(s => s.id === spawnId) || DATA.walkSpawns[0];
    if (!sp) return;
    state.walkPos.set(sp.x, 0, sp.z);
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
    const reopenPill = document.getElementById("reopenDrawerPill");
    if (reopenPill) reopenPill.hidden = true;

    const r = Math.max(b.w, b.d) * 0.58;
    highlightRing.geometry.dispose();
    highlightRing.geometry = new THREE.RingGeometry(r, r + 1.5, 36);
    highlightRing.position.set(b.x, 0.3, b.z);
    highlightRing.visible = true;

    if (moveCamera && !state.walkMode) {
      const dist = Math.max(45, Math.max(b.w, b.d) * 1.45);
      const topY = b.floors * (b.floorHeight || 5.4) * 0.5;
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
    closeMobileSheets("detail");
    panel.hidden = false;

    const reopenPill = document.getElementById("reopenDrawerPill");
    if (reopenPill) reopenPill.hidden = true;

    const categoryNames = {
      landmark: "校園地標",
      admin: "行政與教學支援",
      teaching: "普通與綜合教學大樓",
      tech: "專業群科與實習館舍",
      sport: "運動與集會場館",
      facility: "校園生活與服務設施"
    };

    const isSportCourt = b.style === "sport_court" || b.category === "sport";
    const bldgBadgeText = isSportCourt ? "" : (" ・ " + (b.badgeText ? (b.badgeText + "場地") : (b.floors + " 層樓")));

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
          <span class="cat-pill cat-${b.category}">${categoryNames[b.category] || "校園建築"}${bldgBadgeText}</span>
          <h2>${b.name}</h2>
          <small class="en-sub">${b.englishName || ""}</small>
        </div>
        <div class="drawer-head-actions">
          <button type="button" class="drawer-action-btn minimize-btn" id="minimizeDrawerBtn" title="縮小／隱藏介紹面板，保留大樓空間標籤">
            <span>收起面板 ▾</span>
          </button>
          <button type="button" class="close-btn" id="closeDrawerBtn" title="收起介紹面板（保留3D標籤）" aria-label="收起面板">✕</button>
        </div>
      </div>

      <p class="b-summary">${b.summary}</p>

      <div class="feature-tags">
        ${(b.features || []).map(ft => `<span class="ft-tag">✦ ${ft}</span>`).join("")}
      </div>

      <div class="drawer-actions">
        <button type="button" class="act-btn pri" id="navToHereBtn">🧭 導航帶路</button>
        <button type="button" class="act-btn" id="setStartHereBtn">🚩 設為起點</button>
        <button type="button" class="act-btn deselect-btn" id="deselectBldgBtn" title="取消選取此棟建築並清除教室標籤">✕ 取消選取</button>
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

    function hideDrawerKeepLabels() {
      panel.hidden = true;
      if (reopenPill) {
        reopenPill.innerHTML = `<span>📖 展開「${b.name.replace(/（.*）/, "")}」介紹 ▴</span>`;
        reopenPill.hidden = false;
        reopenPill.onclick = () => {
          panel.hidden = false;
          reopenPill.hidden = true;
        };
      }
    }

    const minBtn = document.getElementById("minimizeDrawerBtn");
    if (minBtn) minBtn.addEventListener("click", hideDrawerKeepLabels);

    const closeBtn = document.getElementById("closeDrawerBtn");
    if (closeBtn) closeBtn.addEventListener("click", hideDrawerKeepLabels);

    const deselectBtn = document.getElementById("deselectBldgBtn");
    if (deselectBtn) {
      deselectBtn.addEventListener("click", () => {
        panel.hidden = true;
        if (reopenPill) reopenPill.hidden = true;
        state.selectedBuilding = null;
        highlightRing.visible = false;
        updateRoomLabelsDOM();
      });
    }

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

  // ================= 三種原創視覺風格切換 (晴空寫實 / 復古像素冒險 / 微縮積木世界) =================
  function applyVisualTheme(themeName) {
    state.theme = themeName;
    document.querySelectorAll("#themeSwitcher button, .more-themes button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === themeName);
    });

    document.body.classList.toggle("theme-pixel", themeName === "pixel");
    document.body.classList.toggle("theme-brick", themeName === "brick");

    // 一鍵同步全校樹木 (有機圓潤 / 圓盤積木樹 / 體素方塊樹) 與屋頂 (積木 Stud 凸粒 / 體素女兒牆)
    if (BUILDER && BUILDER.setVisualTheme) {
      BUILDER.setVisualTheme(themeName);
    }

    // 始終維持原生高解析度渲染，徹底告別模糊
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (themeName === "day") {
      scene.background.set("#CFE5F5");
      scene.fog.color.set("#CFE5F5");
      hemiLight.color.set("#FFFFFF");
      hemiLight.groundColor.set("#6E8562");
      hemiLight.intensity = 0.75;
      sunLight.color.set("#FFF8E7");
      sunLight.intensity = 1.05;
      sunLight.position.set(120, 185, 110);
      showToast("☀️ 已切換為「晴空寫實風格」");
    } else if (themeName === "pixel") {
      // 復古像素冒險風格：極致清晰體素方塊世界 (Minecraft / Crossy Road 稜角分明體素大樓與方塊樹)
      scene.background.set("#1E2430");
      scene.fog.color.set("#1E2430");
      hemiLight.color.set("#7DFFB3");
      hemiLight.groundColor.set("#3D1E4A");
      hemiLight.intensity = 0.95;
      sunLight.color.set("#FFF677");
      sunLight.intensity = 1.25;
      sunLight.position.set(100, 180, 100);
      showToast("🕹️ 已切換為「復古像素冒險風格」！全校體素方塊樹、方塊女兒牆與像素冒險家已生成");
    } else if (themeName === "brick") {
      // 微縮積木世界風格：全校屋頂滿滿 Stud 圓形凸粒、階梯圓盤積木樹、高光玩具塑膠模型
      scene.background.set("#E8F3FD");
      scene.fog.color.set("#E8F3FD");
      hemiLight.color.set("#FFFFFF");
      hemiLight.groundColor.set("#3898EC");
      hemiLight.intensity = 0.95;
      sunLight.color.set("#FFF0D0");
      sunLight.intensity = 1.30;
      sunLight.position.set(140, 210, 95);
      showToast("🧱 已切換為「微縮積木世界風格」！圓盤積木樹、全校屋頂 Stud 凸粒與積木人偶已就緒");
    }

    // 若角色公仔存在，同步重構為對應風格公仔 (寫實學生 / 積木人偶 / 體素方塊人)
    if (studentAvatarGroup) {
      buildStudentAvatar(state.walkChar, state.theme);
      studentAvatarGroup.visible = state.walkMode && (state.walkView === "third_person");
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

  // 建立嚴格沿著黑色道路行走的平滑導航軌跡 (直線段嚴格平行道路中心線，轉彎處微幅平滑倒角，絕不橫切草皮或大樓)
  function createRoadRouteCurve(points, cornerRadius = 1.8) {
    if (!points || points.length < 2) return null;
    if (points.length === 2) {
      const cp = new THREE.CurvePath();
      cp.add(new THREE.LineCurve3(points[0], points[1]));
      return cp;
    }

    const cp = new THREE.CurvePath();
    let prevEnd = points[0].clone();

    for (let i = 1; i < points.length - 1; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const pNext = points[i + 1];

      const v1 = new THREE.Vector3().subVectors(pCurr, pPrev);
      const v2 = new THREE.Vector3().subVectors(pNext, pCurr);
      const len1 = v1.length();
      const len2 = v2.length();

      if (len1 < 0.01 || len2 < 0.01) continue;

      const dir1 = v1.clone().normalize();
      const dir2 = v2.clone().normalize();

      const dot = dir1.dot(dir2);
      if (dot > 0.999) {
        continue;
      }

      const r = Math.min(cornerRadius, len1 * 0.45, len2 * 0.45);
      const filletStart = new THREE.Vector3().copy(pCurr).addScaledVector(dir1, -r);
      const filletEnd = new THREE.Vector3().copy(pCurr).addScaledVector(dir2, r);

      if (prevEnd.distanceTo(filletStart) > 0.05) {
        cp.add(new THREE.LineCurve3(prevEnd.clone(), filletStart.clone()));
      }

      cp.add(new THREE.QuadraticBezierCurve3(filletStart.clone(), pCurr.clone(), filletEnd.clone()));
      prevEnd.copy(filletEnd);
    }

    const lastPt = points[points.length - 1];
    if (prevEnd.distanceTo(lastPt) > 0.05) {
      cp.add(new THREE.LineCurve3(prevEnd.clone(), lastPt.clone()));
    }

    return cp;
  }

  function startNavigation(fromBuildingId, toBuildingId, roomLabel = "") {
    state.navStartId = fromBuildingId;
    state.navEndId = toBuildingId;

    const startNode = DATA.buildingNavNode[fromBuildingId] || "n_gate";
    const endNode = DATA.buildingNavNode[toBuildingId] || "n_quad_c";
    const fromBld = DATA.buildings.find(b => b.id === fromBuildingId);
    const toBld = DATA.buildings.find(b => b.id === toBuildingId);

    // 起點與終點相同，或路網上找不到連通路線：不畫線 (避免直線切過草皮與建築)
    if (startNode === endNode) {
      showToast(fromBuildingId === toBuildingId ? "📍 起點與終點相同，請選擇其他目的地" : "📍 兩地相鄰，步行即可直接抵達");
      return;
    }

    const res = findShortestPath(startNode, endNode);
    if (res.path.length < 2 || res.path[0] !== startNode) {
      showToast("⚠️ 找不到沿校園道路的步行路線");
      return;
    }

    while (routeGroup.children.length) {
      routeGroup.remove(routeGroup.children[0]);
    }

    const pts = [];
    res.path.forEach(nid => {
      const n = DATA.navNodes[nid];
      if (n) pts.push(new THREE.Vector3(n.x, 0.75, n.z));
    });

    if (pts.length >= 2) {
      const curve = createRoadRouteCurve(pts, 1.8);
      state.navCurve = curve;
      const segments = Math.max(64, Math.min(256, Math.round(res.distance * 0.85)));
      const tubeGeo = new THREE.TubeGeometry(curve, segments, 0.65, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: "#FFD23F" });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      routeGroup.add(tubeMesh);

      const startPin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.6, 20), new THREE.MeshBasicMaterial({ color: "#4CC3D9" }));
      startPin.position.copy(pts[0]);
      const endPin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.7, 20), new THREE.MeshBasicMaterial({ color: "#FF595E" }));
      endPin.position.copy(pts[pts.length - 1]);
      routeGroup.add(startPin, endPin);
    }

    state.navDistance = res.distance;
    state.navWalking = false;
    state.navPaused = false;
    state.navProgress = 0;
    walkerMesh.visible = false;
    const simBtn = document.getElementById("simWalkBtn");
    if (simBtn) simBtn.innerHTML = "🚶 模擬沿路帶路";
    const wrap = document.getElementById("navWalkProgressWrap");
    if (wrap) {
      wrap.hidden = true;
      const bar = document.getElementById("navWalkProgressBar");
      if (bar) bar.style.width = "0%";
    }

    const totalMeters = Math.max(25, res.distance);
    const walkMins = Math.max(1, Math.round(totalMeters / 68));

    const navBar = document.getElementById("navStatusBar");
    navBar.hidden = false;
    document.getElementById("navRouteTitle").textContent = `${fromBld ? fromBld.name.replace(/（.*）/, "") : "起點"} ➔ ${toBld ? toBld.name.replace(/（.*）/, "") : "終點"}${roomLabel ? " (" + roomLabel + ")" : ""}`;
    document.getElementById("navRouteMeta").textContent = `預估步行距離約 ${totalMeters} 公尺 ・ 步行時間約 ${walkMins} 分鐘`;

    // 手機版：收起面板，讓路線完整露出
    closeMobileSheets();

    if (fromBld && toBld && !state.walkMode) {
      const midX = (fromBld.x + toBld.x) / 2;
      const midZ = (fromBld.z + toBld.z) / 2;
      const span = Math.max(85, Math.hypot(fromBld.x - toBld.x, fromBld.z - toBld.z) * 1.15);
      flyTo([midX, 2, midZ], [midX + span * 0.35, span * 0.85, midZ + span * 0.78]);
    }
  }

  function applyNavCameraPreset() {
    const level = state.navCamHeightLevel || 0;
    const heightBtn = document.getElementById("walkCamHeightBtn");
    if (level === 0) {
      camControl.sphericalGoal.radius = 140;
      camControl.sphericalGoal.phi = 0.94;
      if (heightBtn) heightBtn.innerHTML = "🔭 俯瞰：高空全景";
      showToast("🔭 視角切換：高空全景 (可綜覽沿途各大樓)");
    } else if (level === 1) {
      camControl.sphericalGoal.radius = 95;
      camControl.sphericalGoal.phi = 1.02;
      if (heightBtn) heightBtn.innerHTML = "🚁 俯瞰：中景跟隨";
      showToast("🚁 視角切換：中景跟隨");
    } else {
      camControl.sphericalGoal.radius = 55;
      camControl.sphericalGoal.phi = 1.12;
      if (heightBtn) heightBtn.innerHTML = "👀 俯瞰：近距特寫";
      showToast("👀 視角切換：近距特寫");
    }
  }

  function startSimulatedWalk() {
    if (!state.navCurve) return;
    if (state.walkMode) toggleWalkMode(false);
    const simBtn = document.getElementById("simWalkBtn");
    const wrap = document.getElementById("navWalkProgressWrap");

    // 1. 如果正在帶路中 -> 點擊執行「暫停」
    if (state.navWalking) {
      state.navWalking = false;
      state.navPaused = true;
      if (simBtn) simBtn.innerHTML = "▶️ 繼續帶路";
      showToast("⏸️ 已暫停帶路");
      return;
    }

    // 2. 如果處於暫停狀態 -> 點擊執行「繼續」
    if (state.navPaused) {
      state.navWalking = true;
      state.navPaused = false;
      if (simBtn) simBtn.innerHTML = "⏸️ 暫停帶路";
      showToast("▶️ 繼續沿路帶路");
      return;
    }

    // 3. 尚未開始或已抵達終點 -> 點擊執行「開始」或「重新開始」
    if (state.navProgress >= 1) {
      state.navProgress = 0;
    }
    state.navWalking = true;
    state.navPaused = false;
    walkerMesh.visible = true;
    if (simBtn) simBtn.innerHTML = "⏸️ 暫停帶路";
    if (wrap) wrap.hidden = false;

    // 將視角提升至高空俯瞰全景，能綜覽路過的大樓
    applyNavCameraPreset();
    showToast("🚶 開始模擬沿路帶路導覽！");
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
        document.body.classList.remove("search-open");
        if (item.kind === "building") {
          selectBuilding(item.buildingId, true);
        } else if (item.kind === "room") {
          focusOnRoom(item.rm);
          startNavigation(state.navStartId || "main_gate", item.rm.buildingId, `${item.rm.floor}F ${item.rm.name}`);
        }
      });
    });
  }

  // ================= 3D 動態羅盤指北針 =================
  const compassDialEl = document.getElementById("compassDial");
  const compassHeadingEl = document.getElementById("compassHeadingTxt");

  function updateCompass() {
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
    // 1. 分區快速跳轉按鈕 (已依需求移除)
    const zoneBar = document.getElementById("zoneBar");
    if (zoneBar) {
      zoneBar.innerHTML = "";
    }

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

    // 3b. 地面漫步角色切換 (男同學 vs 女同學) 與 第三人稱／第一人稱視角切換
    const charBoyBtn = document.getElementById("charBoyBtn");
    const charGirlBtn = document.getElementById("charGirlBtn");
    if (charBoyBtn && charGirlBtn) {
      charBoyBtn.addEventListener("click", () => {
        state.walkChar = "boy";
        charBoyBtn.classList.add("active");
        charGirlBtn.classList.remove("active");
        buildStudentAvatar("boy", state.theme);
        if (studentAvatarGroup) studentAvatarGroup.visible = state.walkMode && (state.walkView === "third_person");
        showToast("👦 已選擇「南大附中男同學」角色！");
      });
      charGirlBtn.addEventListener("click", () => {
        state.walkChar = "girl";
        charGirlBtn.classList.add("active");
        charBoyBtn.classList.remove("active");
        buildStudentAvatar("girl", state.theme);
        if (studentAvatarGroup) studentAvatarGroup.visible = state.walkMode && (state.walkView === "third_person");
        showToast("👧 已選擇「南大附中女同學」角色！");
      });
    }

    const toggleWalkCamBtn = document.getElementById("toggleWalkCamViewBtn");
    if (toggleWalkCamBtn) {
      toggleWalkCamBtn.addEventListener("click", () => {
        if (state.walkView === "third_person") {
          state.walkView = "first_person";
          toggleWalkCamBtn.innerHTML = "👁️ 第一人稱";
          toggleWalkCamBtn.classList.remove("active");
          if (studentAvatarGroup) studentAvatarGroup.visible = false;
          showToast("👁️ 已切換為第一人稱沉浸視角");
        } else {
          state.walkView = "third_person";
          toggleWalkCamBtn.innerHTML = "🎥 第三人稱";
          toggleWalkCamBtn.classList.add("active");
          if (studentAvatarGroup) studentAvatarGroup.visible = true;
          showToast("🎥 已切換為第三人稱角色追尾視角");
        }
      });
    }

    // 縮小 / 展開地面漫步操作面板 (或按鍵盤 H)
    const toggleHudCollapseBtn = document.getElementById("toggleHudCollapseBtn");
    if (toggleHudCollapseBtn) {
      toggleHudCollapseBtn.addEventListener("click", () => {
        const hud = document.getElementById("walkHudBar");
        if (!hud) return;
        const isMin = hud.classList.toggle("minimized");
        toggleHudCollapseBtn.innerHTML = isMin ? "🔼 展開面板" : "🔽 收合面板";
        toggleHudCollapseBtn.title = isMin ? "展開完整方向控制盤與快捷傳送按鈕" : "收合下方操作面板以獲得全螢幕清晰漫步視野 (快捷鍵 H)";
      });
    }

    window.addEventListener("keydown", (e) => {
      if (state.walkMode && (e.key === "h" || e.key === "H") && !e.ctrlKey && !e.altKey) {
        if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
        if (toggleHudCollapseBtn) toggleHudCollapseBtn.click();
      }
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

    // 6. 樓層切換器 (已依需求移除)

    // 7. 視覺風格切換器 (桌機頂部列與手機「更多」選單共用)
    document.querySelectorAll("#themeSwitcher button, .more-themes button").forEach(btn => {
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

    const speedBtn = document.getElementById("walkSpeedBtn");
    if (speedBtn) {
      speedBtn.addEventListener("click", () => {
        if (state.navSpeedMultiplier === 1.0) {
          state.navSpeedMultiplier = 2.0;
          speedBtn.innerHTML = "⚡ 2x 快速";
          showToast("⚡ 帶路速度：2x 快速");
        } else if (state.navSpeedMultiplier === 2.0) {
          state.navSpeedMultiplier = 0.5;
          speedBtn.innerHTML = "⚡ 0.5x 慢速";
          showToast("⚡ 帶路速度：0.5x 慢速");
        } else {
          state.navSpeedMultiplier = 1.0;
          speedBtn.innerHTML = "⚡ 1x 速度";
          showToast("⚡ 帶路速度：1x 正常");
        }
      });
    }

    const heightBtn = document.getElementById("walkCamHeightBtn");
    if (heightBtn) {
      heightBtn.addEventListener("click", () => {
        state.navCamHeightLevel = ((state.navCamHeightLevel || 0) + 1) % 3;
        applyNavCameraPreset();
      });
    }

    document.getElementById("clearNavBtn").addEventListener("click", () => {
      while (routeGroup.children.length) routeGroup.remove(routeGroup.children[0]);
      walkerMesh.visible = false;
      state.navWalking = false;
      state.navPaused = false;
      state.navProgress = 0;
      const simBtn = document.getElementById("simWalkBtn");
      if (simBtn) simBtn.innerHTML = "🚶 模擬沿路帶路";
      const wrap = document.getElementById("navWalkProgressWrap");
      if (wrap) wrap.hidden = true;
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
    camControl.spherical.radius = camControl.sphericalGoal.radius = getOverviewRadius();
    camControl.spherical.phi = camControl.sphericalGoal.phi = getOverviewPhi();

    initCompactUI();
  }

  // ================= 手機／平板精簡介面 =================
  // 斷點需與 style.css 的「精簡版面」媒體查詢一致
  const compactQuery = window.matchMedia("(max-width: 900px), (max-height: 520px)");
  const touchQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
  const GESTURE_HINT_KEY = "tntcsh3d.gestureHintSeen";

  function isCompactLayout() {
    return compactQuery.matches;
  }

  // 底部面板一次只開一個；except 為保留開啟的面板 ('nav' | 'programs' | 'more' | 'detail')
  function closeMobileSheets(except) {
    if (!isCompactLayout()) return;
    if (except !== "nav") document.getElementById("leftNavBox").classList.remove("open");
    if (except !== "more") document.getElementById("moreSheet").hidden = true;
    if (except !== "programs") {
      document.getElementById("programsDrawer").hidden = true;
      document.getElementById("programsToggleBtn").classList.remove("active");
    }
    if (except !== "detail" && !document.getElementById("detailDrawer").hidden) {
      const minBtn = document.getElementById("minimizeDrawerBtn");
      if (minBtn) minBtn.click();
    }
    document.body.classList.remove("search-open");
    syncDock();
  }

  function syncDock() {
    const dock = document.getElementById("mobileDock");
    if (!dock) return;
    const activeMap = {
      walk: state.walkMode,
      nav: document.getElementById("leftNavBox").classList.contains("open"),
      programs: !document.getElementById("programsDrawer").hidden,
      more: !document.getElementById("moreSheet").hidden
    };
    dock.querySelectorAll("button[data-dock]").forEach(btn => {
      btn.classList.toggle("active", !!activeMap[btn.dataset.dock]);
    });
  }

  function showGestureHint() {
    document.getElementById("gestureHint").hidden = false;
  }

  function initCompactUI() {
    const navBox = document.getElementById("leftNavBox");
    const moreSheet = document.getElementById("moreSheet");

    document.querySelectorAll("#mobileDock button[data-dock]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.dock;
        if (act === "overview") {
          closeMobileSheets();
          resetToBestOverview();
        } else if (act === "walk") {
          closeMobileSheets();
          toggleWalkMode(!state.walkMode, "gate");
        } else if (act === "nav") {
          const willOpen = !navBox.classList.contains("open");
          closeMobileSheets("nav");
          navBox.classList.toggle("open", willOpen);
        } else if (act === "programs") {
          closeMobileSheets("programs");
          document.getElementById("programsToggleBtn").click();
        } else if (act === "more") {
          const willOpen = moreSheet.hidden;
          closeMobileSheets("more");
          moreSheet.hidden = !willOpen;
        }
        syncDock();
      });
    });

    document.getElementById("closeNavBoxBtn").addEventListener("click", () => {
      navBox.classList.remove("open");
      syncDock();
    });
    document.getElementById("closeMoreSheetBtn").addEventListener("click", () => {
      moreSheet.hidden = true;
      syncDock();
    });
    document.getElementById("closeProgramsBtn").addEventListener("click", syncDock);
    document.getElementById("openCopyModalBtn2").addEventListener("click", () => {
      moreSheet.hidden = true;
      syncDock();
      document.getElementById("copyrightModal").hidden = false;
    });
    document.getElementById("showGestureHintBtn").addEventListener("click", () => {
      moreSheet.hidden = true;
      syncDock();
      showGestureHint();
    });

    // 搜尋：手機版點 🔍 展開搜尋列
    const searchInput = document.getElementById("campusSearchInput");
    document.getElementById("mobileSearchBtn").addEventListener("click", () => {
      const willOpen = !document.body.classList.contains("search-open");
      closeMobileSheets();
      document.body.classList.toggle("search-open", willOpen);
      if (willOpen) searchInput.focus();
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".search-box") && !e.target.closest("#mobileSearchBtn")) {
        document.body.classList.remove("search-open");
      }
    });

    // 觸控操作說明：觸控裝置或精簡版面首次開啟時顯示一次
    document.getElementById("closeGestureHintBtn").addEventListener("click", () => {
      document.getElementById("gestureHint").hidden = true;
      try {
        localStorage.setItem(GESTURE_HINT_KEY, "1");
      } catch (err) { /* 無痕模式等情況無法儲存，下次再顯示即可 */ }
    });
    let hintSeen = false;
    try {
      hintSeen = localStorage.getItem(GESTURE_HINT_KEY) === "1";
    } catch (err) { /* 同上 */ }
    if (!hintSeen && (touchQuery.matches || isCompactLayout())) showGestureHint();

    // 漫步跑步／步行切換 (手機與觸控裝置預設步行，搖桿操作較好控制)
    const paceBtn = document.getElementById("walkPaceBtn");
    const renderPace = () => {
      paceBtn.innerHTML = state.walkPace === "run" ? "🏃 跑步" : "🚶 步行";
    };
    if (touchQuery.matches || isCompactLayout()) state.walkPace = "walk";
    renderPace();
    paceBtn.addEventListener("click", () => {
      state.walkPace = state.walkPace === "run" ? "walk" : "run";
      renderPace();
      showToast(state.walkPace === "run" ? "🏃 已切換為跑步速度" : "🚶 已切換為步行速度");
    });

    // 漫步虛擬搖桿
    const joy = document.getElementById("walkJoystick");
    const knob = joy.querySelector(".joy-knob");
    let joyPointer = null;
    const updateJoy = e => {
      const rect = joy.getBoundingClientRect();
      const radius = rect.width / 2;
      let ox = e.clientX - (rect.left + radius);
      let oy = e.clientY - (rect.top + radius);
      const len = Math.hypot(ox, oy);
      const maxLen = radius * 0.62;
      if (len > maxLen) {
        ox *= maxLen / len;
        oy *= maxLen / len;
      }
      knob.style.transform = `translate(${ox}px, ${oy}px)`;
      // 平方曲線：輕推時慢慢走、推到底才全速，方便微調
      const strength = Math.min(len, maxLen) / maxLen;
      state.walkJoy.x = (ox / maxLen) * strength;
      state.walkJoy.y = (oy / maxLen) * strength;
    };
    const releaseJoy = () => {
      joyPointer = null;
      knob.style.transform = "";
      state.walkJoy.x = 0;
      state.walkJoy.y = 0;
    };
    joy.addEventListener("pointerdown", e => {
      e.preventDefault();
      joyPointer = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      updateJoy(e);
    });
    joy.addEventListener("pointermove", e => {
      if (e.pointerId === joyPointer) updateJoy(e);
    });
    joy.addEventListener("pointerup", releaseJoy);
    joy.addEventListener("pointercancel", releaseJoy);

    syncDock();
  }

  function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    if (!state.walkMode) camera.fov = getBirdFov();
    camera.updateProjectionMatrix();
  }

  // ================= 投影 3D 標籤至螢幕座標 =================
  const tempV = new THREE.Vector3();
  const camDirV = new THREE.Vector3();
  const toLabelV = new THREE.Vector3();

  function updateFloatingLabels() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (state.walkMode) {
      camera.getWorldDirection(camDirV);
      camDirV.y = 0;
      camDirV.normalize();
    }

    // 1. 周邊道路路名牌 (地面實境漫步模式全數隱藏，鳥瞰模式顯示)
    roadLabels.forEach(item => {
      if (state.walkMode) {
        item.el.style.display = "none";
        return;
      }
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

    // 2. 東西南北方位大標籤 (地面實境漫步模式全數隱藏，鳥瞰模式顯示)
    cardinalLabels.forEach(item => {
      if (state.walkMode) {
        item.el.style.display = "none";
        return;
      }
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

    // 3. 建築物標籤 (地面漫步模式嚴格只顯示身旁 <= 65m 且在視線前方的建築，遠距大樓與兩側街道徹底隱藏)
    buildingLabels.forEach(item => {
      if (state.walkMode) {
        const isSelected = !!(state.selectedBuilding && state.selectedBuilding.id === item.data.id);
        const dist = Math.hypot(item.pos.x - state.walkPos.x, item.pos.z - state.walkPos.z);
        const maxDist = isSelected ? 120 : 65;
        if (dist > maxDist) {
          item.el.style.display = "none";
          return;
        }
        toLabelV.set(item.pos.x - camera.position.x, 0, item.pos.z - camera.position.z).normalize();
        const dot = camDirV.dot(toLabelV);
        if (dot < 0.28 && !isSelected) {
          item.el.style.display = "none";
          return;
        }
        // 依距離平滑淡入淡出
        const alpha = isSelected ? 1.0 : Math.min(1.0, Math.max(0.2, 1.0 - (dist - 40) / 25));
        item.el.style.opacity = alpha;
      } else {
        item.el.style.opacity = "1";
      }

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

    // 4. 整體大樓各樓層獨立指標標籤 (1F, 2F, 3F...)
    floorMarkerPool.forEach(item => {
      if (state.walkMode) {
        const isSelected = !!(state.selectedBuilding && state.selectedBuilding.id === item.bId);
        if (!isSelected) {
          const dist = Math.hypot(item.pos.x - state.walkPos.x, item.pos.z - state.walkPos.z);
          if (dist > 35) {
            item.el.style.display = "none";
            return;
          }
        }
      }
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
      item.el.classList.toggle("active", state.activeFloor === item.floor);
    });

    // 5. 教室標籤（地面漫步模式只在極近距離或選取該大樓時顯示）
    roomLabelPool.forEach(item => {
      if (state.walkMode) {
        const isSelected = !!(state.selectedBuilding && state.selectedBuilding.id === item.bId);
        if (!isSelected) {
          const dist = Math.hypot(item.pos.x - state.walkPos.x, item.pos.z - state.walkPos.z);
          if (dist > 30) {
            item.el.style.display = "none";
            return;
          }
        }
      }
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
  // 所有移動量皆以「每秒」計算再乘上實際經過時間 dt，速度不受螢幕更新率 (60/120/144Hz) 影響
  const WALK_SPEED = { run: 43, walk: 8 };    // 漫步移動速度 (公尺/秒)
  const WALK_LIMB_RATE = { run: 13, walk: 7 }; // 擺臂擺腿頻率 (弧度/秒)
  const WALK_TURN_SPEED = 1.7;                 // 轉向速度 (弧度/秒)
  const NAV_WALK_SPEED = 14;                   // 模擬帶路小人 1x 速度 (公尺/秒)
  const CAM_SMOOTHING = 6.3;                   // 鏡頭平滑跟隨速率 (約等於 60fps 下每幀趨近 10%)
  const MAX_FRAME_DT = 0.1;                    // 切換分頁回來時避免瞬間移動

  let lastFrameTime = null;

  function animate(now) {
    requestAnimationFrame(animate);
    if (lastFrameTime === null) lastFrameTime = now;
    const dt = Math.min(MAX_FRAME_DT, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    const frames60 = dt * 60; // 以 60fps 為基準的幀數，用於原本「每幀乘以係數」的平滑運算

    if (state.walkMode) {
      // 地面漫步冒險 / 第三人稱角色探索控制
      const keys = camControl.keys;
      const hold = state.walkHoldActions;
      let turnInput = -state.walkJoy.x;
      let moveInput = -state.walkJoy.y;
      if (keys["KeyA"] || keys["ArrowLeft"] || hold.turnLeft) turnInput += 1;
      if (keys["KeyD"] || keys["ArrowRight"] || hold.turnRight) turnInput -= 1;
      if (keys["KeyW"] || keys["ArrowUp"] || hold.forward) moveInput += 1;
      if (keys["KeyS"] || keys["ArrowDown"] || hold.backward) moveInput -= 1;
      turnInput = Math.max(-1, Math.min(1, turnInput));
      moveInput = Math.max(-1, Math.min(1, moveInput));

      state.walkYaw += turnInput * WALK_TURN_SPEED * dt;

      const lookDirX = -Math.sin(state.walkYaw);
      const lookDirZ = -Math.cos(state.walkYaw);

      const isMoving = Math.abs(moveInput) > 0.05;
      if (isMoving) {
        const step = moveInput * WALK_SPEED[state.walkPace] * dt;
        moveWalker(lookDirX * step, lookDirZ * step);
      }

      // 角色走動擺臂擺腿動畫與身體起伏 (Walking limb swing cycle & bobbing)
      if (isMoving) {
        state.walkLimbPhase += WALK_LIMB_RATE[state.walkPace] * Math.abs(moveInput) * dt;
        if (avatarLimbParts.leftLeg) {
          avatarLimbParts.leftLeg.rotation.x = Math.sin(state.walkLimbPhase) * 0.65;
          avatarLimbParts.rightLeg.rotation.x = -Math.sin(state.walkLimbPhase) * 0.65;
          avatarLimbParts.leftArm.rotation.x = -Math.sin(state.walkLimbPhase) * 0.55;
          avatarLimbParts.rightArm.rotation.x = Math.sin(state.walkLimbPhase) * 0.55;
        }
      } else {
        if (avatarLimbParts.leftLeg) {
          const decay = Math.pow(0.82, frames60);
          avatarLimbParts.leftLeg.rotation.x *= decay;
          avatarLimbParts.rightLeg.rotation.x *= decay;
          avatarLimbParts.leftArm.rotation.x *= decay;
          avatarLimbParts.rightArm.rotation.x *= decay;
        }
      }

      const bobY = isMoving ? Math.abs(Math.sin(state.walkLimbPhase * 2)) * 0.07 : (Math.sin(performance.now() * 0.003) * 0.02);
      if (avatarLimbParts.body) {
        avatarLimbParts.body.position.y = bobY;
      }

      // 更新角色位置與朝向 (設定 y = 0.08 確保雙腳平穩踩於路面之上，絕不埋入地面)
      if (studentAvatarGroup) {
        studentAvatarGroup.position.set(state.walkPos.x, 0.08, state.walkPos.z);
        studentAvatarGroup.rotation.y = state.walkYaw + Math.PI;
      }

      if (state.walkView === "third_person") {
        // 第三人稱跟隨視角：採用角色重心跟隨彈簧臂 (Spring-Arm Orbit)，鏡頭對焦於人偶胸肩高度，雙腿與鞋子始終完整呈現於螢幕安全區域內
        if (studentAvatarGroup) studentAvatarGroup.visible = true;

        const followDist = 5.6;
        const pitchClamped = Math.max(-0.35, Math.min(0.65, state.walkPitch));
        const horizDist = followDist * Math.cos(pitchClamped);
        const vertDist = followDist * Math.sin(pitchClamped);

        const camX = state.walkPos.x - lookDirX * Math.max(2.5, horizDist);
        const camZ = state.walkPos.z - lookDirZ * Math.max(2.5, horizDist);
        const camY = Math.max(1.6, 2.8 + vertDist);

        camera.position.set(camX, camY, camZ);

        // 瞄準點對焦於人偶前方，維持全身在畫面中央下三分之一處，全身雙腿擺動清晰可見
        const lookTarget = new THREE.Vector3(
          state.walkPos.x + lookDirX * 3.8,
          1.25 + Math.sin(pitchClamped) * 1.8,
          state.walkPos.z + lookDirZ * 3.8
        );
        camera.lookAt(lookTarget);
      } else {
        // 第一人稱沉浸視角：相機置於行人雙眼高度 (1.75m)，角色隱藏避免遮擋視野
        if (studentAvatarGroup) studentAvatarGroup.visible = false;
        camera.position.set(state.walkPos.x, 1.75 + bobY, state.walkPos.z);
        const lookTarget = new THREE.Vector3(
          state.walkPos.x + lookDirX * 20,
          1.75 + bobY + Math.sin(state.walkPitch) * 20,
          state.walkPos.z + lookDirZ * 20
        );
        camera.lookAt(lookTarget);
      }
    } else {
      // 鳥瞰軌道模式：支援鍵盤 WASD／方向鍵 與 右上角十字平移按鈕 (panHold) 前後左右平移與縮放
      const moveSpeed = Math.max(1.1, camControl.spherical.radius * 0.0055) * frames60;
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
        camControl.sphericalGoal.radius = Math.max(18, camControl.sphericalGoal.radius * Math.pow(0.975, frames60));
      }
      if (camControl.panHold.zoomOut) {
        camControl.sphericalGoal.radius = Math.min(700, camControl.sphericalGoal.radius * Math.pow(1.025, frames60));
      }

      if (state.navWalking && state.navCurve) {
        const totalDist = Math.max(30, state.navDistance || 300);
        state.navProgress += (NAV_WALK_SPEED * (state.navSpeedMultiplier || 1.0) * dt) / totalDist;

        const progressBar = document.getElementById("navWalkProgressBar");
        if (progressBar) {
          progressBar.style.width = `${Math.min(100, Math.round(state.navProgress * 100))}%`;
        }

        if (state.navProgress >= 1) {
          state.navProgress = 1;
          state.navWalking = false;
          state.navPaused = false;
          const simBtn = document.getElementById("simWalkBtn");
          if (simBtn) simBtn.innerHTML = "🔄 重新帶路";
          showToast("🎉 已抵達目的地！");
        }
        const pt = state.navCurve.getPointAt(state.navProgress);
        walkerMesh.position.copy(pt);
        camControl.targetGoal.set(pt.x, 2.5, pt.z);
        // 不強制覆蓋 sphericalGoal.radius，讓使用者也能自由用滑鼠滾輪隨時縮放視角高度！
      }

      const smooth = 1 - Math.exp(-CAM_SMOOTHING * dt);
      camControl.target.lerp(camControl.targetGoal, smooth);
      camControl.spherical.radius += (camControl.sphericalGoal.radius - camControl.spherical.radius) * smooth;
      camControl.spherical.phi += (camControl.sphericalGoal.phi - camControl.spherical.phi) * smooth;
      camControl.spherical.theta += (camControl.sphericalGoal.theta - camControl.spherical.theta) * smooth;

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
    updateCompass();
  }

  initUI();
  requestAnimationFrame(animate);
})();
