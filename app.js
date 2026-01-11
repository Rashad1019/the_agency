// Appliance Analytics Platform - Main Application JavaScript
// Data and state management
let rawData = [];
let filteredData = [];
let charts = {};

// Brand colors for consistent visualization
const brandColors = {
    'LG': '#A50034',
    'SAMSUNG': '#1428A0',
    'WHIRLPOOL': '#0051A0',
    'HAIER': '#E30613',
    'IFB': '#00A0E3',
    'REALME TECHLIFE': '#F5C518',
    'MARQ BY FLIPKART': '#2874F0',
    'ONIDA': '#FF6B00',
    'MIDEA': '#0066CC'
};

const accentColors = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

// CSV Parsing
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            let value = values[i]?.trim() || '';
            if (header === 'avg_price_usd') value = parseFloat(value.replace('$', '')) || 0;
            else if (['rating', 'capacity_lb', 'spin_rpm', 'listings'].includes(header)) value = parseFloat(value) || 0;
            obj[header] = value;
        });
        return obj;
    });
}

// Load and initialize data
async function loadData() {
    try {
        const response = await fetch('Washingmachine_analysis_ready - Washingmachine_analysis_ready.csv');
        const csvText = await response.text();
        const allData = parseCSV(csvText);

        // Filter to only include 4 specific brands
        const selectedBrands = ['SAMSUNG', 'LG', 'WHIRLPOOL', 'IFB'];
        rawData = allData.filter(d => selectedBrands.includes(d.brand));
        filteredData = [...rawData];
        initializeApp();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function initializeApp() {
    updateKPIs();
    populateFilters();
    renderTable();
    createCharts();
    generateInsights();
    setupEventListeners();
}

// KPI Updates
function updateKPIs() {
    document.getElementById('totalModels').textContent = filteredData.length;
    document.getElementById('avgRating').textContent = (filteredData.reduce((sum, d) => sum + d.rating, 0) / filteredData.length).toFixed(2);
    document.getElementById('avgPrice').textContent = '$' + (filteredData.reduce((sum, d) => sum + d.avg_price_usd, 0) / filteredData.length).toFixed(0);
    document.getElementById('totalBrands').textContent = new Set(filteredData.map(d => d.brand)).size;
}

// Populate filter options
function populateFilters() {
    const brands = [...new Set(rawData.map(d => d.brand))].sort();
    const types = [...new Set(rawData.map(d => d.function_type))];

    document.getElementById('brandFilters').innerHTML = brands.map(brand => `
        <label class="filter-option">
            <input type="checkbox" value="${brand}" checked>
            <span>${brand}</span>
        </label>
    `).join('');

    document.getElementById('typeFilters').innerHTML = types.map(type => `
        <label class="filter-option">
            <input type="checkbox" value="${type}" checked>
            <span>${type.replace('Fully Automatic ', '')}</span>
        </label>
    `).join('');

    const prices = rawData.map(d => d.avg_price_usd);
    document.getElementById('minPrice').placeholder = `Min ($${Math.min(...prices).toFixed(0)})`;
    document.getElementById('maxPrice').placeholder = `Max ($${Math.max(...prices).toFixed(0)})`;

    const capacities = rawData.map(d => d.capacity_lb);
    document.getElementById('minCapacity').placeholder = `Min (${Math.min(...capacities).toFixed(1)})`;
    document.getElementById('maxCapacity').placeholder = `Max (${Math.max(...capacities).toFixed(1)})`;
}

// Apply filters
function applyFilters() {
    const selectedBrands = [...document.querySelectorAll('#brandFilters input:checked')].map(i => i.value);
    const selectedTypes = [...document.querySelectorAll('#typeFilters input:checked')].map(i => i.value);
    const heaterFilter = document.querySelector('input[name="heater"]:checked').value;

    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || 9999;
    const minCapacity = parseFloat(document.getElementById('minCapacity').value) || 0;
    const maxCapacity = parseFloat(document.getElementById('maxCapacity').value) || 9999;

    filteredData = rawData.filter(d => {
        if (!selectedBrands.includes(d.brand)) return false;
        if (!selectedTypes.includes(d.function_type)) return false;
        if (heaterFilter !== 'all' && d.has_heater !== heaterFilter) return false;
        if (d.avg_price_usd < minPrice || d.avg_price_usd > maxPrice) return false;
        if (d.capacity_lb < minCapacity || d.capacity_lb > maxCapacity) return false;
        return true;
    });

    updateKPIs();
    renderTable();
    updateCharts();
    generateInsights();
}

function resetFilters() {
    document.querySelectorAll('#brandFilters input, #typeFilters input').forEach(i => i.checked = true);
    document.querySelector('input[name="heater"][value="all"]').checked = true;
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('minCapacity').value = '';
    document.getElementById('maxCapacity').value = '';
    filteredData = [...rawData];
    updateKPIs();
    renderTable();
    updateCharts();
    generateInsights();
}

// Table rendering with detailed information
function renderTable() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;

    let data = filteredData.filter(d =>
        d.brand.toLowerCase().includes(searchTerm) ||
        d.model_name.toLowerCase().includes(searchTerm)
    );

    const [sortField, sortDir] = sortBy.split('-');
    data.sort((a, b) => {
        let valA, valB;
        switch (sortField) {
            case 'rating': valA = a.rating; valB = b.rating; break;
            case 'price': valA = a.avg_price_usd; valB = b.avg_price_usd; break;
            case 'capacity': valA = a.capacity_lb; valB = b.capacity_lb; break;
            case 'spin': valA = a.spin_rpm; valB = b.spin_rpm; break;
        }
        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    document.getElementById('productTableBody').innerHTML = data.map((d, idx) => {
        // Calculate value score (rating per $100)
        const valueScore = ((d.rating / d.avg_price_usd) * 100).toFixed(2);

        // Calculate efficiency rating (spin RPM per lb capacity)
        const efficiencyRating = (d.spin_rpm / d.capacity_lb).toFixed(0);

        // Determine price category
        let priceCategory = 'Budget';
        if (d.avg_price_usd > 250) priceCategory = 'Premium';
        else if (d.avg_price_usd > 150) priceCategory = 'Mid-Range';

        // Calculate capacity category
        const capacityCategory = d.capacity_lb < 14 ? 'Compact' : d.capacity_lb < 17 ? 'Standard' : 'Large';

        return `
            <tr class="product-row" onclick="toggleDetails('details-${idx}')">
                <td><span class="brand-badge">${d.brand}</span></td>
                <td><strong>${d.model_name}</strong></td>
                <td><strong>$${d.avg_price_usd.toFixed(2)}</strong><br><span class="price-category ${priceCategory.toLowerCase()}">${priceCategory}</span></td>
                <td><span class="rating-stars">${'★'.repeat(Math.round(d.rating))}${'☆'.repeat(5 - Math.round(d.rating))}</span> <strong>${d.rating}</strong></td>
                <td><strong>${d.capacity_lb} lb</strong><br><span class="capacity-category">${capacityCategory}</span></td>
                <td><strong>${d.spin_rpm}</strong> RPM</td>
                <td>${d.function_type.replace('Fully Automatic ', '')}</td>
                <td><span class="heater-badge ${d.has_heater.toLowerCase()}">${d.has_heater}</span></td>
                <td><span class="listings-count">${d.listings}</span></td>
                <td><button class="btn-details" onclick="event.stopPropagation(); toggleDetails('details-${idx}')">Details ▼</button></td>
            </tr>
            <tr id="details-${idx}" class="details-row" style="display: none;">
                <td colspan="10">
                    <div class="details-content">
                        <div class="details-grid">
                            <div class="detail-card">
                                <h4>📊 Performance Metrics</h4>
                                <div class="metric-row">
                                    <span class="metric-label">Value Score:</span>
                                    <span class="metric-value">${valueScore} <small>rating per $100</small></span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Efficiency Rating:</span>
                                    <span class="metric-value">${efficiencyRating} <small>RPM per lb</small></span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Market Presence:</span>
                                    <span class="metric-value">${d.listings} listings <small>${d.listings > 40 ? '(Highly Available)' : d.listings > 20 ? '(Widely Available)' : '(Limited Availability)'}</small></span>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <h4>⚙️ Technical Specifications</h4>
                                <div class="metric-row">
                                    <span class="metric-label">Load Capacity:</span>
                                    <span class="metric-value">${d.capacity_lb} lb (${(d.capacity_lb * 0.453592).toFixed(1)} kg) - ${capacityCategory}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Max Spin Speed:</span>
                                    <span class="metric-value">${d.spin_rpm} RPM ${d.spin_rpm > 1300 ? '(High Speed)' : d.spin_rpm > 900 ? '(Standard)' : '(Gentle)'}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Function Type:</span>
                                    <span class="metric-value">${d.function_type}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Built-in Heater:</span>
                                    <span class="metric-value">${d.has_heater} ${d.has_heater === 'Yes' ? '(Hot water capability)' : '(Cold water only)'}</span>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <h4>💡 Market Analysis</h4>
                                <div class="metric-row">
                                    <span class="metric-label">Price Positioning:</span>
                                    <span class="metric-value">${priceCategory} segment</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">vs. Brand Average:</span>
                                    <span class="metric-value">${calculateBrandComparison(d)}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Best For:</span>
                                    <span class="metric-value">${getBestUseCase(d)}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Competitive Edge:</span>
                                    <span class="metric-value">${getCompetitiveEdge(d)}</span>
                                </div>
                            </div>
                            
                            <div class="detail-card">
                                <h4>🎯 Recommendations</h4>
                                <div class="recommendation-tags">
                                    ${getRecommendationTags(d).map(tag => `<span class="rec-tag ${tag.type}">${tag.text}</span>`).join('')}
                                </div>
                                <p class="recommendation-text">${getRecommendationText(d)}</p>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper functions for detailed information
function toggleDetails(id) {
    const row = document.getElementById(id);
    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

function calculateBrandComparison(model) {
    const brandModels = filteredData.filter(d => d.brand === model.brand);
    const avgPrice = brandModels.reduce((sum, d) => sum + d.avg_price_usd, 0) / brandModels.length;
    const diff = ((model.avg_price_usd - avgPrice) / avgPrice * 100).toFixed(1);
    if (Math.abs(diff) < 5) return 'At brand average';
    return diff > 0 ? `${diff}% above average` : `${Math.abs(diff)}% below average`;
}

function getBestUseCase(model) {
    if (model.capacity_lb > 17 && model.spin_rpm > 1200) return 'Large families, heavy loads';
    if (model.capacity_lb < 14 && model.avg_price_usd < 150) return 'Small households, budget-conscious';
    if (model.has_heater === 'Yes') return 'Deep cleaning, stain removal';
    if (model.spin_rpm > 1300) return 'Quick drying, energy efficiency';
    if (model.function_type.includes('Front Load')) return 'Water efficiency, gentle care';
    return 'General household use';
}

function getCompetitiveEdge(model) {
    const edges = [];
    if (model.rating >= 4.4) edges.push('Highly rated');
    if (model.spin_rpm >= 1350) edges.push('Fast spin');
    if (model.capacity_lb >= 17) edges.push('Large capacity');
    if (model.has_heater === 'Yes') edges.push('Hot wash');
    if ((model.rating / model.avg_price_usd) > 0.025) edges.push('Great value');
    return edges.length > 0 ? edges.join(', ') : 'Standard features';
}

function getRecommendationTags(model) {
    const tags = [];
    const valueScore = (model.rating / model.avg_price_usd) * 100;

    if (valueScore > 2.8) tags.push({ type: 'best-value', text: '💰 Best Value' });
    if (model.rating >= 4.4) tags.push({ type: 'top-rated', text: '⭐ Top Rated' });
    if (model.listings > 40) tags.push({ type: 'popular', text: '🔥 Most Popular' });
    if (model.spin_rpm >= 1350) tags.push({ type: 'efficient', text: '⚡ High Efficiency' });
    if (model.capacity_lb >= 17) tags.push({ type: 'capacity', text: '📦 Large Capacity' });
    if (model.has_heater === 'Yes') tags.push({ type: 'premium', text: '✨ Premium Feature' });

    return tags;
}

function getRecommendationText(model) {
    const valueScore = (model.rating / model.avg_price_usd) * 100;

    if (valueScore > 3 && model.rating >= 4.3) {
        return `The ${model.brand} ${model.model_name} offers exceptional value with a ${model.rating}★ rating at just $${model.avg_price_usd.toFixed(0)}. Perfect for budget-conscious buyers seeking quality.`;
    }
    if (model.rating >= 4.4 && model.listings > 40) {
        return `This is a market favorite with ${model.listings} listings and ${model.rating}★ rating. Widely available and trusted by consumers.`;
    }
    if (model.has_heater === 'Yes') {
        return `Features built-in heater for superior cleaning power on tough stains. Ideal for families needing deep-clean capabilities.`;
    }
    if (model.spin_rpm >= 1350) {
        return `High-speed ${model.spin_rpm} RPM spin cycle ensures faster drying times and better water extraction, reducing energy costs.`;
    }
    if (model.capacity_lb >= 17) {
        return `Large ${model.capacity_lb} lb capacity handles big loads efficiently. Perfect for families of 4+ or those who prefer fewer, larger washes.`;
    }

    return `Solid ${model.function_type.replace('Fully Automatic ', '')} option from ${model.brand} offering reliable performance for everyday laundry needs.`;
}


// Chart creation
function createCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';

    createPricePerformanceChart();
    createBrandDominanceChart();
    createMarketShareChart();
    createCapacityDistChart();
    createFeatureCorrelationChart();
    createFunctionTypeChart();
    createSpinRpmChart();
}

function createPricePerformanceChart() {
    const ctx = document.getElementById('pricePerformanceChart').getContext('2d');
    charts.pricePerformance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: Object.keys(brandColors).filter(b => filteredData.some(d => d.brand === b)).map(brand => ({
                label: brand,
                data: filteredData.filter(d => d.brand === brand).map(d => ({ x: d.avg_price_usd, y: d.rating, model: d.model_name })),
                backgroundColor: brandColors[brand] + 'CC',
                borderColor: brandColors[brand],
                pointRadius: 8,
                pointHoverRadius: 12
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.raw.model}\nPrice: $${ctx.raw.x.toFixed(2)} | Rating: ${ctx.raw.y}`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Price (USD)', color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { title: { display: true, text: 'Rating', color: '#94a3b8' }, min: 3.5, max: 5, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
    updateScatterInsights();
}

function updateScatterChart() {
    const yAxis = document.getElementById('scatterYAxis').value;
    const yTitles = { rating: 'Rating', spin_rpm: 'Spin RPM', capacity_lb: 'Capacity (lb)' };
    const yConfig = {
        rating: { min: 3.5, max: 5 },
        spin_rpm: { min: 500, max: 1500 },
        capacity_lb: { min: 10, max: 22 }
    };

    charts.pricePerformance.data.datasets = Object.keys(brandColors).filter(b => filteredData.some(d => d.brand === b)).map(brand => ({
        label: brand,
        data: filteredData.filter(d => d.brand === brand).map(d => ({ x: d.avg_price_usd, y: d[yAxis], model: d.model_name })),
        backgroundColor: brandColors[brand] + 'CC',
        borderColor: brandColors[brand],
        pointRadius: 8,
        pointHoverRadius: 12
    }));

    charts.pricePerformance.options.scales.y.title.text = yTitles[yAxis];
    charts.pricePerformance.options.scales.y.min = yConfig[yAxis].min;
    charts.pricePerformance.options.scales.y.max = yConfig[yAxis].max;
    charts.pricePerformance.update();
    updateScatterInsights();
}

function updateScatterInsights() {
    const best = filteredData.reduce((a, b) => (b.rating / b.avg_price_usd > a.rating / a.avg_price_usd) ? b : a);
    document.getElementById('scatterInsights').innerHTML = `
        <div class="insight-badge"><span class="insight-icon">💡</span>
            <span class="insight-text">Best Value: ${best.brand} ${best.model_name} - $${best.avg_price_usd.toFixed(0)} with ${best.rating}★ rating</span>
        </div>
    `;
}

function createBrandDominanceChart() {
    const ctx = document.getElementById('brandDominanceChart').getContext('2d');
    const brandData = {};
    filteredData.forEach(d => {
        if (!brandData[d.brand]) brandData[d.brand] = { listings: 0, ratings: [], count: 0 };
        brandData[d.brand].listings += d.listings;
        brandData[d.brand].ratings.push(d.rating);
        brandData[d.brand].count++;
    });

    const labels = Object.keys(brandData).sort((a, b) => brandData[b].listings - brandData[a].listings);
    charts.brandDominance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total Listings',
                data: labels.map(b => brandData[b].listings),
                backgroundColor: labels.map((b, i) => accentColors[i % accentColors.length] + 'CC'),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function createMarketShareChart() {
    const ctx = document.getElementById('marketShareChart').getContext('2d');
    const brandListings = {};
    filteredData.forEach(d => { brandListings[d.brand] = (brandListings[d.brand] || 0) + d.listings; });
    const total = Object.values(brandListings).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(brandListings).sort((a, b) => b[1] - a[1]);

    charts.marketShare = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sorted.map(([b]) => b),
            datasets: [{
                data: sorted.map(([, v]) => ((v / total) * 100).toFixed(1)),
                backgroundColor: sorted.map(([b], i) => brandColors[b] || accentColors[i % accentColors.length]),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 10 } },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}%` } }
            }
        }
    });
}

function createCapacityDistChart() {
    const ctx = document.getElementById('capacityDistChart').getContext('2d');
    const bins = { '12-14 lb': 0, '14-16 lb': 0, '16-18 lb': 0, '18-20 lb': 0 };
    filteredData.forEach(d => {
        if (d.capacity_lb < 14) bins['12-14 lb']++;
        else if (d.capacity_lb < 16) bins['14-16 lb']++;
        else if (d.capacity_lb < 18) bins['16-18 lb']++;
        else bins['18-20 lb']++;
    });

    charts.capacityDist = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(bins),
            datasets: [{
                label: 'Number of Models',
                data: Object.values(bins),
                backgroundColor: ['#6366f1CC', '#8b5cf6CC', '#a855f7CC', '#ec4899CC'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function createFeatureCorrelationChart() {
    const ctx = document.getElementById('featureCorrelationChart').getContext('2d');
    const withHeater = filteredData.filter(d => d.has_heater === 'Yes');
    const withoutHeater = filteredData.filter(d => d.has_heater === 'No');
    const avgWithHeater = withHeater.length ? withHeater.reduce((s, d) => s + d.avg_price_usd, 0) / withHeater.length : 0;
    const avgWithoutHeater = withoutHeater.length ? withoutHeater.reduce((s, d) => s + d.avg_price_usd, 0) / withoutHeater.length : 0;

    charts.featureCorrelation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Without Heater', 'With Heater'],
            datasets: [{
                label: 'Average Price (USD)',
                data: [avgWithoutHeater, avgWithHeater],
                backgroundColor: ['#6366f1CC', '#10b981CC'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `Avg Price: $${ctx.raw.toFixed(2)}` } }
            },
            scales: { x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } }
        }
    });
}

function createFunctionTypeChart() {
    const ctx = document.getElementById('functionTypeChart').getContext('2d');
    const typeData = {};
    filteredData.forEach(d => {
        if (!typeData[d.function_type]) typeData[d.function_type] = [];
        typeData[d.function_type].push(d.avg_price_usd);
    });

    const labels = Object.keys(typeData).map(t => t.replace('Fully Automatic ', ''));
    const avgPrices = Object.values(typeData).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length);

    charts.functionType = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Average Price (USD)',
                data: avgPrices,
                backgroundColor: ['#6366f1CC', '#8b5cf6CC', '#a855f7CC'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function createSpinRpmChart() {
    const ctx = document.getElementById('spinRpmChart').getContext('2d');
    charts.spinRpm = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Spin RPM vs Price',
                data: filteredData.map(d => ({ x: d.spin_rpm, y: d.avg_price_usd, brand: d.brand })),
                backgroundColor: '#6366f1CC',
                pointRadius: 6,
                pointHoverRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `${ctx.raw.brand}: ${ctx.raw.x} RPM @ $${ctx.raw.y.toFixed(2)}` } }
            },
            scales: {
                x: { title: { display: true, text: 'Spin RPM' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { title: { display: true, text: 'Price (USD)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function updateCharts() {
    Object.values(charts).forEach(chart => chart.destroy());
    createCharts();
}

// Generate key insights
function generateInsights() {
    const insights = [];

    // Best value
    const bestValue = filteredData.reduce((a, b) => (b.rating / b.avg_price_usd > a.rating / a.avg_price_usd) ? b : a);
    insights.push({ emoji: '💰', title: 'Best Value', value: `$${bestValue.avg_price_usd.toFixed(0)}`, desc: `${bestValue.brand} ${bestValue.model_name} offers the best rating per dollar` });

    // Top rated
    const topRated = filteredData.reduce((a, b) => b.rating > a.rating ? b : a);
    insights.push({ emoji: '⭐', title: 'Top Rated', value: `${topRated.rating}★`, desc: `${topRated.brand} ${topRated.model_name} leads in customer satisfaction` });

    // Most listings
    const mostListings = filteredData.reduce((a, b) => b.listings > a.listings ? b : a);
    insights.push({ emoji: '📊', title: 'Most Popular', value: `${mostListings.listings} listings`, desc: `${mostListings.brand} ${mostListings.model_name} is most widely available` });

    // Heater premium
    const withHeater = filteredData.filter(d => d.has_heater === 'Yes');
    const withoutHeater = filteredData.filter(d => d.has_heater === 'No');
    if (withHeater.length && withoutHeater.length) {
        const premium = ((withHeater.reduce((s, d) => s + d.avg_price_usd, 0) / withHeater.length) - (withoutHeater.reduce((s, d) => s + d.avg_price_usd, 0) / withoutHeater.length));
        insights.push({ emoji: '🔥', title: 'Heater Premium', value: `+$${premium.toFixed(0)}`, desc: 'Average price increase for models with built-in heater' });
    }

    // Capacity sweet spot
    const capacityGroups = {};
    filteredData.forEach(d => {
        const cap = Math.round(d.capacity_lb);
        if (!capacityGroups[cap]) capacityGroups[cap] = 0;
        capacityGroups[cap]++;
    });
    const popularCap = Object.entries(capacityGroups).sort((a, b) => b[1] - a[1])[0];
    insights.push({ emoji: '📦', title: 'Popular Capacity', value: `${popularCap[0]} lb`, desc: `Most common capacity with ${popularCap[1]} models in this range` });

    // Market leader
    const brandCounts = {};
    filteredData.forEach(d => { brandCounts[d.brand] = (brandCounts[d.brand] || 0) + d.listings; });
    const leader = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
    insights.push({ emoji: '👑', title: 'Market Leader', value: leader[0], desc: `Dominates with ${leader[1]} total listings across all models` });

    document.getElementById('insightsGrid').innerHTML = insights.map(i => `
        <div class="insight-card">
            <div class="insight-header"><span class="insight-emoji">${i.emoji}</span><span class="insight-title">${i.title}</span></div>
            <div class="insight-value">${i.value}</div>
            <p class="insight-description">${i.desc}</p>
        </div>
    `).join('');
}

// Event listeners
function setupEventListeners() {
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('tableSearch').addEventListener('input', renderTable);
    document.getElementById('sortBy').addEventListener('change', renderTable);
    document.getElementById('globalSearch').addEventListener('input', e => {
        document.getElementById('tableSearch').value = e.target.value;
        renderTable();
    });
    document.getElementById('scatterYAxis').addEventListener('change', updateScatterChart);

    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateBrandDominanceChart(tab.dataset.chart);
        });
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function updateBrandDominanceChart(metric) {
    const brandData = {};
    filteredData.forEach(d => {
        if (!brandData[d.brand]) brandData[d.brand] = { listings: 0, ratings: [] };
        brandData[d.brand].listings += d.listings;
        brandData[d.brand].ratings.push(d.rating);
    });

    const labels = Object.keys(brandData).sort((a, b) => {
        if (metric === 'listings') return brandData[b].listings - brandData[a].listings;
        return (brandData[b].ratings.reduce((a, b) => a + b, 0) / brandData[b].ratings.length) - (brandData[a].ratings.reduce((a, b) => a + b, 0) / brandData[a].ratings.length);
    });

    charts.brandDominance.data.labels = labels;
    charts.brandDominance.data.datasets[0].label = metric === 'listings' ? 'Total Listings' : 'Average Rating';
    charts.brandDominance.data.datasets[0].data = labels.map(b => {
        if (metric === 'listings') return brandData[b].listings;
        return (brandData[b].ratings.reduce((a, b) => a + b, 0) / brandData[b].ratings.length).toFixed(2);
    });
    charts.brandDominance.update();
}

// Quick Preset Filters
function applyPreset(presetType) {
    // Reset filters first
    document.querySelectorAll('#brandFilters input, #typeFilters input').forEach(i => i.checked = true);
    document.querySelector('input[name="heater"][value="all"]').checked = true;
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('minCapacity').value = '';
    document.getElementById('maxCapacity').value = '';

    // Highlight active preset
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.preset-btn').classList.add('active');

    // Apply preset-specific filters
    switch (presetType) {
        case 'best-value':
            // Top value models (high rating, low price)
            filteredData = rawData.filter(d => {
                const valueScore = (d.rating / d.avg_price_usd) * 100;
                return valueScore > 2.5; // Above average value
            });
            break;

        case 'premium':
            // High-end models
            filteredData = rawData.filter(d =>
                d.avg_price_usd > 200 || d.rating >= 4.4 || d.has_heater === 'Yes'
            );
            break;

        case 'budget':
            // Budget-friendly options
            filteredData = rawData.filter(d => d.avg_price_usd < 150);
            document.getElementById('maxPrice').value = '150';
            break;

        case 'high-capacity':
            // Large capacity models
            filteredData = rawData.filter(d => d.capacity_lb >= 17);
            document.getElementById('minCapacity').value = '17';
            break;

        case 'high-speed':
            // High spin speed models
            filteredData = rawData.filter(d => d.spin_rpm >= 1300);
            break;

        case 'top-rated':
            // Highest rated models
            filteredData = rawData.filter(d => d.rating >= 4.4);
            break;
    }

    updateKPIs();
    renderTable();
    updateCharts();
    generateInsights();
}

// Export to CSV
function exportToCSV() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;

    // Get filtered and sorted data (same as table)
    let data = filteredData.filter(d =>
        d.brand.toLowerCase().includes(searchTerm) ||
        d.model_name.toLowerCase().includes(searchTerm)
    );

    const [sortField, sortDir] = sortBy.split('-');
    data.sort((a, b) => {
        let valA, valB;
        switch (sortField) {
            case 'rating': valA = a.rating; valB = b.rating; break;
            case 'price': valA = a.avg_price_usd; valB = b.avg_price_usd; break;
            case 'capacity': valA = a.capacity_lb; valB = b.capacity_lb; break;
            case 'spin': valA = a.spin_rpm; valB = b.spin_rpm; break;
        }
        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    // Create CSV content
    const headers = ['Brand', 'Model', 'Price (USD)', 'Rating', 'Capacity (lb)', 'Spin RPM', 'Type', 'Heater', 'Listings', 'Value Score', 'Efficiency Rating'];
    const csvRows = [headers.join(',')];

    data.forEach(d => {
        const valueScore = ((d.rating / d.avg_price_usd) * 100).toFixed(2);
        const efficiencyRating = (d.spin_rpm / d.capacity_lb).toFixed(0);

        const row = [
            d.brand,
            `"${d.model_name}"`, // Quoted in case of commas
            d.avg_price_usd.toFixed(2),
            d.rating,
            d.capacity_lb,
            d.spin_rpm,
            `"${d.function_type}"`,
            d.has_heater,
            d.listings,
            valueScore,
            efficiencyRating
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `washing_machine_analysis_${timestamp}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadData);

