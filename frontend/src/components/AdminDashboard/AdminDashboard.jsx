import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../Toast/ToastContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area
} from 'recharts';
import './AdminDashboard.css';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const TOOLTIP_STYLE = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  color: 'var(--text-color)'
};

const AdminDashboard = ({ onClose }) => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', nombre_completo: '', rol: 'empleado' });
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      addToast('Error al cargar usuarios: ' + err.message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await api.getMovementStats();
      setStats(data);
    } catch (err) {
      addToast('Error al cargar estadísticas: ' + err.message, 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const resetForm = () => {
    setFormData({ username: '', password: '', nombre_completo: '', rol: 'empleado' });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleEdit = (user) => {
    setEditingUser(user.username);
    setFormData({ username: user.username, password: '', nombre_completo: '', rol: user.rol });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingUser) {
        const updatePayload = {};
        if (formData.password) updatePayload.password = formData.password;
        if (formData.nombre_completo) updatePayload.nombre_completo = formData.nombre_completo;
        // No permitir cambiar el rol de un admin
        const editedUserData = users.find(u => u.username === editingUser);
        if (formData.rol && !(editedUserData && editedUserData.rol === 'admin')) {
          updatePayload.rol = formData.rol;
        }
        await api.updateUser(editingUser, updatePayload);
        addToast(`Usuario "${editingUser}" actualizado.`, 'success');
      } else {
        if (!formData.username || !formData.password || !formData.nombre_completo) {
          addToast('Todos los campos son requeridos.', 'error');
          setFormLoading(false);
          return;
        }
        await api.createUser(formData);
        addToast(`Usuario "${formData.username}" creado.`, 'success');
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteUser(userToDelete);
      addToast(`Usuario "${userToDelete}" eliminado.`, 'success');
      fetchUsers();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  // Un admin no se puede eliminar a sí mismo ni eliminar a otro admin
  const canDelete = (user) => {
    return user.rol !== 'admin';
  };

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
            <h2>Panel de Administración</h2>
          </div>
          <button className="admin-close-btn" onClick={onClose} title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="admin-body">
          {/* ─── SECCIÓN: Gestión de Empleados ─── */}
          <section className="admin-section">
            <div className="section-header">
              <h3>Gestión de Empleados</h3>
              <button className="btn-premium btn-save" onClick={() => { resetForm(); setShowForm(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Nuevo Usuario</span>
              </button>
            </div>

            {/* Tabla de usuarios */}
            {loadingUsers ? (
              <p className="loading-text">Cargando usuarios...</p>
            ) : (
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombre Completo</th>
                      <th>Rol</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.username}>
                        <td className="font-mono">{u.username}</td>
                        <td>{u.nombre_completo}</td>
                        <td>
                          <span className={`role-badge ${u.rol === 'admin' ? 'role-admin' : 'role-empleado'}`}>
                            {u.rol === 'admin' ? 'Admin' : 'Empleado'}
                          </span>
                        </td>
                        <td>
                          <div className="user-actions">
                            <button className="btn-crud btn-edit" onClick={() => handleEdit(u)} title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                            {canDelete(u) ? (
                              <button className="btn-crud btn-delete" onClick={() => setUserToDelete(u.username)} title="Eliminar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            ) : (
                              <span className="protected-badge" title="Los administradores no pueden ser eliminados">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ─── SECCIÓN: Analítica de Movimientos ─── */}
          <section className="admin-section">
            <h3>Analítica de Movimientos</h3>
            {loadingStats ? (
              <p className="loading-text">Cargando estadísticas...</p>
            ) : stats && (
              <div className="charts-grid">
                {/* Barras: Acciones por usuario */}
                <div className="chart-card card">
                  <h4>Acciones por Usuario</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.by_user} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--muted-text)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--muted-text)', fontSize: 12 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-color)' }} labelStyle={{ color: 'var(--text-color)' }} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {stats.by_user.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Barras horizontales: Tipos detallados */}
                <div className="chart-card card">
                  <h4>Desglose por Tipo</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.by_type} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis type="number" tick={{ fill: 'var(--muted-text)', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-text)', fontSize: 12 }} width={70} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-color)' }} labelStyle={{ color: 'var(--text-color)' }} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {stats.by_type.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Área: Actividad diaria */}
                <div className="chart-card card full-width">
                  <h4>Actividad Diaria (Últimos 30 días)</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={stats.by_date} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--muted-text)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--muted-text)', fontSize: 12 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'var(--text-color)' }} labelStyle={{ color: 'var(--text-color)' }} />
                      <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#areaGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* KPIs */}
                <div className="stats-summary card">
                  <div className="stat-item">
                    <span className="stat-number">{stats.total_movements}</span>
                    <span className="stat-label">Movimientos Totales</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.by_user.length}</span>
                    <span className="stat-label">Usuarios Activos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.by_type.length}</span>
                    <span className="stat-label">Tipos de Acción</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ─── Modal flotante para crear/editar usuario ─── */}
      {showForm && (
        <div className="user-modal-overlay" onClick={e => { e.stopPropagation(); resetForm(); }}>
          <div className="modal-content card user-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3>{editingUser ? `Editar: ${editingUser}` : 'Crear Nuevo Usuario'}</h3>
              <button className="detail-close-btn" onClick={resetForm} title="Cerrar">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              {!editingUser && (
                <div className="form-group">
                  <label>Usuario (login)</label>
                  <input type="text" value={formData.username} onChange={e => setFormData(p => ({...p, username: e.target.value}))} required placeholder="ej: pedro123" />
                </div>
              )}
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" value={formData.nombre_completo} onChange={e => setFormData(p => ({...p, nombre_completo: e.target.value}))} required={!editingUser} placeholder={editingUser ? users.find(u => u.username === editingUser)?.nombre_completo || 'Sin cambios' : 'ej: Pedro García'} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{editingUser ? 'Nueva Contraseña' : 'Contraseña'}</label>
                  <input type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} required={!editingUser} placeholder="••••••" />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select value={formData.rol} onChange={e => setFormData(p => ({...p, rol: e.target.value}))} disabled={editingUser && users.find(u => u.username === editingUser)?.rol === 'admin'}>
                    <option value="empleado">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-premium btn-cancel" onClick={resetForm} disabled={formLoading}>Cancelar</button>
                <button type="submit" className="btn-premium btn-save" disabled={formLoading}>
                  {formLoading ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ConfirmModal para eliminar usuario ─── */}
      <ConfirmModal
        isOpen={!!userToDelete}
        title="Eliminar Usuario"
        message={userToDelete ? `¿Estás seguro de que deseas eliminar permanentemente al usuario "${userToDelete}"? Esta acción no se puede deshacer.` : ''}
        confirmText="Sí, eliminar"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};

export default AdminDashboard;
