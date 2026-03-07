export const API_URL = 'http://localhost:8000';

export const api = {
  getProducts: async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('getProducts falló:', error);
      throw new Error(error.message || 'No se pudo conectar con el servidor.');
    }
  },

  createProduct: async (product) => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('createProduct falló:', error);
      throw new Error(error.message || 'Error al crear el producto.');
    }
  },

  updateStock: async (productId, amount) => {
    try {
      const response = await fetch(`${API_URL}/products/${productId}/update_stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: amount }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('updateStock falló:', error);
      throw new Error(error.message || 'Error al actualizar el stock.');
    }
  }
};
