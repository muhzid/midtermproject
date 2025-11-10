// =======================
// BMW Dashboard (D3 v7)
// Modern 2025 Edition - FIXED COLORS
// =======================

const csvPath = "data/BMW_sales_data.csv";

// DOM References
const modelSelect = d3.select("#modelSelect");
const regionContainer = d3.select("#regionCheckboxes");
const playBtn = d3.select("#playBtn");
const yearSlider = d3.select("#yearSlider");
const yearLabel = d3.select("#yearLabel");
const tooltip = d3.select("#tooltip");

// Global Variables
let rawData = [];
let regions = [];
let models = [];
let groupedByYearRegion = new Map();
let animationTimer = null;
let playing = false;
let selectedYearStart = 2010;
let selectedYearEnd = 2024;
let filteredData = [];

// ✨ DEFINISI WARNA EKSPLISIT
const REGION_COLORS = {
  'Africa': '#ff6b6b',
  'Asia': '#4ecdc4',
  'Europe': '#45b7d1',
  'Middle East': '#96ceb4',
  'North America': '#ffeead',
  'South America': '#f38181'
};

const MODEL_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', 
  '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
  '#a855f7', '#14b8a6', '#f97316', '#22c55e'
];

// ===========================
// DATA PARSING
// ===========================

function parseRow(d) {
  return {
    Model: d.Model,
    Year: +d.Year,
    Region: d.Region,
    Color: d.Color,
    Fuel_Type: d.Fuel_Type,
    Transmission: d.Transmission,
    Engine_Size_L: +d.Engine_Size_L || 0,
    Mileage_KM: +d.Mileage_KM || 0,
    Price_USD: +d.Price_USD || 0,
    Sales_Volume: +d.Sales_Volume || 0,
    Sales_Classification: d.Sales_Classification
  };
}

// ===========================
// LOAD CSV DATA
// ===========================

d3.csv(csvPath, parseRow).then(data => {
  rawData = data;
  initialize();
}).catch(err => {
  console.error("❌ Terjadi error saat memuat CSV:", err);
  alert("Gagal memuat CSV – cek path file dan jalankan Live Server.");
});

// ===========================
// INITIALIZATION
// ===========================

function initialize() {
  regions = Array.from(new Set(rawData.map(d => d.Region))).sort();
  models = Array.from(new Set(rawData.map(d => d.Model))).sort();

  models.forEach(m => modelSelect.append("option").attr("value", m).text(m));

  regions.forEach(r => {
    const id = "region-" + r.replace(/\s+/g,"_");
    const chip = regionContainer.append("label").attr("class","chip");
    chip.html(`<input type="checkbox" id="${id}" value="${r}" checked> ${r}`);
  });

  const years = Array.from(new Set(rawData.map(d => d.Year))).sort((a,b)=>a-b);
  const minY = d3.min(years), maxY = d3.max(years);
  
  const yearStart = d3.select("#yearStart");
  const yearEnd = d3.select("#yearEnd");
  
  years.forEach(y => {
    yearStart.append("option").attr("value", y).text(y);
    yearEnd.append("option").attr("value", y).text(y).property("selected", y === maxY);
  });
  
  selectedYearStart = minY;
  selectedYearEnd = maxY;
  
  yearSlider.attr("min", minY).attr("max", maxY).attr("value", minY);
  yearLabel.text(minY);

  filterDataByYearRange();
  recomputeAggregates();

  buildLineChart();
  buildScatterChart();
  buildBarChart();

  d3.selectAll("#regionCheckboxes input[type=checkbox]").on("change", updateAll);
  modelSelect.on("change", updateAll);
  d3.select("#applyYearRange").on("click", applyYearRange);
  yearSlider.on("input", function() {
    const y = +this.value;
    yearLabel.text(y);
    updateForYear(y);
  });
  playBtn.on("click", togglePlay);
  initializeChartModal();
}

// ===========================
// HELPER: GET COLOR
// ===========================

function getRegionColor(region) {
  return REGION_COLORS[region] || '#888888';
}

function getModelColor(model, index) {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}

// ===========================
// YEAR RANGE FILTERING
// ===========================

function applyYearRange() {
  const yearStart = +d3.select("#yearStart").node().value;
  const yearEnd = +d3.select("#yearEnd").node().value;
  
  if (yearStart > yearEnd) {
    alert("⚠️ Start year tidak boleh lebih besar dari end year!");
    return;
  }
  
  selectedYearStart = yearStart;
  selectedYearEnd = yearEnd;
  
  filterDataByYearRange();
  recomputeAggregates();
  
  yearSlider.attr("min", yearStart).attr("max", yearEnd).attr("value", yearStart);
  yearLabel.text(yearStart);
  
  buildLineChart();
  buildScatterChart();
  buildBarChart();
  
  updateForYear(yearStart);
  showYearRangeNotification(yearStart, yearEnd);
}

function filterDataByYearRange() {
  filteredData = rawData.filter(d => 
    d.Year >= selectedYearStart && d.Year <= selectedYearEnd
  );
}

function recomputeAggregates() {
  groupedByYearRegion = d3.rollup(
    filteredData,
    v => d3.sum(v, d => d.Sales_Volume),
    d => d.Year, 
    d => d.Region
  );
}

function showYearRangeNotification(start, end) {
  d3.select(".year-range-notification").remove();
  
  const notification = d3.select("body")
    .append("div")
    .attr("class", "year-range-notification")
    .style("position", "fixed")
    .style("top", "100px")
    .style("right", "30px")
    .style("background", "linear-gradient(135deg, #3b82f6, #8b5cf6)")
    .style("color", "white")
    .style("padding", "16px 24px")
    .style("border-radius", "12px")
    .style("box-shadow", "0 8px 25px rgba(59, 130, 246, 0.4)")
    .style("z-index", "1000")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .html(`✅ Year range updated: ${start} - ${end}`);
  
  setTimeout(() => {
    notification.transition().duration(300).style("opacity", 0).remove();
  }, 3000);
}

// ===========================
// LINE CHART - WITH FIXED COLORS
// ===========================

function buildLineChart() {
  d3.select("#lineChart").selectAll("*").remove();

  const margin = {top: 30, right: 160, bottom: 50, left: 70};
  const width = Math.min(900, window.innerWidth - 100) - margin.left - margin.right;
  const height = 350 - margin.top - margin.bottom;

  const svg = d3.select("#lineChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const years = Array.from(new Set(filteredData.map(d=>d.Year))).sort((a,b)=>a-b);
  const series = regions.map(region => {
    return {
      id: region,
      values: years.map(y => {
        const val = groupedByYearRegion.get(y) ? 
          (groupedByYearRegion.get(y).get(region) || 0) : 0;
        return {Year: y, Total: val};
      })
    };
  });

  const x = d3.scaleLinear()
    .domain(d3.extent(years))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(series, s => d3.max(s.values, d => d.Total))])
    .nice()
    .range([height, 0]);

  // Axes with styling
  const xAxis = g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d")));
  
  xAxis.selectAll("text").attr("fill", "#94a3b8");
  xAxis.selectAll("line").attr("stroke", "#334155");
  xAxis.select(".domain").attr("stroke", "#334155");

  const yAxis = g.append("g")
    .call(d3.axisLeft(y).tickFormat(d3.format(",")));
  
  yAxis.selectAll("text").attr("fill", "#94a3b8");
  yAxis.selectAll("line").attr("stroke", "#334155");
  yAxis.select(".domain").attr("stroke", "#334155");

  // Line generator
  const line = d3.line()
    .x(d => x(d.Year))
    .y(d => y(d.Total))
    .curve(d3.curveMonotoneX);

  // Draw lines with EXPLICIT COLORS
  const lines = g.append("g").attr("class", "lines");
  
  series.forEach(regionData => {
    const color = getRegionColor(regionData.id);
    
    lines.append("path")
      .datum(regionData)
      .attr("class", "line-path")
      .attr("data-region", regionData.id)
      .attr("d", d => line(d.values))
      .style("stroke", color)
      .style("stroke-width", "3px")
      .style("fill", "none")
      .style("opacity", "0.9");
  });

  // ✨ LEGEND WITH COLORS
  const legend = svg.append("g")
    .attr("class", "chart-legend")
    .attr("transform", `translate(${width + margin.left + 15}, ${margin.top})`);

  regions.forEach((r, i) => {
    const color = getRegionColor(r);
    
    const legendRow = legend.append("g")
      .attr("class", "legend-row")
      .attr("transform", `translate(0, ${i * 24})`)
      .style("cursor", "pointer")
      .on("click", () => {
        const cb = d3.select(`#region-${r.replace(/\s+/g,"_")}`);
        cb.property("checked", !cb.property("checked"));
        updateAll();
      })
      .on("mouseover", function() {
        d3.select(this).select("rect")
          .style("stroke", "#fff")
          .style("stroke-width", "2px");
      })
      .on("mouseout", function() {
        d3.select(this).select("rect")
          .style("stroke", "none");
      });

    legendRow.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 14)
      .attr("rx", 3)
      .style("fill", color);

    legendRow.append("text")
      .attr("x", 20)
      .attr("y", 11)
      .text(r)
      .style("font-size", "11px")
      .style("fill", "#f8fafc")
      .style("font-weight", "500");
  });

  // Year marker
  const marker = g.append("line")
    .attr("class", "year-marker")
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "#3b82f6")
    .style("stroke-dasharray", "4 4")
    .style("stroke-width", "2px")
    .style("opacity", "0.7");

  d3.select("#lineChart").node().__chart = {
    svg, g, x, y, line, series, marker, years
  };
}

// ===========================
// SCATTER CHART - WITH COLORS
// ===========================

function buildScatterChart() {
  d3.select("#scatterChart").selectAll("*").remove();

  const margin = {top: 20, right: 20, bottom: 50, left: 70};
  const width = Math.min(600, window.innerWidth/2 - 80) - margin.left - margin.right;
  const height = 350 - margin.top - margin.bottom;

  const svg = d3.select("#scatterChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  g.append("g")
    .attr("class", "y-axis");

  g.append("text")
    .attr("class", "x-label")
    .attr("x", width/2)
    .attr("y", height + 42)
    .attr("text-anchor", "middle")
    .style("fill", "#94a3b8")
    .text("Price (USD)");

  g.append("text")
    .attr("class", "y-label")
    .attr("x", -height/2)
    .attr("y", -55)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .style("fill", "#94a3b8")
    .text("Sales Volume");

  // Container untuk legend scatter
  g.append("g")
    .attr("class", "scatter-legend");

  d3.select("#scatterChart").node().__chart = {
    svg, g, margin, width, height
  };
}

// ===========================
// BAR CHART
// ===========================

function buildBarChart() {
  d3.select("#barChart").selectAll("*").remove();

  const margin = {top: 20, right: 180, bottom: 60, left: 90};
  const width = Math.min(1200, window.innerWidth - 120) - margin.left - margin.right;
  const height = 260 - margin.top - margin.bottom;

  const svg = d3.select("#barChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  g.append("g")
    .attr("class", "y-axis");

  d3.select("#barChart").node().__chart = {
    svg, g, margin, width, height
  };
}

// ===========================
// UPDATE FUNCTIONS
// ===========================

function getActiveRegions() {
  return Array.from(d3.selectAll("#regionCheckboxes input[type=checkbox]").nodes())
    .filter(n => n.checked)
    .map(n => n.value);
}

function updateAll() {
  const activeRegions = getActiveRegions();
  updateLines(activeRegions);
  updateForYear(+yearSlider.node().value);
}

function updateLines(activeRegions) {
  const chart = d3.select("#lineChart").node().__chart;
  const {g} = chart;

  g.selectAll(".line-path")
    .transition()
    .duration(600)
    .style("opacity", function() {
      const region = d3.select(this).attr("data-region");
      return activeRegions.includes(region) ? "0.9" : "0.1";
    })
    .style("stroke-width", function() {
      const region = d3.select(this).attr("data-region");
      return activeRegions.includes(region) ? "3px" : "1.5px";
    });
}

function updateForYear(year) {
  const chart = d3.select("#lineChart").node().__chart;
  const {x, marker} = chart;
  const xpos = x(year);
  
  marker.transition()
    .duration(300)
    .attr("x1", xpos)
    .attr("x2", xpos)
    .style("opacity", "0.9");

  updateScatter(year);
  updateBar(year);
}

// ===========================
// UPDATE SCATTER
// ===========================

function updateScatter(year) {
  const selModel = modelSelect.node().value;
  const activeRegions = getActiveRegions();

  let subset = filteredData.filter(d => d.Year === +year && activeRegions.includes(d.Region));
  
  if (selModel !== "__ALL__") {
    subset = subset.filter(d => d.Model === selModel);
  }

  const agg = Array.from(
    d3.rollup(
      subset, 
      v => ({
        totalSales: d3.sum(v, d => d.Sales_Volume),
        avgPrice: v.length ? d3.mean(v, d => d.Price_USD) : 0,
        avgEngine: v.length ? d3.mean(v, d => d.Engine_Size_L) : 0,
        sampleCount: v.length
      }),
      d => d.Model
    ),
    ([model, val]) => ({Model: model, ...val})
  );

  const chart = d3.select("#scatterChart").node().__chart;
  const {g, width, height} = chart;

  const x = d3.scaleLinear()
    .domain([0, d3.max(agg, d => d.avgPrice) || 1])
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(agg, d => d.totalSales) || 1])
    .nice()
    .range([height, 0]);

  const size = d3.scaleSqrt()
    .domain([0, d3.max(agg, d => d.totalSales) || 1])
    .range([5, 30]);

  const xAxis = g.select(".x-axis")
    .transition()
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(",")).tickSizeOuter(0));
  
  xAxis.selectAll("text").attr("fill", "#94a3b8");
  xAxis.selectAll("line").attr("stroke", "#334155");

  const yAxis = g.select(".y-axis")
    .transition()
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));
  
  yAxis.selectAll("text").attr("fill", "#94a3b8");
  yAxis.selectAll("line").attr("stroke", "#334155");

  const points = g.selectAll(".point").data(agg, d => d.Model);

  points.exit()
    .transition()
    .attr("r", 0)
    .remove();

  const enter = points.enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", d => x(d.avgPrice))
    .attr("cy", d => y(d.totalSales))
    .attr("r", 0)
    .style("opacity", "0.85")
    .style("stroke", "#fff")
    .style("stroke-width", "2px")
    .on("mousemove", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.Model}</strong><br/>Sales: ${d3.format(",")(d.totalSales)}<br/>Avg Price: $${d3.format(",.0f")(d.avgPrice)}<br/>Engine: ${d.avgEngine.toFixed(1)}L`)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  enter.merge(points)
    .transition()
    .duration(700)
    .attr("cx", d => x(d.avgPrice))
    .attr("cy", d => y(d.totalSales))
    .attr("r", d => size(d.totalSales))
    .style("fill", (d, i) => getModelColor(d.Model, i));

  // ✨ TAMBAHKAN LEGEND UNTUK SCATTER PLOT
  const legendContainer = g.select(".scatter-legend");
  legendContainer.selectAll("*").remove();
  
  // Hitung posisi legend (di pojok kanan atas area chart)
  const legendX = width - 150;
  const legendY = 10;
  
  // Background untuk legend
  legendContainer.append("rect")
    .attr("x", legendX - 10)
    .attr("y", legendY - 10)
    .attr("width", 160)
    .attr("height", Math.min(agg.length, 6) * 22 + 20)
    .attr("rx", 8)
    .style("fill", "rgba(26, 33, 55, 0.9)")
    .style("stroke", "#334155")
    .style("stroke-width", "1px");
  
  // Judul legend
  legendContainer.append("text")
    .attr("x", legendX)
    .attr("y", legendY + 5)
    .text("Models")
    .style("font-size", "12px")
    .style("fill", "#94a3b8")
    .style("font-weight", "600");
  
  // Items legend (maksimal 6 item untuk tidak terlalu panjang)
  const legendItems = agg.slice(0, 6);
  
  legendItems.forEach((d, i) => {
    const color = getModelColor(d.Model, i);
    const itemY = legendY + 25 + (i * 22);
    
    const legendRow = legendContainer.append("g")
      .attr("class", "legend-item")
      .style("cursor", "pointer")
      .on("mouseover", function() {
        // Highlight titik yang sesuai
        g.selectAll(".point")
          .style("opacity", function(p) {
            return p.Model === d.Model ? "1" : "0.2";
          });
      })
      .on("mouseout", function() {
        g.selectAll(".point").style("opacity", "0.85");
      });
    
    legendRow.append("circle")
      .attr("cx", legendX + 8)
      .attr("cy", itemY)
      .attr("r", 6)
      .style("fill", color)
      .style("stroke", "#fff")
      .style("stroke-width", "1.5px");
    
    legendRow.append("text")
      .attr("x", legendX + 20)
      .attr("y", itemY + 4)
      .text(d.Model.length > 12 ? d.Model.substring(0, 12) + "..." : d.Model)
      .style("font-size", "11px")
      .style("fill", "#f8fafc")
      .style("font-weight", "400");
  });
  
  // Jika ada lebih dari 6 model, tambahkan info
  if (agg.length > 6) {
    legendContainer.append("text")
      .attr("x", legendX)
      .attr("y", legendY + 25 + (6 * 22))
      .text(`+${agg.length - 6} more...`)
      .style("font-size", "10px")
      .style("fill", "#64748b")
      .style("font-style", "italic");
  }
}

// ===========================
// UPDATE BAR
// ===========================

function updateBar(year) {
  const selModel = modelSelect.node().value;
  const activeRegions = getActiveRegions();

  let subset = filteredData.filter(d => d.Year === +year && activeRegions.includes(d.Region));
  
  if (selModel !== "__ALL__") {
    subset = subset.filter(d => d.Model === selModel);
  }

  const transCounts = d3.rollup(
    subset, 
    v => d3.sum(v, d => d.Sales_Volume), 
    d => d.Transmission, 
    d => d.Fuel_Type
  );

  const rows = [];
  for (const [trans, map] of transCounts.entries()) {
    for (const [fuel, val] of map.entries()) {
      rows.push({transmission: trans, fuel: fuel, value: val});
    }
  }

  const transmissions = Array.from(new Set(rows.map(r => r.transmission)));
  const fuels = Array.from(new Set(rows.map(r => r.fuel)));
  
  const dataPivot = transmissions.map(t => {
    const row = {transmission: t};
    fuels.forEach(f => {
      const r = rows.find(rr => rr.transmission === t && rr.fuel === f);
      row[f] = r ? r.value : 0;
    });
    return row;
  });

  const chart = d3.select("#barChart").node().__chart;
  const {g, width, height} = chart;
  g.selectAll("*").remove();

  const x0 = d3.scaleBand()
    .domain(transmissions)
    .range([0, width])
    .padding(0.25);

  const x1 = d3.scaleBand()
    .domain(fuels)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const y = d3.scaleLinear()
    .domain([0, d3.max(dataPivot, d => d3.max(fuels, f => d[f])) || 1])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(fuels)
    .range(['#10b981', '#3b82f6', '#f59e0b', '#ec4899']);

  const xAxis = g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0));
  
  xAxis.selectAll("text").attr("fill", "#94a3b8");
  xAxis.selectAll("line").attr("stroke", "#334155");
  xAxis.select(".domain").attr("stroke", "#334155");

  const yAxis = g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")));
  
  yAxis.selectAll("text").attr("fill", "#94a3b8");
  yAxis.selectAll("line").attr("stroke", "#334155");
  yAxis.select(".domain").attr("stroke", "#334155");

  const groups = g.selectAll(".group")
    .data(dataPivot)
    .enter()
    .append("g")
    .attr("class", "group")
    .attr("transform", d => `translate(${x0(d.transmission)},0)`);

  groups.selectAll("rect")
    .data(d => fuels.map(f => ({fuel: f, value: d[f]})))
    .enter()
    .append("rect")
    .attr("x", d => x1(d.fuel))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.value))
    .style("fill", d => color(d.fuel))
    .attr("rx", 4)
    .on("mousemove", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.fuel}</strong><br/>Value: ${d3.format(",")(d.value)}`)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  // Legend
  const legend = g.append("g")
    .attr("transform", `translate(${width + 20}, 15)`);

  fuels.forEach((f, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendRow.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .style("fill", color(f));

    legendRow.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(f)
      .style("font-size", "11px")
      .style("fill", "#f8fafc")
      .style("font-weight", "500");
  });
}

// ===========================
// PLAYBACK
// ===========================

function togglePlay() {
  if (playing) {
    playing = false;
    playBtn.text("▶ Play").classed("paused", false);
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
  } else {
    playing = true;
    playBtn.text("|| Pause").classed("paused", true);
    
    const min = +yearSlider.attr("min");
    const max = +yearSlider.attr("max");
    let y = +yearSlider.node().value;
    
    animationTimer = setInterval(() => {
      y = y + 1;
      if (y > max) y = min;
      yearSlider.node().value = y;
      yearLabel.text(y);
      updateForYear(y);
    }, 900);
  }
}

// ===========================
// MODAL
// ===========================

function initializeChartModal() {
  const modal = d3.select("#chartModal");
  const modalClose = d3.select("#modalClose");
  const modalOverlay = modal.select(".modal-overlay");
  const modalTitle = d3.select("#modalTitle");
  const modalContainer = d3.select("#modalChartContainer");
  
  function openModal(chartId, title) {
    const originalChart = d3.select(`#${chartId}`);
    const chartData = originalChart.node().__chart;
    
    if (!chartData) return;
    
    modalTitle.text(title);
    modalContainer.selectAll("*").remove();
    
    const originalSvg = originalChart.select("svg");
    if (originalSvg.empty()) return;
    
    const clonedSvg = originalSvg.node().cloneNode(true);
    
    const scaleFactor = 1.5;
    const originalWidth = parseFloat(d3.select(clonedSvg).attr("width"));
    const originalHeight = parseFloat(d3.select(clonedSvg).attr("height"));
    
    d3.select(clonedSvg)
      .attr("width", originalWidth * scaleFactor)
      .attr("height", originalHeight * scaleFactor);
    
    modalContainer.node().appendChild(clonedSvg);
    
    modal.classed("active", true);
    d3.select("body").classed("modal-open", true);
  }
  
  function closeModal() {
    modal.classed("active", false);
    d3.select("body").classed("modal-open", false);
    setTimeout(() => modalContainer.selectAll("*").remove(), 300);
  }
  
  d3.select("#lineChart").on("click", function(event) {
    if (event.target.tagName === "rect" || event.target.tagName === "text") return;
    openModal("lineChart", "Tren Penjualan per Tahun");
  });
  
  d3.select("#scatterChart").on("click", function() {
    openModal("scatterChart", "Harga vs Sales");
  });
  
  d3.select("#barChart").on("click", function() {
    openModal("barChart", "Distribusi Spesifikasi");
  });
  
  modalClose.on("click", closeModal);
  modalOverlay.on("click", closeModal);
  
  d3.select(document).on("keydown", function(event) {
    if (event.key === "Escape" && modal.classed("active")) {
      closeModal();
    }
  });
}