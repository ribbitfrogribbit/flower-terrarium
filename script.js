const flowerTypes = [
  {
    key: "매화_개화일_DOY",
    accKey: "매화_적산온도",
    name: "매화",
    className: "plum",
    color: "#e9e7dd",
    order: 0,
    baseStemHeight: 56
  },
  {
    key: "개나리_개화일_DOY",
    accKey: "개나리_적산온도",
    name: "개나리",
    className: "forsythia",
    color: "#ffd51e",
    order: 1,
    baseStemHeight: 49
  },
  {
    key: "진달래_개화일_DOY",
    accKey: "진달래_적산온도",
    name: "진달래",
    className: "azalea",
    color: "#df45da",
    order: 2,
    baseStemHeight: 42
  },
  {
    key: "벚나무_개화일_DOY",
    accKey: "벚나무_적산온도",
    name: "벚꽃",
    className: "cherry",
    color: "#f9c4c4",
    order: 3,
    baseStemHeight: 35
  }
];

const START_DOY = 1;
const END_DOY = 130;

const regionSelect = document.querySelector("#regionSelect");
const stationLabel = document.querySelector("#stationLabel");
const yearGrid = document.querySelector("#yearGrid");
const currentDateLabel = document.querySelector("#currentDateLabel");
const dateMarker = document.querySelector("#dateMarker");
const tooltip = document.querySelector("#tooltip");
const cardCountSlider = document.querySelector("#cardCountSlider");
const cardCountLabel = document.querySelector("#cardCountLabel");

let allData = [];
let currentProvince = "";
let currentStation = "";
let currentDoy = START_DOY;

let minAccTemp;
let maxAccTemp;

d3.csv("flower_data.csv").then(data => {
  allData = data.map(d => {
    const row = { ...d };

    row["연도"] = +d["연도"];
    row["1-5월_평균기온"] = +d["1-5월_평균기온"];

    flowerTypes.forEach(flower => {
      row[flower.key] = +d[flower.key];
      row[flower.accKey] = +d[flower.accKey];
    });

    return row;
  });

  const accTemps = [];

  allData.forEach(row => {
    flowerTypes.forEach(flower => {
      const value = row[flower.accKey];
      if (!isNaN(value)) accTemps.push(value);
    });
  });

  minAccTemp = Math.min(...accTemps);
  maxAccTemp = Math.max(...accTemps);

  const provinces = [...new Set(allData.map(d => d["도"]))].sort();

  provinces.forEach(province => {
    const option = document.createElement("option");
    option.value = province;
    option.textContent = province;
    regionSelect.appendChild(option);
  });

  currentProvince = provinces[0];
  regionSelect.value = currentProvince;

  updateStationInfo();
  updateCardCount();
  renderStation();
  updateByScroll();
});

regionSelect.addEventListener("change", () => {
  currentProvince = regionSelect.value;
  updateStationInfo();
  renderStation();
  updateFlowers();
});

cardCountSlider.addEventListener("input", updateCardCount);
window.addEventListener("scroll", updateByScroll);

function updateStationInfo() {
  const stations = [
    ...new Set(
      allData
        .filter(row => row["도"] === currentProvince)
        .map(row => row["지역"])
    )
  ].sort((a, b) => String(a).localeCompare(String(b), "ko"));

  currentStation = stations[0];
  stationLabel.textContent = currentStation || "-";
}

function updateCardCount() {
  const count = +cardCountSlider.value;
  cardCountLabel.textContent = `${count}개`;
  yearGrid.style.setProperty("--cards-per-row", count);
}

function renderStation() {
  yearGrid.innerHTML = "";

  const stationData = allData
    .filter(row => row["도"] === currentProvince && row["지역"] === currentStation)
    .sort((a, b) => a["연도"] - b["연도"]);

  stationData.forEach(row => {
    const card = document.createElement("div");
    card.className = "year-card";

    const flowerData = flowerTypes
      .map((flower, index) => {
        const doy = row[flower.key];
        const accTemp = row[flower.accKey];

        if (isNaN(doy) || doy <= 0) return null;

        return {
          ...flower,
          index,
          doy,
          accTemp
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.doy === b.doy) return a.order - b.order;
        return a.doy - b.doy;
      });

    card.innerHTML = `
      <div class="card-header">
        <div class="year-label">${row["연도"]}</div>
        <div class="weather-mini">
          <span>🌡 ${formatNumber(row["1-5월_평균기온"])}℃</span>
        </div>
      </div>

      <div
        class="terrarium"
        style="
          --sky-top:#382b47;
          --sky-bottom:#5d4053;
          --sky-glow:transparent;
          --soil-top:#355c47;
          --soil-bottom:#263f33;
        "
      >
        <div class="soil"></div>

        ${flowerData.map((flower, orderIndex) => {
          const safeOffset = getSafeOffset(flower, flowerData);
          const x = doyToPercent(flower.doy, safeOffset);
          const scale = accTempToScale(flower.accTemp);

          const recentBoost = orderIndex === flowerData.length - 1 ? 1.08 : 1;
          const finalScale = scale * recentBoost;

          const headWidth = 38 * finalScale;
          const headHeight = 38 * finalScale;
          const flowerWidth = 42 * finalScale;
          const petalSize = 17 * finalScale;
          const petalDistance = -12 * finalScale;
          const centerSize = 12 * finalScale;
          const centerRingSize = 2.2 * finalScale;

          const stemHeight = flower.baseStemHeight;
          const zIndex = 10 + Math.round(flower.doy);

          return `
            <div
              class="flower future"
              data-year="${row["연도"]}"
              data-station="${row["지역"]}"
              data-flower="${flower.name}"
              data-doy="${flower.doy}"
              data-date="${doyToDate(flower.doy)}"
              data-acc="${formatNumber(flower.accTemp)}"
              data-color="${flower.color}"
              data-acc-raw="${flower.accTemp}"
              style="
                --x:${x}%;
                --flower-width:${flowerWidth}px;
                --head-width:${headWidth}px;
                --head-height:${headHeight}px;
                --stem-height:${stemHeight}px;
                --petal-size:${petalSize}px;
                --petal-distance:${petalDistance}px;
                --center-size:${centerSize}px;
                --center-ring-size:${centerRingSize}px;
                z-index:${zIndex};
              "
            >
              <div class="stem"></div>
              <div class="leaf left"></div>
              <div class="leaf right"></div>

              <div class="flower-head ${flower.className}">
                <div class="petal" style="--angle:0deg"></div>
                <div class="petal" style="--angle:72deg"></div>
                <div class="petal" style="--angle:144deg"></div>
                <div class="petal" style="--angle:216deg"></div>
                <div class="petal" style="--angle:288deg"></div>
                <div class="flower-center"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    yearGrid.appendChild(card);
  });

  attachTooltipEvents();
}

function getSafeOffset(targetFlower, flowerData) {
  const closeFlowers = flowerData
    .filter(flower => Math.abs(flower.doy - targetFlower.doy) <= 3)
    .sort((a, b) => {
      if (a.doy === b.doy) return a.order - b.order;
      return a.doy - b.doy;
    });

  if (closeFlowers.length <= 1) return 0;

  const index = closeFlowers.findIndex(flower => flower.name === targetFlower.name);
  const center = (closeFlowers.length - 1) / 2;

  return (index - center) * 1.2;
}

function updateByScroll() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const scrollRatio = maxScroll <= 0 ? 0 : window.scrollY / maxScroll;

  currentDoy = Math.round(START_DOY + scrollRatio * (END_DOY - START_DOY));
  currentDateLabel.textContent = doyToDate(currentDoy);

  const markerColor = timelineColor(scrollRatio);
  dateMarker.style.left = `${scrollRatio * 100}%`;
  dateMarker.style.background = markerColor;
  dateMarker.style.boxShadow = `0 0 18px ${markerColor}`;

  updateFlowers();
}

function updateFlowers() {
  const flowers = document.querySelectorAll(".flower");

  flowers.forEach(flower => {
    const flowerDoy = +flower.dataset.doy;
    const diff = Math.abs(flowerDoy - currentDoy);

    flower.classList.remove("future", "bloomed", "today");

    if (flowerDoy <= currentDoy) {
      flower.classList.add("bloomed");
    } else {
      flower.classList.add("future");
    }

    if (diff <= 1) {
      flower.classList.add("today");
    }
  });

  updateTerrariumColor();
}

function updateTerrariumColor() {
  const terrariums = document.querySelectorAll(".terrarium");

  terrariums.forEach(terrarium => {
    const card = terrarium.closest(".year-card");
    const flowers = [...terrarium.querySelectorAll(".flower")];

    const bloomedFlowers = flowers
      .map(flower => ({
        doy: +flower.dataset.doy,
        color: flower.dataset.color,
        accTemp: +flower.dataset.accRaw
      }))
      .filter(flower => flower.doy <= currentDoy)
      .sort((a, b) => b.doy - a.doy);

    if (bloomedFlowers.length >= 4) {
      card.classList.add("spring-complete");
    } else {
      card.classList.remove("spring-complete");
    }

    if (bloomedFlowers.length === 0) {
      terrarium.style.setProperty("--sky-top", "#382b47");
      terrarium.style.setProperty("--sky-bottom", "#5d4053");
      terrarium.style.setProperty("--sky-glow", "transparent");
      terrarium.style.setProperty("--soil-top", "#355c47");
      terrarium.style.setProperty("--soil-bottom", "#263f33");
      return;
    }

    const latestFlower = bloomedFlowers[0];

    const skyTop = mixColor("#382b47", latestFlower.color, 0.35);
    const skyBottom = mixColor("#5d4053", latestFlower.color, 0.45);
    const soilColors = accTempToSoilColor(latestFlower.accTemp);

    terrarium.style.setProperty("--sky-top", skyTop);
    terrarium.style.setProperty("--sky-bottom", skyBottom);
    terrarium.style.setProperty("--sky-glow", hexToRgba(latestFlower.color, 0.45));
    terrarium.style.setProperty("--soil-top", soilColors.top);
    terrarium.style.setProperty("--soil-bottom", soilColors.bottom);
  });
}

function attachTooltipEvents() {
  const flowers = document.querySelectorAll(".flower");

  flowers.forEach(flower => {
    flower.addEventListener("mouseenter", () => {
      if (flower.classList.contains("future")) {
        tooltip.style.display = "none";
        return;
      }

      tooltip.style.display = "block";

      tooltip.innerHTML = `
        <div class="tooltip-title">
          <span class="tooltip-dot" style="background:${flower.dataset.color}"></span>
          ${flower.dataset.year} · ${flower.dataset.station} · ${flower.dataset.flower}
        </div>
        <div>개화일: ${flower.dataset.date}</div>
        <div>적산온도: ${flower.dataset.acc}</div>
      `;
    });

    flower.addEventListener("mousemove", event => {
      if (flower.classList.contains("future")) {
        tooltip.style.display = "none";
        return;
      }

      tooltip.style.left = `${event.clientX + 14}px`;
      tooltip.style.top = `${event.clientY + 14}px`;
    });

    flower.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
}

function doyToPercent(doy, offset = 0) {
  if (isNaN(doy) || doy <= 0) return 0;

  const basePercent = ((doy - START_DOY) / (END_DOY - START_DOY)) * 100;
  const correctedPercent = basePercent + offset;

  return Math.max(7, Math.min(93, correctedPercent));
}

function accTempToScale(value) {
  if (isNaN(value) || maxAccTemp === minAccTemp) return 0.82;

  const t = (value - minAccTemp) / (maxAccTemp - minAccTemp);
  return 0.62 + t * 0.55;
}

function accTempToSoilColor(value) {
  if (isNaN(value) || maxAccTemp === minAccTemp) {
    return {
      top: "#355c47",
      bottom: "#263f33"
    };
  }

  const t = (value - minAccTemp) / (maxAccTemp - minAccTemp);

  return {
    top: mixColor("#355c47", "#b67a44", t),
    bottom: mixColor("#263f33", "#7b4b2d", t)
  };
}

function timelineColor(ratio) {
  const stops = [
    { at: 0, color: "#e9e7dd" },
    { at: 0.34, color: "#ffd51e" },
    { at: 0.66, color: "#df45da" },
    { at: 1, color: "#f9c4c4" }
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];

    if (ratio >= a.at && ratio <= b.at) {
      const localRatio = (ratio - a.at) / (b.at - a.at);
      return mixColor(a.color, b.color, localRatio);
    }
  }

  return stops[stops.length - 1].color;
}

function mixColor(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  const mixed = a.map((value, index) => {
    return Math.round(value + (b[index] - value) * amount);
  });

  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return [r, g, b];
}

function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function doyToDate(doy) {
  const date = new Date(2024, 0, doy);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatNumber(value) {
  if (isNaN(value)) return "-";
  return value.toFixed(1);
}