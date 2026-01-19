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

module.exports = {
  summarizeOrders,
};
