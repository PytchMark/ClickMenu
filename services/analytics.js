const startOfDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const summarizeOrders = (orders) => {
  const todayStart = startOfDay();
  let todayCount = 0;
  let newCount = 0;

  orders.forEach((order) => {
    const created = new Date(order.created_at);
    if (created >= todayStart) {
      todayCount += 1;
    }
    if (order.status === "new") {
      newCount += 1;
    }
  });

  return {
    ordersToday: todayCount,
    newOrders: newCount,
  };
};

const buildMerchantAnalytics = (orders = [], items = []) => {
  const summary = summarizeOrders(orders);
  const itemCounts = {};
  const categoryCounts = {};

  orders.forEach((order) => {
    (order.items_json || []).forEach((item) => {
      if (!item?.itemId) return;
      itemCounts[item.itemId] = (itemCounts[item.itemId] || 0) + (item.qty || 1);
    });
  });

  items.forEach((item) => {
    if (!item?.category) return;
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  const topItemId = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topItem = items.find((item) => item.item_id === topItemId) || null;
  const topCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    ...summary,
    totalOrders: orders.length,
    totalItems: items.length,
    topItem: topItem ? { item_id: topItem.item_id, title: topItem.title } : null,
    topCategory,
  };
};

module.exports = {
  summarizeOrders,
  buildMerchantAnalytics,
};
