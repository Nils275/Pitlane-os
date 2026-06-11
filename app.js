
// ================================================================
//  PITLANE OS — app.js (VERSION COMPLÈTE & INTÉGRÉE)
// ================================================================
'use strict';

const PitlaneOS = {
  version: '12.0.0',
  config: { user: { name: 'Alex Martin', initials: 'AM', role: 'Super Admin', color: '#3B82F6' } },
  state: { currentPage: 'dashboard', currentChatChannel: 'général', chatType: 'channel' }
};

const Utils = {
  $(selector, parent = document) { return parent.querySelector(selector); },
  $$(selector, parent = document) { return Array.from(parent.querySelectorAll(selector)); },
  createElement(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') el.className = v; else if (k === 'innerHTML') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    if (children) children.forEach(c => { if (typeof c === 'string') el.insertAdjacentHTML('beforeend', c); else if (c) el.appendChild(c); });
    return el;
  },
  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; },
  formatTime(date = new Date()) { return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0'); },
  uid() { return 'id_' + Math.random().toString(36).substr(2, 9); }
};

const EventBus = {
  events: {},
  on(event, cb) { (this.events[event] = this.events[event] || []).push(cb); },
  emit(event, data) { (this.events[event] || []).forEach(cb => cb(data)); }
};

// ================================================================
//  0. NAVIGATION SÉCURISÉE (Toujours active)
// ================================================================
window.showPage = (pageId, el) => {
  if (pageId === 'automations') return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + pageId);
  if(targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => { 
    n.classList.remove('active'); 
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(pageId)) n.classList.add('active');
  });
  
  PitlaneOS.state.currentPage = pageId;
  
  if (pageId === 'calendar' && typeof Calendar !== 'undefined') Calendar.renderView();
  if (pageId === 'admin' && typeof Settings !== 'undefined') { Settings.renderTabs(); Settings.renderContent(); }
};

// ================================================================
//  1. BASE DE DONNÉES
// ================================================================
const Database = {
  data: { projects: [], tasks: [], messages: [], risks: [], events: [], folders: [], documents: [], wiki: [], notifications: [], settings: {} },
  init() {
    const saved = localStorage.getItem('pitlane_db');
    if (saved) { 
      this.data = JSON.parse(saved); 
      if(!this.data.events) this.data.events = [];
      if(!this.data.documents) this.data.documents = [];
      if(!this.data.folders) this.data.folders = [];
      if(!this.data.settings) this.data.settings = this.defaultSettings();
      if(!this.data.wiki) this.data.wiki = [];
      if(!this.data.notifications) this.data.notifications = [];
    } else {
      this.data.tasks = [
        { id: Utils.uid(), title: "Maquette onboarding", status: "À faire", priority: "Normale", assignee: "Léa Mercier", initials: "LM", date: "2026-06-14", description: "Design Figma." },
        { id: Utils.uid(), title: "Dashboard analytique", status: "En cours", priority: "Haute", assignee: "Marc Dupuis", initials: "MD", date: "2026-06-16" },
        { id: Utils.uid(), title: "GitHub Actions", status: "Terminé", priority: "Normale", assignee: "Alex Martin", initials: "AM", date: "2026-06-08" }
      ];
      this.data.projects = [
        { id: Utils.uid(), name: "Plateforme Connect V2", client: "Ferrari", assignee: "Sarah Kambo", date: "2026-07-15", progress: 72, health: "green", status: "En cours", description: "Refonte du backoffice client avec nouveau design system." },
        { id: Utils.uid(), name: "Application Mobile", client: "Mercedes", assignee: "Thomas Renard", date: "2026-08-28", progress: 45, health: "orange", status: "Planifié", description: "Application mobile native iOS/Android pour les utilisateurs finaux." }
      ];
      this.data.messages = [{ id: Utils.uid(), channel: "général", type: "channel", author: "Sarah Kambo", initials: "SK", text: "La démo s'est bien passée ! 🏁", time: "09:24", color: "#E10600" }];
      this.data.risks = [
        { id: Utils.uid(), title: "Retard livraison fournisseur", project: "Porsche Track", impact: "Élevé", probability: "75%", criticality: "Critique", status: "Ouvert", assignee: "AM", initials: "AM" },
        { id: Utils.uid(), title: "Indisponibilité expert backend", project: "Tous projets", impact: "Moyen", probability: "85%", criticality: "Critique", status: "En cours", assignee: "TR", initials: "TR" }
      ];
      this.data.events = [
        { id: Utils.uid(), title: "10:00 Daily Standup", date: "2026-06-09", color: "blue" },
        { id: Utils.uid(), title: "Démo client Ferrari", date: "2026-06-04", color: "green" }
      ];
      this.data.folders = [{ id: 'f_proj', name: 'Projets', parentId: null }, { id: 'f_rh', name: 'RH', parentId: null }];
      this.data.documents = [{ id: Utils.uid(), name: "Budget_Q2.xlsx", folderId: 'f_rh', author: "Alex Martin", initials: "AM", type: "XLS", size: "412 KB", version: "v1.1", status: "Validé", date: "Ce matin", color: "var(--green)", bg: "rgba(34,197,94,0.15)" }];
      this.data.wiki = [
        { id: Utils.uid(), title: "Procédure d'onboarding", category: "Procédure", content: "Bienvenue ! Demandez vos accès AWS au service IT.", author: "Sarah Kambo", date: "Il y a 2 h", views: 12, color: "var(--purple)" },
        { id: Utils.uid(), title: "Clé Wi-Fi entreprise", category: "FAQ", content: "Le mot de passe est affiché à la cafétéria.", author: "Alex Martin", date: "Hier", views: 142, color: "var(--blue)" }
      ];
      this.data.notifications = [
        { id: Utils.uid(), title: "Risque critique détecté", desc: "Porsche Track présente un risque.", time: "Il y a 5 min", icon: "⚠️", bg: "rgba(225,6,0,0.15)", color: "var(--red-soft)", target: "risks", read: false }
      ];
      this.data.settings = this.defaultSettings();
      this.save();
    }
  },
  defaultSettings() { return { orgName: 'Pitlane Performance Group', domain: 'pitlane.os', timezone: 'Europe/Paris', lang: 'Français', require2fa: 'Oui', passPolicy: 'Stricte', sessionTimeout: '2 heures', slackIntegration: 'Activée', githubIntegration: 'Désactivée', defaultRole: 'Membre', publicProjects: 'Non' }; },
  save() { localStorage.setItem('pitlane_db', JSON.stringify(this.data)); }
};

// ================================================================
//  2. UI : Toasts & Modals
// ================================================================
const Toast = {
  initNative() { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission(); },
  show(type, msg, osTitle = null) {
    let container = Utils.$('#toastContainer') || document.body.appendChild(Utils.createElement('div', { id: 'toastContainer', className: 'toast-container' }));
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️', chat: '💬' };
    const toast = Utils.createElement('div', { className: `toast toast-${type}` }, [`<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${Utils.escapeHtml(msg)}</span>`]);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    if (osTitle && "Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(osTitle, { body: msg, icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828817.png' });
  }
};
const notify = { success: (m,os) => Toast.show('success',m,os), info: (m,os) => Toast.show('info',m,os), error: (m,os) => Toast.show('error',m,os), warning: (m,os) => Toast.show('warning',m,os), chat: (m,os) => Toast.show('chat',m,os) };

const Modal = {
  active: null,
  open(title, content, size = 'md') {
    if(this.active) this.close();
    const overlay = Utils.createElement('div', { className: 'modal-overlay' });
    overlay.appendChild(Utils.createElement('div', { className: `modal-box modal-${size}` }, [`<div class="modal-head"><h3>${title}</h3><button class="modal-close">✕</button></div>`, `<div class="modal-body">${content}</div>`]));
    document.body.appendChild(overlay); this.active = overlay;
    overlay.querySelector('.modal-close').onclick = () => this.close();
    requestAnimationFrame(() => overlay.classList.add('visible'));
  },
  close() { if(this.active){ this.active.classList.remove('visible'); setTimeout(() => { this.active.remove(); this.active=null; }, 200); } }
};

// ================================================================
//  3. DASHBOARD (Accès rapides fonctionnels ✅)
// ================================================================
const Dashboard = {
  init() {
    // KPI cliquables
    Utils.$$('.kpi-card').forEach((k, i) => {
      k.style.cursor = 'pointer';
      k.onclick = () => window.showPage(['portfolio', 'tasks', 'risks', 'workload'][i]);
    });

    // Bouton Exporter
    const exportBtn = Utils.$('#page-dashboard .page-actions .btn-ghost');
    if (exportBtn && exportBtn.textContent.includes('Exporter')) {
      exportBtn.onclick = async () => {
        if (typeof html2canvas !== 'undefined') {
          notify.info("Export en cours...");
          try {
            const canvas = await html2canvas(Utils.$('#page-dashboard'));
            const link = document.createElement('a');
            link.download = `Dashboard_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
            notify.success("Export réussi !");
          } catch (e) { notify.error("Erreur d'export"); }
        } else notify.error("html2canvas manquant dans le HTML");
      };
    }

    // ✅ ACCÈS RAPIDES FONCTIONNELS
    const quickActions = Utils.$$('.quick-action');
    if (quickActions.length >= 4) {
      // 1. Nouveau projet
      quickActions[0].onclick = () => {
        window.showPage('portfolio');
        setTimeout(() => Portfolio.openCreateForm(), 300);
      };
      // 2. Nouveau document
      quickActions[1].onclick = () => {
        window.showPage('documents');
        setTimeout(() => Documents.openImport(), 300);
      };
      // 3. Discussion
      quickActions[2].onclick = () => {
        window.showPage('chat');
        notify.info("Bienvenue dans les conversations !");
      };
      // 4. Réunion
      quickActions[3].onclick = () => {
        window.showPage('calendar');
        setTimeout(() => Calendar.openCreateForm(), 300);
      };

      quickActions.forEach(a => a.style.cursor = 'pointer');
    }

    // Graphique interactif
    const toggles = Utils.$$('#page-dashboard .view-toggle button');
    const svg = Utils.$('.chart svg');
    if (!svg || toggles.length < 3) return;
    const chartData = {
      'Mois': { labels: ['Jul','Aoû','Sep','Oct','Nov','Déc','Jan','Fév','Mar','Avr','Mai','Juin'], points: [160, 130, 145, 110, 95, 115, 80, 90, 60, 70, 50, 45] },
      'Trimestre': { labels: ['T1 25','T2 25','T3 25','T4 25','T1 26','T2 26','','','','','',''], points: [180, 150, 170, 130, 90, 45, null, null, null, null, null, null] },
      'Année': { labels: ['2021','2022','2023','2024','2025','2026','','','','','',''], points: [220, 200, 150, 110, 80, 45, null, null, null, null, null, null] }
    };
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        toggles.forEach(b => b.classList.remove('active')); btn.classList.add('active');
        const data = chartData[btn.textContent.trim()];
        if (data) {
          const paths = Utils.$$('path', svg), circlesGroup = Utils.$$('g', svg)[2], labelsGroup = Utils.$$('g', svg)[3];
          const xCoords = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 590];
          let pathD = '', fillD = '', circlesHtml = '', labelsHtml = '', firstValid = true;
          for (let i = 0; i < 12; i++) {
            if (data.points[i] !== null) {
              if (firstValid) { pathD += `M ${xCoords[i]} ${data.points[i]} `; fillD += `M ${xCoords[i]} ${data.points[i]} `; firstValid = false; } 
              else { pathD += `L ${xCoords[i]} ${data.points[i]} `; fillD += `L ${xCoords[i]} ${data.points[i]} `; }
              const isLast = (i === 11 || data.points[i + 1] === null);
              circlesHtml += `<circle cx="${xCoords[i]}" cy="${data.points[i]}" r="${isLast ? 4 : 3}" ${isLast ? 'stroke="#fff" stroke-width="2"' : ''}></circle>`;
            }
            if (data.labels[i]) labelsHtml += `<text x="${xCoords[i]}" y="220">${data.labels[i]}</text>`;
          }
          const lastValidIndex = data.points.findLastIndex(p => p !== null);
          fillD += `L ${xCoords[lastValidIndex]} 200 L ${xCoords[0]} 200 Z`;
          svg.style.opacity = '0';
          setTimeout(() => { paths[0].setAttribute('d', fillD); paths[1].setAttribute('d', pathD); circlesGroup.innerHTML = circlesHtml; labelsGroup.innerHTML = labelsHtml; svg.style.transition = 'opacity 0.4s ease'; svg.style.opacity = '1'; }, 150);
        }
      });
    });
  }
};

// ================================================================
//  4. PORTFOLIO (Terminer + Supprimer ✅)
// ================================================================
const Portfolio = {
  currentView: 'Cartes', draggedProject: null,

  init() {
    this.renderView();
    const btn = Utils.$('#page-portfolio .page-actions .btn-primary'); 
    if (btn) btn.onclick = () => this.openCreateForm();
    const toggles = Utils.$$('#page-portfolio .view-toggle button');
    toggles.forEach(btn => { 
      btn.addEventListener('click', () => { 
        toggles.forEach(b => b.classList.remove('active')); 
        btn.classList.add('active'); 
        this.currentView = btn.textContent.trim(); 
        this.renderView(); 
      }); 
    });
  },

  openCreateForm() {
    Modal.open('Nouveau projet', `
      <form id="fp" class="modal-form">
        <div class="form-group"><label>Nom *</label><input name="name" required></div>
        <div class="form-row">
          <div class="form-group"><label>Client</label><input name="client"></div>
          <div class="form-group"><label>Date limite</label><input type="date" name="date" required></div>
        </div>
        <div class="form-group"><label>Responsable</label>
          <select name="assignee">
            <option>Alex Martin</option><option>Sarah Kambo</option>
            <option>Léa Mercier</option><option>Thomas Renard</option><option>Marc Dupuis</option>
          </select>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
        <div class="form-actions"><button type="submit" class="btn-primary">Créer le projet</button></div>
      </form>
    `, 'lg');
    Utils.$('#fp').onsubmit = (e) => { 
      e.preventDefault(); 
      const d = Object.fromEntries(new FormData(e.target)); 
      d.id = Utils.uid(); d.progress = 0; d.health = "green"; d.status = "Planifié"; 
      Database.data.projects.push(d); 
      Database.save(); 
      this.renderView(); 
      Modal.close(); 
      notify.success("Projet créé !"); 
    };
  },

  markAsCompleted(id) {
    const proj = Database.data.projects.find(p => p.id === id);
    if (!proj) return;
    proj.status = "Terminé"; proj.progress = 100; proj.health = "green";
    Database.save(); this.renderView();
    notify.success(`Projet "${proj.name}" marqué comme terminé ! 🎉`);
  },

  deleteProject(id) {
    const proj = Database.data.projects.find(p => p.id === id);
    if (!proj) return;
    if (confirm(`⚠️ Êtes-vous sûr de vouloir supprimer le projet "${proj.name}" ?\n\nCette action est irréversible.`)) {
      Database.data.projects = Database.data.projects.filter(p => p.id !== id);
      Database.save(); this.renderView();
      notify.info(`Projet "${proj.name}" supprimé.`);
    }
  },

  openDetail(id) {
    const p = Database.data.projects.find(x => x.id === id);
    if (!p) return;
    Modal.open(p.name, `
      <div style="margin-bottom:20px;">
        <span class="badge badge-${p.status === 'Terminé' ? 'green' : (p.status === 'En cours' ? 'blue' : 'gray')}">${p.status || 'Planifié'}</span>
        <span class="badge badge-gray" style="margin-left:5px;">${p.client || 'Pas de client'}</span>
      </div>
      <p style="color:var(--text-2); font-size:13px; margin-bottom:6px;">👤 Responsable : <strong style="color:var(--text);">${p.assignee || 'Non assigné'}</strong></p>
      <p style="color:var(--text-2); font-size:13px; margin-bottom:6px;">📅 Date limite : <strong style="color:var(--text);">${p.date || 'Non définie'}</strong></p>
      <p style="color:var(--text-2); font-size:13px; margin-bottom:20px;">📊 Progression : <strong style="color:var(--text);">${p.progress}%</strong></p>
      <div style="background:var(--panel-2); padding:16px; border-radius:8px; margin-bottom:20px; min-height:80px;">
        ${Utils.escapeHtml(p.description || 'Aucune description fournie.')}
      </div>
      <div class="form-actions" style="justify-content: space-between;">
        <button class="btn-ghost" style="color:var(--red-soft); border-color:var(--red-soft);" onclick="Portfolio.deleteProject('${p.id}'); Modal.close();">🗑️ Supprimer</button>
        <div style="display:flex; gap:8px;">
          <button class="btn-ghost" onclick="Modal.close()">Fermer</button>
          ${p.status !== 'Terminé' ? `<button class="btn-primary" style="background:var(--green);" onclick="Portfolio.markAsCompleted('${p.id}'); Modal.close();">✅ Marquer comme terminé</button>` : ''}
        </div>
      </div>
    `, 'md');
  },

  renderView() {
    const wrap = Utils.$('#page-portfolio > .projects-grid') || Utils.$('#page-portfolio > .portfolio-wrapper');
    if (!wrap) return;
    wrap.innerHTML = ''; wrap.className = 'portfolio-wrapper';

    if (this.currentView === 'Cartes') {
      wrap.classList.add('projects-grid');
      if (Database.data.projects.length === 0) {
        wrap.innerHTML = `<p style="color:var(--text-3); text-align:center; padding:40px; grid-column: 1/-1;">Aucun projet pour le moment. Cliquez sur "Nouveau projet" !</p>`;
        return;
      }
      Database.data.projects.forEach(p => {
        const ini = p.assignee ? p.assignee.substring(0, 2).toUpperCase() : '??';
        const isFinished = p.status === 'Terminé';
        const card = Utils.createElement('div', { className: 'project-card', style: isFinished ? 'opacity:0.85;' : '' }, [
          `<div class="project-head">
            <div>
              <div class="project-client">${isFinished ? '✅ Terminé' : '📅 ' + (p.date || 'Pas de date')}</div>
              <div class="project-name">${Utils.escapeHtml(p.name)}</div>
            </div>
            <div class="health ${p.health}">${p.progress}%</div>
          </div>`,
          `<div style="font-size:12px;color:var(--text-3);margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${Utils.escapeHtml(p.description || 'Aucune description.')}</div>`,
          `<div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%; background:${isFinished ? 'var(--green)' : 'var(--blue)'}"></div></div>`,
          `<div class="project-footer">
            <div class="avatars-stack"><div class="avatar" style="background:var(--border-2);font-size:10px;">${ini}</div></div>
            <span class="badge badge-${isFinished ? 'green' : 'gray'}"><span class="dot-mini"></span>${p.status || 'Planifié'}</span>
          </div>
          <div style="display:flex; gap:6px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
            <button onclick="event.stopPropagation(); Portfolio.openDetail('${p.id}')" class="btn-ghost" style="flex:1; justify-content:center; font-size:11px; padding:6px;">👁️ Détails</button>
            ${!isFinished ? `<button onclick="event.stopPropagation(); Portfolio.markAsCompleted('${p.id}')" class="btn-ghost" style="flex:1; justify-content:center; font-size:11px; padding:6px; color:var(--green); border-color:var(--green);">✅ Terminer</button>` : ''}
            <button onclick="event.stopPropagation(); Portfolio.deleteProject('${p.id}')" class="btn-ghost" style="flex:1; justify-content:center; font-size:11px; padding:6px; color:var(--red-soft); border-color:var(--red-soft);">🗑️ Supprimer</button>
          </div>`
        ]);
        card.style.cursor = 'pointer';
        card.onclick = () => this.openDetail(p.id);
        wrap.appendChild(card);
      });
    }
    else if (this.currentView === 'Kanban') {
      wrap.classList.add('kanban');
      ['Planifié', 'En cours', 'Terminé'].forEach(colName => {
        const col = Utils.createElement('div', { className: 'kanban-col' }, [`<div class="kanban-col-head"><div class="kanban-col-title">${colName} <span class="kanban-count">0</span></div></div>`]);
        const projs = Database.data.projects.filter(p => (p.status || 'Planifié') === colName);
        projs.forEach(p => {
          const card = Utils.createElement('div', { className: 'kanban-card', draggable: true, 'data-id': p.id }, [
            `<div class="kanban-card-title">${Utils.escapeHtml(p.name)}</div>`,
            `<div class="kanban-card-meta"><span>📅 ${p.date || '??'}</span><div class="avatar" style="width:20px;height:20px;font-size:9px;">${p.assignee ? p.assignee.substring(0, 2).toUpperCase() : '??'}</div></div>`
          ]);
          card.onclick = () => this.openDetail(p.id);
          card.ondragstart = () => { this.draggedProject = card; card.classList.add('dragging'); };
          card.ondragend = () => { this.draggedProject = null; card.classList.remove('dragging'); Utils.$$('.kanban-col', wrap).forEach(c => c.classList.remove('drag-over')); };
          col.appendChild(card);
        });
        col.ondragover = (e) => { e.preventDefault(); col.classList.add('drag-over'); };
        col.ondragleave = () => col.classList.remove('drag-over');
        col.ondrop = (e) => {
          e.preventDefault(); col.classList.remove('drag-over');
          if (this.draggedProject) {
            const proj = Database.data.projects.find(x => x.id === this.draggedProject.getAttribute('data-id'));
            if (proj) { proj.status = colName; if (colName === 'Terminé') proj.progress = 100; Database.save(); this.renderView(); }
          }
        };
        col.querySelector('.kanban-count').textContent = projs.length;
        wrap.appendChild(col);
      });
    }
    else if (this.currentView === 'Tableau') {
      wrap.classList.add('panel');
      wrap.innerHTML = `<table class="data-table" style="border:none;">
        <thead><tr><th>Projet</th><th>Date</th><th>Statut</th><th>Progression</th><th>Actions</th></tr></thead>
        <tbody>${Database.data.projects.map(p => `
          <tr style="cursor:pointer;">
            <td onclick="Portfolio.openDetail('${p.id}')"><strong>${Utils.escapeHtml(p.name)}</strong></td>
            <td>${p.date || '-'}</td>
            <td><span class="badge badge-${p.status === 'Terminé' ? 'green' : (p.status === 'En cours' ? 'blue' : 'gray')}">${p.status || 'Planifié'}</span></td>
            <td>${p.progress}%</td>
            <td>
              ${p.status !== 'Terminé' ? `<button onclick="Portfolio.markAsCompleted('${p.id}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:16px;" title="Terminer">✅</button>` : ''}
              <button onclick="Portfolio.deleteProject('${p.id}')" style="background:none;border:none;color:var(--red-soft);cursor:pointer;font-size:16px;" title="Supprimer">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    }
    else if (this.currentView === 'Gantt') {
      wrap.classList.add('panel');
      wrap.innerHTML = `<div style="padding:20px;border-bottom:1px solid var(--border);background:var(--panel-2);font-size:11px;color:var(--text-3);font-weight:bold;">Timeline Projets</div>` +
        Database.data.projects.map(p => `
          <div style="display:flex;align-items:center;border-bottom:1px solid var(--border);padding:10px;cursor:pointer;" onclick="Portfolio.openDetail('${p.id}')">
            <div style="width:220px;font-size:13px;font-weight:500;">${Utils.escapeHtml(p.name)}</div>
            <div style="flex:1;position:relative;height:24px;background:var(--bg-2);border-radius:4px;">
              <div style="position:absolute;left:0;width:${p.progress}%;height:100%;background:${p.status === 'Terminé' ? 'var(--green)' : 'var(--blue)'};border-radius:4px;display:flex;align-items:center;padding:0 10px;font-size:10px;font-weight:600;">${p.progress}%</div>
            </div>
          </div>`).join('');
    }
  }
};

// ================================================================
//  5. KANBAN (Tâches associées à un projet ✅)
// ================================================================
const Kanban = {
  dragged: null, isDragging: false, currentFilters: null,
  
  init() { 
    this.renderAll(); 
    const addBtn = Utils.$('#page-tasks .page-actions .btn-primary'); 
    if (addBtn) addBtn.onclick = () => this.openCreateForm(); 
    const filterBtn = Utils.$('#page-tasks .page-actions .btn-ghost'); 
    if (filterBtn) filterBtn.onclick = () => this.openFilterMenu(); 
  },

  openCreateForm() {
    const projectOptions = Database.data.projects.length > 0 
      ? Database.data.projects.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('')
      : '<option value="">Aucun projet disponible</option>';

    Modal.open('Nouvelle tâche', `
      <form id="fk" class="modal-form">
        <div class="form-group"><label>Titre *</label><input type="text" name="title" required></div>
        <div class="form-group">
          <label>🎯 Projet associé</label>
          <select name="projectId">
            <option value="">— Aucun projet —</option>
            ${projectOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Statut</label><select name="status"><option>À faire</option><option>En cours</option><option>En révision</option><option>Terminé</option></select></div>
          <div class="form-group"><label>Date limite</label><input type="date" name="date"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Assigné à</label><select name="assignee"><option>Alex Martin</option><option>Sarah Kambo</option><option>Léa Mercier</option><option>Thomas Renard</option><option>Marc Dupuis</option></select></div>
          <div class="form-group"><label>Priorité</label><select name="priority"><option>Normale</option><option>Basse</option><option>Haute</option><option>Critique</option></select></div>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
        <div class="form-actions">
          <button type="button" class="btn-ghost" onclick="Modal.close()">Annuler</button>
          <button type="submit" class="btn-primary">Créer la tâche</button>
        </div>
      </form>
    `, 'lg');

    Utils.$('#fk').onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.id = Utils.uid();
      d.initials = d.assignee ? d.assignee.substring(0, 2).toUpperCase() : '??';
      if (d.projectId) {
        const proj = Database.data.projects.find(p => p.id === d.projectId);
        d.projectName = proj ? proj.name : '';
      }
      Database.data.tasks.push(d);
      Database.save();
      this.renderAll();
      EventBus.emit('data:updated');
      Modal.close();
      notify.success(d.projectName ? `Tâche ajoutée au projet "${d.projectName}" !` : "Tâche créée !");
    };
  },

  openEdit(id) {
    const task = Database.data.tasks.find(t => t.id === id);
    if (!task) return;
    const projectOptions = Database.data.projects.map(p => `<option value="${p.id}" ${task.projectId === p.id ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`).join('');
    
    Modal.open('Modifier la tâche', `
      <form id="fe" class="modal-form">
        <div class="form-group"><label>Titre *</label><input type="text" name="title" value="${Utils.escapeHtml(task.title)}" required></div>
        <div class="form-group">
          <label>🎯 Projet associé</label>
          <select name="projectId">
            <option value="">— Aucun projet —</option>
            ${projectOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Statut</label>
            <select name="status">
              <option ${task.status==='À faire'?'selected':''}>À faire</option>
              <option ${task.status==='En cours'?'selected':''}>En cours</option>
              <option ${task.status==='En révision'?'selected':''}>En révision</option>
              <option ${task.status==='Terminé'?'selected':''}>Terminé</option>
            </select>
          </div>
          <div class="form-group"><label>Date</label><input type="date" name="date" value="${task.date||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Assigné à</label>
            <select name="assignee">
              <option ${task.assignee==='Alex Martin'?'selected':''}>Alex Martin</option>
              <option ${task.assignee==='Sarah Kambo'?'selected':''}>Sarah Kambo</option>
              <option ${task.assignee==='Léa Mercier'?'selected':''}>Léa Mercier</option>
              <option ${task.assignee==='Thomas Renard'?'selected':''}>Thomas Renard</option>
              <option ${task.assignee==='Marc Dupuis'?'selected':''}>Marc Dupuis</option>
            </select>
          </div>
          <div class="form-group"><label>Priorité</label>
            <select name="priority">
              <option ${task.priority==='Basse'?'selected':''}>Basse</option>
              <option ${task.priority==='Normale'?'selected':''}>Normale</option>
              <option ${task.priority==='Haute'?'selected':''}>Haute</option>
              <option ${task.priority==='Critique'?'selected':''}>Critique</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="3">${Utils.escapeHtml(task.description||'')}</textarea></div>
        <div class="form-actions">
          <button type="button" class="btn-ghost" style="color:var(--red);border-color:var(--red);margin-right:auto;" onclick="Kanban.deleteTask('${task.id}')">Supprimer</button>
          <button type="submit" class="btn-primary">Enregistrer</button>
        </div>
      </form>
    `, 'lg');
    
    Utils.$('#fe').onsubmit = (e) => { 
      e.preventDefault(); 
      Object.assign(task, Object.fromEntries(new FormData(e.target))); 
      task.initials = task.assignee ? task.assignee.substring(0, 2).toUpperCase() : '??';
      if (task.projectId) {
        const proj = Database.data.projects.find(p => p.id === task.projectId);
        task.projectName = proj ? proj.name : '';
      } else { task.projectName = ''; }
      Database.save(); this.renderAll(); EventBus.emit('data:updated'); Modal.close(); notify.success("Tâche modifiée"); 
    };
  },

  deleteTask(id) { 
    if (confirm("⚠️ Êtes-vous sûr de vouloir supprimer cette tâche ?")) { 
      Database.data.tasks = Database.data.tasks.filter(t => t.id !== id); 
      Database.save(); this.renderAll(); EventBus.emit('data:updated'); Modal.close(); notify.info("Tâche supprimée"); 
    } 
  },

  openFilterMenu() { 
    Modal.open('Filtrer les tâches', `<form id="ff" class="modal-form"><div class="form-group"><label>Assigné à</label><select name="assignee"><option value="">Tous</option><option>Alex Martin</option><option>Sarah Kambo</option><option>Léa Mercier</option><option>Thomas Renard</option><option>Marc Dupuis</option></select></div><div class="form-actions"><button type="button" class="btn-ghost" onclick="Kanban.applyFilter(null); Modal.close();">Réinitialiser</button><button type="submit" class="btn-primary">Appliquer</button></div></form>`, 'sm'); 
    Utils.$('#ff').onsubmit = (e) => { e.preventDefault(); this.applyFilter({ assignee: new FormData(e.target).get('assignee') }); Modal.close(); }; 
  },
  applyFilter(f) { this.currentFilters = f; this.renderAll(); if (f && f.assignee) notify.info("Filtre : " + f.assignee); else notify.info("Filtres réinitialisés"); },

  renderAll() {
    Utils.$$('.kanban-col').forEach(col => Utils.$$('.kanban-card', col).forEach(c => c.remove()));
    let tasks = Database.data.tasks;
    if (this.currentFilters && this.currentFilters.assignee) tasks = tasks.filter(t => t.assignee === this.currentFilters.assignee);

    tasks.forEach(task => {
      const col = Utils.$$('.kanban-col').find(c => c.querySelector('.kanban-col-title').textContent.replace(/[⚪🔵🟡🟢\d]/g, '').trim() === task.status);
      if (col) {
        const projectBadge = task.projectName 
          ? `<span class="badge badge-purple" style="font-size:9px;">📁 ${Utils.escapeHtml(task.projectName)}</span>` 
          : '';
        const c = Utils.createElement('div', { className: 'kanban-card', 'data-id': task.id, draggable: true }, [
          `<div class="kanban-tags">
            <span class="badge badge-${task.priority === 'Critique' ? 'red' : (task.priority === 'Haute' ? 'orange' : 'blue')}">${task.priority || 'Normale'}</span>
            ${projectBadge}
          </div>`,
          `<div class="kanban-card-title">${Utils.escapeHtml(task.title)}</div>`,
          `<div class="kanban-card-meta">
            <span>📅 ${task.date || '??'}</span>
            <div class="avatar" style="width:20px;height:20px;font-size:9px;">${task.initials}</div>
          </div>`
        ]);
        c.ondragstart = (e) => { this.dragged = c; c.classList.add('dragging'); this.isDragging = true; e.dataTransfer.setData('text/plain', ''); };
        c.ondragend = () => { c.classList.remove('dragging'); this.dragged = null; Utils.$$('.kanban-col').forEach(x => x.classList.remove('drag-over')); setTimeout(() => this.isDragging = false, 50); };
        c.onclick = () => { if (!this.isDragging) this.openEdit(task.id); };
        col.appendChild(c);
      }
    });

    Utils.$$('.kanban-col').forEach(col => {
      col.ondragover = (e) => { e.preventDefault(); col.classList.add('drag-over'); };
      col.ondragleave = () => col.classList.remove('drag-over');
      col.ondrop = (e) => {
        e.preventDefault(); col.classList.remove('drag-over');
        if (this.dragged) {
          col.appendChild(this.dragged);
          const t = Database.data.tasks.find(x => x.id === this.dragged.getAttribute('data-id'));
          if (t) { t.status = col.querySelector('.kanban-col-title').textContent.replace(/[⚪🔵🟡🟢\d]/g, '').trim(); Database.save(); }
          this.updateCounters();
        }
      };
      col.querySelector('.kanban-count').textContent = col.querySelectorAll('.kanban-card').length;
    });
  },
  updateCounters() { Utils.$$('.kanban-col').forEach(col => { const badge = col.querySelector('.kanban-count'); if (badge) badge.textContent = col.querySelectorAll('.kanban-card').length; }); }
};

// ================================================================
//  6. RISQUES
// ================================================================
const Risks = {
  init() { this.renderAll(); const btn = Utils.$('#page-risks .page-actions .btn-primary'); if(btn) btn.onclick = () => this.openCreate(); 
    const exportBtn = Utils.$('#page-risks .page-actions .btn-ghost');
    if (exportBtn) exportBtn.onclick = async () => { if (typeof html2canvas !== 'undefined') { notify.info("Export..."); try { const canvas = await html2canvas(Utils.$('#page-risks')); const link = document.createElement('a'); link.download = `Risques.png`; link.href = canvas.toDataURL(); link.click(); notify.success("Export réussi !"); } catch (e) { notify.error("Erreur"); } } };
  },
  getBadgeColor(type, v) { if(type==='impact') return (v==='Critique'||v==='Élevé')?'red':(v==='Moyen'?'orange':'green'); if(type==='prob') return (v==='95%'||v==='75%')?'orange':(v==='50%'?'blue':'green'); if(type==='crit') return v==='Critique'?'red':(v==='Haute'?'orange':(v==='Moyenne'?'blue':'green')); return v==='Ouvert'?'red':(v==='En cours'?'orange':(v==='Surveillé'?'blue':'green')); },
  renderAll() {
    const tbody = Utils.$('#page-risks .data-table tbody'); if (!tbody) return; tbody.innerHTML = '';
    Database.data.risks.forEach(r => {
      tbody.appendChild(Utils.createElement('tr', { style: 'cursor:pointer;', onClick: () => this.openEdit(r.id) }, [
        `<td><div style="font-weight:600;">${Utils.escapeHtml(r.title)}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px;">${Utils.escapeHtml(r.project)}</div></td>`,
        `<td><span class="badge badge-${this.getBadgeColor('impact', r.impact)}">${r.impact}</span></td>`,
        `<td><span class="badge badge-${this.getBadgeColor('prob', r.probability)}">${r.probability}</span></td>`,
        `<td><span class="badge badge-${this.getBadgeColor('crit', r.criticality)}">${r.criticality}</span></td>`,
        `<td><div class="avatar" style="width:26px;height:26px;font-size:10px;background:var(--border-2);">${r.initials}</div></td>`,
        `<td><span class="badge badge-${this.getBadgeColor('status', r.status)}"><span class="dot-mini"></span>${r.status}</span></td>`
      ]));
    });
  },
  openCreate() { Modal.open('Déclarer un risque', `<form id="fr" class="modal-form"><div class="form-group"><label>Titre *</label><input name="title" required></div><div class="form-group"><label>Projet</label><input name="project"></div><div class="form-row"><div class="form-group"><label>Impact</label><select name="impact"><option>Moyen</option><option>Élevé</option><option>Critique</option></select></div><div class="form-group"><label>Probabilité</label><select name="probability"><option>50%</option><option>75%</option><option>95%</option></select></div></div><div class="form-row"><div class="form-group"><label>Criticité</label><select name="criticality"><option>Moyenne</option><option>Haute</option><option>Critique</option></select></div><div class="form-group"><label>Statut</label><select name="status"><option>Ouvert</option><option>En cours</option><option>Surveillé</option></select></div></div><div class="form-actions"><button type="submit" class="btn-primary">Déclarer</button></div></form>`, 'lg'); Utils.$('#fr').onsubmit=(e)=>{e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); d.id=Utils.uid(); d.initials="AM"; Database.data.risks.push(d); Database.save(); this.renderAll(); Modal.close(); notify.success("Risque déclaré"); }; },
  openEdit(id) { const r = Database.data.risks.find(x => x.id === id); if(!r) return; Modal.open('Modifier le risque', `<form id="fre" class="modal-form"><div class="form-group"><label>Titre *</label><input name="title" value="${Utils.escapeHtml(r.title)}" required></div><div class="form-row"><div class="form-group"><label>Impact</label><select name="impact"><option ${r.impact==='Moyen'?'selected':''}>Moyen</option><option ${r.impact==='Élevé'?'selected':''}>Élevé</option><option ${r.impact==='Critique'?'selected':''}>Critique</option></select></div><div class="form-group"><label>Criticité</label><select name="criticality"><option ${r.criticality==='Moyenne'?'selected':''}>Moyenne</option><option ${r.criticality==='Haute'?'selected':''}>Haute</option><option ${r.criticality==='Critique'?'selected':''}>Critique</option></select></div></div><div class="form-group"><label>Statut</label><select name="status"><option ${r.status==='Ouvert'?'selected':''}>Ouvert</option><option ${r.status==='En cours'?'selected':''}>En cours</option><option ${r.status==='Surveillé'?'selected':''}>Surveillé</option><option ${r.status==='Mitigé'?'selected':''}>Mitigé</option></select></div><div class="form-actions"><button type="button" class="btn-ghost" style="color:var(--red);margin-right:auto;" onclick="if(confirm('Supprimer ?')){Database.data.risks=Database.data.risks.filter(x=>x.id!=='${r.id}');Database.save();Risks.renderAll();Modal.close();}">Supprimer</button><button type="submit" class="btn-primary">Enregistrer</button></div></form>`, 'md'); Utils.$('#fre').onsubmit=(e)=>{e.preventDefault(); Object.assign(r, Object.fromEntries(new FormData(e.target))); Database.save(); this.renderAll(); Modal.close(); notify.success("Mis à jour"); }; }
};

// ================================================================
//  7. CALENDRIER
// ================================================================
const Calendar = {
  currentView: 'Mois',
  init() {
    this.renderView();
    const addBtn = Utils.$('#page-calendar .page-actions .btn-primary'); if(addBtn) addBtn.onclick = () => this.openCreateForm();
    const toggles = Utils.$$('#page-calendar .view-toggle button'); toggles.forEach(btn => btn.onclick = () => { toggles.forEach(b => b.classList.remove('active')); btn.classList.add('active'); this.currentView = btn.textContent.trim(); this.renderView(); });
    EventBus.on('data:updated', () => { if(PitlaneOS.state.currentPage === 'calendar') this.renderView(); });
  },
  openCreateForm() { Modal.open('Nouvel événement', `<form id="fev" class="modal-form"><div class="form-group"><label>Titre *</label><input name="title" required></div><div class="form-row"><div class="form-group"><label>Date</label><input type="date" name="date" required value="2026-06-09"></div><div class="form-group"><label>Couleur</label><select name="color"><option value="blue">Bleu</option><option value="green">Vert</option><option value="orange">Orange</option><option value="red">Rouge</option></select></div></div><div class="form-actions"><button type="submit" class="btn-primary">Ajouter</button></div></form>`); Utils.$('#fev').onsubmit = (e) => { e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); d.id=Utils.uid(); Database.data.events.push(d); Database.save(); this.renderView(); Modal.close(); notify.success("Événement ajouté"); }; },
  renderView() {
    const grid = Utils.$('.calendar-grid'); if(!grid) return; grid.innerHTML = '';
    if (this.currentView === 'Mois') {
      grid.style.display = 'grid'; grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
      ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach(d => grid.insertAdjacentHTML('beforeend', `<div class="cal-head">${d}</div>`));
      const items = [...Database.data.tasks.filter(t=>t.date).map(t=>({id:t.id, title:`[Tâche] ${t.title}`, date:t.date, color:'blue', type:'task'})), ...Database.data.events.map(e=>({id:e.id, title:e.title, date:e.date, color:e.color||'blue', type:'event'}))];
      for(let i=1; i<=30; i++) {
        const dateStr = `2026-06-${i.toString().padStart(2, '0')}`;
        const dayHtml = items.filter(x => x.date === dateStr).map(x => `<div class="cal-event ${x.color}" onclick="if('${x.type}'==='task') Kanban.openEdit('${x.id}'); else { if(confirm('Supprimer ?')){Database.data.events=Database.data.events.filter(e=>e.id!=='${x.id}'); Database.save(); Calendar.renderView(); } }">${Utils.escapeHtml(x.title)}</div>`).join('');
        grid.insertAdjacentHTML('beforeend', `<div class="cal-cell ${dateStr==='2026-06-09'?'today':''}"><div class="cal-day">${i}</div>${dayHtml}</div>`);
      }
    } else grid.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-3);display:block;width:100%;">Vue ${this.currentView}. Revenez sur "Mois" pour voir le calendrier complet.</div>`;
  }
};

// ================================================================
//  8. CHAT
// ================================================================
// ================================================================
//  8. CHAT — avec renommage des salons
// ================================================================
const Chat = {
  init() {
    this.ensureChannelStorage();
    this.applySavedChannelNames();
    this.renderMessages();

    Utils.$$('.chat-item').forEach(item => {
      item.addEventListener('click', () => this.switchChannel(item));
    });

    const input = Utils.$('.chat-input-box input');
    const btn = Utils.$('.chat-input-box svg:last-child');

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendMsg(input.value);
      });
    }

    if (btn) {
      btn.addEventListener('click', () => this.sendMsg(input.value));
    }

    // Initialise le header du salon actif au chargement
    const active = Utils.$('.chat-item.active');
    if (active) this.switchChannel(active);
  },

  // Stockage des noms personnalisés des salons
  ensureChannelStorage() {
    if (!Database.data.channels) {
      Database.data.channels = {};
      Database.save();
    }
  },

  getItemKey(item) {
    return item.dataset.channelKey || item.textContent.trim().replace('#', '').trim();
  },

  getItemDisplayName(item) {
    const key = this.getItemKey(item);
    return Database.data.channels?.[key] || key;
  },

  applySavedChannelNames() {
    Utils.$$('.chat-item').forEach(item => {
      const isDM = item.querySelector('.status') !== null;
      if (isDM) return;

      const originalName = item.textContent.trim().replace('#', '').trim();
      if (!item.dataset.channelKey) item.dataset.channelKey = originalName;

      const savedName = Database.data.channels?.[originalName];
      if (savedName) {
        item.innerHTML = `<span class="hash">#</span>${Utils.escapeHtml(savedName)}`;
      }
    });
  },

  switchChannel(el) {
    if (!el) return;

    Utils.$$('.chat-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');

    const isDM = el.querySelector('.status') !== null;

    if (!isDM && !el.dataset.channelKey) {
      el.dataset.channelKey = el.textContent.trim().replace('#', '').trim();
    }

    const channelKey = this.getItemKey(el);
    const displayName = isDM
      ? el.textContent.trim()
      : this.getItemDisplayName(el);

    PitlaneOS.state.chatType = isDM ? 'dm' : 'channel';
    PitlaneOS.state.currentChatChannel = displayName;

    // Retirer badge non lu
    const unread = el.querySelector('.chat-unread');
    if (unread) unread.remove();

    this.updateHeader(displayName, isDM, el);
    this.renderMessages();
  },

  updateHeader(name, isDM, sidebarItem) {
    const headTitle = Utils.$('.chat-channel-name');
    const headDesc = Utils.$('.chat-channel-desc');
    const input = Utils.$('.chat-input-box input');

    if (headTitle) {
      if (isDM) {
        headTitle.innerHTML = `<span>💬 ${Utils.escapeHtml(name)}</span>`;
      } else {
        headTitle.innerHTML = `
          <span># ${Utils.escapeHtml(name)}</span>
          <button class="btn-ghost" id="renameChannelBtn" style="padding:4px 8px;font-size:11px;margin-left:8px;">
            ✏️ Renommer
          </button>
        `;

        const renameBtn = Utils.$('#renameChannelBtn');
        if (renameBtn) {
          renameBtn.onclick = () => this.openRenameModal(sidebarItem);
        }
      }
    }

    if (headDesc) {
      headDesc.textContent = isDM
        ? 'Conversation privée'
        : 'Canal de communication d’équipe';
    }

    if (input) {
      input.placeholder = isDM
        ? `Message à ${name}`
        : `Message #${name}`;
    }
  },

  openRenameModal(sidebarItem) {
    if (!sidebarItem) return;

    const key = this.getItemKey(sidebarItem);
    const currentName = this.getItemDisplayName(sidebarItem);

    Modal.open('Renommer le salon', `
      <form id="renameChannelForm" class="modal-form">
        <div class="form-group">
          <label>Nouveau nom du salon</label>
          <input type="text" name="name" value="${Utils.escapeHtml(currentName)}" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-ghost" onclick="Modal.close()">Annuler</button>
          <button type="submit" class="btn-primary">Enregistrer</button>
        </div>
      </form>
    `, 'sm');

    Utils.$('#renameChannelForm').onsubmit = (e) => {
      e.preventDefault();

      const newName = new FormData(e.target).get('name').trim();
      if (!newName) return;

      // Ancien nom affiché utilisé dans les messages
      const oldDisplayName = this.getItemDisplayName(sidebarItem);

      // Sauvegarde du nouveau nom
      Database.data.channels[key] = newName;

      // Renommer aussi les messages existants liés à ce salon
      Database.data.messages.forEach(msg => {
        if (msg.type === 'channel' && msg.channel === oldDisplayName) {
          msg.channel = newName;
        }
      });

      Database.save();

      // Mettre à jour la sidebar
      sidebarItem.innerHTML = `<span class="hash">#</span>${Utils.escapeHtml(newName)}`;
      sidebarItem.dataset.channelKey = key;

      // Mettre à jour l’état courant
      PitlaneOS.state.currentChatChannel = newName;
      PitlaneOS.state.chatType = 'channel';

      Modal.close();
      this.updateHeader(newName, false, sidebarItem);
      this.renderMessages();

      notify.success(`Salon renommé en #${newName}`);
    };
  },

  sendMsg(text) {
    if (!text || !text.trim()) return;

    Database.data.messages.push({
      id: Utils.uid(),
      channel: PitlaneOS.state.currentChatChannel,
      type: PitlaneOS.state.chatType,
      author: PitlaneOS.config.user.name,
      initials: PitlaneOS.config.user.initials,
      color: PitlaneOS.config.user.color,
      text: text.trim(),
      time: Utils.formatTime()
    });

    Database.save();

    const input = Utils.$('.chat-input-box input');
    if (input) input.value = '';

    this.renderMessages();
  },

  renderMessages() {
    const container = Utils.$('.chat-messages');
    if (!container) return;

    container.innerHTML = '';

    const msgs = Database.data.messages.filter(m =>
      m.channel === PitlaneOS.state.currentChatChannel &&
      m.type === PitlaneOS.state.chatType
    );

    if (msgs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;color:var(--text-3);margin-top:40px;">
          Aucun message pour le moment.
        </div>
      `;
      return;
    }

    msgs.forEach(msg => {
      const isMe = msg.author === PitlaneOS.config.user.name;

      container.insertAdjacentHTML('beforeend', `
        <div class="msg" style="flex-direction:${isMe ? 'row-reverse' : 'row'};">
          <div class="avatar" style="background:${msg.color}">${msg.initials}</div>
          <div class="msg-content" style="align-items:${isMe ? 'flex-end' : 'flex-start'};display:flex;flex-direction:column;">
            <div class="msg-head">
              <span class="msg-author">${Utils.escapeHtml(msg.author)}</span>
              <span class="msg-time" style="margin:0 5px;">${msg.time}</span>
            </div>
            <div class="msg-text" style="background:${isMe ? 'var(--bg-2)' : 'var(--panel-2)'};padding:10px 14px;border-radius:10px;">
              ${Utils.escapeHtml(msg.text)}
            </div>
          </div>
        </div>
      `);
    });

    container.scrollTop = container.scrollHeight;
  }
};

// ================================================================
//  9. DOCUMENTS
// ================================================================
const Documents = {
  init() {
    this.renderTree(); this.renderTable();
    const importBtn = Utils.$('#page-documents .page-actions .btn-ghost'); if(importBtn) importBtn.onclick = () => this.openImport();
    const btn = Utils.$('#page-documents .page-actions .btn-primary'); if(btn) btn.onclick = () => this.openImport();
  },
  renderTree() {
    const tc = Utils.$('.file-tree'); if(!tc) return;
    let html = `<div style="font-size:11px;color:var(--text-3);margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;padding:0 10px;">Bibliothèque</div><div class="tree-item folder" onclick="Documents.renderTable()" style="margin-bottom:8px;">📁 Tous les documents</div>`;
    Database.data.folders.filter(f => !f.parentId).forEach(f => {
      html += `<div class="tree-item folder" onclick="Documents.renderTable('${f.id}')">📂 ${Utils.escapeHtml(f.name)}</div>`;
    });
    tc.innerHTML = html;
  },
  renderTable(folderId = null) {
    const tbody = Utils.$('#page-documents .data-table tbody'); if(!tbody) return; tbody.innerHTML = '';
    let docs = Database.data.documents; if(folderId) docs = docs.filter(d => d.folderId === folderId);
    if (docs.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:20px;">Dossier vide</td></tr>'; return; }
    docs.forEach(d => {
      tbody.appendChild(Utils.createElement('tr', { onClick: (e) => { if(!e.target.closest('button')) this.openPreview(d.id); } }, [
        `<td><div style="display:flex;align-items:center;gap:10px;"><span style="width:32px;height:32px;background:${d.bg};border-radius:6px;display:flex;align-items:center;justify-content:center;color:${d.color};font-weight:700;font-size:11px;">${d.type}</span><div><div style="font-weight:600;">${Utils.escapeHtml(d.name)}</div><div style="font-size:11px;color:var(--text-3);">${d.size}</div></div></div></td>`,
        `<td>${d.author}</td><td><span class="badge badge-gray">${d.version}</span></td><td><span class="badge badge-green">${d.status}</span></td><td>${d.date}</td>`,
        `<td><button class="icon-btn" onclick="Documents.download('${d.name}')" style="background:none;border:none;color:var(--text-3);cursor:pointer;">⬇️</button></td>`
      ]));
    });
  },
  openPreview(id) {
    const d = Database.data.documents.find(x => x.id === id); if(!d) return;
    Modal.open('Aperçu', `<div style="display:flex; gap:20px;"><div style="width:120px; height:160px; background:${d.bg}; color:${d.color}; display:flex; align-items:center; justify-content:center; font-size:24px; border-radius:12px; font-weight:bold;">${d.type}</div><div><h2>${Utils.escapeHtml(d.name)}</h2><p style="color:var(--text-2);font-size:13px;">Auteur: <strong>${d.author}</strong></p><p style="color:var(--text-2);font-size:13px;">Taille: ${d.size}</p></div></div><div class="form-actions" style="margin-top:24px;"><button class="btn-ghost" style="color:var(--red-soft); border-color:var(--red-soft); margin-right:auto;" onclick="if(confirm('⚠️ Êtes-vous sûr ?')){Database.data.documents=Database.data.documents.filter(x=>x.id!=='${d.id}');Database.save();Documents.renderTable();Modal.close();notify.info('Supprimé');}">🗑️ Supprimer</button><button class="btn-primary" onclick="Documents.download('${d.name}')">⬇️ Télécharger</button></div>`, 'md');
  },
  download(name) { notify.info(`Préparation...`); setTimeout(() => { const a=document.createElement('a'); a.href="data:text/plain;charset=utf-8,Document_simule_PitlaneOS"; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); notify.success(`${name} téléchargé !`); }, 600); },
  openImport() {
    let opts = Database.data.folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    Modal.open('Importer un document', `<form id="fi" class="modal-form"><div class="form-group"><label>Fichier *</label><input type="file" required></div><div class="form-group"><label>Dossier</label><select name="folderId">${opts}<option value="NEW">+ Créer un nouveau dossier</option></select></div><div class="form-group" id="newFolderGroup" style="display:none;"><label>Nom du nouveau dossier</label><input type="text" name="newFolderName"></div><div class="form-actions"><button type="submit" class="btn-primary">Importer</button></div></form>`);
    Utils.$('select[name="folderId"]').onchange = (e) => Utils.$('#newFolderGroup').style.display = e.target.value === 'NEW' ? 'flex' : 'none';
    Utils.$('#fi').onsubmit = (e) => { 
      e.preventDefault(); 
      const fd = new FormData(e.target);
      const file = e.target.querySelector('input[type="file"]').files[0]; 
      if(!file) return; 
      let folderId = fd.get('folderId');
      if(folderId === 'NEW') {
        const newName = fd.get('newFolderName');
        if(newName.trim()) { folderId = Utils.uid(); Database.data.folders.push({ id: folderId, name: newName, parentId: null }); }
      }
      const ext = file.name.split('.').pop().toUpperCase();
      let color = 'var(--blue)', bg = 'rgba(59,130,246,0.15)';
      if(ext === 'PDF') { color = 'var(--red-soft)'; bg = 'rgba(225,6,0,0.15)'; }
      else if(['XLS','XLSX'].includes(ext)) { color = 'var(--green)'; bg = 'rgba(34,197,94,0.15)'; }
      Database.data.documents.push({ id: Utils.uid(), name: file.name, folderId: folderId, author: PitlaneOS.config.user.name, initials: "AM", type: ext.substring(0,4), size: (file.size/1024).toFixed(0) + ' KB', version: "v1.0", status: "Nouveau", date: "À l'instant", color: color, bg: bg }); 
      Database.save(); this.renderTree(); this.renderTable(folderId); Modal.close(); notify.success("Importé !"); 
    };
  }
};

// ================================================================
//  10. WIKI
// ================================================================
const Wiki = {
  currentFilter: null,
  init() { this.renderArticles(); this.setupCategoryClicks(); const btn = Utils.$('#page-wiki .page-actions .btn-primary'); if (btn) btn.onclick = () => this.openCreateForm(); },
  setupCategoryClicks() {
    const panels = Utils.$$('#page-wiki .kpi-grid .panel'); const cats = ['Procédure', 'FAQ', 'Compte-rendu', 'REX'];
    panels.forEach((p, i) => { p.style.cursor='pointer'; p.onclick = () => { const cat = cats[i]; if(this.currentFilter===cat){ this.currentFilter=null; panels.forEach(x=>x.style.borderColor='var(--border)'); }else{ this.currentFilter=cat; panels.forEach(x=>x.style.borderColor='var(--border)'); p.style.borderColor='var(--red)'; } this.renderArticles(); }; });
  },
  renderArticles() {
    const lc = Utils.$('#page-wiki .dash-grid .panel:first-child > div:last-child'); if (!lc) return; lc.innerHTML = '';
    let arts = [...Database.data.wiki].reverse(); if (this.currentFilter) arts = arts.filter(a => a.category === this.currentFilter);
    if(arts.length === 0) { lc.innerHTML = `<p style="color:var(--text-3);text-align:center;padding:20px;">Aucun document.</p>`; }
    arts.forEach(a => { lc.appendChild(Utils.createElement('div', { style: 'padding:14px;background:var(--panel-2);border-radius:8px;cursor:pointer;margin-bottom:10px;', onClick: () => this.openArticle(a.id) }, [`<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><strong style="font-size:14px;">${Utils.escapeHtml(a.title)}</strong><span class="badge" style="background:${a.color};color:#fff;">${a.category}</span></div><div style="font-size:12px;color:var(--text-3);">Publié par ${a.author} · ${a.date}</div>`])); });
  },
  openArticle(id) {
    const a = Database.data.wiki.find(x => x.id === id); if(!a) return;
    a.views += 1; Database.save();
    Modal.open(a.title, `<div style="margin-bottom:16px;"><span class="badge" style="background:${a.color};color:#fff;">${a.category}</span></div><div style="background:var(--bg); padding:20px; border-radius:8px; white-space:pre-wrap;min-height:200px;">${Utils.escapeHtml(a.content)}</div><div class="form-actions" style="margin-top:20px;justify-content:space-between;"><button class="btn-ghost" style="color:var(--red-soft);border-color:var(--red-soft);" onclick="if(confirm('Supprimer ?')){Database.data.wiki=Database.data.wiki.filter(x=>x.id!=='${a.id}');Database.save();Wiki.renderArticles();Modal.close();}">Supprimer</button><button class="btn-ghost" onclick="Modal.close()">Fermer</button></div>`, 'lg');
  },
  openCreateForm() {
    Modal.open('Rédiger une page', `<form id="fw" class="modal-form"><div class="form-group"><label>Titre *</label><input name="title" required></div><div class="form-group"><label>Catégorie</label><select name="category"><option value="Formation|var(--blue)">Formation</option><option value="Procédure|var(--purple)">Procédure</option><option value="FAQ|var(--green)">FAQ</option><option value="REX|var(--orange)">REX</option><option value="Compte-rendu|var(--green)">Compte-rendu</option></select></div><div class="form-group"><label>Contenu *</label><textarea name="content" required rows="8"></textarea></div><div class="form-actions"><button type="submit" class="btn-primary">Publier</button></div></form>`, 'lg');
    Utils.$('#fw').onsubmit = (e) => { e.preventDefault(); const fd=new FormData(e.target); const cat = fd.get('category').split('|'); Database.data.wiki.push({ id: Utils.uid(), title: fd.get('title'), category: cat[0], color: cat[1], content: fd.get('content'), author: PitlaneOS.config.user.name, date: "À l'instant", views: 0 }); Database.save(); this.renderArticles(); Modal.close(); notify.success("Publié !", "Pitlane OS - Wiki"); };
  }
};

// ================================================================
//  11. NOTIFICATIONS
// ================================================================
const Notifications = {
  init() {
    this.render();
    const btn = Utils.$('#page-notifications .page-actions .btn-ghost'); if(btn) btn.onclick = () => this.markAllAsRead();
    const bellBtn = Utils.$$('.topbar .icon-btn').find(b => b.innerHTML.includes('path d="M15 17h5l')); if(bellBtn) bellBtn.onclick = () => window.showPage('notifications');
  },
  render() {
    const c = Utils.$('#page-notifications .panel'); if (!c) return; c.innerHTML = '';
    const notifs = Database.data.notifications; const unread = notifs.filter(n => !n.read).length;
    this.updateBadges(unread);
    if(notifs.length === 0) { c.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-3);">Aucune notification</p>'; return; }
    notifs.forEach(n => { c.appendChild(Utils.createElement('div', { className: `notif-item ${n.read ? '' : 'unread'}`, onClick: () => { n.read=true; Database.save(); this.render(); if (n.target) window.showPage(n.target); } }, [`<div class="notif-icon" style="background:${n.bg}; color:${n.color}; font-size:18px;">${n.icon}</div>`, `<div style="flex:1;"><div style="font-weight:600;font-size:13px;">${Utils.escapeHtml(n.title)}</div><div style="font-size:12px;color:var(--text-2);margin-top:2px;">${Utils.escapeHtml(n.desc)}</div><div style="font-size:11px;color:var(--text-3);margin-top:4px;">${n.time}</div></div>` ])); });
  },
  markAllAsRead() { Database.data.notifications.forEach(n => n.read = true); Database.save(); this.render(); notify.success("Toutes notifications lues."); },
  updateBadges(c) {
    const n = Utils.$$('.nav-item').find(i => i.textContent.includes('Notifications'))?.querySelector('.nav-badge'); if(n) { n.textContent = c; n.style.display = c > 0 ? 'inline-block' : 'none'; }
    const bellBtn = Utils.$$('.topbar .icon-btn').find(b => b.innerHTML.includes('path d="M15 17h5l')); if(bellBtn) { let dot = bellBtn.querySelector('.dot'); if (c > 0) { if (!dot) { dot = Utils.createElement('span', { className: 'dot' }); bellBtn.appendChild(dot); } dot.style.display = 'block'; } else if (dot) dot.style.display = 'none'; }
  }
};

// ================================================================
//  12. PARAMÈTRES (RBAC)
// ================================================================
const Settings = {
  currentTab: 'Général',
  tabsDef: [ { name: 'Général', r: false }, { name: 'Utilisateurs', r: false }, { name: 'Permissions', r: true }, { name: 'Intégrations', r: false }, { name: 'Facturation', r: true }, { name: 'Sécurité', r: true } ],
  init() {
    this.renderTabs(); this.renderContent();
    const header = Utils.$('#page-admin .page-header');
    if(header && !header.querySelector('.btn-ghost')) {
      header.appendChild(Utils.createElement('button', { className: 'btn-ghost', innerHTML: '👁️ Simuler le mode Utilisateur', style: 'margin-left:auto; font-size:12px; border-color:var(--blue); color:var(--blue);', onClick: (e) => {
          const u = PitlaneOS.config.user;
          if (u.role === 'Super Admin') { u.role = 'Membre'; e.target.innerHTML = '👑 Repasser en Super Admin'; e.target.style.color = 'var(--red-soft)'; e.target.style.borderColor = 'var(--red)'; notify.warning("Mode Membre activé."); } 
          else { u.role = 'Super Admin'; e.target.innerHTML = '👁️ Simuler le mode Utilisateur'; e.target.style.color = 'var(--blue)'; e.target.style.borderColor = 'var(--blue)'; notify.success("Mode Admin restauré."); }
          this.renderTabs(); this.renderContent();
      }}));
    }
  },
  renderTabs() {
    const tc = Utils.$('#page-admin .tabs'); if (!tc) return; tc.innerHTML = '';
    this.tabsDef.forEach(t => {
      const lock = t.r && PitlaneOS.config.user.role !== 'Super Admin';
      tc.appendChild(Utils.createElement('div', { className: `tab ${this.currentTab === t.name ? 'active' : ''}`, innerHTML: `${t.name} ${lock ? '🔒' : ''}`, onClick: () => { this.currentTab = t.name; this.renderTabs(); this.renderContent(); } }));
    });
  },
  renderContent() {
    const panel = Utils.$('#page-admin .panel'); if (!panel) return;
    const s = Database.data.settings; 
    const canEdit = !this.tabsDef.find(t => t.name === this.currentTab).r || PitlaneOS.config.user.role === 'Super Admin';
    let html = `<div class="panel-header"><div class="panel-title">${this.currentTab}</div></div>`;
    if (!canEdit) html += `<div style="background:rgba(245,158,11,0.1); border:1px solid var(--orange); color:var(--orange); padding:12px; border-radius:8px; margin-bottom:20px;">🔒 <strong>Accès restreint :</strong> Vous n'avez pas les droits d'administration.</div>`;
    html += `<form id="fs" class="modal-form">`;
    
    if (this.currentTab === 'Général') {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="form-group"><label>Nom de l'organisation</label><input type="text" name="orgName" value="${s.orgName}" ${!canEdit?'disabled':''}></div>
        <div class="form-group"><label>Domaine</label><input type="text" name="domain" value="${s.domain}" ${!canEdit?'disabled':''}></div>
        <div class="form-group"><label>Fuseau horaire</label><input type="text" name="timezone" value="${s.timezone}" ${!canEdit?'disabled':''}></div>
        <div class="form-group"><label>Langue</label><input type="text" name="lang" value="${s.lang}" ${!canEdit?'disabled':''}></div>
      </div>`;
    } 
    else if (this.currentTab === 'Utilisateurs') {
      html += `<table class="data-table"><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th></tr></thead><tbody><tr><td><strong>Alex Martin (Vous)</strong></td><td><span class="badge badge-purple">Super Admin</span></td><td><span class="badge badge-green">Actif</span></td></tr><tr><td>Sarah Kambo</td><td><span class="badge badge-blue">Manager</span></td><td><span class="badge badge-green">Actif</span></td></tr><tr><td>Thomas Renard</td><td><span class="badge badge-gray">Membre</span></td><td><span class="badge badge-green">Actif</span></td></tr></tbody></table>`;
    }
    else if (this.currentTab === 'Permissions') {
      html += `<div class="form-group"><label>Rôle par défaut</label><select name="defaultRole" ${!canEdit?'disabled':''}><option ${s.defaultRole==='Membre'?'selected':''}>Membre</option><option ${s.defaultRole==='Manager'?'selected':''}>Manager</option></select></div>`;
    }
    else if (this.currentTab === 'Intégrations') {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="form-group"><label>Slack</label><select name="slackIntegration" ${!canEdit?'disabled':''}><option ${s.slackIntegration==='Activée'?'selected':''}>Activée</option><option ${s.slackIntegration==='Désactivée'?'selected':''}>Désactivée</option></select></div>
        <div class="form-group"><label>GitHub</label><select name="githubIntegration" ${!canEdit?'disabled':''}><option ${s.githubIntegration==='Activée'?'selected':''}>Activée</option><option ${s.githubIntegration==='Désactivée'?'selected':''}>Désactivée</option></select></div>
      </div>`;
    }
    else if (this.currentTab === 'Facturation') {
      html += `<div style="background:var(--panel-2); padding:16px; border-radius:8px;"><h3>Plan Enterprise 🚀</h3><p style="color:var(--text-3); margin-top:8px;">499€/mois · Renouvellement le 15 Janvier 2027</p></div>`;
    }
    else if (this.currentTab === 'Sécurité') {
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="form-group"><label>2FA</label><select name="require2fa" ${!canEdit?'disabled':''}><option ${s.require2fa==='Oui'?'selected':''}>Oui</option><option ${s.require2fa==='Non'?'selected':''}>Non</option></select></div>
        <div class="form-group"><label>Timeout session</label><select name="sessionTimeout" ${!canEdit?'disabled':''}><option ${s.sessionTimeout==='30 minutes'?'selected':''}>30 minutes</option><option ${s.sessionTimeout==='2 heures'?'selected':''}>2 heures</option></select></div>
      </div>`;
    }

    if (canEdit && this.currentTab !== 'Facturation' && this.currentTab !== 'Utilisateurs') {
      html += `<div class="form-actions" style="margin-top:24px;"><button type="submit" class="btn-primary">Enregistrer</button></div>`;
    }
    html += `</form>`;
    panel.innerHTML = html;
    
    const f = Utils.$('#fs', panel); 
    if(f) f.onsubmit = (e) => { e.preventDefault(); Object.assign(Database.data.settings, Object.fromEntries(new FormData(e.target))); Database.save(); notify.success("Paramètres enregistrés !"); };
  }
};
// ================================================================
//  JARVIS — Assistant vocal intelligent
// ================================================================
const Jarvis = {
  recognition: null,
  enabled: false,
  awake: false,
  panel: null,
  orb: null,
  transcriptEl: null,
  answerEl: null,

  init() {
    this.createUI();
    this.setupSpeechRecognition();
  },

  createUI() {
    this.orb = Utils.createElement('div', {
      className: 'jarvis-orb',
      innerHTML: 'J',
      title: 'Jarvis — cliquez pour activer'
    });
    
    this.panel = Utils.createElement('div', {
      className: 'jarvis-panel',
      innerHTML: `
        <div class="jarvis-head">
          <div>
            <div class="jarvis-title">Jarvis</div>
            <div class="jarvis-status" id="jarvisStatus">Assistant vocal désactivé</div>
          </div>
          <button class="btn-ghost" id="jarvisClose" style="padding:5px 8px;">✕</button>
        </div>

        <div class="jarvis-body">
          <div class="jarvis-line">
            Dites <strong>“Hey Jarvis”</strong>, puis posez une question.
          </div>

          <div class="jarvis-line">
            Exemples :
            <br>• “Donne-moi les tâches à faire cette semaine”
            <br>• “Ouvre les projets”
            <br>• “Montre les risques critiques”
            <br>• “Crée une tâche”
          </div>

          <div class="jarvis-line" id="jarvisTranscript">
            En attente…
          </div>

          <div class="jarvis-line" id="jarvisAnswer">
            Réponse de Jarvis…
          </div>
        </div>

        <div class="jarvis-actions">
          <button class="btn-primary" id="jarvisToggle">Activer</button>
          <button class="btn-ghost" id="jarvisHelp">Aide</button>
        </div>
      `
    });

    document.body.appendChild(this.panel);
    document.body.appendChild(this.orb);

    this.transcriptEl = Utils.$('#jarvisTranscript');
    this.answerEl = Utils.$('#jarvisAnswer');

    this.orb.onclick = () => {
      this.panel.classList.toggle('open');
    };

    Utils.$('#jarvisClose').onclick = () => {
      this.panel.classList.remove('open');
    };

    Utils.$('#jarvisToggle').onclick = () => {
      this.enabled ? this.stop() : this.start();
    };

    Utils.$('#jarvisHelp').onclick = () => {
      this.respond(
        "Voici ce que je peux faire : lire les tâches de la semaine, ouvrir les pages, afficher les risques critiques, créer une tâche, ouvrir le chat, ouvrir l'agenda ou lister les projets actifs."
      );
    };
  },

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.setStatus("Reconnaissance vocale non supportée sur ce navigateur.");
      if (this.answerEl) {
        this.answerEl.innerHTML = `
          Votre navigateur ne supporte pas la reconnaissance vocale.
          Essayez avec Chrome ou Edge.
        `;
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript.trim().toLowerCase();

      this.showTranscript(text);
      this.handleSpeech(text);
    };

    this.recognition.onerror = (event) => {
      console.warn('Jarvis speech error:', event.error);
      this.setStatus("Erreur micro : " + event.error);
    };

    this.recognition.onend = () => {
      if (this.enabled) {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };
  },

  start() {
    if (!this.recognition) {
      notify.error("Reconnaissance vocale indisponible.");
      return;
    }

    this.enabled = true;
    this.awake = false;

    try {
      this.recognition.start();
    } catch (e) {}

    this.orb.classList.add('listening');
    this.orb.classList.remove('awake');

    Utils.$('#jarvisToggle').textContent = 'Désactiver';
    this.setStatus('Écoute active — dites “Hey Jarvis”');
    this.panel.classList.add('open');

    notify.success("Jarvis est activé.");
  },

  stop() {
    this.enabled = false;
    this.awake = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.orb.classList.remove('listening', 'awake');
    Utils.$('#jarvisToggle').textContent = 'Activer';
    this.setStatus('Assistant vocal désactivé');

    notify.info("Jarvis est désactivé.");
  },

  handleSpeech(text) {
    const wakeWords = ['hey jarvis', 'jarvis', 'hé jarvis'];

    const hasWakeWord = wakeWords.some(w => text.includes(w));

    if (hasWakeWord) {
      this.awake = true;
      this.orb.classList.remove('listening');
      this.orb.classList.add('awake');
      this.setStatus('Jarvis réveillé — je vous écoute');

      const command = this.extractCommandAfterWakeWord(text);

      if (command) {
        this.handleCommand(command);
      } else {
        this.respond("Oui Nils, je vous écoute.");
      }

      return;
    }

    if (this.awake) {
      this.handleCommand(text);
    }
  },

  extractCommandAfterWakeWord(text) {
    const variants = ['hey jarvis', 'hé jarvis', 'jarvis'];

    for (const v of variants) {
      const idx = text.indexOf(v);
      if (idx !== -1) {
        return text.slice(idx + v.length).trim();
      }
    }

    return '';
  },

  handleCommand(command) {
    this.setStatus('Analyse de la demande…');

    let answer = '';

    if (this.includesAny(command, ['tâches cette semaine', 'taches cette semaine', 'à faire cette semaine', 'a faire cette semaine'])) {
      answer = this.getTasksThisWeekAnswer();
    }

    else if (this.includesAny(command, ['tâches aujourd', 'taches aujourd', 'aujourd’hui', 'aujourd hui'])) {
      answer = this.getTasksTodayAnswer();
    }

    else if (this.includesAny(command, ['tâches critiques', 'taches critiques', 'priorité critique'])) {
      answer = this.getCriticalTasksAnswer();
    }

    else if (this.includesAny(command, ['risques critiques', 'risque critique'])) {
      answer = this.getCriticalRisksAnswer();
      window.showPage('risks');
    }

    else if (this.includesAny(command, ['projets actifs', 'projet actifs', 'liste des projets'])) {
      answer = this.getActiveProjectsAnswer();
      window.showPage('portfolio');
    }

    else if (this.includesAny(command, ['ouvre les projets', 'ouvre portfolio', 'va aux projets'])) {
      window.showPage('portfolio');
      answer = "J’ouvre le portfolio projets.";
    }

    else if (this.includesAny(command, ['ouvre les tâches', 'ouvre les taches', 'va aux tâches', 'va aux taches'])) {
      window.showPage('tasks');
      answer = "J’ouvre la page des tâches.";
    }

    else if (this.includesAny(command, ['ouvre agenda', 'ouvre l agenda', 'calendrier'])) {
      window.showPage('calendar');
      answer = "J’ouvre l’agenda.";
    }

    else if (this.includesAny(command, ['ouvre les documents', 'documents'])) {
      window.showPage('documents');
      answer = "J’ouvre la bibliothèque de documents.";
    }

    else if (this.includesAny(command, ['ouvre le wiki', 'wiki', 'formations'])) {
      window.showPage('wiki');
      answer = "J’ouvre le wiki interne.";
    }

    else if (this.includesAny(command, ['ouvre les messages', 'ouvre le chat', 'conversation', 'discussion'])) {
      window.showPage('chat');
      answer = "J’ouvre les conversations.";
    }

    else if (this.includesAny(command, ['crée une tâche', 'creer une tache', 'créer une tâche', 'nouvelle tâche'])) {
      window.showPage('tasks');
      setTimeout(() => Kanban.openCreateForm(), 300);
      answer = "J’ouvre le formulaire de création de tâche.";
    }

    else if (this.includesAny(command, ['crée un projet', 'creer un projet', 'nouveau projet'])) {
      window.showPage('portfolio');
      setTimeout(() => Portfolio.openCreateForm(), 300);
      answer = "J’ouvre le formulaire de création de projet.";
    }

    else if (this.includesAny(command, ['crée une réunion', 'nouvelle réunion', 'nouvel événement', 'nouvel evenement'])) {
      window.showPage('calendar');
      setTimeout(() => Calendar.openCreateForm(), 300);
      answer = "J’ouvre le formulaire de création d’événement.";
    }

    else if (this.includesAny(command, ['aide', 'que peux tu faire', 'commandes'])) {
      answer = "Je peux ouvrir les pages, lister les tâches de la semaine, afficher les risques critiques, créer une tâche, créer un projet ou créer un événement.";
    }

    else {
      answer = "Je n’ai pas encore compris cette demande. Essayez par exemple : “donne-moi les tâches à faire cette semaine”.";
    }

    this.respond(answer);

    // Après réponse, Jarvis repasse en attente du mot-clé
    setTimeout(() => {
      this.awake = false;
      this.orb.classList.remove('awake');
      if (this.enabled) this.orb.classList.add('listening');
      this.setStatus('Écoute active — dites “Hey Jarvis”');
    }, 2500);
  },

  includesAny(text, patterns) {
    return patterns.some(p => text.includes(p));
  },

  getTasksThisWeekAnswer() {
    const { start, end } = this.getCurrentWeekRange();

    const tasks = Database.data.tasks.filter(t => {
      if (!t.date) return false;
      const d = this.parseDate(t.date);
      return d >= start && d <= end && t.status !== 'Terminé';
    });

    if (tasks.length === 0) {
      return "Vous n’avez aucune tâche à faire cette semaine.";
    }

    const list = tasks
      .slice(0, 5)
      .map(t => `${t.title}, assignée à ${t.assignee || 'personne'}, pour le ${this.formatShortDate(t.date)}`)
      .join('. ');

    return `Vous avez ${tasks.length} tâche${tasks.length > 1 ? 's' : ''} à faire cette semaine. ${list}.`;
  },

  getTasksTodayAnswer() {
    const today = this.toDateInputValue(new Date());

    const tasks = Database.data.tasks.filter(t =>
      t.date === today && t.status !== 'Terminé'
    );

    if (tasks.length === 0) {
      return "Vous n’avez aucune tâche prévue aujourd’hui.";
    }

    const list = tasks.map(t => t.title).join(', ');
    return `Aujourd’hui, vous avez ${tasks.length} tâche${tasks.length > 1 ? 's' : ''} : ${list}.`;
  },

  getCriticalTasksAnswer() {
    const tasks = Database.data.tasks.filter(t =>
      t.priority === 'Critique' && t.status !== 'Terminé'
    );

    if (tasks.length === 0) {
      return "Aucune tâche critique ouverte pour le moment.";
    }

    const list = tasks.slice(0, 5).map(t => t.title).join(', ');
    return `Vous avez ${tasks.length} tâche${tasks.length > 1 ? 's critiques' : ' critique'} : ${list}.`;
  },

  getCriticalRisksAnswer() {
    const risks = Database.data.risks.filter(r =>
      r.criticality === 'Critique' && r.status !== 'Mitigé'
    );

    if (risks.length === 0) {
      return "Aucun risque critique actif actuellement.";
    }

    const list = risks.slice(0, 5).map(r => r.title).join(', ');
    return `Il y a ${risks.length} risque${risks.length > 1 ? 's critiques' : ' critique'} actif${risks.length > 1 ? 's' : ''} : ${list}.`;
  },

  getActiveProjectsAnswer() {
    const projects = Database.data.projects.filter(p => p.status !== 'Terminé');

    if (projects.length === 0) {
      return "Aucun projet actif pour le moment.";
    }

    const list = projects.slice(0, 5).map(p => p.name).join(', ');
    return `Vous avez ${projects.length} projet${projects.length > 1 ? 's actifs' : ' actif'} : ${list}.`;
  },

  getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0 dimanche, 1 lundi
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(now);
    start.setDate(now.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  },

  parseDate(value) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatShortDate(value) {
    const d = this.parseDate(value);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long'
    });
  },

  respond(text) {
    if (this.answerEl) {
      this.answerEl.innerHTML = Utils.escapeHtml(text);
    }

    this.speak(text);
  },

  speak(text) {
    if (!('speechSynthesis' in window)) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;

    speechSynthesis.speak(utterance);
  },

  showTranscript(text) {
    if (this.transcriptEl) {
      this.transcriptEl.innerHTML = `<strong>Vous :</strong> ${Utils.escapeHtml(text)}`;
    }
  },

  setStatus(text) {
    const status = Utils.$('#jarvisStatus');
    if (status) status.textContent = text;
  }
};
// ================================================================
//  DÉMARRAGE DE L'APPLICATION
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  Toast.initNative(); 
  Database.init();   
  Dashboard.init();
  Portfolio.init();
  Kanban.init();
  Risks.init();
  Calendar.init();
  Chat.init();
  Documents.init();
  Wiki.init();
  Notifications.init();
  Settings.init();
  Jarvis.init();
});
