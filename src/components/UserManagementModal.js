'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit3, User, Shield, Mail, Loader2, Check, AlertCircle, Calendar } from 'lucide-react';

export default function UserManagementModal({ isOpen, onClose, currentUserEmail }) {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'requests'
  
  // User form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('normal');
  const [editingId, setEditingId] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchRequests();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        throw new Error('Erro ao buscar lista de usuários.');
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/users/requests');
      if (!res.ok) {
        throw new Error('Erro ao buscar solicitações.');
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }

    setActionLoading(true);
    try {
      if (editingId) {
        // Edit Mode
        const res = await fetch(`/api/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), role })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao atualizar usuário.');
        }

        setSuccess('Usuário atualizado com sucesso!');
        resetForm();
      } else {
        // Create Mode
        if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error('Este e-mail já está autorizado.');
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), role })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Erro ao cadastrar usuário.');
        }

        setSuccess('Usuário cadastrado com sucesso!');
        resetForm();
      }
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setError('');
    setSuccess('');
  };

  const handleDeleteClick = async (u) => {
    if (u.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert('Você não pode excluir a sua própria permissão de acesso.');
      return;
    }

    if (!confirm(`Tem certeza que deseja revogar o acesso de ${u.name} (${u.email})?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir usuário.');
      }

      setSuccess('Acesso revogado com sucesso!');
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRequest = async (reqId, requestName, requestEmail) => {
    const assignedRole = confirm(`Deseja aprovar ${requestName} (${requestEmail}) como ADMINISTRADOR?\n\n(Clique em Cancelar para aprovar com perfil NORMAL)`) ? 'adm' : 'normal';

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', role: assignedRole })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao aprovar solicitação.');
      }

      setSuccess(`Acesso de ${requestName} aprovado com perfil ${assignedRole === 'adm' ? 'Administrador' : 'Normal'}!`);
      await Promise.all([fetchUsers(), fetchRequests()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (reqId, requestName) => {
    if (!confirm(`Tem certeza que deseja recusar a solicitação de acesso de ${requestName}?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao recusar solicitação.');
      }

      setSuccess(`Solicitação de acesso de ${requestName} recusada.`);
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('normal');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '650px', width: '95%' }}>
        
        {/* MODAL HEADER */}
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} style={{ color: 'hsl(var(--primary))' }} />
            Gerenciamento de Acessos
          </h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* FEEDBACK STATUSES */}
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
              {success}
            </div>
          )}

          {/* TAB NAVIGATION */}
          <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))', marginBottom: '1.25rem', gap: '0.5rem' }}>
            <button
              type="button"
              style={{
                padding: '0.6rem 1rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'users' ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                fontWeight: activeTab === 'users' ? 800 : 600,
                color: activeTab === 'users' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setActiveTab('users')}
            >
              Usuários Autorizados ({users.length})
            </button>
            <button
              type="button"
              style={{
                padding: '0.6rem 1rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'requests' ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                fontWeight: activeTab === 'requests' ? 800 : 600,
                color: activeTab === 'requests' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setActiveTab('requests')}
            >
              Solicitações Pendentes
              {requests.length > 0 && (
                <span 
                  className="pulse-badge" 
                  style={{ 
                    backgroundColor: 'red', 
                    color: '#fff', 
                    fontSize: '0.65rem', 
                    padding: '0.1rem 0.4rem', 
                    borderRadius: '10px', 
                    fontWeight: 800,
                    animation: 'pulse 2s infinite' 
                  }}
                >
                  {requests.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: AUTHORIZED USERS CONTENT */}
          {activeTab === 'users' && (
            <>
              {/* ADD / EDIT FORM */}
              <form onSubmit={handleSubmit} style={{ backgroundColor: 'hsl(var(--muted))', padding: '1rem', borderRadius: '12px', border: '1px solid hsl(var(--border))', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                  {editingId ? '✍️ Editar Usuário' : '➕ Autorizar Novo E-mail no Sistema'}
                </span>

                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Nome Completo</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nome do usuário"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ height: '36px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>E-mail Google</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="email@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ height: '36px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Nível de Permissão</label>
                    <select
                      className="form-control"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ height: '36px', fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      <option value="normal">Normal (Viagens)</option>
                      <option value="adm">Administrador (Total)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', height: '36px', fontSize: '0.8rem' }}
                      onClick={resetForm}
                      disabled={actionLoading}
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 1rem', height: '36px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s infinite linear' }} />
                    ) : editingId ? (
                      'Salvar Alterações'
                    ) : (
                      'Autorizar Acesso'
                    )}
                  </button>
                </div>
              </form>

              {/* LIST */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', gap: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s infinite linear' }} />
                    <span>Carregando usuários...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                    Nenhum usuário autorizado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {users.map((u, index) => {
                      const isSelf = u.email.toLowerCase() === currentUserEmail.toLowerCase();
                      return (
                        <div
                          key={u.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            borderBottom: index < users.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                            backgroundColor: isSelf ? 'rgba(51, 148, 89, 0.05)' : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                              <User size={14} style={{ color: 'hsl(var(--primary))' }} />
                              {u.name}
                              {isSelf && (
                                <span style={{ backgroundColor: 'hsl(var(--primary))', color: '#fff', fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 600 }}>
                                  Você
                                </span>
                              )}
                              <span 
                                style={{
                                  backgroundColor: u.role === 'adm' ? 'rgba(230, 115, 25, 0.15)' : 'rgba(120, 120, 120, 0.1)',
                                  color: u.role === 'adm' ? 'rgb(230, 115, 25)' : 'hsl(var(--muted-foreground))',
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}
                              >
                                {u.role === 'adm' ? 'Administrador' : 'Normal'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                              <Mail size={12} />
                              {u.email}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ padding: '0.35rem', border: 'none', background: 'transparent' }}
                              onClick={() => handleEditClick(u)}
                              title="Editar permissão"
                              disabled={actionLoading}
                            >
                              <Edit3 size={14} style={{ color: 'hsl(var(--primary))' }} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              style={{ padding: '0.35rem', border: 'none', background: 'transparent' }}
                              onClick={() => handleDeleteClick(u)}
                              disabled={isSelf || actionLoading}
                              title={isSelf ? 'Você não pode excluir a si mesmo' : 'Revogar acesso'}
                            >
                              <Trash2 size={14} style={{ color: isSelf ? 'hsl(var(--border))' : '#ef4444' }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: PENDING REQUESTS CONTENT */}
          {activeTab === 'requests' && (
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
              {actionLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', gap: '0.5rem', backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--primary))', fontSize: '0.8rem', fontWeight: 600 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s infinite linear' }} />
                  <span>Processando solicitação...</span>
                </div>
              )}
              
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={24} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <span style={{ fontSize: '0.85rem' }}>Nenhuma solicitação de acesso pendente no momento.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {requests.map((r, index) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        borderBottom: index < requests.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="suggestion-item"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={14} style={{ color: 'hsl(var(--accent-rgb))' }} />
                          {r.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Mail size={12} />
                          {r.email}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} />
                          Solicitado em: {r.date}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', height: '32px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          onClick={() => handleApproveRequest(r.id, r.name, r.email)}
                          disabled={actionLoading}
                        >
                          <Check size={12} /> Aprovar
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', height: '32px', display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#ef4444', borderColor: '#fca5a5' }}
                          onClick={() => handleRejectRequest(r.id, r.name)}
                          disabled={actionLoading}
                        >
                          <X size={12} /> Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
