// Analytics Service for Merchant Dashboard — Premium UI
const Analytics = (() => {
  let ordersChart = null;
  let topItemsChart = null;
  let fulfillmentChart = null;

  const CHART_COLORS = {
    red: 'rgba(225, 29, 72, 0.9)',
    redLight: 'rgba(251, 113, 133, 0.7)',
    redGlow: 'rgba(225, 29, 72, 0.35)',
    white: 'rgba(255, 255, 255, 0.8)',
    gray: 'rgba(255, 255, 255, 0.4)',
    accent: '#e11d48',
    accentSoft: '#fb7185',
  };

  const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 11, 0.96)',
        titleColor: '#fff',
        titleFont: { weight: '700', family: "'Plus Jakarta Sans', sans-serif" },
        bodyColor: 'rgba(255, 255, 255, 0.75)',
        bodyFont: { family: "'Plus Jakarta Sans', sans-serif" },
        borderColor: 'rgba(225, 29, 72, 0.4)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 12,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11, family: "'Plus Jakarta Sans'" } },
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
      },
      x: {
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11, family: "'Plus Jakarta Sans'" } },
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
      },
    },
  };

  // Demo data for when no real data exists
  const DEMO_ORDERS = (() => {
    const orders = [];
    const items = [
      { item_id: 'SAMPLE-001', title: 'Signature Jerk Chicken', qty: 3 },
      { item_id: 'ITEM-002', title: 'Ackee & Saltfish', qty: 2 },
      { item_id: 'ITEM-003', title: 'Festival', qty: 1 },
      { item_id: 'ITEM-004', title: 'Rum Punch', qty: 2 },
    ];
    for (let d = 6; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const count = Math.floor(Math.random() * 5) + (d < 2 ? 3 : 1);
      for (let j = 0; j < count; j++) {
        const pick = items[Math.floor(Math.random() * items.length)];
        orders.push({
          created_at: date.toISOString(),
          fulfillment_type: Math.random() > 0.4 ? 'pickup' : 'delivery',
          items_json: [{ item_id: pick.item_id, qty: pick.qty }],
        });
      }
    }
    return orders;
  })();

  const DEMO_ITEMS = [
    { item_id: 'SAMPLE-001', title: 'Signature Jerk Chicken' },
    { item_id: 'ITEM-002', title: 'Ackee & Saltfish' },
    { item_id: 'ITEM-003', title: 'Festival' },
    { item_id: 'ITEM-004', title: 'Rum Punch' },
  ];

  // Calculate KPIs from orders and items
  const calculateKPIs = (orders, items) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ordersToday = orders.filter(o => new Date(o.created_at) >= todayStart);
    const ordersThisWeek = orders.filter(o => new Date(o.created_at) >= weekStart);

    // Revenue estimate ($)
    let revenueEst = 0;
    ordersThisWeek.forEach(o => {
      if (o.items_json && Array.isArray(o.items_json)) {
        o.items_json.forEach(i => { revenueEst += (i.price || 1500) * (i.qty || 1); });
      }
    });

    const itemRequestCounts = {};
    orders.forEach(order => {
      if (order.items_json && Array.isArray(order.items_json)) {
        order.items_json.forEach(item => {
          const itemId = item.itemId || item.item_id;
          if (itemId) itemRequestCounts[itemId] = (itemRequestCounts[itemId] || 0) + (item.qty || 1);
        });
      }
    });

    const itemsWithRequests = Object.entries(itemRequestCounts)
      .map(([itemId, count]) => ({ itemId, count, item: items.find(i => i.item_id === itemId) }))
      .filter(i => i.item);
    itemsWithRequests.sort((a, b) => b.count - a.count);

    const topItem = itemsWithRequests[0];
    const worstItem = itemsWithRequests.length > 1 ? itemsWithRequests[itemsWithRequests.length - 1] : null;

    const pickupOrders = orders.filter(o => o.fulfillment_type === 'pickup').length;
    const deliveryOrders = orders.filter(o => o.fulfillment_type === 'delivery').length;
    const totalFulfillment = pickupOrders + deliveryOrders;

    return {
      ordersToday: ordersToday.length,
      ordersThisWeek: ordersThisWeek.length,
      revenueEst,
      totalMenuItems: items.length,
      topItem: topItem ? { name: topItem.item.title, count: topItem.count } : null,
      worstItem: worstItem ? { name: worstItem.item.title, count: worstItem.count } : null,
      pickupRatio: totalFulfillment > 0 ? Math.round((pickupOrders / totalFulfillment) * 100) : 50,
      deliveryRatio: totalFulfillment > 0 ? Math.round((deliveryOrders / totalFulfillment) * 100) : 50,
      pickupCount: pickupOrders,
      deliveryCount: deliveryOrders,
      itemRequestCounts,
      isDemo: false,
    };
  };

  // Render KPI cards
  const renderKPIs = (kpis) => {
    const kpiRow = document.getElementById('kpiRow');
    if (!kpiRow) return;

    const cards = [
      { label: 'Orders (7d)', value: kpis.ordersThisWeek, icon: 'fa-shopping-bag', color: '#e11d48' },
      { label: 'Revenue Est.', value: `$${(kpis.revenueEst / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: 'fa-dollar-sign', color: '#22c55e' },
      { label: 'Orders Today', value: kpis.ordersToday, icon: 'fa-bolt', color: '#f59e0b' },
      { label: 'Menu Items', value: kpis.totalMenuItems, icon: 'fa-utensils', color: '#6366f1' },
      { label: 'Best Seller', value: kpis.topItem ? kpis.topItem.name : 'N/A', subtext: kpis.topItem ? `${kpis.topItem.count} requests` : '', icon: 'fa-trophy', color: '#f43f5e' },
      { label: 'Worst Seller', value: kpis.worstItem ? kpis.worstItem.name : 'N/A', subtext: kpis.worstItem ? `${kpis.worstItem.count} requests` : '', icon: 'fa-arrow-down', color: '#94a3b8' },
    ];

    kpiRow.innerHTML = cards.map(card => `
      <div class="kpi-card" data-testid="kpi-${card.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div style="width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:${card.color}22;color:${card.color};font-size:0.85rem;">
            <i class="fas ${card.icon}"></i>
          </div>
          <span class="muted" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">${card.label}</span>
        </div>
        <strong>${card.value}</strong>
        ${card.subtext ? `<span style="font-size:0.72rem;color:rgba(255,255,255,0.4);">${card.subtext}</span>` : ''}
      </div>
    `).join('');

    if (kpis.isDemo) {
      const badge = document.createElement('div');
      badge.style.cssText = 'grid-column:1/-1;text-align:center;padding:8px;border-radius:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:#f59e0b;font-size:0.78rem;font-weight:600;';
      badge.innerHTML = '<i class="fas fa-info-circle"></i> Demo Mode — showing sample data. Real data will appear once you receive orders.';
      kpiRow.appendChild(badge);
    }
  };

  // Render orders line chart
  const renderOrdersChart = (orders) => {
    const canvas = document.getElementById('ordersLineChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ordersChart) ordersChart.destroy();

    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      counts.push(orders.filter(o => { const d = new Date(o.created_at); return d >= dayStart && d < dayEnd; }).length);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(225,29,72,0.3)');
    gradient.addColorStop(1, 'rgba(225,29,72,0.02)');

    ordersChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Orders',
          data: counts,
          borderColor: CHART_COLORS.red,
          backgroundColor: gradient,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: CHART_COLORS.accent,
          pointBorderColor: '#1a1a1a',
          pointBorderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 2.5,
        }],
      },
      options: defaultChartOptions,
    });
  };

  // Render top items bar chart
  const renderTopItemsChart = (kpis, items) => {
    const canvas = document.getElementById('topItemsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (topItemsChart) topItemsChart.destroy();

    const topItems = Object.entries(kpis.itemRequestCounts)
      .map(([itemId, count]) => ({ itemId, count, item: items.find(i => i.item_id === itemId) }))
      .filter(i => i.item)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topItems.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('No order data yet', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = topItems.map(i => i.item.title.length > 18 ? i.item.title.substring(0, 18) + '...' : i.item.title);
    const data = topItems.map(i => i.count);

    topItemsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Requests',
          data,
          backgroundColor: 'rgba(225,29,72,0.7)',
          borderColor: 'rgba(225,29,72,0.9)',
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        ...defaultChartOptions,
        indexAxis: 'y',
      },
    });
  };

  // Render fulfillment donut
  const renderFulfillmentChart = (kpis) => {
    const canvas = document.getElementById('fulfillmentDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (fulfillmentChart) fulfillmentChart.destroy();

    if (kpis.pickupCount === 0 && kpis.deliveryCount === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('No orders yet', canvas.width / 2, canvas.height / 2);
      return;
    }

    fulfillmentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pickup', 'Delivery'],
        datasets: [{
          data: [kpis.pickupCount, kpis.deliveryCount],
          backgroundColor: [CHART_COLORS.red, CHART_COLORS.redLight],
          borderColor: 'rgba(10,10,11,0.95)',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.7)',
              padding: 16,
              font: { size: 12, family: "'Plus Jakarta Sans'" },
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: defaultChartOptions.plugins.tooltip,
        },
      },
    });
  };

  // Main render
  const render = (orders, items) => {
    let useOrders = orders;
    let useItems = items;
    let isDemo = false;

    // Fallback to demo data if no real data
    if (!orders || orders.length === 0) {
      useOrders = DEMO_ORDERS;
      useItems = items && items.length > 0 ? items : DEMO_ITEMS;
      isDemo = true;
    }

    const kpis = calculateKPIs(useOrders, useItems);
    kpis.isDemo = isDemo;
    renderKPIs(kpis);
    renderOrdersChart(useOrders);
    renderTopItemsChart(kpis, useItems);
    renderFulfillmentChart(kpis);
  };

  return { render, calculateKPIs };
})();
