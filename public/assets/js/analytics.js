// Analytics Service for Merchant Dashboard
const Analytics = (() => {
  let ordersChart = null;
  let topItemsChart = null;
  let fulfillmentChart = null;

  const CHART_COLORS = {
    red: 'rgba(255, 59, 48, 0.9)',
    redLight: 'rgba(255, 107, 74, 0.7)',
    white: 'rgba(255, 255, 255, 0.8)',
    gray: 'rgba(255, 255, 255, 0.4)',
    gradient1: 'rgba(255, 59, 48, 0.8)',
    gradient2: 'rgba(255, 107, 74, 0.5)',
  };

  const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 59, 48, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => `${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 11 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 11 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          drawBorder: false,
        },
      },
    },
  };

  // Calculate KPIs from orders and items
  const calculateKPIs = (orders, items) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ordersToday = orders.filter(o => new Date(o.created_at) >= todayStart);
    const ordersThisWeek = orders.filter(o => new Date(o.created_at) >= weekStart);

    // Count requests per item
    const itemRequestCounts = {};
    orders.forEach(order => {
      if (order.items_json && Array.isArray(order.items_json)) {
        order.items_json.forEach(item => {
          const itemId = item.itemId || item.item_id;
          if (itemId) {
            itemRequestCounts[itemId] = (itemRequestCounts[itemId] || 0) + (item.qty || 1);
          }
        });
      }
    });

    // Find top and worst performing items
    const itemsWithRequests = Object.entries(itemRequestCounts)
      .map(([itemId, count]) => ({
        itemId,
        count,
        item: items.find(i => i.item_id === itemId),
      }))
      .filter(i => i.item);

    itemsWithRequests.sort((a, b) => b.count - a.count);

    const topItem = itemsWithRequests[0];
    const worstItem = itemsWithRequests[itemsWithRequests.length - 1];

    // Fulfillment split
    const pickupOrders = orders.filter(o => o.fulfillment_type === 'pickup').length;
    const deliveryOrders = orders.filter(o => o.fulfillment_type === 'delivery').length;
    const totalFulfillment = pickupOrders + deliveryOrders;

    return {
      ordersToday: ordersToday.length,
      ordersThisWeek: ordersThisWeek.length,
      totalMenuItems: items.length,
      topItem: topItem ? { name: topItem.item.title, count: topItem.count } : null,
      worstItem: worstItem ? { name: worstItem.item.title, count: worstItem.count } : null,
      pickupRatio: totalFulfillment > 0 ? Math.round((pickupOrders / totalFulfillment) * 100) : 50,
      deliveryRatio: totalFulfillment > 0 ? Math.round((deliveryOrders / totalFulfillment) * 100) : 50,
      pickupCount: pickupOrders,
      deliveryCount: deliveryOrders,
      itemRequestCounts,
    };
  };

  // Render KPI cards
  const renderKPIs = (kpis) => {
    const kpiRow = document.getElementById('kpiRow');
    if (!kpiRow) return;

    const cards = [
      {
        label: 'Orders Today',
        value: kpis.ordersToday,
        icon: '📦',
      },
      {
        label: 'Orders This Week',
        value: kpis.ordersThisWeek,
        icon: '📊',
      },
      {
        label: 'Total Menu Items',
        value: kpis.totalMenuItems,
        icon: '🍽️',
      },
      {
        label: 'Top Seller',
        value: kpis.topItem ? kpis.topItem.name : 'N/A',
        subtext: kpis.topItem ? `${kpis.topItem.count} requests` : '',
        icon: '⭐',
      },
      {
        label: 'Needs Attention',
        value: kpis.worstItem ? kpis.worstItem.name : 'N/A',
        subtext: kpis.worstItem ? `${kpis.worstItem.count} requests` : '',
        icon: '⚠️',
      },
      {
        label: 'Pickup vs Delivery',
        value: `${kpis.pickupRatio}% / ${kpis.deliveryRatio}%`,
        icon: '🚗',
      },
    ];

    kpiRow.innerHTML = cards
      .map(
        (card) => `
        <div class="kpi-card">
          <div style="font-size: 2rem; margin-bottom: 8px;">${card.icon}</div>
          <div class="muted" style="font-size: 0.8rem; margin-bottom: 4px;">${card.label}</div>
          <strong style="font-size: 1.4rem; color: #ff6b4a;">${card.value}</strong>
          ${card.subtext ? `<div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">${card.subtext}</div>` : ''}
        </div>
      `
      )
      .join('');
  };

  // Render orders line chart (last 7 days)
  const renderOrdersChart = (orders) => {
    const canvas = document.getElementById('ordersLineChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (ordersChart) {
      ordersChart.destroy();
    }

    // Prepare data for last 7 days
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= dayStart && orderDate < dayEnd;
      });

      days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      counts.push(dayOrders.length);
    }

    ordersChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Orders',
            data: counts,
            borderColor: CHART_COLORS.red,
            backgroundColor: CHART_COLORS.gradient2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: CHART_COLORS.red,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        ...defaultChartOptions,
        plugins: {
          ...defaultChartOptions.plugins,
          tooltip: {
            ...defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (item) => `Orders: ${item.formattedValue}`,
            },
          },
        },
      },
    });
  };

  // Render top items bar chart
  const renderTopItemsChart = (kpis, items) => {
    const canvas = document.getElementById('topItemsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (topItemsChart) {
      topItemsChart.destroy();
    }

    // Get top 5 items by request count
    const topItems = Object.entries(kpis.itemRequestCounts)
      .map(([itemId, count]) => ({
        itemId,
        count,
        item: items.find(i => i.item_id === itemId),
      }))
      .filter(i => i.item)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topItems.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No order data yet', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = topItems.map(i => i.item.title.substring(0, 20));
    const data = topItems.map(i => i.count);

    topItemsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Requests',
            data: data,
            backgroundColor: CHART_COLORS.gradient1,
            borderColor: CHART_COLORS.red,
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...defaultChartOptions,
        indexAxis: 'y',
        plugins: {
          ...defaultChartOptions.plugins,
          tooltip: {
            ...defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (item) => `Requests: ${item.formattedValue}`,
            },
          },
        },
      },
    });
  };

  // Render fulfillment donut chart
  const renderFulfillmentChart = (kpis) => {
    const canvas = document.getElementById('fulfillmentDonutChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (fulfillmentChart) {
      fulfillmentChart.destroy();
    }

    if (kpis.pickupCount === 0 && kpis.deliveryCount === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No orders yet', canvas.width / 2, canvas.height / 2);
      return;
    }

    fulfillmentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pickup', 'Delivery'],
        datasets: [
          {
            data: [kpis.pickupCount, kpis.deliveryCount],
            backgroundColor: [CHART_COLORS.red, CHART_COLORS.redLight],
            borderColor: 'rgba(15, 15, 15, 0.9)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
              padding: 15,
              font: { size: 12 },
            },
          },
          tooltip: {
            ...defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: (item) => `${item.label}: ${item.formattedValue} orders`,
            },
          },
        },
      },
    });
  };

  // Main render function
  const render = (orders, items) => {
    const kpis = calculateKPIs(orders, items);
    renderKPIs(kpis);
    renderOrdersChart(orders);
    renderTopItemsChart(kpis, items);
    renderFulfillmentChart(kpis);
  };

  return {
    render,
    calculateKPIs,
  };
})();
