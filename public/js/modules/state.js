/**
 * Módulo de Gestión de Estado Reactivo (AppStore)
 * Mantiene el estado sincronizado de Tasks, Commitments, Filtros, Vista Activa y Tema Glass
 */

export class AppStore {
  constructor() {
    this.state = {
      tasks: [],
      overdueTasks: [],
      commitments: [],
      taskFilter: 'ALL',
      taskPriorityFilter: 'ALL',
      commFilter: 'ALL',
      searchQuery: '',
      activeModule: 'all', // 'all' | 'tasks' | 'commitments' | 'sdd'
      referenceNow: new Date().toISOString(),
      theme: localStorage.getItem('sdd_glass_theme') || 'light',
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    if (partial.theme) {
      localStorage.setItem('sdd_glass_theme', partial.theme);
      document.documentElement.setAttribute('data-theme', partial.theme);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getFilteredTasks() {
    const { tasks, taskFilter, taskPriorityFilter, searchQuery } = this.state;
    const q = searchQuery.trim().toLowerCase();

    return tasks.filter((t) => {
      if (taskFilter !== 'ALL' && t.estado !== taskFilter) return false;
      if (taskPriorityFilter !== 'ALL' && t.prioridad !== taskPriorityFilter) return false;
      if (q) {
        const inTitle = t.titulo.toLowerCase().includes(q);
        const inDesc = (t.descripcion || '').toLowerCase().includes(q);
        const inTags = (t.etiquetas || []).some((tag) => tag.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });
  }

  getFilteredCommitments() {
    const { commitments, commFilter, searchQuery } = this.state;
    const q = searchQuery.trim().toLowerCase();

    return commitments.filter((c) => {
      if (commFilter !== 'ALL' && c.estado !== commFilter) return false;
      if (q) {
        const inTitle = c.titulo.toLowerCase().includes(q);
        const inDesc = (c.descripcion || '').toLowerCase().includes(q);
        const inLoc = (c.ubicacion || '').toLowerCase().includes(q);
        const inEmails = (c.participantes || []).some((e) => e.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inLoc && !inEmails) return false;
      }
      return true;
    });
  }
}
