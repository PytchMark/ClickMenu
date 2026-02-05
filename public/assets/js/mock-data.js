// Mock data service for GitHub Pages and offline testing
const MockData = (() => {
  const merchants = [
    {
      store_id: 'TASTE1',
      name: 'Kingston Taste Kitchen',
      status: 'active',
      plan: 'pro',
      subscription_status: 'active',
      whatsapp: '+18765551234',
      profile_email: 'hello@kingstontaste.com',
      cuisine_type: 'Caribbean Fusion',
      password: 'demo123',
      logo_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80',
      business_address: '123 Hope Road',
      parish: 'Kingston',
      owner_name: 'Marcus Thompson',
      owner_phone: '+18765551234',
      owner_email: 'marcus@kingstontaste.com',
      hours: 'Mon-Sat: 11am-10pm, Sun: 12pm-9pm',
      about: 'Experience authentic Caribbean flavors with a modern twist. Our chefs craft mouthwatering dishes using fresh, local ingredients and family recipes passed down through generations.',
      instagram: '@kingstontaste',
      tiktok: '@kingstontaste',
      pickup_enabled: true,
      delivery_enabled: true,
      authorized: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-02-01T15:30:00Z',
    },
    {
      store_id: 'SPICE2',
      name: 'Island Spice Grill',
      status: 'active',
      plan: 'business',
      subscription_status: 'active',
      whatsapp: '+18765555678',
      profile_email: 'orders@islandspice.com',
      cuisine_type: 'Jamaican BBQ',
      password: 'demo456',
      logo_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
      business_address: '456 Market Street',
      parish: 'Montego Bay',
      owner_name: 'Sarah Williams',
      owner_phone: '+18765555678',
      owner_email: 'sarah@islandspice.com',
      hours: 'Daily: 10am-11pm',
      about: 'Fire up your taste buds with our signature jerk recipes and slow-cooked BBQ perfection. Every bite tells a story of island tradition and culinary passion.',
      instagram: '@islandspice',
      tiktok: '@islandspicegrill',
      pickup_enabled: true,
      delivery_enabled: true,
      authorized: true,
      created_at: '2024-01-10T08:00:00Z',
      updated_at: '2024-02-03T12:00:00Z',
    },
  ];

  const menuItems = [
    // Kingston Taste Kitchen items
    {
      id: '1a2b3c4d',
      store_id: 'TASTE1',
      item_id: 'ITEM-001',
      title: 'Jerk Chicken Paradise',
      description: 'Succulent chicken marinated for 24 hours in our secret jerk blend, grilled to smoky perfection. Served with coconut rice, festival, and mango chutney.',
      category: 'Lunch',
      price: 18.99,
      labels: ['Popular', 'Signature'],
      featured: true,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-16T10:00:00Z',
    },
    {
      id: '2b3c4d5e',
      store_id: 'TASTE1',
      item_id: 'ITEM-002',
      title: 'Curry Goat Supreme',
      description: 'Tender goat meat slow-cooked in aromatic curry spices with potatoes and carrots. A Caribbean classic that melts in your mouth.',
      category: 'Dinner',
      price: 22.50,
      labels: ['Top Pick'],
      featured: true,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-16T10:15:00Z',
    },
    {
      id: '3c4d5e6f',
      store_id: 'TASTE1',
      item_id: 'ITEM-003',
      title: 'Ackee & Saltfish Perfection',
      description: "Jamaica's national dish done right! Creamy ackee paired with flaky saltfish, sautéed with peppers, onions, and tomatoes. Served with fried dumplings and plantains.",
      category: 'Breakfast',
      price: 16.99,
      labels: ['Traditional'],
      featured: false,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-16T10:30:00Z',
    },
    {
      id: '4d5e6f7g',
      store_id: 'TASTE1',
      item_id: 'ITEM-004',
      title: 'Tropical Rum Punch',
      description: 'Our signature blend of island rums, tropical fruit juices, and a hint of nutmeg. One sip and you\'re on the beach!',
      category: 'Drinks',
      price: 8.50,
      labels: ['New'],
      featured: false,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-02-01T09:00:00Z',
    },
    {
      id: '5e6f7g8h',
      store_id: 'TASTE1',
      item_id: 'ITEM-005',
      title: 'Coconut Drops',
      description: 'Sweet, chewy coconut candies with ginger and brown sugar. The perfect treat to end your meal.',
      category: 'Dessert',
      price: 5.99,
      labels: [],
      featured: false,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-20T11:00:00Z',
    },
    // Island Spice Grill items
    {
      id: '6f7g8h9i',
      store_id: 'SPICE2',
      item_id: 'ITEM-101',
      title: 'Jerk Pork Platter',
      description: 'Fall-off-the-bone pork shoulder rubbed with traditional jerk seasoning and slow-smoked for 8 hours. Pure Caribbean fire!',
      category: 'Lunch',
      price: 20.99,
      labels: ['Signature', 'Spicy'],
      featured: true,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-11T10:00:00Z',
    },
    {
      id: '7g8h9i0j',
      store_id: 'SPICE2',
      item_id: 'ITEM-102',
      title: 'BBQ Ribs Island Style',
      description: 'Tender baby back ribs glazed with our secret tamarind BBQ sauce. Served with coleslaw and sweet potato fries.',
      category: 'Dinner',
      price: 24.50,
      labels: ['Popular', 'Best Seller'],
      featured: true,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-11T10:30:00Z',
    },
    {
      id: '8h9i0j1k',
      store_id: 'SPICE2',
      item_id: 'ITEM-103',
      title: 'Grilled Lobster Tail',
      description: 'Fresh Caribbean lobster tail grilled with garlic butter and island herbs. A luxurious taste of the sea!',
      category: 'Dinner',
      price: 34.99,
      labels: ['Premium'],
      featured: false,
      status: 'limited',
      image_url: 'https://images.unsplash.com/photo-1559737558-2f19f70d3e3d?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-15T14:00:00Z',
    },
    {
      id: '9i0j1k2l',
      store_id: 'SPICE2',
      item_id: 'ITEM-104',
      title: 'Festival & Bammy Basket',
      description: 'Crispy fried dumplings and cassava flatbread served with three dipping sauces. Perfect for sharing!',
      category: 'Snacks',
      price: 7.99,
      labels: ['Vegetarian'],
      featured: false,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      created_at: '2024-01-12T09:00:00Z',
    },
  ];

  const orders = [
    {
      id: 'order-001',
      request_id: 'ORD-20240205-001',
      store_id: 'TASTE1',
      status: 'new',
      customer_name: 'John Davis',
      customer_phone: '+18765559999',
      customer_email: 'john@example.com',
      notes: 'Please make it extra spicy!',
      items_json: [
        { itemId: 'ITEM-001', title: 'Jerk Chicken Paradise', qty: 2, price: 18.99 },
        { itemId: 'ITEM-004', title: 'Tropical Rum Punch', qty: 2, price: 8.50 },
      ],
      fulfillment_type: 'pickup',
      parish: 'Kingston',
      delivery_address: '123 Hope Road',
      preferred_time: 'ASAP',
      subtotal: 54.98,
      source: 'storefront',
      created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    },
    {
      id: 'order-002',
      request_id: 'ORD-20240205-002',
      store_id: 'TASTE1',
      status: 'confirmed',
      customer_name: 'Lisa Brown',
      customer_phone: '+18765558888',
      customer_email: 'lisa@example.com',
      notes: 'No onions please',
      items_json: [
        { itemId: 'ITEM-002', title: 'Curry Goat Supreme', qty: 1, price: 22.50 },
        { itemId: 'ITEM-005', title: 'Coconut Drops', qty: 1, price: 5.99 },
      ],
      fulfillment_type: 'delivery',
      parish: 'Kingston',
      delivery_address: '789 Main Street, Apt 4B',
      delivery_notes: 'Call on arrival',
      preferred_time: '6:00 PM',
      subtotal: 28.49,
      source: 'storefront',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    },
    {
      id: 'order-003',
      request_id: 'ORD-20240204-015',
      store_id: 'SPICE2',
      status: 'completed',
      customer_name: 'Michael Chen',
      customer_phone: '+18765557777',
      notes: '',
      items_json: [
        { itemId: 'ITEM-101', title: 'Jerk Pork Platter', qty: 1, price: 20.99 },
        { itemId: 'ITEM-104', title: 'Festival & Bammy Basket', qty: 1, price: 7.99 },
      ],
      fulfillment_type: 'pickup',
      parish: 'Montego Bay',
      delivery_address: '456 Market Street',
      preferred_time: 'Lunch',
      subtotal: 28.98,
      source: 'storefront',
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(), // Yesterday
    },
  ];

  const dailySpecials = [
    {
      id: 'special-001',
      store_id: 'TASTE1',
      item_id: 'SPECIAL-TODAY',
      title: "Chef's Special: Brown Stew Fish",
      description: 'Fresh snapper seasoned and stewed in rich brown gravy with peppers and thyme. Today only!',
      price: 19.99,
      image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
      active: true,
      display_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
  ];

  // Simulate API delay
  const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

  return {
    // Public endpoints
    getStoreProfile: async (storeId) => {
      await delay();
      const profile = merchants.find(m => m.store_id === storeId);
      if (!profile) throw new Error('Store not found');
      return profile;
    },

    getMenuItems: async (storeId, includeHidden = false) => {
      await delay();
      let items = menuItems.filter(item => item.store_id === storeId);
      if (!includeHidden) {
        items = items.filter(item => item.status !== 'hidden');
      }
      return items;
    },

    getDailySpecials: async (storeId) => {
      await delay();
      return dailySpecials.filter(special => 
        special.store_id === storeId && 
        special.active &&
        special.display_date === new Date().toISOString().split('T')[0]
      );
    },

    getCombinedMenu: async (storeIds) => {
      await delay();
      const stores = merchants.filter(m => storeIds.includes(m.store_id));
      const items = menuItems.filter(item => 
        storeIds.includes(item.store_id) && item.status !== 'hidden'
      );
      return { stores, items };
    },

    createOrderRequest: async (storeId, payload) => {
      await delay();
      const newOrder = {
        id: `order-${Date.now()}`,
        request_id: `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`,
        store_id: storeId,
        status: 'new',
        ...payload,
        created_at: new Date().toISOString(),
      };
      orders.unshift(newOrder);
      return newOrder;
    },

    // Merchant endpoints
    merchantLogin: async (identifier, passcode) => {
      await delay();
      const merchant = merchants.find(m => 
        (m.store_id === identifier || m.profile_email === identifier) &&
        m.password === passcode
      );
      if (!merchant) throw new Error('Invalid credentials');
      return merchant;
    },

    getMerchantOrders: async (storeId) => {
      await delay();
      return orders.filter(order => order.store_id === storeId);
    },

    updateOrderStatus: async (storeId, requestId, status) => {
      await delay();
      const order = orders.find(o => o.store_id === storeId && o.request_id === requestId);
      if (!order) throw new Error('Order not found');
      order.status = status;
      return order;
    },

    getMerchantAnalytics: async (storeId) => {
      await delay();
      const storeOrders = orders.filter(o => o.store_id === storeId);
      const totalOrders = storeOrders.length;
      const totalRevenue = storeOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      return {
        totalOrders,
        totalRevenue,
        newOrders: storeOrders.filter(o => o.status === 'new').length,
      };
    },

    updateMerchantProfile: async (storeId, payload) => {
      await delay();
      const merchant = merchants.find(m => m.store_id === storeId);
      if (!merchant) throw new Error('Merchant not found');
      Object.assign(merchant, payload);
      return merchant;
    },

    upsertMenuItem: async (storeId, payload) => {
      await delay();
      const existingIndex = menuItems.findIndex(item => 
        item.store_id === storeId && item.item_id === payload.item_id
      );
      
      if (existingIndex >= 0) {
        menuItems[existingIndex] = { ...menuItems[existingIndex], ...payload };
        return menuItems[existingIndex];
      } else {
        const newItem = {
          id: `item-${Date.now()}`,
          store_id: storeId,
          created_at: new Date().toISOString(),
          ...payload,
        };
        menuItems.push(newItem);
        return newItem;
      }
    },

    updateMenuItem: async (storeId, itemId, updates) => {
      await delay();
      const item = menuItems.find(i => i.store_id === storeId && i.item_id === itemId);
      if (!item) throw new Error('Item not found');
      Object.assign(item, updates);
      return item;
    },
  };
})();
