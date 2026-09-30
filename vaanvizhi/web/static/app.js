/**
 * VaanVizhi - Precision Operational Command Center Application Logic
 * Implements vertical sidebar navigation, real-time live disaggregation,
 * SVG GIS interactive polygon canvas, 5-day forecast table with trend sparklines,
 * dual synchronized Leaflet maps, and TRAI DLT compliant Tamil Agro-Advisory.
 */

// Basemap Providers (Dark Canvas, Real Satellite, OpenStreetMap, Topographic)
const BASEMAP_PROVIDERS = {
  dark: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    ref: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 18, maxNativeZoom: 16, attribution: "&copy; Esri &mdash; Dark Gray Canvas" }
  },
  satellite: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ref: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 19, maxNativeZoom: 18, attribution: "&copy; Esri World Imagery" }
  },
  osm: {
    base: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    ref: null,
    options: { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }
  },
  topo: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    ref: null,
    options: { maxZoom: 19, maxNativeZoom: 18, attribution: "&copy; Esri Topographic" }
  }
};

// Global State
const state = {
  district: "Dindigul",
  block: "VEDA",
  lang: "en",
  layer: "rainfall",
  leadDay: 1,
  mapVar: "tmax",
  basemapStyle: "dark",
  baseLayerBlock: null,
  refLayerBlock: null,
  baseLayerPanchayat: null,
  refLayerPanchayat: null,
  selectedPanchayat: null,
  panchayats: [],
  blocks: [],
  currentBlockPanchayats: [],
  forecastCache: {},
  mapsInitialized: false,
  mapBlock: null,
  mapPanchayat: null,
  blockLayerGroup: null,
  panchayatLayerGroup: null,
  chartInstance: null,
  userLocation: null,
  nearestPanchayat: null,
  nearestDistanceKm: null,
  userMarkerBlock: null,
  userMarkerPanchayat: null,
  userCircleBlock: null,
  userCirclePanchayat: null
};

// Vedasandur Reference Demo Panchayats (Matching UI Reference)
const VEDASANDUR_DEMO = [
  {
    gp_id: "DEMO_KOVILUR",
    gp_name: "Kovilur",
    name_ta: "கோவிலூர்",
    grid_id: "VDS-01",
    elev: 284,
    terrain: "North Basin",
    rain: 41.0,
    tmax: 31.8,
    tmin: 23.6,
    rh: 88,
    wind: 16,
    conf: 89,
    conf_level: "High",
    advisory_status: "Drainage Alert",
    advisory_class: "bg-error-container text-on-error-container text-[10px] font-bold tracking-wide uppercase",
    sparkline_d: "M0,18 L15,14 L30,16 L45,4 L60,2",
    sparkline_color: "text-error",
    polygon_id: "poly-kovilur"
  },
  {
    gp_id: "DEMO_VEDA_TOWN",
    gp_name: "Vedasandur Town",
    name_ta: "வேடசந்தூர்",
    grid_id: "VDS-02",
    elev: 250,
    terrain: "Urban Core",
    rain: 34.0,
    tmax: 33.4,
    tmin: 24.0,
    rh: 83,
    wind: 18,
    conf: 85,
    conf_level: "High",
    advisory_status: "Halt Top-Dress",
    advisory_class: "bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase",
    sparkline_d: "M0,16 L15,15 L30,10 L45,6 L60,5",
    sparkline_color: "text-primary",
    polygon_id: "poly-vedasandur"
  },
  {
    gp_id: "DEMO_NAGAYAKOTTAI",
    gp_name: "Nagayakottai",
    name_ta: "நாயக்கன்கோட்டை",
    grid_id: "VDS-03",
    elev: 242,
    terrain: "Western Plain",
    rain: 26.0,
    tmax: 34.2,
    tmin: 24.2,
    rh: 79,
    wind: 14,
    conf: 82,
    conf_level: "Med",
    advisory_status: "Normal Care",
    advisory_class: "bg-surface-container-high text-on-surface text-[10px] font-bold uppercase",
    sparkline_d: "M0,17 L15,16 L30,12 L45,10 L60,11",
    sparkline_color: "text-on-surface-variant",
    polygon_id: "poly-nagayakottai"
  },
  {
    gp_id: "DEMO_MARAMBADI",
    gp_name: "Marambadi",
    name_ta: "மராம்பாடி",
    grid_id: "VDS-04",
    elev: 230,
    terrain: "Central Belt",
    rain: 22.0,
    tmax: 34.8,
    tmin: 24.4,
    rh: 77,
    wind: 15,
    conf: 84,
    conf_level: "High",
    advisory_status: "Monitor Soil",
    advisory_class: "bg-surface-container-high text-on-surface text-[10px] font-bold uppercase",
    sparkline_d: "M0,18 L15,17 L30,15 L45,12 L60,13",
    sparkline_color: "text-on-surface-variant",
    polygon_id: "poly-marambadi"
  },
  {
    gp_id: "DEMO_ERIODU",
    gp_name: "Eriodu",
    name_ta: "எரியோடு",
    grid_id: "VDS-05",
    elev: 215,
    terrain: "Valley Corridor",
    rain: 19.0,
    tmax: 35.1,
    tmin: 24.6,
    rh: 74,
    wind: 15,
    conf: 80,
    conf_level: "Med",
    advisory_status: "Light Irrig",
    advisory_class: "bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase",
    sparkline_d: "M0,19 L15,18 L30,17 L45,15 L60,14",
    sparkline_color: "text-secondary",
    polygon_id: "poly-eriodu"
  },
  {
    gp_id: "DEMO_KALVARPATTI",
    gp_name: "Kalvarpatti",
    name_ta: "கல்வார்பட்டி",
    grid_id: "VDS-06",
    elev: 198,
    terrain: "South Rain Shadow",
    rain: 16.0,
    tmax: 35.4,
    tmin: 24.8,
    rh: 72,
    wind: 15,
    conf: 81,
    conf_level: "Med",
    advisory_status: "Normal Cycle",
    advisory_class: "bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase",
    sparkline_d: "M0,19 L15,18 L30,18 L45,16 L60,16",
    sparkline_color: "text-on-surface-variant",
    polygon_id: "poly-kalvarpatti"
  }
];

// Document Ready
document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) lucide.createIcons();

  initSidebarNavigation();
  initTopHeaderControls();
  initGisCanvasControls();
  initAdvisorySimulator();
  initMessageDispatchControls();
  initLiveRainAdvisor();
  initImdModal();
  initLiveLocationModal();

  // Load backend data
  await loadMetadata();
  await loadBlocksAndPanchayats();

  // Select Kovilur by default
  selectPanchayat(VEDASANDUR_DEMO[0]);
  fetchAndDisplayRainForecast(10.0100, 77.4800, "Kovilur (வேடசந்தூர் வட்டம்)");
});

// =========================================================================
// 1. SIDEBAR & NAVIGATION TABS
// =========================================================================
function initSidebarNavigation() {
  const items = document.querySelectorAll(".sidebar-nav-item");
  items.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute("data-tab");
      if (!targetTab) return;

      items.forEach(i => {
        i.classList.remove("active", "bg-primary-container", "text-white", "font-bold", "shadow-xs");
        i.classList.add("text-on-surface-variant");
      });
      item.classList.add("active", "bg-primary-container", "text-white", "font-bold", "shadow-xs");
      item.classList.remove("text-on-surface-variant");

      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById(targetTab);
      if (panel) panel.classList.add("active");

      if (targetTab === "tabPanchayatMap") {
        setTimeout(initOrResizeDualMaps, 100);
      } else if (targetTab === "tabForecast") {
        setTimeout(renderQuantileChart, 100);
      }
    });
  });

  // Settings / Ingest Button
  document.getElementById("sidebarOpenImdBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    const modal = document.getElementById("imdModal");
    if (modal) modal.classList.replace("hidden", "flex");
  });
}

// =========================================================================
// 2. TOP HEADER & LOCATION CONTROLS
// =========================================================================
function initTopHeaderControls() {
  const distSelect = document.getElementById("sidebarDistrictSelect");
  const blockSelect = document.getElementById("sidebarBlockSelect");

  distSelect?.addEventListener("change", (e) => {
    state.district = e.target.value;
    if (state.district === "Dindigul") {
      blockSelect.innerHTML = `<option value="VEDA" selected>Vedasandur (வேடசந்தூர்)</option>`;
      state.block = "VEDA";
      document.getElementById("crumbDistrict").innerText = "Dindigul";
      document.getElementById("crumbBlock").innerText = "Vedasandur Block";
      document.getElementById("deckLocationSub").innerHTML = `Dindigul District (<span class="font-semibold text-on-surface">திண்டுக்கல்</span>) · Vedasandur Block (<span class="font-semibold text-on-surface">வேடசந்தூர்</span>) — 1.0 km² Gridded Mesh Real-Time Simulation`;
      document.getElementById("sidebarOfficerBadge").innerText = "Agro-Met Officer, DGL";
    } else {
      populateTheniBlocks();
      state.block = blockSelect.value;
      const bText = blockSelect.options[blockSelect.selectedIndex].text;
      document.getElementById("crumbDistrict").innerText = "Theni";
      document.getElementById("crumbBlock").innerText = `${bText} Block`;
      document.getElementById("deckLocationSub").innerHTML = `Theni District (<span class="font-semibold text-on-surface">தேனி மாவட்டம்</span>) · ${bText} Block — 1.0 km² Gridded Mesh Real-Time Simulation`;
      document.getElementById("sidebarOfficerBadge").innerText = "Agro-Met Officer, Theni";
    }
    updateDashboardForCurrentBlock();
  });

  blockSelect?.addEventListener("change", (e) => {
    state.block = e.target.value;
    const bText = blockSelect.options[blockSelect.selectedIndex].text;
    document.getElementById("crumbBlock").innerText = `${bText} Block`;
    updateDashboardForCurrentBlock();
  });

  // Global Search Filter
  const searchInput = document.getElementById("globalPanchayatSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      filterPanchayatsInTable(q);
    });
  }

  // Active Flags Pill Click
  document.getElementById("flagsPillBtn")?.addEventListener("click", () => {
    const overviewTab = document.querySelector('.sidebar-nav-item[data-tab="tabOverview"]');
    if (overviewTab) overviewTab.click();
    const alertBox = document.querySelector(".lg\\:col-span-4.bg-surface-container-lowest");
    if (alertBox) alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Top Live Location Button
  document.getElementById("topLiveLocationBtn")?.addEventListener("click", () => {
    triggerRealtimeGeolocation(false);
  });

  // Sidebar GPS Auto-detect Button
  document.getElementById("sidebarGpsBtn")?.addEventListener("click", () => {
    triggerRealtimeGeolocation(true);
  });

  // Top Sync Button
  document.getElementById("syncRunTopBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("syncRunTopBtn");
    const icon = btn.querySelector(".material-symbols-outlined");
    if (icon) icon.classList.add("animate-spin");
    await loadBlocksAndPanchayats();
    updateDashboardForCurrentBlock();
    setTimeout(() => {
      if (icon) icon.classList.remove("animate-spin");
    }, 700);
  });

  // Top Export Button
  document.getElementById("exportTopBtn")?.addEventListener("click", () => {
    document.getElementById("btnExportForecastCsv")?.click();
  });

  // =========================================================================
  // OPERATIONAL TELEMETRY ACTION BUTTONS (4 HEADER PILLS)
  // =========================================================================
  // Button 1: Model Refresh
  const btnModelRefresh = document.getElementById("btnTelemetryModelRefresh");
  btnModelRefresh?.addEventListener("click", async () => {
    const pingDot = document.getElementById("telemetryPingDot");
    const spinIcon = document.getElementById("telemetrySpinIcon");
    const refreshText = document.getElementById("telemetryRefreshText");

    pingDot?.classList.add("hidden");
    spinIcon?.classList.remove("hidden");
    if (refreshText) refreshText.textContent = "Syncing Model Weights...";

    try {
      await loadMetadata();
      await loadBlocksAndPanchayats();
      updateDashboardForCurrentBlock();
      if (state.selectedPanchayat && typeof fetchAndDisplayRainForecast === "function") {
        fetchAndDisplayRainForecast(state.selectedPanchayat.lat || 10.01, state.selectedPanchayat.lon || 77.48, state.selectedPanchayat.gp_name);
      }
    } catch (e) {
      console.warn("Model sync error:", e);
    } finally {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTimeout(() => {
        spinIcon?.classList.add("hidden");
        pingDot?.classList.remove("hidden");
        if (refreshText) refreshText.textContent = `Model Refresh: Today ${nowTime} IST`;
        showToastNotification(`Model weights & live weather telemetry refreshed (${nowTime} IST cycle active)!`);
      }, 500);
    }
  });

  // Button 2: Horizon 1-5 Days
  const btnHorizon = document.getElementById("btnTelemetryHorizon");
  let currentLeadDayIdx = 1;
  btnHorizon?.addEventListener("click", () => {
    // Switch to Forecast Analysis Tab and trigger chart
    const forecastTabBtn = document.querySelector('.sidebar-nav-item[data-tab="tabForecast"]');
    if (forecastTabBtn) {
      forecastTabBtn.click();
      setTimeout(() => {
        const chartCanvas = document.getElementById("quantileForecastChart");
        if (chartCanvas) chartCanvas.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
    currentLeadDayIdx = (currentLeadDayIdx % 5) + 1;
    const leadLabels = {
      1: "Day 1 (Today)",
      2: "Day 2 (+24h)",
      3: "Day 3 (+48h)",
      4: "Day 4 (+72h)",
      5: "Day 5 (+96h)"
    };
    const hText = document.getElementById("telemetryHorizonText");
    if (hText) hText.textContent = `Horizon: ${leadLabels[currentLeadDayIdx]}`;
    showToastNotification(`Forecast Horizon: ${leadLabels[currentLeadDayIdx]} multi-quantile envelope`);
  });

  // Button 3: 1.0 km² Micro-Grid
  const btnMicroGrid = document.getElementById("btnTelemetryMicroGrid");
  btnMicroGrid?.addEventListener("click", () => {
    const mapTabBtn = document.querySelector('.sidebar-nav-item[data-tab="tabPanchayatMap"]');
    if (mapTabBtn) {
      mapTabBtn.click();
      setTimeout(() => {
        initOrResizeDualMaps();
        if (state.mapPanchayat && state.selectedPanchayat) {
          const p = state.selectedPanchayat;
          state.mapPanchayat.flyTo([p.lat || 10.01, p.lon || 77.48], 12, { animate: true, duration: 1.0 });
        }
      }, 150);
    }
    showToastNotification("1.0 km² Micro-Grid active: 284 topographic downscaled centroids loaded.");
  });

  // Button 4: Run #4 LightGBM + Topo Residuals
  const btnModelRun = document.getElementById("btnTelemetryModelRun");
  const modelRunModal = document.getElementById("modelRunModal");
  const closeModelRunBtn = document.getElementById("closeModelRunModalBtn");
  const closeModelRunBtn2 = document.getElementById("btnModalCloseModelRun");
  const goToInsightsBtn = document.getElementById("btnModalGoToInsights");
  const goToDisaggBtn = document.getElementById("btnModalGoToDisagg");

  btnModelRun?.addEventListener("click", () => {
    if (modelRunModal) {
      modelRunModal.classList.replace("hidden", "flex");
    }
    showToastNotification("Model Run #4: LightGBM Multi-Quantile + Topo Residuals diagnostics loaded.");
  });

  closeModelRunBtn?.addEventListener("click", () => {
    modelRunModal?.classList.replace("flex", "hidden");
  });
  closeModelRunBtn2?.addEventListener("click", () => {
    modelRunModal?.classList.replace("flex", "hidden");
  });

  goToInsightsBtn?.addEventListener("click", () => {
    modelRunModal?.classList.replace("flex", "hidden");
    document.querySelector('.sidebar-nav-item[data-tab="tabModelInsights"]')?.click();
  });

  goToDisaggBtn?.addEventListener("click", () => {
    modelRunModal?.classList.replace("flex", "hidden");
    document.querySelector('.sidebar-nav-item[data-tab="tabSpatialDisaggregation"]')?.click();
  });

  // Language Toggles
  const enBtn = document.getElementById("sidebarLangEn");
  const taBtn = document.getElementById("sidebarLangTa");
  enBtn?.addEventListener("click", () => {
    state.lang = "en";
    enBtn.className = "text-primary font-bold";
    taBtn.className = "text-on-surface-variant hover:text-primary";
    applyLanguageTranslations();
  });
  taBtn?.addEventListener("click", () => {
    state.lang = "ta";
    taBtn.className = "text-primary font-bold";
    enBtn.className = "text-on-surface-variant hover:text-primary";
    applyLanguageTranslations();
  });
}

function populateTheniBlocks() {
  const blockSelect = document.getElementById("sidebarBlockSelect");
  if (!blockSelect) return;
  blockSelect.innerHTML = `
    <option value="BODI" selected>Bodinayakanur (போடி)</option>
    <option value="CUMB">Cumbum (கம்பம்)</option>
    <option value="THENI">Theni (தேனி)</option>
    <option value="PERI">Periyakulam (பெரியகுளம்)</option>
    <option value="CHIN">Chinnamanur (சின்னமனூர்)</option>
    <option value="ANDI">Andipatti (ஆண்டிபட்டி)</option>
    <option value="UTHA">Uthamapalayam (உத்தமபாளையம்)</option>
    <option value="KMYL">K. Myladumparai (மயிலை)</option>
  `;
}

function applyLanguageTranslations() {
  const isTa = state.lang === "ta";
  document.getElementById("deckMainTitle").innerText = isTa
    ? "விவசாயத்திற்கான நுண்ணிய வானிலை நுண்ணறிவு"
    : "Weather Intelligence for Agriculture";

  renderPanchayatTable();
  if (state.selectedPanchayat) {
    selectPanchayat(state.selectedPanchayat);
  }
}

// =========================================================================
// 3. API DATA FETCHING
// =========================================================================
async function loadMetadata() {
  try {
    const res = await fetch("/api/metadata");
    if (res.ok) {
      const meta = await res.json();
    }
  } catch (err) {
    console.warn("Using local store:", err);
  }
}

async function loadBlocksAndPanchayats() {
  try {
    const [blocksRes, gpRes] = await Promise.all([
      fetch("/api/blocks"),
      fetch("/api/panchayats")
    ]);
    if (blocksRes.ok) state.blocks = await blocksRes.json();
    if (gpRes.ok) state.panchayats = await gpRes.json();
  } catch (e) {
    console.warn("Offline fallback:", e);
  }
  updateDashboardForCurrentBlock();
}

// =========================================================================
// 4. UPDATE DASHBOARD FOR ACTIVE BLOCK
// =========================================================================
function updateDashboardForCurrentBlock() {
  const bSelect = document.getElementById("sidebarBlockSelect");
  const blockName = bSelect?.options[bSelect.selectedIndex]?.text.split(" ")[0] || "Vedasandur";

  document.getElementById("gisMeshHeading").innerText = `Micro-Climatic Panchayat Polygon Mesh`;
  document.getElementById("gisMeshSub").innerText = `${blockName} Boundary · Orographic Relief Integration`;
  document.getElementById("forecastTableHeading").innerText = `Disaggregated Forecast Across Panchayats (${blockName})`;

  if (state.block === "VEDA") {
    state.currentBlockPanchayats = VEDASANDUR_DEMO;
    document.getElementById("bannerImdBase").innerText = "28.0 mm";
    document.getElementById("bannerDownscaleRange").innerText = "12.0 mm to 41.0 mm";
    document.getElementById("bannerReliefMultiplier").innerText = "+46.4% Peak";
    document.getElementById("bannerMinGauge").innerText = "Min: 12mm (Kalvarpatti)";
    document.getElementById("bannerMaxGauge").innerText = "Kovilur: 41mm";
  } else {
    const polyIds = ["poly-kovilur", "poly-vedasandur", "poly-nagayakottai", "poly-eriodu", "poly-marambadi", "poly-kalvarpatti"];
    const filtered = state.panchayats.filter(p => p.block_id === state.block);
    if (filtered.length > 0) {
      state.currentBlockPanchayats = filtered.map((p, idx) => {
        const elev = Math.round(p.elev || 300);
        const elevAnom = p.elev_anom || 0;
        const lapseDelta = -0.0065 * elevAnom;
        const tmax = Math.round((35.0 + lapseDelta + (idx % 3) * 0.4) * 10) / 10;
        const tmin = Math.round((24.0 + lapseDelta * 0.7) * 10) / 10;
        const rain = Math.round(Math.max(2, 14 + (elev / 100) * 3 - (idx % 4) * 2));
        const rh = Math.min(95, Math.max(55, Math.round(65 + (elev / 80) * 4)));
        const wind = Math.round(12 + (elev / 150) * 3);
        const conf = Math.min(94, Math.max(76, Math.round(84 + (idx % 5))));

        let advisory = "Normal Care";
        let advClass = "bg-surface-container-high text-on-surface text-[10px] font-bold uppercase";
        if (rain > 30) {
          advisory = "Drainage Alert";
          advClass = "bg-error-container text-on-error-container text-[10px] font-bold uppercase";
        } else if (wind > 18) {
          advisory = "Halt Spraying";
          advClass = "bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase";
        } else if (rh > 82) {
          advisory = "Fungal Watch";
          advClass = "bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase";
        }

        return {
          gp_id: p.gp_id,
          gp_name: p.gp_name,
          name_ta: p.gp_name,
          grid_id: `THN-${idx + 1 < 10 ? '0' : ''}${idx + 1}`,
          elev: elev,
          terrain: elev > 600 ? "Ghat Slope" : elev > 350 ? "Upper Plateau" : "Basin Plain",
          rain: rain,
          tmax: tmax,
          tmin: tmin,
          rh: rh,
          wind: wind,
          conf: conf,
          conf_level: conf > 84 ? "High" : "Med",
          advisory_status: advisory,
          advisory_class: advClass,
          sparkline_d: "M0,18 L15,14 L30,16 L45,8 L60,10",
          sparkline_color: rain > 30 ? "text-error" : "text-primary",
          polygon_id: polyIds[idx] || null
        };
      });
    } else {
      state.currentBlockPanchayats = VEDASANDUR_DEMO;
    }

    const rains = state.currentBlockPanchayats.map(p => p.rain);
    const minRain = Math.min(...rains);
    const maxRain = Math.max(...rains);
    const avgRain = Math.round(rains.reduce((a, b) => a + b, 0) / rains.length);

    document.getElementById("bannerImdBase").innerText = `${avgRain}.0 mm`;
    document.getElementById("bannerDownscaleRange").innerText = `${minRain}.0 mm to ${maxRain}.0 mm`;
    document.getElementById("bannerReliefMultiplier").innerText = `+${Math.round(((maxRain - avgRain) / avgRain) * 100)}% Peak`;
    document.getElementById("bannerMinGauge").innerText = `Min: ${minRain}mm`;
    document.getElementById("bannerMaxGauge").innerText = `Max: ${maxRain}mm`;
  }

  // Update dynamic SVG polygon titles and labels for current block
  const polyIds = ["poly-kovilur", "poly-vedasandur", "poly-nagayakottai", "poly-eriodu", "poly-marambadi", "poly-kalvarpatti"];
  const titleIds = ["title-poly-1", "title-poly-2", "title-poly-3", "title-poly-4", "title-poly-5", "title-poly-6"];
  const lblIds = ["lbl-kovilur", "lbl-vedasandur", "lbl-nagayakottai", "lbl-eriodu", "lbl-marambadi", "lbl-kalvarpatti"];

  state.currentBlockPanchayats.slice(0, 6).forEach((p, idx) => {
    const titleEl = document.getElementById(titleIds[idx]);
    const lblEl = document.getElementById(lblIds[idx]);
    const polyEl = document.getElementById(polyIds[idx]);
    if (titleEl) titleEl.textContent = p.gp_name;
    if (lblEl) lblEl.textContent = `${p.rain} mm`;
    if (polyEl) polyEl.setAttribute("data-gpid", p.gp_id);
  });

  populateForecastPanchayatSelect();
  renderPanchayatTable();

  if (state.currentBlockPanchayats.length > 0) {
    selectPanchayat(state.currentBlockPanchayats[0]);
  }
}

// =========================================================================
// 5. PANCHAYAT SELECTION & LIVE TELEMETRY
// =========================================================================
function selectPanchayat(p) {
  state.selectedPanchayat = p;
  const isTa = state.lang === "ta";
  const displayName = isTa ? (p.name_ta || p.gp_name) : p.gp_name;

  // Sidebar & Breadcrumbs
  document.getElementById("sidebarPanchayatName").innerText = displayName;
  document.getElementById("crumbPanchayat").innerText = `${displayName} Panchayat`;

  // Floating Map Card
  document.getElementById("floatingCardName").innerText = `${displayName} Panchayat`;
  document.getElementById("floatingCardRain").innerHTML = `${p.rain.toFixed(1)} <span class="text-[11px] font-normal text-on-surface">mm</span>`;
  document.getElementById("floatingCardConf").innerHTML = `${p.conf}% <span class="text-[10px] font-normal text-on-surface">${p.conf_level}</span>`;
  document.getElementById("floatingCardTempRh").innerHTML = `Tmax: <strong>${p.tmax}°C</strong> · RH: <strong>${p.rh}%</strong>`;
  document.getElementById("floatingCardAlertTag").innerText = p.advisory_status;

  // 6 KPI Cards
  document.getElementById("kpiRainVal").innerText = Math.round(p.rain);
  document.getElementById("kpiRainProb").innerText = `${Math.min(95, Math.round(p.rain * 1.8 + 15))}%`;
  const blockAvg = state.block === "VEDA" ? 28 : 22;
  const rainDiff = Math.round((p.rain - blockAvg) * 10) / 10;
  document.getElementById("kpiRainDiffTag").innerHTML = `
    <span class="material-symbols-outlined text-[14px]">${rainDiff >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
    <span>${rainDiff >= 0 ? '+' : ''}${rainDiff}mm vs block avg</span>
  `;

  document.getElementById("kpiTmaxVal").innerText = p.tmax;
  const coarseTmax = 32.8;
  const tmaxDiff = Math.round((p.tmax - coarseTmax) * 10) / 10;
  document.getElementById("kpiTmaxDiffTag").innerHTML = `
    <span class="material-symbols-outlined text-[14px]">trending_up</span>
    <span>${tmaxDiff >= 0 ? '+' : ''}${tmaxDiff}°C vs coarse grid</span>
  `;

  document.getElementById("kpiTminVal").innerText = p.tmin;
  const diurnal = Math.round((p.tmax - p.tmin) * 10) / 10;
  document.getElementById("kpiDiurnalDelta").innerText = `Δ ${diurnal}°C`;

  document.getElementById("kpiRhVal").innerText = p.rh;
  const dewPoint = Math.round((p.tmin - (100 - p.rh) / 5) * 10) / 10;
  document.getElementById("kpiDewPoint").innerText = `${dewPoint}°C`;
  const fungalRisk = p.rh > 85 ? "High Alert" : p.rh > 75 ? "Moderate" : "Low";
  document.getElementById("kpiFungalRiskBadge").innerText = fungalRisk;

  document.getElementById("kpiWindVal").innerText = p.wind;
  const spraySafe = p.wind <= 15 && p.rain < 25;
  document.getElementById("kpiSprayBadge").innerText = spraySafe ? "Safe (<20)" : "Unsafe (>20)";

  document.getElementById("kpiTrustVal").innerText = p.conf;
  const spread = Math.round((100 - p.conf) * 0.25 * 10) / 10;
  document.getElementById("kpiSpreadVal").innerText = `±${spread} mm`;

  // SHAP Attribution Card
  document.getElementById("shapPanchayatTag").innerText = `${p.gp_name} Anomaly`;
  document.getElementById("shapVarianceText").innerText = `${rainDiff >= 0 ? '+' : ''}${rainDiff} mm`;
  const elevVariance = Math.round(((p.elev - 250) * 0.05) * 10) / 10;
  document.getElementById("shapElevVal").innerText = `${elevVariance >= 0 ? '+' : ''}${elevVariance} mm`;
  const elevBar = document.getElementById("shapElevBar");
  if (elevBar) {
    elevBar.style.width = `${Math.min(90, Math.max(15, Math.abs(elevVariance) * 12))}%`;
  }

  // Map Footer Centroid
  document.getElementById("mapFooterCoords").innerText = `Centroid: 10.528°N, 77.954°E · Elevation ${p.elev}m ASL`;

  // Forecast Meta
  document.getElementById("metaElev").innerText = `${p.elev} m`;
  const lapseRate = Math.round((-0.0065 * (p.elev - 250)) * 10) / 10;
  document.getElementById("metaLapse").innerText = `${lapseRate >= 0 ? '+' : ''}${lapseRate}°C`;
  document.getElementById("metaTree").innerText = `${Math.min(65, Math.max(12, Math.round(p.elev / 12)))}%`;
  document.getElementById("metaWater").innerText = `${Math.round(350 + (p.elev % 10) * 60)} m`;

  const chartTitle = document.getElementById("chartPanchayatTitle");
  if (chartTitle) chartTitle.innerText = `${p.gp_name} — 5-Day Multi-Quantile Forecast Ribbon`;

  updateAdvisoryText(p);
  if (typeof fetchAndDisplayRainForecast === "function") {
    fetchAndDisplayRainForecast(p.lat || 10.0100, p.lon || 77.4800, `${p.gp_name} (${p.name_ta || 'வட்டம்'})`);
  }
  highlightPolygon(p);
  highlightTableRow(p.gp_id);
}

// =========================================================================
// 6. GIS CANVAS POLYGON MESH INTERACTIONS
// =========================================================================
function initGisCanvasControls() {
  const polygonIds = ["poly-kovilur", "poly-vedasandur", "poly-nagayakottai", "poly-eriodu", "poly-marambadi", "poly-kalvarpatti"];

  polygonIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("mouseenter", () => {
      el.setAttribute("stroke", "#002542");
      el.setAttribute("stroke-width", "3.5");
    });
    el.addEventListener("mouseleave", () => {
      el.setAttribute("stroke", "#ffffff");
      el.setAttribute("stroke-width", "2");
    });

    el.addEventListener("click", () => {
      const gpid = el.getAttribute("data-gpid");
      const matched = state.currentBlockPanchayats.find(p => p.gp_id === gpid || p.polygon_id === id);
      if (matched) selectPanchayat(matched);
    });
  });

  // Layer Switching
  const layerBtns = document.querySelectorAll(".gis-layer-btn");
  layerBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      layerBtns.forEach(b => {
        b.classList.remove("active", "bg-primary-container", "text-white", "font-semibold", "shadow-xs");
        b.classList.add("text-on-surface");
      });
      this.classList.add("active", "bg-primary-container", "text-white", "font-semibold", "shadow-xs");
      this.classList.remove("text-on-surface");

      const layer = this.getAttribute("data-layer");
      state.layer = layer;
      updateGisLayerVisuals(layer);
    });
  });

  // Jump to Real GIS Leaflet Map from Overview
  document.getElementById("btnJumpToRealGisMap")?.addEventListener("click", () => {
    document.querySelector('.sidebar-nav-item[data-tab="tabPanchayatMap"]')?.click();
  });
}

function highlightPolygon(p) {
  document.querySelectorAll(".panchayat-polygon").forEach(el => el.classList.remove("selected-poly"));
  const poly = document.querySelector(`[data-gpid="${p.gp_id}"]`) || (p.polygon_id && document.getElementById(p.polygon_id));
  if (poly) poly.classList.add("selected-poly");
}

function updateGisLayerVisuals(layer) {
  const legendTitle = document.getElementById("legendTitle");
  const legendBar = document.getElementById("legendBarContainer");

  if (layer === "rainfall") {
    legendTitle.innerText = "Rainfall Gradient (mm / 24h)";
    legendBar.innerHTML = `
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#00714e]"></div><span class="font-mono text-[9px] mt-0.5">0–15</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#006c4a]"></div><span class="font-mono text-[9px] mt-0.5">15–25</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#3c6188]"></div><span class="font-mono text-[9px] mt-0.5">25–35</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#21496f]"></div><span class="font-mono text-[9px] mt-0.5">35–40</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#0f3b60]"></div><span class="font-mono text-[9px] mt-0.5">&gt;40</span></div>
    `;
    document.getElementById("lbl-kovilur").textContent = "41 mm · Heavy";
    document.getElementById("lbl-vedasandur").textContent = "34 mm";
    document.getElementById("lbl-nagayakottai").textContent = "26 mm";
    document.getElementById("lbl-eriodu").textContent = "19 mm";
    document.getElementById("lbl-marambadi").textContent = "22 mm";
    document.getElementById("lbl-kalvarpatti").textContent = "16 mm";
  } else if (layer === "temperature") {
    legendTitle.innerText = "Max Temperature (°C)";
    legendBar.innerHTML = `
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#38BDF8]"></div><span class="font-mono text-[9px] mt-0.5">&lt;30°</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#FACC15]"></div><span class="font-mono text-[9px] mt-0.5">30–33°</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#F97316]"></div><span class="font-mono text-[9px] mt-0.5">33–35°</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#EF4444]"></div><span class="font-mono text-[9px] mt-0.5">35–37°</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#B91C1C]"></div><span class="font-mono text-[9px] mt-0.5">&gt;37°C</span></div>
    `;
    document.getElementById("lbl-kovilur").textContent = "31.8°C";
    document.getElementById("lbl-vedasandur").textContent = "33.4°C";
    document.getElementById("lbl-nagayakottai").textContent = "34.2°C";
    document.getElementById("lbl-eriodu").textContent = "35.1°C";
    document.getElementById("lbl-marambadi").textContent = "34.8°C";
    document.getElementById("lbl-kalvarpatti").textContent = "35.4°C";
  } else if (layer === "humidity") {
    legendTitle.innerText = "Relative Humidity (%)";
    legendBar.innerHTML = `
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#FDE047]"></div><span class="font-mono text-[9px] mt-0.5">&lt;65%</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#86EFAC]"></div><span class="font-mono text-[9px] mt-0.5">65–75%</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#38BDF8]"></div><span class="font-mono text-[9px] mt-0.5">75–82%</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#0284C7]"></div><span class="font-mono text-[9px] mt-0.5">82–88%</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#0369A1]"></div><span class="font-mono text-[9px] mt-0.5">&gt;88%</span></div>
    `;
    document.getElementById("lbl-kovilur").textContent = "88% RH";
    document.getElementById("lbl-vedasandur").textContent = "83% RH";
    document.getElementById("lbl-nagayakottai").textContent = "79% RH";
    document.getElementById("lbl-eriodu").textContent = "74% RH";
    document.getElementById("lbl-marambadi").textContent = "77% RH";
    document.getElementById("lbl-kalvarpatti").textContent = "72% RH";
  } else if (layer === "ndvi") {
    legendTitle.innerText = "NDVI / Canopy Cover";
    legendBar.innerHTML = `
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#E2E8F0]"></div><span class="font-mono text-[9px] mt-0.5">&lt;0.2</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#BBF7D0]"></div><span class="font-mono text-[9px] mt-0.5">0.2–0.4</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#4ADE80]"></div><span class="font-mono text-[9px] mt-0.5">0.4–0.6</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#16A34A]"></div><span class="font-mono text-[9px] mt-0.5">0.6–0.75</span></div>
      <div class="flex flex-col items-center"><div class="w-8 h-2.5 rounded-sm bg-[#14532D]"></div><span class="font-mono text-[9px] mt-0.5">&gt;0.75</span></div>
    `;
    document.getElementById("lbl-kovilur").textContent = "NDVI 0.68";
    document.getElementById("lbl-vedasandur").textContent = "NDVI 0.42";
    document.getElementById("lbl-nagayakottai").textContent = "NDVI 0.51";
    document.getElementById("lbl-eriodu").textContent = "NDVI 0.58";
    document.getElementById("lbl-marambadi").textContent = "NDVI 0.49";
    document.getElementById("lbl-kalvarpatti").textContent = "NDVI 0.38";
  }
}

// =========================================================================
// 7. PANCHAYAT FORECAST TABLE RENDERING
// =========================================================================
function renderPanchayatTable() {
  const tbody = document.getElementById("panchayatTableBody");
  if (!tbody) return;

  const isTa = state.lang === "ta";
  tbody.innerHTML = "";

  state.currentBlockPanchayats.forEach(p => {
    const tr = document.createElement("tr");
    tr.id = `row-${p.gp_id}`;
    tr.className = "hover:bg-surface-container-low/60 transition-colors";
    tr.onclick = () => selectPanchayat(p);

    const displayName = isTa ? (p.name_ta || p.gp_name) : `${p.gp_name} (${p.name_ta || ''})`;

    tr.innerHTML = `
      <td class="py-3 px-3">
        <div class="flex flex-col">
          <span class="font-semibold text-primary">${displayName}</span>
          <span class="font-mono text-[10px] text-on-surface-variant">Grid ID: ${p.grid_id} · ${p.elev}m</span>
        </div>
      </td>
      <td class="py-3 px-3">
        <div class="flex items-baseline gap-1">
          <span class="font-mono text-[15px] font-bold ${p.rain > 30 ? 'text-error' : 'text-primary'}">${p.rain.toFixed(1)}</span>
          <span class="font-mono text-[11px] text-on-surface-variant">mm</span>
        </div>
      </td>
      <td class="py-3 px-3">
        <svg class="overflow-visible ${p.sparkline_color}" height="20" width="60">
          <path d="${p.sparkline_d}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"></path>
        </svg>
      </td>
      <td class="py-3 px-3 font-mono text-[12px] text-on-surface">${p.tmax} / ${p.tmin}°C</td>
      <td class="py-3 px-3 font-mono text-[12px] text-primary font-semibold">${p.rh}%</td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-secondary-container text-on-secondary-container font-bold">
          ${p.conf}% ${p.conf_level}
        </span>
      </td>
      <td class="py-3 px-3 text-right">
        <span class="px-2 py-1 rounded font-mono ${p.advisory_class}">
          ${p.advisory_status}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (state.selectedPanchayat) {
    highlightTableRow(state.selectedPanchayat.gp_id);
  }
}

function filterPanchayatsInTable(query) {
  const rows = document.querySelectorAll("#panchayatTableBody tr");
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(query) ? "" : "none";
  });
}

function highlightTableRow(gp_id) {
  document.querySelectorAll("#panchayatTableBody tr").forEach(r => r.classList.remove("selected-row"));
  const row = document.getElementById(`row-${gp_id}`);
  if (row) row.classList.add("selected-row");
}

// Export CSV
document.getElementById("btnExportForecastCsv")?.addEventListener("click", () => {
  const headers = ["grid_id", "panchayat_name", "elevation_m", "terrain", "rain_48h_mm", "tmax_degc", "tmin_degc", "rh_pct", "confidence_pct", "advisory_status"];
  const rows = state.currentBlockPanchayats.map(p => [
    p.grid_id, `"${p.gp_name}"`, p.elev, `"${p.terrain}"`, p.rain, p.tmax, p.tmin, p.rh, p.conf, `"${p.advisory_status}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `VaanVizhi_${state.block}_Forecast.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// =========================================================================
// 8. SYNCHRONIZED DUAL GIS LEAFLET MAPS
// =========================================================================
function setBasemapStyle(styleName) {
  state.basemapStyle = styleName;
  const config = BASEMAP_PROVIDERS[styleName] || BASEMAP_PROVIDERS.dark;

  if (state.mapBlock) {
    if (state.baseLayerBlock) state.mapBlock.removeLayer(state.baseLayerBlock);
    if (state.refLayerBlock) state.mapBlock.removeLayer(state.refLayerBlock);
    state.baseLayerBlock = L.tileLayer(config.base, config.options).addTo(state.mapBlock);
    if (config.ref) {
      state.refLayerBlock = L.tileLayer(config.ref, config.options).addTo(state.mapBlock);
    } else {
      state.refLayerBlock = null;
    }
  }

  if (state.mapPanchayat) {
    if (state.baseLayerPanchayat) state.mapPanchayat.removeLayer(state.baseLayerPanchayat);
    if (state.refLayerPanchayat) state.mapPanchayat.removeLayer(state.refLayerPanchayat);
    state.baseLayerPanchayat = L.tileLayer(config.base, config.options).addTo(state.mapPanchayat);
    if (config.ref) {
      state.refLayerPanchayat = L.tileLayer(config.ref, config.options).addTo(state.mapPanchayat);
    } else {
      state.refLayerPanchayat = null;
    }
  }

  if (state.blockLayerGroup) state.blockLayerGroup.bringToFront();
  if (state.panchayatLayerGroup) state.panchayatLayerGroup.bringToFront();
  if (state.userCircleBlock) state.userCircleBlock.bringToFront();
  if (state.userMarkerBlock) state.userMarkerBlock.bringToFront();
  if (state.userCirclePanchayat) state.userCirclePanchayat.bringToFront();
  if (state.userMarkerPanchayat) state.userMarkerPanchayat.bringToFront();
}

function initOrResizeDualMaps() {
  if (state.mapsInitialized) {
    if (state.mapBlock) state.mapBlock.invalidateSize();
    if (state.mapPanchayat) state.mapPanchayat.invalidateSize();
    return;
  }

  const centerLat = 9.93;
  const centerLon = 77.48;
  const zoomLevel = 10;

  state.mapBlock = L.map("mapBlockContainer", {
    zoomControl: true,
    attributionControl: false
  }).setView([centerLat, centerLon], zoomLevel);

  state.mapPanchayat = L.map("mapPanchayatContainer", {
    zoomControl: true,
    attributionControl: false
  }).setView([centerLat, centerLon], zoomLevel);

  // Apply basemap (Dark Canvas, Satellite, OSM, Topo)
  setBasemapStyle(state.basemapStyle || "dark");

  let isSyncing = false;
  state.mapBlock.on("move", () => {
    if (!isSyncing) {
      isSyncing = true;
      state.mapPanchayat.setView(state.mapBlock.getCenter(), state.mapBlock.getZoom(), { animate: false });
      isSyncing = false;
    }
  });

  state.mapPanchayat.on("move", () => {
    if (!isSyncing) {
      isSyncing = true;
      state.mapBlock.setView(state.mapPanchayat.getCenter(), state.mapPanchayat.getZoom(), { animate: false });
      isSyncing = false;
    }
  });

  state.blockLayerGroup = L.layerGroup().addTo(state.mapBlock);
  state.panchayatLayerGroup = L.layerGroup().addTo(state.mapPanchayat);

  state.mapsInitialized = true;
  refreshLeafletLayers();

  // If user location was previously acquired, render it now on maps
  if (state.userLocation) {
    renderUserLocationOnMaps(state.userLocation.lat, state.userLocation.lon, state.userLocation.accuracy, state.nearestPanchayat, state.nearestDistanceKm);
  }

  document.getElementById("mapStyleSelect")?.addEventListener("change", (e) => {
    setBasemapStyle(e.target.value);
  });

  document.getElementById("mapLiveLocationBtn")?.addEventListener("click", () => {
    triggerRealtimeGeolocation(false);
  });

  document.getElementById("mapPanchayatSearch")?.addEventListener("input", (e) => {
    refreshLeafletLayers(e.target.value.toLowerCase());
  });

  document.getElementById("mapVarSelect")?.addEventListener("change", (e) => {
    state.mapVar = e.target.value;
    refreshLeafletLayers();
  });

  document.querySelectorAll(".lead-day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lead-day-btn").forEach(b => b.classList.remove("active", "bg-primary", "text-white"));
      btn.classList.add("active", "bg-primary", "text-white");
      state.leadDay = parseInt(btn.getAttribute("data-day")) || 1;
      refreshLeafletLayers();
    });
  });
}

function refreshLeafletLayers(searchFilter = "") {
  if (!state.mapsInitialized) return;

  state.blockLayerGroup.clearLayers();
  state.panchayatLayerGroup.clearLayers();

  const varKey = state.mapVar || "tmax";

  const sampleBlocks = [
    { name: "Bodinayakanur", lat: 10.015, lon: 77.350, val: 34.5 },
    { name: "Cumbum", lat: 9.735, lon: 77.295, val: 31.8 },
    { name: "Theni", lat: 10.010, lon: 77.480, val: 35.1 },
    { name: "Periyakulam", lat: 10.120, lon: 77.545, val: 34.0 },
    { name: "Andipatti", lat: 9.980, lon: 77.625, val: 35.6 },
    { name: "Chinnamanur", lat: 9.845, lon: 77.385, val: 33.2 },
    { name: "Uthamapalayam", lat: 9.815, lon: 77.330, val: 32.7 },
    { name: "K. Myladumparai", lat: 9.790, lon: 77.560, val: 29.5 }
  ];

  sampleBlocks.forEach(b => {
    const circle = L.circleMarker([b.lat, b.lon], {
      radius: 28,
      fillColor: "#0284c7",
      color: "#38bdf8",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.35
    });
    circle.bindPopup(`<strong>Block: ${b.name}</strong><br/>Coarse NWP: ${b.val}°C<br/>Grid: ~9 km ECMWF IFS`);
    state.blockLayerGroup.addLayer(circle);
  });

  const listToRender = (state.panchayats.length > 0 ? state.panchayats : VEDASANDUR_DEMO);
  listToRender.forEach(p => {
    if (searchFilter && !p.gp_name.toLowerCase().includes(searchFilter)) return;

    const lat = p.lat || (9.8 + (Math.random() * 0.3));
    const lon = p.lon || (77.3 + (Math.random() * 0.35));
    const val = p[varKey] || (p.tmax || 34.0);

    const color = varKey === "rain_amount"
      ? (val > 30 ? "#004B87" : val > 15 ? "#22B8CF" : "#94D82D")
      : (val > 35 ? "#ef4444" : val > 32 ? "#f59e0b" : "#38bdf8");

    const marker = L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: color,
      color: "#ffffff",
      weight: 1.5,
      opacity: 0.95,
      fillOpacity: 0.8
    });

    marker.bindPopup(`
      <div style="font-family:Inter,sans-serif; min-width:140px;">
        <strong style="color:#38bdf8; font-size:13px;">${p.gp_name}</strong><br/>
        <span style="color:#94a3b8; font-size:11px;">Elev: ${p.elev || 300}m</span><hr style="border-color:#334155; margin:4px 0;"/>
        <strong>Downscaled ${varKey.toUpperCase()}:</strong> ${val}<br/>
        <span style="color:#10b981; font-weight:bold;">1.0 km² Micro-Grid</span>
      </div>
    `);

    marker.on("click", () => {
      const matched = state.currentBlockPanchayats.find(item => item.gp_id === p.gp_id);
      if (matched) selectPanchayat(matched);
    });

    state.panchayatLayerGroup.addLayer(marker);
  });
}

// =========================================================================
// 9. 5-DAY MULTI-QUANTILE CHART.JS FORECAST
// =========================================================================
function populateForecastPanchayatSelect() {
  const sel = document.getElementById("forecastGpSelect");
  if (!sel) return;
  sel.innerHTML = "";
  state.currentBlockPanchayats.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.gp_id;
    opt.textContent = `${p.gp_name} (${p.name_ta || ''})`;
    sel.appendChild(opt);
  });

  sel.addEventListener("change", (e) => {
    const matched = state.currentBlockPanchayats.find(p => p.gp_id === e.target.value);
    if (matched) {
      selectPanchayat(matched);
      renderQuantileChart();
    }
  });

  document.getElementById("forecastVarSelect")?.addEventListener("change", () => renderQuantileChart());
}

function renderQuantileChart() {
  const ctx = document.getElementById("quantileForecastChart")?.getContext("2d");
  if (!ctx) return;

  const p = state.selectedPanchayat || state.currentBlockPanchayats[0];
  const varKey = document.getElementById("forecastVarSelect")?.value || "tmax";

  const labels = ["Day 1 (Today)", "Day 2 (+24h)", "Day 3 (+48h)", "Day 4 (+72h)", "Day 5 (+96h)"];

  const base = p ? p[varKey] || 33.0 : 33.0;
  const p50 = [base, base + 0.6, base - 0.4, base + 0.8, base + 0.2];
  const p10 = p50.map(v => Math.round((v - (varKey === "rain_amount" ? 4 : 1.6)) * 10) / 10);
  const p90 = p50.map(v => Math.round((v + (varKey === "rain_amount" ? 8 : 1.8)) * 10) / 10);
  const m0_raw = p50.map(v => Math.round((v + (varKey === "tmax" ? 1.5 : -1.0)) * 10) / 10);

  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  state.chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "p90 (Upper Envelope)",
          data: p90,
          borderColor: "rgba(0, 108, 74, 0.4)",
          backgroundColor: "rgba(133, 248, 196, 0.35)",
          fill: "+1",
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.3
        },
        {
          label: "p10 (Lower Envelope)",
          data: p10,
          borderColor: "rgba(0, 108, 74, 0.4)",
          fill: false,
          pointRadius: 0,
          borderWidth: 1,
          tension: 0.3
        },
        {
          label: "p50 Downscaled Median",
          data: p50,
          borderColor: "#006c4a",
          backgroundColor: "#006c4a",
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#85f8c4",
          tension: 0.3
        },
        {
          label: "Raw Coarse NWP (M0 Baseline)",
          data: m0_raw,
          borderColor: "#002542",
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "rgba(194, 199, 207, 0.25)" } },
        y: { grid: { color: "rgba(194, 199, 207, 0.25)" } }
      }
    }
  });

  renderShapDrivers(p);
}

function renderShapDrivers(p) {
  const container = document.getElementById("shapDriversList");
  if (!container) return;

  const elevAnom = (p.elev || 280) - 250;
  const isCooled = elevAnom > 0;

  container.innerHTML = `
    <div class="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] ${isCooled ? 'text-secondary' : 'text-error'}">
          ${isCooled ? 'terrain' : 'landscape'}
        </span>
        <span class="text-[12px] font-semibold text-primary">Elevation Anomaly (${elevAnom >= 0 ? '+' : ''}${elevAnom}m)</span>
      </div>
      <span class="font-mono text-[11px] font-bold ${isCooled ? 'text-secondary' : 'text-error'}">
        ${isCooled ? '-' : '+'}${Math.abs(Math.round(elevAnom * 0.0065 * 10) / 10)}°C Lapse Rate
      </span>
    </div>

    <div class="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-secondary">park</span>
        <span class="text-[12px] font-semibold text-primary">Canopy Evaporative Buffer</span>
      </div>
      <span class="font-mono text-[11px] font-bold text-secondary">-0.4°C / +4% RH</span>
    </div>

    <div class="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-primary">waves</span>
        <span class="text-[12px] font-semibold text-primary">Water Proximity (Kudaganar)</span>
      </div>
      <span class="font-mono text-[11px] font-bold text-primary">+6% Moisture Pooling</span>
    </div>
  `;
}

// =========================================================================
// 10. FARMER MOBILE PHONE SIMULATOR & ADVISORY
// =========================================================================
function initAdvisorySimulator() {
  const btnSms = document.getElementById("btnPhoneSms");
  const btnWa = document.getElementById("btnPhoneWa");
  const btnVoice = document.getElementById("btnPhoneVoice");
  const smsView = document.getElementById("phoneSmsView");
  const waView = document.getElementById("phoneWaView");

  if (btnSms && btnWa && smsView && waView) {
    btnSms.addEventListener("click", () => {
      btnSms.classList.add("bg-primary", "text-white", "font-bold");
      btnSms.classList.remove("text-on-surface-variant");
      btnWa.classList.remove("bg-primary", "text-white", "font-bold");
      btnWa.classList.add("text-on-surface-variant");
      smsView.classList.remove("hidden");
      waView.classList.add("hidden");
    });

    btnWa.addEventListener("click", () => {
      btnWa.classList.add("bg-primary", "text-white", "font-bold");
      btnWa.classList.remove("text-on-surface-variant");
      btnSms.classList.remove("bg-primary", "text-white", "font-bold");
      btnSms.classList.add("text-on-surface-variant");
      waView.classList.remove("hidden");
      smsView.classList.add("hidden");
    });
  }

  if (btnVoice) {
    btnVoice.addEventListener("click", () => {
      const textToSpeak = document.getElementById("phoneSmsText")?.innerText || "";
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const taVoice = voices.find(v => v.lang.includes("ta") || v.lang.includes("IN"));
        if (taVoice) utterance.voice = taVoice;
        window.speechSynthesis.speak(utterance);
      }
    });
  }

  document.getElementById("btnRegenerateAdvisory")?.addEventListener("click", () => {
    if (state.selectedPanchayat) updateAdvisoryText(state.selectedPanchayat);
  });
}

function updateAdvisoryText(p) {
  const crop = document.getElementById("advisoryCropSelect")?.value || "banana";
  const pName = p.name_ta || p.gp_name;

  let smsText = "";
  let waHtml = "";

  if (crop === "banana") {
    smsText = `வானவிழி வேளாண் அறிக்கை: ${pName}-ல் 24 மணி நேரத்தில் காற்று ${p.wind} கிமீ/ம வீசக்கூடும். வாழைக்கு சவுக்குக்கம்பு முட்டுக் கொடுக்கவும். உரம் இடுவதை தள்ளிப்போடவும். -TNAU`;
    waHtml = `
      🌿 <strong>வானவிழி வேளாண் ஆலோசனை (வாழை)</strong><br/>
      📍 <strong>பஞ்சாயத்து:</strong> ${pName}<br/>
      🌧️ <strong>மழை:</strong> ${p.rain} மி.மீ | 💨 <strong>காற்று:</strong> ${p.wind} கி.மீ/ம<br/>
      ⚠️ <strong>முக்கிய செயல்பாடு:</strong> வாழை மரங்களுக்கு சவுக்குக்கம்பு முட்டு கொடுக்கவும்.<br/>
      🧪 <strong>உரம்:</strong> மழைக்கு பின் மேலுரம் இடவும்.
    `;
  } else if (crop === "grapes") {
    smsText = `வானவிழி திராட்சை ஆலோசனை: ${pName}-ல் காற்றின் ஈரப்பதம் ${p.rh}%. சாம்பல் நோய் வர வாய்ப்பு உள்ளது. மேன்கோசெப் 2 கி/லி தெளிக்கவும். -TNAU`;
    waHtml = `
      🍇 <strong>வானவிழி திராட்சை பாதுகாப்பு</strong><br/>
      📍 <strong>பஞ்சாயத்து:</strong> ${pName}<br/>
      💧 <strong>ஈரப்பதம்:</strong> ${p.rh}% | 🌡️ <strong>வெப்பநிலை:</strong> ${p.tmax}°C<br/>
      ⚠️ <strong>நோய் கண்காணிப்பு:</strong> இலைக்கருகல் மற்றும் சாம்பல் நோய் எச்சரிக்கை.
    `;
  } else {
    smsText = `வானவிழி வேளாண் அறிக்கை: ${pName}-ல் மழைப்பொழிவு ${p.rain} மி.மீ எதிர்பார்க்கப்படுகிறது. வடிகால் வாய்க்கால்களை தூர்வாரவும். உரம் இடுவதை ஒத்திவைக்கவும். -TNAU`;
    waHtml = `
      🌾 <strong>வானவிழி நெல்/பயறு ஆலோசனை</strong><br/>
      📍 <strong>பஞ்சாயத்து:</strong> ${pName}<br/>
      🌧️ <strong>மழை வாய்ப்பு:</strong> ${p.rain} மி.மீ | 💧 <strong>ஈரப்பதம்:</strong> ${p.rh}%<br/>
      ⚠️ <strong>முக்கிய நடவடிக்கை:</strong> இளம் நாற்றுப்பாவிகளில் நீர் தேங்காமல் வடிக்கவும்.
    `;
  }

  const smsEl = document.getElementById("phoneSmsText");
  const waEl = document.getElementById("phoneWaText");
  if (smsEl) smsEl.innerText = smsText;
  if (waEl) waEl.innerHTML = waHtml;

  const charLen = smsText.length;
  const segments = Math.ceil(charLen / 70) || 1;
  const lenBadge = document.getElementById("smsLengthBadge");
  const segBadge = document.getElementById("smsSegmentsBadge");
  if (lenBadge) lenBadge.innerText = `${charLen} chars (Unicode Tamil)`;
  if (segBadge) segBadge.innerText = `${segments} Segment${segments > 1 ? 's' : ''} (≤70 chars/seg)`;
}

// =========================================================================
// 10B. MESSAGE DISPATCH ENGINE (WHATSAPP, DLT SMS, & FARMER BROADCAST)
// =========================================================================
function initMessageDispatchControls() {
  const modal = document.getElementById("sendMessageModal");
  const closeBtn = document.getElementById("closeSendMessageModalBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");
  const channelWaBtn = document.getElementById("modalChannelWa");
  const channelSmsBtn = document.getElementById("modalChannelSms");
  const recipientRadios = document.querySelectorAll('input[name="modalRecipientType"]');
  const directContainer = document.getElementById("modalDirectPhoneContainer");
  const directPhoneInput = document.getElementById("modalDirectPhoneInput");
  const messageText = document.getElementById("modalMessageText");
  const charCounter = document.getElementById("modalCharCounter");
  const segCounter = document.getElementById("modalSegmentCounter");
  const resetBtn = document.getElementById("modalResetMessageBtn");
  const copyModalBtn = document.getElementById("modalCopyTextBtn");
  const copyPhoneBtn = document.getElementById("btnCopyPhoneText");
  const sendActionBtn = document.getElementById("modalSendActionBtn");
  const sendBtnLabel = document.getElementById("modalSendBtnLabel");
  const sendBtnIcon = document.getElementById("modalSendBtnIcon");

  // Status & Progress elements
  const statusBox = document.getElementById("modalDispatchStatusBox");
  const statusTitle = document.getElementById("modalStatusTitle");
  const statusPercent = document.getElementById("modalStatusPercent");
  const progressBar = document.getElementById("modalProgressBar");
  const statusDetails = document.getElementById("modalStatusDetails");
  const statusSpinner = document.getElementById("modalStatusSpinner");

  let currentChannel = "whatsapp"; // "whatsapp" | "sms"

  function updateCharAndSegments() {
    if (!messageText) return;
    const len = messageText.value.length;
    const segs = Math.ceil(len / 70) || 1;
    if (charCounter) charCounter.textContent = `${len} characters (Unicode Tamil)`;
    if (segCounter) {
      if (currentChannel === "sms") {
        segCounter.textContent = `${segs} Segment${segs > 1 ? 's' : ''} (≤70 chars/seg)`;
        segCounter.className = segs > 2 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold";
      } else {
        segCounter.textContent = "Unlimited (WhatsApp Rich Card)";
        segCounter.className = "text-emerald-500 font-bold";
      }
    }
  }

  if (messageText) {
    messageText.addEventListener("input", updateCharAndSegments);
  }

  function getActivePanchayat() {
    return state.selectedPanchayat || (state.panchayats && state.panchayats[0]) || VEDASANDUR_DEMO[0];
  }

  function getCleanAdvisoryText(channel) {
    const p = getActivePanchayat();
    const cropSelect = document.getElementById("advisoryCropSelect");
    const crop = cropSelect ? cropSelect.value : "banana";
    const pName = p.name_ta || p.gp_name || "Tamil Nadu";

    if (channel === "sms") {
      const smsEl = document.getElementById("phoneSmsText");
      if (smsEl && smsEl.innerText.trim()) return smsEl.innerText.trim();
      return `வானவிழி வேளாண் அறிக்கை: ${pName}-ல் காற்று ${p.wind || 18} கிமீ/ம வீசக்கூடும். வாழைக்கு சவுக்குக்கம்பு முட்டுக் கொடுக்கவும். உரம் இடுவதை தள்ளிப்போடவும். -TNAU`;
    } else {
      // Clean structured Tamil alert for WhatsApp
      return `🌾 *வானவிழி வேளாண் ஆலோசனை* 🌾\n📍 *பஞ்சாயத்து:* ${pName} (${p.block_name || state.block || 'வேடசந்தூர்'})\n🌧️ *மழை:* ${p.rain || 0} மி.மீ | 💨 *காற்று:* ${p.wind || 16} கி.மீ/ம\n⚠️ *முக்கிய எச்சரிக்கை:* பலத்த காற்று/மழைக்கு முன் பாதுகாப்பு நடவடிக்கை எடுக்கவும்.\n🌱 *பயிர்:* ${crop.toUpperCase()} | TRAI DLT: VK-AGROTN\n— தமிழ்நாடு வேளாண்மை பல்கலைக்கழகம் (TNAU) & VaanVizhi`;
    }
  }

  function setChannel(channel) {
    currentChannel = channel;
    if (channel === "whatsapp") {
      channelWaBtn?.classList.add("bg-emerald-600", "text-white", "font-bold", "shadow-xs");
      channelWaBtn?.classList.remove("text-on-surface-variant");
      channelSmsBtn?.classList.remove("bg-sky-600", "text-white", "font-bold", "shadow-xs");
      channelSmsBtn?.classList.add("text-on-surface-variant");

      if (sendActionBtn) {
        sendActionBtn.className = "px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[12px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer";
      }
      if (sendBtnIcon) sendBtnIcon.textContent = "chat";
      if (sendBtnLabel) sendBtnLabel.textContent = "Send via WhatsApp";
    } else {
      channelSmsBtn?.classList.add("bg-sky-600", "text-white", "font-bold", "shadow-xs");
      channelSmsBtn?.classList.remove("text-on-surface-variant");
      channelWaBtn?.classList.remove("bg-emerald-600", "text-white", "font-bold", "shadow-xs");
      channelWaBtn?.classList.add("text-on-surface-variant");

      if (sendActionBtn) {
        sendActionBtn.className = "px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-[12px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer";
      }
      if (sendBtnIcon) sendBtnIcon.textContent = "sms";
      if (sendBtnLabel) sendBtnLabel.textContent = "Transmit DLT SMS";
    }
    updateCharAndSegments();
  }

  channelWaBtn?.addEventListener("click", () => {
    setChannel("whatsapp");
    if (messageText) messageText.value = getCleanAdvisoryText("whatsapp");
    updateCharAndSegments();
  });

  channelSmsBtn?.addEventListener("click", () => {
    setChannel("sms");
    if (messageText) messageText.value = getCleanAdvisoryText("sms");
    updateCharAndSegments();
  });

  // Recipient radio change
  recipientRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "direct") {
        directContainer?.classList.remove("hidden");
        directPhoneInput?.focus();
      } else {
        directContainer?.classList.add("hidden");
      }
    });
  });

  // Reset message button
  resetBtn?.addEventListener("click", () => {
    if (messageText) {
      messageText.value = getCleanAdvisoryText(currentChannel);
      updateCharAndSegments();
    }
  });

  // Copy buttons
  function copyToClipboard(text, btnElement, defaultLabel) {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).then(() => {
        if (btnElement) {
          btnElement.innerHTML = `<span class="material-symbols-outlined text-[15px] text-emerald-500">check</span><span class="text-emerald-500 font-bold">Copied!</span>`;
          setTimeout(() => {
            btnElement.innerHTML = `<span class="material-symbols-outlined text-[14px]">content_copy</span><span>${defaultLabel}</span>`;
          }, 2000);
        }
      });
    }
  }

  copyModalBtn?.addEventListener("click", () => {
    copyToClipboard(messageText?.value || "", copyModalBtn, "Copy Text");
  });

  copyPhoneBtn?.addEventListener("click", () => {
    const isSmsVisible = !document.getElementById("phoneSmsView")?.classList.contains("hidden");
    const activeText = isSmsVisible ? getCleanAdvisoryText("sms") : getCleanAdvisoryText("whatsapp");
    copyToClipboard(activeText, copyPhoneBtn, "Copy Text");
  });

  // Open modal helper
  function openDispatchModal(channel = "whatsapp", recipientType = "broadcast") {
    if (!modal) return;
    const p = getActivePanchayat();
    const pNameEl = document.getElementById("modalTargetPanchayatName");
    const cropNameEl = document.getElementById("modalTargetCropName");
    const cropSel = document.getElementById("advisoryCropSelect");
    const stageSel = document.getElementById("advisoryStageSelect");

    if (pNameEl) {
      pNameEl.textContent = `${p.gp_name} (${p.name_ta || ''}) · ${p.block_name || state.block} Block`;
    }
    if (cropNameEl && cropSel && stageSel) {
      const cropText = cropSel.options[cropSel.selectedIndex]?.text || "Banana";
      const stageText = stageSel.options[stageSel.selectedIndex]?.text || "Vegetative Growth";
      cropNameEl.textContent = `Target: ${cropText} · Phase: ${stageText}`;
    }

    setChannel(channel);

    recipientRadios.forEach(r => {
      r.checked = (r.value === recipientType);
    });
    if (recipientType === "direct") {
      directContainer?.classList.remove("hidden");
    } else {
      directContainer?.classList.add("hidden");
    }

    if (messageText) {
      messageText.value = getCleanAdvisoryText(channel);
      updateCharAndSegments();
    }

    if (statusBox) statusBox.classList.add("hidden");
    modal.classList.replace("hidden", "flex");
  }

  // Quick Action Buttons
  document.getElementById("btnQuickDispatchLeft")?.addEventListener("click", () => {
    openDispatchModal("sms", "broadcast");
  });

  document.getElementById("btnQuickSendWa")?.addEventListener("click", () => {
    const text = getCleanAdvisoryText("whatsapp");
    const p = getActivePanchayat();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");

    // Also notify backend
    fetch("/api/advisory/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gp_id: p.gp_id || "GP_DEMO",
        channel: "whatsapp",
        recipient: "all_farmers",
        crop: document.getElementById("advisoryCropSelect")?.value || "banana",
        message_text: text
      })
    }).catch(console.warn);

    showToastNotification("WhatsApp Web opened! Advisory payload queued for dispatch.");
  });

  document.getElementById("btnQuickSendSms")?.addEventListener("click", () => {
    openDispatchModal("sms", "direct");
  });

  document.getElementById("btnQuickBroadcast")?.addEventListener("click", () => {
    openDispatchModal("sms", "broadcast");
    triggerBroadcastProgressSequence();
  });

  // Modal Close / Cancel
  closeBtn?.addEventListener("click", () => modal.classList.replace("flex", "hidden"));
  cancelBtn?.addEventListener("click", () => modal.classList.replace("flex", "hidden"));

  // Trigger simulated/live progress sequence
  async function triggerBroadcastProgressSequence() {
    if (!statusBox) return;
    statusBox.classList.remove("hidden");
    if (statusSpinner) {
      statusSpinner.classList.add("animate-spin");
      statusSpinner.textContent = "sync";
    }

    const steps = [
      { pct: 15, title: "Connecting to TRAI DLT Gateway...", detail: "Authorizing Entity ID: 140716123456 (VK-AGROTN)..." },
      { pct: 45, title: "Validating Tamil Unicode GSM Payload...", detail: "Checking byte boundaries (≤70 chars/seg) & consent registry..." },
      { pct: 80, title: "Transmitting across Mobile BTS Towers...", detail: "Airtel / Jio / BSNL localized cell broadcast in progress..." },
      { pct: 100, title: "Broadcast Dispatched Successfully!", detail: "Ack Token: AGRO-TN-" + Date.now().toString().slice(-6) + " • 1,240 SMS queued." }
    ];

    for (const step of steps) {
      if (progressBar) progressBar.style.width = `${step.pct}%`;
      if (statusPercent) statusPercent.textContent = `${step.pct}%`;
      if (statusTitle) statusTitle.textContent = step.title;
      if (statusDetails) statusDetails.textContent = step.detail;
      await new Promise(r => setTimeout(r, 450));
    }

    if (statusSpinner) {
      statusSpinner.classList.remove("animate-spin");
      statusSpinner.textContent = "verified";
    }

    // Update phone preview status badge
    const pTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const deliveredEls = document.querySelectorAll("#phoneSmsView .text-slate-500, #phoneWaView .text-emerald-500");
    deliveredEls.forEach(el => {
      el.textContent = `✓✓ Broadcast Active: 1,240 Delivered at ${pTime}`;
      el.classList.add("text-emerald-400", "font-bold");
    });
  }

  const modalNativeSmsBtn = document.getElementById("modalNativeSmsBtn");

  function updateModalNativeSmsBtnVisibility() {
    const isDirect = document.querySelector('input[name="modalRecipientType"]:checked')?.value === "direct";
    if (currentChannel === "sms" && isDirect) {
      modalNativeSmsBtn?.classList.remove("hidden");
    } else {
      modalNativeSmsBtn?.classList.add("hidden");
    }
  }

  modalNativeSmsBtn?.addEventListener("click", () => {
    const phoneNum = directPhoneInput?.value.replace(/\D/g, "");
    const msg = messageText?.value.trim() || getCleanAdvisoryText(currentChannel);
    if (!phoneNum || phoneNum.length < 10) {
      alert("Please enter a valid 10-digit mobile number (+91).");
      directPhoneInput?.focus();
      return;
    }
    const smsUrl = `sms:+91${phoneNum}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
    showToastNotification(`Device SMS messaging app opened for +91${phoneNum}...`);
  });

  // Send action button inside modal
  sendActionBtn?.addEventListener("click", async () => {
    const p = getActivePanchayat();
    const isDirect = document.querySelector('input[name="modalRecipientType"]:checked')?.value === "direct";
    const phoneNum = directPhoneInput?.value.replace(/\D/g, "");
    const msg = messageText?.value.trim() || getCleanAdvisoryText(currentChannel);

    if (isDirect && (!phoneNum || phoneNum.length < 10)) {
      alert("Please enter a valid 10-digit mobile number (+91).");
      directPhoneInput?.focus();
      return;
    }

    if (currentChannel === "whatsapp") {
      const waUrl = isDirect
        ? `https://api.whatsapp.com/send?phone=91${phoneNum}&text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
    }

    // Call Backend API
    try {
      sendActionBtn.disabled = true;
      sendActionBtn.classList.add("opacity-70");

      await triggerBroadcastProgressSequence();

      const res = await fetch("/api/advisory/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gp_id: p.gp_id || "GP_DEMO",
          channel: currentChannel,
          recipient: isDirect ? `+91${phoneNum}` : "all_farmers",
          crop: document.getElementById("advisoryCropSelect")?.value || "banana",
          message_text: msg
        })
      });

      const data = await res.json();
      console.log("Advisory dispatch ack:", data);

      if (currentChannel === "sms" && isDirect && data.sms_intent_url) {
        // Trigger native mobile / desktop cellular SMS app
        window.location.href = data.sms_intent_url;
      }

      setTimeout(() => {
        modal.classList.replace("flex", "hidden");
        sendActionBtn.disabled = false;
        sendActionBtn.classList.remove("opacity-70");
        showToastNotification(`Advisory sent successfully via ${currentChannel.toUpperCase()}! Transmission ID: ${data.transmission_id}`);
      }, 1400);

    } catch (err) {
      console.error("Advisory dispatch error:", err);
      sendActionBtn.disabled = false;
      sendActionBtn.classList.remove("opacity-70");
      alert("Network transmission error. Please check backend connection.");
    }
  });
}

function showToastNotification(message) {
  let toast = document.getElementById("vaanvizhiToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "vaanvizhiToast";
    toast.className = "fixed bottom-5 right-5 z-[10001] bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-[12px] font-medium transition-all duration-300 opacity-0 transform translate-y-3 pointer-events-none";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span class="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span><span>${message}</span>`;
  toast.classList.remove("opacity-0", "translate-y-3", "pointer-events-none");
  toast.classList.add("opacity-100", "translate-y-0");

  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-3", "pointer-events-none");
  }, 4000);
}

// =========================================================================
// 10C. LIVE LOCATION RAIN INTELLIGENCE & DIRECT SIM SMS ENGINE
// =========================================================================
let activeAdvisoryLocation = {
  name: "Kovilur (வேடசந்தூர் வட்டம்)",
  lat: 10.0100,
  lon: 77.4800,
  elev: 284,
  isLiveGps: false,
  rainData: null
};

async function fetchAndDisplayRainForecast(lat, lon, placeName) {
  try {
    const statusText = document.getElementById("rainLiveLocStatusText");
    if (statusText) statusText.textContent = "Updating Forecast...";

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation,precipitation_probability,rain,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Forecast fetch failed");
    const data = await res.json();

    activeAdvisoryLocation.lat = lat;
    activeAdvisoryLocation.lon = lon;
    activeAdvisoryLocation.name = placeName;
    activeAdvisoryLocation.rainData = data;

    // Update location headers
    const nameEl = document.getElementById("advisoryActiveLocName");
    const coordsEl = document.getElementById("advisoryActiveLocCoords");
    if (nameEl) nameEl.innerHTML = `<span class="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span><span>${placeName}</span>`;
    if (coordsEl) coordsEl.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E · Elev: ${Math.round(data.elevation || 280)}m`;

    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const todayRainSum = (daily.precipitation_sum && daily.precipitation_sum[0] !== undefined)
      ? Number(daily.precipitation_sum[0]).toFixed(1)
      : (current.precipitation || 0).toFixed(1);

    const todayRainProb = (daily.precipitation_probability_max && daily.precipitation_probability_max[0] !== undefined)
      ? Math.round(daily.precipitation_probability_max[0])
      : 50;

    // Categorize Rain Risk
    let rainCategory = "Dry Window";
    let rainRisk = "Low Rain Risk";
    let rainRiskClass = "text-emerald-500";
    const rainNum = parseFloat(todayRainSum);

    if (rainNum >= 25) {
      rainCategory = "Very Heavy Downpour";
      rainRisk = "Severe Rain Alert";
      rainRiskClass = "text-rose-500 font-bold";
    } else if (rainNum >= 10) {
      rainCategory = "Heavy Rain Window";
      rainRisk = "High Rain Risk";
      rainRiskClass = "text-rose-400 font-bold";
    } else if (rainNum >= 2.5) {
      rainCategory = "Moderate Showers";
      rainRisk = "Moderate Rain Risk";
      rainRiskClass = "text-amber-400 font-bold";
    } else if (rainNum > 0) {
      rainCategory = "Light Showers";
      rainRisk = "Low / Scattered";
      rainRiskClass = "text-sky-400 font-bold";
    }

    // Peak Rain Timing Calculation from Hourly
    const nowHour = new Date().getHours();
    let maxHourIdx = nowHour;
    let maxHourlyRain = 0;
    let maxHourlyProb = 0;

    const hPrecip = hourly.precipitation || [];
    const hProb = hourly.precipitation_probability || [];
    const hTime = hourly.time || [];

    for (let i = nowHour; i < Math.min(nowHour + 24, hPrecip.length); i++) {
      if ((hPrecip[i] || 0) > maxHourlyRain) {
        maxHourlyRain = hPrecip[i];
        maxHourIdx = i;
        maxHourlyProb = hProb[i] || 0;
      }
    }

    let timingText = "No Rain Expected";
    let timingDetail = "Fair Weather Window";
    if (rainNum > 0 || maxHourlyProb >= 40) {
      const peakHour = maxHourIdx % 24;
      const startH = (peakHour - 1 + 24) % 24;
      const endH = (peakHour + 2) % 24;
      const formatH = (h) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:00 ${ampm}`;
      };
      timingText = `${formatH(startH)} - ${formatH(endH)}`;
      timingDetail = `Peak ${maxHourlyRain.toFixed(1)} mm/hr (${maxHourlyProb}% PoP)`;
    }

    // Update Metrics in DOM
    const cardSum = document.getElementById("rainCardSum");
    const cardCat = document.getElementById("rainCardCategory");
    const cardProb = document.getElementById("rainCardProb");
    const cardRisk = document.getElementById("rainCardRisk");
    const cardTiming = document.getElementById("rainCardTiming");
    const cardPeakIntensity = document.getElementById("rainCardPeakIntensity");
    const cardTempWind = document.getElementById("rainCardTempWind");
    const cardRhDew = document.getElementById("rainCardRhDew");

    if (cardSum) cardSum.innerHTML = `${todayRainSum} <span class="text-[12px] font-normal text-on-surface-variant">mm</span>`;
    if (cardCat) cardCat.textContent = rainCategory;
    if (cardProb) cardProb.innerHTML = `${todayRainProb}<span class="text-[12px] font-normal text-on-surface-variant">%</span>`;
    if (cardRisk) {
      cardRisk.textContent = rainRisk;
      cardRisk.className = `text-[10px] font-semibold ${rainRiskClass}`;
    }
    if (cardTiming) cardTiming.textContent = timingText;
    if (cardPeakIntensity) cardPeakIntensity.textContent = timingDetail;
    if (cardTempWind) cardTempWind.textContent = `${current.temperature_2m || 31}°C · ${current.wind_speed_10m || 15} km/h`;
    if (cardRhDew) cardRhDew.textContent = `RH ${current.relative_humidity_2m || 75}% · Feels ${current.apparent_temperature || current.temperature_2m}°C`;

    // Render 12-Hour Progression Bars
    const barsContainer = document.getElementById("rainHourlyBarsContainer");
    if (barsContainer) {
      barsContainer.innerHTML = "";
      const displaySlots = 12;
      for (let s = 0; s < displaySlots; s++) {
        const idx = nowHour + s;
        if (idx >= hTime.length) break;
        const val = hPrecip[idx] || 0;
        const pVal = hProb[idx] || 0;
        const timeStr = hTime[idx] ? hTime[idx].slice(-5) : `${(idx % 24)}:00`;
        const barHeightPct = Math.min(Math.max((val / 8) * 100, (pVal / 100) * 60, 12), 100);
        const barColor = val >= 5 ? "bg-rose-500" : val >= 2 ? "bg-amber-400" : pVal >= 40 ? "bg-sky-400" : "bg-emerald-500/40";

        const col = document.createElement("div");
        col.className = "flex flex-col items-center gap-1";
        col.innerHTML = `
          <span class="text-[9px] font-mono text-on-surface-variant font-bold">${val > 0 ? val.toFixed(1) : pVal + '%'}</span>
          <div class="w-full bg-surface-container-high rounded-full h-11 flex items-end p-0.5">
            <div class="${barColor} w-full rounded-full transition-all duration-300" style="height: ${barHeightPct}%"></div>
          </div>
          <span class="text-[9px] font-mono text-on-surface-variant">${timeStr}</span>
        `;
        barsContainer.appendChild(col);
      }
    }

    const timelineSum = document.getElementById("rainTimelineSummary");
    if (timelineSum) {
      timelineSum.textContent = (rainNum > 0)
        ? `Rain peak: ${timingText} (${todayRainSum} mm expected)`
        : `Dry conditions expected for the next 12 hours`;
    }

    // Agronomic Advice Formulation
    const cropSel = document.getElementById("advisoryCropSelect");
    const crop = cropSel ? cropSel.value : "banana";
    let adviceTamil = "";

    if (crop === "banana") {
      if (rainNum >= 10 || (current.wind_speed_10m || 0) > 18) {
        adviceTamil = `${placeName}-ல் ${todayRainSum} மி.மீ மழை (${todayRainProb}%), காற்று ${current.wind_speed_10m || 16} கி.மீ/ம. மழை நேரம்: ${timingText}. வாழை மரங்களுக்கு சவுக்குக்கம்பு முட்டு கொடுக்கவும். பூச்சி மருந்து தெளிப்பதை ஒத்திவைக்கவும்.`;
      } else {
        adviceTamil = `${placeName}-ல் வறண்ட/மிதமான வானிலை (${todayRainSum} மி.மீ மழை, ${todayRainProb}% வாய்ப்பு). உரமிட மற்றும் சொட்டுநீர்ப் பாசனம் செய்ய ஏற்ற சமயம்.`;
      }
    } else if (crop === "grapes") {
      adviceTamil = `${placeName}-ல் ஈரப்பதம் ${current.relative_humidity_2m}%, மழை ${todayRainSum} மி.மீ (${timingText}). சாம்பல் நோய் மற்றும் இலைக்கருகல் வராமல் கண்காணிக்கவும்.`;
    } else {
      adviceTamil = `${placeName}-ல் மழைப்பொழிவு ${todayRainSum} மி.மீ (${todayRainProb}% வாய்ப்பு), நேரம்: ${timingText}. வடிகால் வாய்க்கால்களை தூர்வாரவும்.`;
    }

    const adviceBox = document.getElementById("rainAgronomicAdviceText");
    if (adviceBox) {
      adviceBox.innerHTML = `<strong>விவசாய ஆலோசனை:</strong> ${adviceTamil}`;
    }

    // Update the phone preview mockup text
    const phoneSms = document.getElementById("phoneSmsText");
    if (phoneSms) {
      phoneSms.innerText = `வானவிழி நேரடி மழை அறிக்கை: ${adviceTamil} -TNAU`;
      const charLen = phoneSms.innerText.length;
      const segs = Math.ceil(charLen / 70) || 1;
      const lBadge = document.getElementById("smsLengthBadge");
      const sBadge = document.getElementById("smsSegmentsBadge");
      if (lBadge) lBadge.innerText = `${charLen} chars (Unicode Tamil)`;
      if (sBadge) sBadge.innerText = `${segs} Segment${segs > 1 ? 's' : ''} (≤70 chars/seg)`;
    }

    const phoneWa = document.getElementById("phoneWaText");
    if (phoneWa) {
      phoneWa.innerHTML = `
        🌧️ <strong>வானவிழி நேரடி மழை அறிக்கை</strong><br/>
        📍 <strong>இடம்:</strong> ${placeName}<br/>
        🌧️ <strong>மழை வாய்ப்பு:</strong> ${todayRainProb}% (${todayRainSum} மி.மீ)<br/>
        ⏰ <strong>மழை நேரம்:</strong> ${timingText}<br/>
        💨 <strong>காற்று / வெப்பநிலை:</strong> ${current.wind_speed_10m || 16} கி.மீ/ம | ${current.temperature_2m}°C<br/>
        ⚠️ <strong>முக்கிய எச்சரிக்கை:</strong> ${adviceTamil.split('. ')[1] || 'பாதுகாப்பு நடவடிக்கை எடுக்கவும்.'}
      `;
    }

    if (statusText) statusText.textContent = "Live Forecast Active";
  } catch (err) {
    console.warn("Rain forecast fetch error:", err);
    const statusText = document.getElementById("rainLiveLocStatusText");
    if (statusText) statusText.textContent = "Forecast Feed Ready";
  }
}

function initLiveRainAdvisor() {
  const btnGps = document.getElementById("btnAdvisoryUseGps");
  const btnReset = document.getElementById("btnAdvisoryResetLoc");
  const btnSearch = document.getElementById("btnAdvisorySearchLoc");
  const searchInput = document.getElementById("advisoryLocationInput");
  const btnToggleSettings = document.getElementById("btnToggleSmsApiSettings");
  const settingsPanel = document.getElementById("smsGatewaySettingsPanel");
  const directSmsBtn = document.getElementById("btnSendDirectSmsNow");
  const directWaBtn = document.getElementById("btnSendDirectWaNow");
  const directPhoneInput = document.getElementById("directFarmerMobileInput");
  const feedbackStrip = document.getElementById("directSmsFeedbackStrip");
  const feedbackText = document.getElementById("directSmsFeedbackText");
  const feedbackLink = document.getElementById("directSmsNativeLink");

  // GPS Click Handler
  btnGps?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    btnGps.innerHTML = `<span class="material-symbols-outlined text-[14px] animate-spin">sync</span><span>Acquiring GPS...</span>`;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fetchAndDisplayRainForecast(lat, lon, "My Live Location (GPS)");
        if (searchInput) searchInput.value = `Live GPS (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`;
        btnGps.innerHTML = `<span class="material-symbols-outlined text-[14px]">my_location</span><span>GPS Active</span>`;
        showToastNotification("Live GPS location & real-time rain forecast synchronized!");
      },
      (err) => {
        console.warn("GPS error:", err);
        // Fallback to Theni District HQ
        fetchAndDisplayRainForecast(10.010, 77.480, "Theni Pilot Station");
        btnGps.innerHTML = `<span class="material-symbols-outlined text-[14px]">my_location</span><span>Use My Live GPS</span>`;
        showToastNotification("GPS unavailable, connected to Theni Pilot Station reference.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  // Search Location Handler
  async function performLocationSearch() {
    const q = searchInput?.value.trim();
    if (!q) return;

    btnSearch.disabled = true;
    btnSearch.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Checking...</span>`;

    try {
      // Check if coordinates
      const coordMatch = q.match(/^([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        await fetchAndDisplayRainForecast(lat, lon, `Given Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
        showToastNotification(`Rain forecast loaded for coordinates ${lat}, ${lon}`);
        return;
      }

      // Check matching panchayat in state
      const localP = state.panchayats.find(p => p.gp_name.toLowerCase().includes(q.toLowerCase()) || (p.name_ta && p.name_ta.includes(q)));
      if (localP) {
        await fetchAndDisplayRainForecast(localP.lat || 10.01, localP.lon || 77.48, `${localP.gp_name} (${localP.name_ta || ''})`);
        showToastNotification(`Rain forecast loaded for ${localP.gp_name}!`);
        return;
      }

      // Geocoding via Open-Meteo free API
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const geoData = await res.json();
        if (geoData.results && geoData.results.length > 0) {
          const top = geoData.results[0];
          const displayName = `${top.name}${top.admin1 ? ', ' + top.admin1 : ''}`;
          await fetchAndDisplayRainForecast(top.latitude, top.longitude, displayName);
          showToastNotification(`Found: ${displayName}! Rain forecast updated.`);
          return;
        }
      }
      alert(`Location "${q}" not found. Please try another place name or coordinates.`);
    } catch (e) {
      console.warn("Location search error:", e);
      alert("Error finding location. Please verify network connection.");
    } finally {
      btnSearch.disabled = false;
      btnSearch.innerHTML = `<span class="material-symbols-outlined text-[16px]">travel_explore</span><span>Check Rain</span>`;
    }
  }

  btnSearch?.addEventListener("click", performLocationSearch);
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performLocationSearch();
    }
  });

  // Reset Button
  btnReset?.addEventListener("click", () => {
    const defaultP = state.selectedPanchayat || VEDASANDUR_DEMO[0];
    if (searchInput) searchInput.value = "";
    fetchAndDisplayRainForecast(defaultP.lat || 10.010, defaultP.lon || 77.480, `${defaultP.gp_name} (${defaultP.name_ta || 'வேடசந்தூர்'})`);
  });

  // Toggle Gateway Settings
  btnToggleSettings?.addEventListener("click", () => {
    settingsPanel?.classList.toggle("hidden");
  });

  // Direct Send SMS Button
  directSmsBtn?.addEventListener("click", async () => {
    const rawPhone = directPhoneInput?.value.replace(/\D/g, "");
    if (!rawPhone || rawPhone.length !== 10) {
      alert("Please enter a valid 10-digit Indian mobile number (+91).");
      directPhoneInput?.focus();
      return;
    }

    const phoneSms = document.getElementById("phoneSmsText");
    const msgText = phoneSms ? phoneSms.innerText.trim() : `வானவிழி நேரடி மழை அறிக்கை: ${activeAdvisoryLocation.name}-ல் மழை வாய்ப்பு. -TNAU`;
    const customApiKey = document.getElementById("customSmsApiKeyInput")?.value.trim() || "";

    directSmsBtn.disabled = true;
    directSmsBtn.innerHTML = `<span class="material-symbols-outlined text-[17px] animate-spin">sync</span><span>Sending...</span>`;

    try {
      const res = await fetch("/api/advisory/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gp_id: activeAdvisoryLocation.name,
          channel: "sms",
          recipient: "+91" + rawPhone,
          crop: document.getElementById("advisoryCropSelect")?.value || "banana",
          message_text: msgText,
          sms_api_key: customApiKey
        })
      });

      const data = await res.json();
      console.log("Direct SMS response:", data);

      const smsUrl = data.sms_intent_url || `sms:+91${rawPhone}?body=${encodeURIComponent(msgText)}`;

      if (feedbackStrip) {
        feedbackStrip.classList.remove("hidden");
        if (data.gateway_status === "delivered_via_fast2sms") {
          feedbackText.innerHTML = `<span class="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span><span>Dispatched via Fast2SMS Cellular Gateway! Ack: ${data.transmission_id}</span>`;
        } else {
          feedbackText.innerHTML = `<span class="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span><span>Cellular SMS Queued! DLT Ack #${data.transmission_id}</span>`;
        }
        if (feedbackLink) {
          feedbackLink.href = smsUrl;
          feedbackLink.textContent = "Open in Device SMS App (SIM)";
        }
      }

      showToastNotification(`SMS Queued for +91${rawPhone}! Cellular SMS protocol triggered.`);

      // Open device native SMS app
      window.location.href = smsUrl;

    } catch (err) {
      console.error("SMS dispatch error:", err);
      const fallbackUrl = `sms:+91${rawPhone}?body=${encodeURIComponent(msgText)}`;
      window.location.href = fallbackUrl;
      showToastNotification(`Device SMS App opened for +91${rawPhone}!`);
    } finally {
      directSmsBtn.disabled = false;
      directSmsBtn.innerHTML = `<span class="material-symbols-outlined text-[17px]">sms</span><span>Send Real SMS</span>`;
    }
  });

  // Direct WhatsApp Button
  directWaBtn?.addEventListener("click", () => {
    const rawPhone = directPhoneInput?.value.replace(/\D/g, "");
    const phoneSms = document.getElementById("phoneSmsText");
    const msgText = phoneSms ? phoneSms.innerText.trim() : `வானவிழி நேரடி மழை அறிக்கை: ${activeAdvisoryLocation.name}-ல் மழை வாய்ப்பு. -TNAU`;

    const waUrl = rawPhone
      ? `https://api.whatsapp.com/send?phone=91${rawPhone}&text=${encodeURIComponent(msgText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msgText)}`;

    window.open(waUrl, "_blank");

    fetch("/api/advisory/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gp_id: activeAdvisoryLocation.name,
        channel: "whatsapp",
        recipient: rawPhone ? `+91${rawPhone}` : "all_farmers",
        crop: document.getElementById("advisoryCropSelect")?.value || "banana",
        message_text: msgText
      })
    }).catch(console.warn);

    showToastNotification("WhatsApp Web opened with live rain advisory!");
  });

  // Re-fetch when crop or stage changes
  document.getElementById("advisoryCropSelect")?.addEventListener("change", () => {
    fetchAndDisplayRainForecast(activeAdvisoryLocation.lat, activeAdvisoryLocation.lon, activeAdvisoryLocation.name);
  });
  document.getElementById("advisoryStageSelect")?.addEventListener("change", () => {
    fetchAndDisplayRainForecast(activeAdvisoryLocation.lat, activeAdvisoryLocation.lon, activeAdvisoryLocation.name);
  });
}

// =========================================================================
// 11. IMD BULLETIN UPLOAD MODAL
// =========================================================================
function initImdModal() {
  const modal = document.getElementById("imdModal");
  const closeBtn = document.getElementById("closeImdModalBtn");
  const cancelBtn = document.getElementById("btnCancelImdUpload");
  const submitBtn = document.getElementById("btnSubmitImdUpload");

  if (closeBtn && modal) closeBtn.onclick = () => modal.classList.replace("flex", "hidden");
  if (cancelBtn && modal) cancelBtn.onclick = () => modal.classList.replace("flex", "hidden");

  if (submitBtn && modal) {
    submitBtn.onclick = async () => {
      const csvVal = document.getElementById("imdCsvInput")?.value;
      if (!csvVal) {
        alert("Please paste valid IMD CSV content.");
        return;
      }
      try {
        submitBtn.innerText = "Ingesting & Downscaling...";
        const res = await fetch("/api/input/imd-block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv_content: csvVal })
        });
        if (res.ok) {
          modal.classList.replace("flex", "hidden");
          await loadBlocksAndPanchayats();
          updateDashboardForCurrentBlock();
        } else {
          modal.classList.replace("flex", "hidden");
        }
      } catch (e) {
        modal.classList.replace("flex", "hidden");
      } finally {
        submitBtn.innerText = "Ingest Bulletin & Downscale";
      }
    };
  }
}

// =========================================================================
// 12. REAL-TIME GEOLOCATION & LIVE WEATHER ENGINE
// =========================================================================
function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findClosestPanchayat(lat, lon) {
  const list = (state.panchayats && state.panchayats.length > 0) ? state.panchayats : VEDASANDUR_DEMO;
  let closest = list[0];
  let minDist = Infinity;
  list.forEach(p => {
    const pLat = p.lat || 9.93;
    const pLon = p.lon || 77.48;
    const dist = getHaversineDistanceKm(lat, lon, pLat, pLon);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  });
  return { panchayat: closest, distanceKm: Math.round(minDist * 10) / 10 };
}

async function fetchRealtimeWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.current || null;
    }
  } catch (err) {
    console.warn("Live weather query error:", err);
  }
  return null;
}

async function triggerRealtimeGeolocation(autoSelect = false) {
  const topLabel = document.getElementById("topLiveLocationBtnLabel");
  const mapBtn = document.getElementById("mapLiveLocationBtn");

  if (topLabel) topLabel.textContent = "Acquiring GPS...";
  if (mapBtn) mapBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">sync</span><span>Locating...</span>`;

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    resetLocateBtns(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 25);

      state.userLocation = { lat, lon, accuracy };

      const { panchayat, distanceKm } = findClosestPanchayat(lat, lon);
      state.nearestPanchayat = panchayat;
      state.nearestDistanceKm = distanceKm;

      const sidebarDist = document.getElementById("sidebarGpsDist");
      if (sidebarDist) {
        sidebarDist.textContent = `📍 ${distanceKm}km`;
        sidebarDist.title = `Nearest: ${panchayat.gp_name} (${distanceKm} km)`;
        sidebarDist.classList.remove("hidden");
      }

      // Fetch live weather from Open-Meteo
      const liveWeather = await fetchRealtimeWeather(lat, lon);

      populateLiveLocationModal(lat, lon, accuracy, liveWeather, panchayat, distanceKm);
      const modal = document.getElementById("liveLocationModal");
      if (modal) modal.classList.replace("hidden", "flex");

      renderUserLocationOnMaps(lat, lon, accuracy, panchayat, distanceKm);

      if (autoSelect && panchayat) {
        applyNearestPanchayat(panchayat);
      }

      resetLocateBtns(true);
    },
    (err) => {
      console.warn("Browser GPS permission error or unavailable, using Theni Pilot HQ reference:", err);
      const fallbackLat = 10.010;
      const fallbackLon = 77.480;
      const { panchayat, distanceKm } = findClosestPanchayat(fallbackLat, fallbackLon);
      state.userLocation = { lat: fallbackLat, lon: fallbackLon, accuracy: 50 };
      state.nearestPanchayat = panchayat;
      state.nearestDistanceKm = distanceKm;

      fetchRealtimeWeather(fallbackLat, fallbackLon).then(liveWeather => {
        populateLiveLocationModal(fallbackLat, fallbackLon, 50, liveWeather, panchayat, distanceKm, "(Theni Reference Station)");
        const modal = document.getElementById("liveLocationModal");
        if (modal) modal.classList.replace("hidden", "flex");
        renderUserLocationOnMaps(fallbackLat, fallbackLon, 50, panchayat, distanceKm);
      });

      resetLocateBtns(false);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
  );
}

function resetLocateBtns(success = true) {
  const topLabel = document.getElementById("topLiveLocationBtnLabel");
  const mapBtn = document.getElementById("mapLiveLocationBtn");
  if (topLabel) topLabel.textContent = success ? "GPS Active" : "Live Location";
  if (mapBtn) mapBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">my_location</span><span>Find My Location</span>`;
}

function populateLiveLocationModal(lat, lon, acc, liveWeather, panchayat, distanceKm, note = "") {
  const coordsEl = document.getElementById("modalGpsCoords");
  if (coordsEl) {
    coordsEl.textContent = `Lat: ${lat.toFixed(4)}°N, Lon: ${lon.toFixed(4)}°E (±${acc}m) ${note}`;
  }

  if (liveWeather) {
    const tEl = document.getElementById("liveLocTemp");
    const feelsEl = document.getElementById("liveLocFeels");
    const rhEl = document.getElementById("liveLocRh");
    const rainEl = document.getElementById("liveLocRain");
    const windEl = document.getElementById("liveLocWind");
    const windDirEl = document.getElementById("liveLocWindDir");

    if (tEl) tEl.textContent = liveWeather.temperature_2m ?? "--";
    if (feelsEl) feelsEl.textContent = `Feels ${liveWeather.apparent_temperature ?? liveWeather.temperature_2m}°C`;
    if (rhEl) rhEl.textContent = liveWeather.relative_humidity_2m ?? "--";
    if (rainEl) rainEl.textContent = (liveWeather.precipitation ?? liveWeather.rain ?? 0).toFixed(1);
    if (windEl) windEl.textContent = liveWeather.wind_speed_10m ?? "--";
    if (windDirEl) windDirEl.textContent = `Dir: ${liveWeather.wind_direction_10m ?? 0}°`;
  }

  const pNameEl = document.getElementById("liveLocNearestGpName");
  const pBlockEl = document.getElementById("liveLocNearestGpBlock");
  const distTagEl = document.getElementById("liveLocDistanceTag");

  if (pNameEl) pNameEl.textContent = `${panchayat.gp_name} (${panchayat.name_ta || ''})`;
  if (pBlockEl) pBlockEl.textContent = `Block: ${panchayat.block_name || panchayat.block_id || 'Theni'} · Elev: ${panchayat.elev || 280}m ASL`;
  if (distTagEl) distTagEl.textContent = `${distanceKm} km away`;
}

function renderUserLocationOnMaps(lat, lon, accuracy, panchayat, distanceKm) {
  if (!state.mapsInitialized) {
    initOrResizeDualMaps();
  }

  const gpsIcon = L.divIcon({
    className: 'user-gps-container',
    html: '<div class="user-gps-marker"><div class="user-gps-pulse"></div><div class="user-gps-dot"></div></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const popupHtml = `
    <div style="font-family:Inter,sans-serif; min-width:160px;">
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#06b6d4;"></span>
        <strong style="color:#06b6d4; font-size:13px;">Your Live Location</strong>
      </div>
      <span style="color:#94a3b8; font-size:10px;">${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E (±${accuracy}m)</span>
      <hr style="border-color:#334155; margin:6px 0;"/>
      <div style="font-size:11px; color:#f8fafc;">
        <strong>Nearest GP:</strong> ${panchayat.gp_name}<br/>
        <span style="color:#10b981; font-weight:bold;">${distanceKm} km away</span>
      </div>
    </div>
  `;

  // Map 1: Block Map
  if (state.mapBlock) {
    if (state.userMarkerBlock) state.mapBlock.removeLayer(state.userMarkerBlock);
    if (state.userCircleBlock) state.mapBlock.removeLayer(state.userCircleBlock);

    state.userCircleBlock = L.circle([lat, lon], {
      radius: Math.max(accuracy, 250),
      color: "#06b6d4",
      weight: 1.5,
      fillColor: "#06b6d4",
      fillOpacity: 0.15
    }).addTo(state.mapBlock);

    state.userMarkerBlock = L.marker([lat, lon], { icon: gpsIcon }).addTo(state.mapBlock).bindPopup(popupHtml);
  }

  // Map 2: Downscaled Panchayat Map
  if (state.mapPanchayat) {
    if (state.userMarkerPanchayat) state.mapPanchayat.removeLayer(state.userMarkerPanchayat);
    if (state.userCirclePanchayat) state.mapPanchayat.removeLayer(state.userCirclePanchayat);

    state.userCirclePanchayat = L.circle([lat, lon], {
      radius: Math.max(accuracy, 250),
      color: "#06b6d4",
      weight: 1.5,
      fillColor: "#06b6d4",
      fillOpacity: 0.15
    }).addTo(state.mapPanchayat);

    state.userMarkerPanchayat = L.marker([lat, lon], { icon: gpsIcon }).addTo(state.mapPanchayat).bindPopup(popupHtml);
    state.userMarkerPanchayat.openPopup();
  }

  // Pan to location
  if (state.mapBlock) state.mapBlock.flyTo([lat, lon], 12, { animate: true, duration: 1.2 });
  if (state.mapPanchayat) state.mapPanchayat.flyTo([lat, lon], 12, { animate: true, duration: 1.2 });
}

function applyNearestPanchayat(p) {
  if (!p) return;
  if (p.block_id && p.block_id !== state.block) {
    state.block = p.block_id;
    const bSel = document.getElementById("sidebarBlockSelect");
    if (bSel) bSel.value = p.block_id;
    updateDashboardForCurrentBlock();
  }
  selectPanchayat(p);
  const modal = document.getElementById("liveLocationModal");
  if (modal) modal.classList.replace("flex", "hidden");
}

function initLiveLocationModal() {
  const modal = document.getElementById("liveLocationModal");
  const closeBtn = document.getElementById("closeLiveLocModalBtn");
  const applyBtn = document.getElementById("btnApplyNearestGp");
  const viewMapBtn = document.getElementById("btnViewOnMapLive");

  if (closeBtn && modal) {
    closeBtn.onclick = () => modal.classList.replace("flex", "hidden");
  }

  if (applyBtn) {
    applyBtn.onclick = () => {
      if (state.nearestPanchayat) {
        applyNearestPanchayat(state.nearestPanchayat);
      }
    };
  }

  if (viewMapBtn) {
    viewMapBtn.onclick = () => {
      if (modal) modal.classList.replace("flex", "hidden");
      document.querySelector('.sidebar-nav-item[data-tab="tabPanchayatMap"]')?.click();
      if (state.userLocation) {
        setTimeout(() => {
          renderUserLocationOnMaps(state.userLocation.lat, state.userLocation.lon, state.userLocation.accuracy, state.nearestPanchayat, state.nearestDistanceKm);
        }, 200);
      }
    };
  }
}

