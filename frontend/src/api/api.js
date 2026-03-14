export const API_URL = 'http://localhost:8000';

/** Genera los headers de autorización con el token de sesión. */
const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': token } : {}),
});

/** Recupera el token de sesión almacenado en localStorage. */
const getStoredToken = () => {
  try {
    const stored = localStorage.getItem('sisteminv_session');
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
};

export const api = {
  // ─── Auth ────────────────────────────────────────────────────────
  login: async ({ username, password }) => {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Credenciales inválidas.');
    }
    return response.json();
  },

  logout: async (token) => {
    await fetch(`${API_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Authorization': token },
    });
  },

  // ─── Products ────────────────────────────────────────────────────
  getProducts: async () => {
    const token = getStoredToken();
    const response = await fetch(`${API_URL}/products`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    return response.json();
  },

  createProduct: async (product) => {
    const token = getStoredToken();
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  updateStock: async (productId, amount) => {
    const token = getStoredToken();
    const response = await fetch(`${API_URL}/products/${productId}/update_stock`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ cantidad: amount }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  updateProduct: async (productId, data) => {
    const token = getStoredToken();
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  deleteProduct: async (productId) => {
    const token = getStoredToken();
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },
};
