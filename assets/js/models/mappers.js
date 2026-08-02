window.MiniMakerMappers = (() => {
  const today = () => new Date().toISOString().slice(0, 10);

  return {
    product(row) {
      return {
        id: row.id,
        name: row.name,
        qty: Number(row.qty),
        price: Number(row.price),
        photo: row.photo || '',
        variants: Array.isArray(row.variants) ? row.variants : [],
        createdAt: row.created_at
      };
    },
    order(row) {
      return {
        id: row.id,
        productId: row.product_id,
        name: row.product_name,
        qty: Number(row.qty),
        color: row.color || 'Standard',
        customer: row.customer_name,
        contact: row.contact,
        note: row.note || '',
        status: row.status,
        createdAt: row.created_at
      };
    },
    sale(row) {
      return {
        id: row.id,
        productId: row.product_id,
        name: row.product_name,
        qty: Number(row.qty),
        price: Number(row.price || 0),
        color: row.color || 'Standard',
        buyer: row.buyer || '',
        date: row.occurred_on || today(),
        recordType: row.record_type
      };
    },
    color(row) {
      return {
        id: row.id,
        name: row.name,
        photo: row.photo || '',
        extraPrice: Number(row.extra_price || 0),
        createdAt: row.created_at
      };
    },
    design(row) {
      return {
        id: row.id,
        name: row.name,
        photo: row.photo || '',
        sizeCategory: row.size_category || 'small',
        basePrice: Number(row.base_price || 5),
        createdAt: row.created_at
      };
    }
  };
})();
