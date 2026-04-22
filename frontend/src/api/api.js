export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

/** Maneja las respuestas globales para detectar expiración de sesión (401). */
const handleResponse = async (response) => {
  if (response.status === 401) {
    // Disparamos un evento global para que AuthContext lo capture y haga logout
    window.dispatchEvent(new CustomEvent('unauthorized-api-call'));
    throw new Error('SESIÓN EXPIRADA');
  }
  return response;
};

/** Wrapper sobre fetch que maneja errores globales. */
const secureFetch = async (url, options) => {
  const response = await fetch(url, options);
  return handleResponse(response);
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
    await secureFetch(`${API_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Authorization': token },
    });
  },

  forgotPassword: async (username) => {
    const response = await secureFetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Error al solicitar PIN.');
    }
    return response.json();
  },

  resetPassword: async (payload) => {
    const response = await secureFetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Error al restablecer contraseña.');
    }
    return response.json();
  },

  // ─── Products ────────────────────────────────────────────────────

  getProducts: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/products?_t=${Date.now()}`, {
      headers: getAuthHeaders(token),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    return response.json();
  },

  createProduct: async (product) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    window.dispatchEvent(new Event('inventory-changed'));
    return response.json();
  },

  updateStock: async (productId, amount) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/products/${productId}/update_stock`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ cantidad: amount }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    window.dispatchEvent(new Event('inventory-changed'));
    return response.json();
  },

  updateProduct: async (productId, data) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    window.dispatchEvent(new Event('inventory-changed'));
    return response.json();
  },

  deleteProduct: async (productId) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    window.dispatchEvent(new Event('inventory-changed'));
    return response.json();
  },

  // HU-07: Consulta individual
  getProduct: async (productId) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/products/${productId}?_t=${Date.now()}`, {
      headers: getAuthHeaders(token),
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  // HU-11: Ajuste manual absoluto (admin only)
  adjustStock: async (productId, cantidad_nueva) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/products/${productId}/ajuste`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ cantidad_nueva }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    window.dispatchEvent(new Event('inventory-changed'));
    return response.json();
  },

  getHistory: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/history?_t=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error al obtener historial`);
    }
    return response.json();
  },

  clearHistory: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/history/clear`, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error al limpiar historial`);
    }
    return response.json();
  },

  // ─── POS / Cajero ─────────────────────────────────────────────
  checkoutPOS: async (items, total) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/pos/checkout`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ items, total }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error procesando la venta: ${response.status}`);
    }
    window.dispatchEvent(new Event('inventory-changed'));
    return response.json();
  },

  getSales: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/sales?_t=${Date.now()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error al obtener historial de ventas`);
    }
    return response.json();
  },

  // ─── HU-25: User Management ────────────────────────────────────
  getUsers: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/users`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  createUser: async (userData) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  updateUser: async (username, data) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/users/${username}`, {
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

  deleteUser: async (username) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/users/${username}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  getMovementStats: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/stats/movements`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  // ─── Configuraciones (Categorías/Unidades) ────────────────────
  getSettings: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/settings?_t=${Date.now()}`, {
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  updateSettings: async (settingsData) => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settingsData),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Error ${response.status}`);
    }
    return response.json();
  },

  clearStats: async () => {
    const token = getStoredToken();
    const response = await secureFetch(`${API_URL}/api/stats/clear`, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Error al reiniciar estadísticas');
    }
    return response.json();
  }
};
