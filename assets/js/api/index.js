window.MiniMakerApi = (() => {
  const { hasSharedInventory, request } = window.MiniMakerApiClient;
  const map = window.MiniMakerMappers;
  const storage = window.MiniMakerStorage;
  const today = () => new Date().toISOString().slice(0, 10);

  const colors = {
    async list() {
      if (hasSharedInventory) {
        return (await request('color_library?select=id,name,photo,created_at&order=created_at.asc')).map(map.color);
      }
      return storage.loadState().colorLibrary;
    },
    async create(input) {
      if (hasSharedInventory) {
        return map.color((await request('color_library?select=id,name,photo,created_at', {
          method: 'POST',
          body: { id: crypto.randomUUID(), ...input },
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const created = { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() };
        state.colorLibrary.push(created);
        return created;
      });
    },
    async update(id, patch) {
      if (hasSharedInventory) {
        return map.color((await request(`color_library?id=eq.${encodeURIComponent(id)}&select=id,name,photo,created_at`, {
          method: 'PATCH',
          body: patch,
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const item = state.colorLibrary.find(entry => entry.id === id);
        if (!item) throw new Error('Color not found.');
        Object.assign(item, patch);
        return item;
      });
    },
    async remove(id) {
      if (hasSharedInventory) {
        await request(`color_library?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return true;
      }
      return storage.withLocalState(state => {
        state.colorLibrary = state.colorLibrary.filter(entry => entry.id !== id);
        return true;
      });
    }
  };

  const designs = {
    async list() {
      if (hasSharedInventory) {
        return (await request('design_library?select=id,name,photo,created_at&order=created_at.asc')).map(map.design);
      }
      return storage.loadState().designLibrary;
    },
    async create(input) {
      if (hasSharedInventory) {
        return map.design((await request('design_library?select=id,name,photo,created_at', {
          method: 'POST',
          body: { id: crypto.randomUUID(), ...input },
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const created = { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() };
        state.designLibrary.push(created);
        return created;
      });
    },
    async update(id, patch) {
      if (hasSharedInventory) {
        return map.design((await request(`design_library?id=eq.${encodeURIComponent(id)}&select=id,name,photo,created_at`, {
          method: 'PATCH',
          body: patch,
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const item = state.designLibrary.find(entry => entry.id === id);
        if (!item) throw new Error('Design not found.');
        Object.assign(item, patch);
        return item;
      });
    },
    async remove(id) {
      if (hasSharedInventory) {
        await request(`design_library?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return true;
      }
      return storage.withLocalState(state => {
        state.designLibrary = state.designLibrary.filter(entry => entry.id !== id);
        return true;
      });
    }
  };

  const inventory = {
    async list() {
      if (hasSharedInventory) {
        return (await request('inventory_items?select=id,name,qty,price,photo,variants,created_at&order=created_at.asc')).map(map.product);
      }
      return storage.loadState().products;
    },
    async create(input) {
      if (hasSharedInventory) {
        return map.product((await request('inventory_items?select=id,name,qty,price,photo,variants,created_at', {
          method: 'POST',
          body: { id: crypto.randomUUID(), ...input },
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const created = { id: crypto.randomUUID(), ...input };
        state.products.push(created);
        return created;
      });
    },
    async update(id, patch) {
      if (hasSharedInventory) {
        return map.product((await request(`inventory_items?id=eq.${encodeURIComponent(id)}&select=id,name,qty,price,photo,variants,created_at`, {
          method: 'PATCH',
          body: patch,
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const item = state.products.find(entry => entry.id === id);
        if (!item) throw new Error('Inventory item not found.');
        Object.assign(item, patch);
        return item;
      });
    },
    async remove(id) {
      if (hasSharedInventory) {
        await request(`inventory_items?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return true;
      }
      return storage.withLocalState(state => {
        state.products = state.products.filter(entry => entry.id !== id);
        return true;
      });
    }
  };

  const orders = {
    async list() {
      if (hasSharedInventory) {
        return (await request('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at&order=created_at.desc')).map(map.order);
      }
      return storage.loadState().orders;
    },
    async create(input) {
      const payload = {
        id: crypto.randomUUID(),
        product_id: input.productId,
        product_name: input.name,
        qty: input.qty,
        color: input.color || 'Standard',
        customer_name: input.customer,
        contact: input.contact,
        note: input.note || '',
        status: input.status || 'pending_print'
      };
      if (hasSharedInventory) {
        return map.order((await request('customer_orders?select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at', {
          method: 'POST',
          body: payload,
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const created = {
          id: payload.id,
          productId: input.productId,
          name: input.name,
          qty: input.qty,
          color: input.color || 'Standard',
          customer: input.customer,
          contact: input.contact,
          note: input.note || '',
          status: payload.status,
          createdAt: new Date().toISOString()
        };
        state.orders.unshift(created);
        return created;
      });
    },
    async update(id, patch) {
      if (hasSharedInventory) {
        return map.order((await request(`customer_orders?id=eq.${encodeURIComponent(id)}&select=id,product_id,product_name,qty,color,customer_name,contact,note,status,created_at`, {
          method: 'PATCH',
          body: { ...patch, updated_at: new Date().toISOString() },
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const item = state.orders.find(entry => entry.id === id);
        if (!item) throw new Error('Order not found.');
        Object.assign(item, patch);
        return item;
      });
    },
    async remove(id) {
      if (hasSharedInventory) {
        await request(`customer_orders?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return true;
      }
      return storage.withLocalState(state => {
        state.orders = state.orders.filter(entry => entry.id !== id);
        return true;
      });
    }
  };

  const sales = {
    async list() {
      if (hasSharedInventory) {
        return (await request('sale_events?select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at&order=created_at.desc')).map(map.sale);
      }
      return storage.loadState().records;
    },
    async create(input) {
      const payload = {
        id: crypto.randomUUID(),
        product_id: input.productId,
        product_name: input.name,
        qty: input.qty,
        price: input.price || 0,
        color: input.color || 'Standard',
        buyer: input.buyer || '',
        record_type: input.recordType,
        occurred_on: input.date || today()
      };
      if (hasSharedInventory) {
        return map.sale((await request('sale_events?select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at', {
          method: 'POST',
          body: payload,
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const created = {
          id: payload.id,
          productId: input.productId,
          name: input.name,
          qty: input.qty,
          price: input.price || 0,
          color: input.color || 'Standard',
          buyer: input.buyer || '',
          recordType: input.recordType,
          date: payload.occurred_on
        };
        state.records.unshift(created);
        return created;
      });
    },
    async update(id, patch) {
      if (hasSharedInventory) {
        return map.sale((await request(`sale_events?id=eq.${encodeURIComponent(id)}&select=id,product_id,product_name,qty,price,color,buyer,record_type,occurred_on,created_at`, {
          method: 'PATCH',
          body: patch,
          prefer: 'return=representation'
        }))[0]);
      }
      return storage.withLocalState(state => {
        const item = state.records.find(entry => entry.id === id);
        if (!item) throw new Error('Sale not found.');
        Object.assign(item, patch);
        return item;
      });
    },
    async remove(id) {
      if (hasSharedInventory) {
        await request(`sale_events?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return true;
      }
      return storage.withLocalState(state => {
        state.records = state.records.filter(entry => entry.id !== id);
        return true;
      });
    }
  };

  return { hasSharedInventory, colors, designs, inventory, orders, sales };
})();
