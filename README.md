# 國立臺南大學附屬高級中學 (TNTCSH) — 3D 互動校園導覽地圖

以 **Three.js (WebGL)** 打造的國立南大附中 3D 互動校園導覽，涵蓋全校 35 處建築與場地、115 學年度班級教室配置、特色學程科館介紹、校園步行路線導航與地面漫步模式。純前端靜態網頁，電腦與手機皆可使用。

👉 **線上瀏覽：<https://begin0808.github.io/3Dtntcsh/>**

## ✨ 主要功能

- **🏫 全校 3D 建築導覽**：行政大樓、敬業樓、樂耕樓、利用樓、正德樓、厚生樓、圖書館大樓、各專門學程科館（餐飲、食品加工、機械、畜產、土木、園藝等）、體育場館與球場。點選建築可查看介紹、各樓層教室配置與樓層剖面。
- **🔍 班級與空間搜尋**：輸入班級（如 315、105）、處室、學程或教室名稱，直接飛到所在建築與樓層。
- **🧭 校園路線導航**：選擇起點與終點，沿校內道路與人行步道規劃最短步行路線（Dijkstra 最短路徑演算法），顯示距離與步行時間，並可「模擬沿路帶路」。
- **🚶 地面實境漫步**：以男／女同學角色在校園中行走，支援第三人稱與第一人稱視角、跑步／步行切換。角色不會穿過建築物或走出校園圍牆。
- **🎓 特色學程導覽**：學術學程與 7 個專門學程，一鍵標示所屬科館。
- **🎨 三種視覺風格**：晴空寫實、像素冒險、微縮積木。

## 🕹️ 操作方式

| | 電腦 | 手機／平板 |
|---|---|---|
| 平移 | 左鍵拖曳（可於右上角切換為旋轉）、WASD／方向鍵 | 單指拖曳 |
| 旋轉 | 右鍵拖曳 | 雙指旋轉 |
| 縮放 | 滾輪 | 雙指捏合 |
| 俯視角度 | 右鍵上下拖曳 | 雙指上下滑動 |
| 漫步移動 | WASD／方向鍵 | 左下角搖桿 |
| 回正北 | 點羅盤 | 點羅盤 |

手機版（寬度 ≤ 900px 或手機橫放）會切換為精簡版面：功能集中在底部工具列，導航、建築介紹、學程等面板由下方滑出。

## 📁 專案結構

```
index.html            頁面結構
css/style.css         版面與樣式（含手機精簡版面）
js/app.js             主程式：鏡頭操控、觸控手勢、搜尋、導航、漫步與碰撞
js/buildings-3d.js    3D 場景：地面、道路、圍牆、樹木與各建築模型
js/vendor/three.min.js  Three.js r128（MIT 授權，放在專案內不依賴外部 CDN）
data/school-year.js   每學年更新資料：學年度、建築名稱與介紹、各樓層班級教室配置
data/campus-data.js   校園結構資料：建築位置與外觀、學程、道路、導航路網
manifest.webmanifest  「加到主畫面」設定
assets/               校徽、App 圖示 (icons/)、社群分享預覽圖 (og-image.png)
```

### 每學年更新（行政人員）

換學年時只需修改 `data/school-year.js`，檔案開頭有填寫說明：

- `academicYear`：學年度，頁首與版權說明會自動顯示。
- `welcomeBannerText`：校門口電子看板的文字。
- `buildings`：各建築的名稱、介紹、特色標籤與各樓層空間。每層依建築走向排列（每棟第一行註解標示「由西 → 東」或「由北 → 南」），班級的 `type` 為 `class1`／`class2`／`class3`（高一／高二／高三）。

### 修改校園結構

`data/campus-data.js` 的座標單位為公尺，**北方為 -Z、東方為 +X**：

- `buildings`：建築位置、尺寸、樓層數與外觀（名稱與教室在 `school-year.js`）。
- `internalRoads`／`walkways`：校內車道與人行步道（同時影響樹木避讓）。
- `navNodes`／`navEdges`：導航路網節點與連線；`buildingNavNode` 指定每棟建築的主入口節點（每棟建築應有自己的入口）。
- `extraNavTargets`：同一棟建築的其他入口（例如圖書館北側的資訊應用學程入口），會出現在導航終點選單；搜尋到 `floors` 所列樓層的教室時也會改走這個入口。
- 新增或移動道路時，請一併更新導航路網，以及 `js/buildings-3d.js` 中的 `isPositionOnRoad`（樹木避讓範圍）。

## 🚀 部署與本機預覽

本專案不需建置，可直接部署於 **GitHub Pages** 或 **Vercel**：

- **GitHub Pages**：儲存庫 `Settings` → `Pages` → `Deploy from a branch`，選擇 `main` / `/ (root)`。
- **本機預覽**（需透過 HTTP 伺服器開啟）：
  ```bash
  python -m http.server 8080
  ```
  接著於瀏覽器開啟 `http://localhost:8080`。

### 加到主畫面與分享預覽

- 手機瀏覽器選單中的「加到主畫面」會以全螢幕 App 方式開啟（設定在 `manifest.webmanifest`）。
- 貼到 LINE、Facebook 時顯示的標題與預覽圖設定在 `index.html` 的 `og:` 標籤，圖片為 `assets/og-image.png`。若網站網址變更，請一併修改 `og:url` 與 `og:image`。

## 📜 版權與資料來源

- © [國立臺南大學附屬高級中學](https://www.tntcsh.tn.edu.tw/)。班級教室配置與校園空間資料由本校彙整建置。
- 校園周邊街道與校界資料引用自 [OpenStreetMap](https://www.openstreetmap.org/way/161510567)（[© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，ODbL 授權）。
- 3D 引擎：[Three.js](https://threejs.org/)（MIT License）。

## 🧑‍🏫 開發者與意見回饋

- 系統開發：李佳恩老師
- 歡迎來信提供建議與指正：[begin@gm.tntcsh.tn.edu.tw](mailto:begin@gm.tntcsh.tn.edu.tw)
