(function () {
    'use strict';

    const API_BASE = (window.API_BASE || 'http://localhost:8000') + '/api/v1';

    const state = {
        maps: [],
        nodes: [],
        edges: [],
        currentMapId: null,
    };

    const elements = {
        mapSelect: document.getElementById('map-select'),
        refreshBtn: document.getElementById('refresh-btn'),
        nodesTbody: document.getElementById('nodes-tbody'),
        edgesTbody: document.getElementById('edges-tbody'),
        nodesCount: document.getElementById('nodes-count'),
        edgesCount: document.getElementById('edges-count'),
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        toast: document.getElementById('toast'),
    };

    function showToast(message, isError) {
        elements.toast.textContent = message;
        elements.toast.classList.toggle('error', !!isError);
        elements.toast.classList.remove('hidden');
        setTimeout(function () {
            elements.toast.classList.add('hidden');
        }, 3000);
    }

    async function apiFetch(path) {
        const response = await fetch(API_BASE + path);
        if (!response.ok) {
            const text = await response.text();
            throw new Error('Request failed (' + response.status + '): ' + text);
        }
        return response.json();
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleString();
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function loadMaps() {
        try {
            const maps = await apiFetch('/maps');
            state.maps = Array.isArray(maps) ? maps : [];
            renderMapSelect();
        } catch (error) {
            showToast('Failed to load maps: ' + error.message, true);
        }
    }

    function renderMapSelect() {
        const previous = state.currentMapId;
        elements.mapSelect.innerHTML = '<option value="">-- select a map --</option>';
        state.maps.forEach(function (map) {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = '#' + map.id + ' - ' + (map.name || 'unnamed');
            elements.mapSelect.appendChild(option);
        });
        if (previous && state.maps.some(function (m) { return m.id === previous; })) {
            elements.mapSelect.value = String(previous);
        }
    }

    function renderEmpty(tbody, colspan, message) {
        tbody.innerHTML = '<tr><td colspan="' + colspan + '" class="empty">' +
            escapeHtml(message) + '</td></tr>';
    }

    function renderNodes() {
        const tbody = elements.nodesTbody;
        elements.nodesCount.textContent = state.nodes.length;
        if (!state.nodes.length) {
            renderEmpty(tbody, 8, state.currentMapId ? 'No nodes for this map.' : 'Select a map to load nodes.');
            return;
        }
        tbody.innerHTML = state.nodes.map(function (node) {
            const walkableClass = node.is_walkable ? 'walkable-true' : 'walkable-false';
            const walkableLabel = node.is_walkable ? 'Yes' : 'No';
            return '<tr>' +
                '<td>' + escapeHtml(node.id) + '</td>' +
                '<td>' + escapeHtml(node.map_id) + '</td>' +
                '<td>' + escapeHtml(node.lat) + '</td>' +
                '<td>' + escapeHtml(node.lon) + '</td>' +
                '<td class="' + walkableClass + '">' + walkableLabel + '</td>' +
                '<td>' + escapeHtml(node.terrain_type) + '</td>' +
                '<td>' + escapeHtml(formatDate(node.created_at)) + '</td>' +
                '<td>' + escapeHtml(formatDate(node.updated_at)) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderEdges() {
        const tbody = elements.edgesTbody;
        elements.edgesCount.textContent = state.edges.length;
        if (!state.edges.length) {
            renderEmpty(tbody, 7, state.currentMapId ? 'No edges for this map.' : 'Select a map to load edges.');
            return;
        }
        tbody.innerHTML = state.edges.map(function (edge) {
            return '<tr>' +
                '<td>' + escapeHtml(edge.id) + '</td>' +
                '<td>' + escapeHtml(edge.map_id) + '</td>' +
                '<td>' + escapeHtml(edge.source_id) + '</td>' +
                '<td>' + escapeHtml(edge.target_id) + '</td>' +
                '<td>' + escapeHtml(edge.weight) + '</td>' +
                '<td>' + escapeHtml(formatDate(edge.created_at)) + '</td>' +
                '<td>' + escapeHtml(formatDate(edge.updated_at)) + '</td>' +
                '</tr>';
        }).join('');
    }

    async function loadDataForCurrentMap() {
        const mapId = state.currentMapId;
        if (!mapId) {
            state.nodes = [];
            state.edges = [];
            renderNodes();
            renderEdges();
            return;
        }
        try {
            const [nodes, edges] = await Promise.all([
                apiFetch('/nodes?map_id=' + encodeURIComponent(mapId)),
                apiFetch('/edges?map_id=' + encodeURIComponent(mapId)),
            ]);
            state.nodes = Array.isArray(nodes) ? nodes : [];
            state.edges = Array.isArray(edges) ? edges : [];
            renderNodes();
            renderEdges();
            showToast('Loaded ' + state.nodes.length + ' nodes, ' + state.edges.length + ' edges');
        } catch (error) {
            showToast('Failed to load data: ' + error.message, true);
        }
    }

    function switchTab(tabName) {
        elements.tabButtons.forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        elements.tabPanels.forEach(function (panel) {
            panel.classList.toggle('active', panel.id === 'tab-' + tabName);
        });
    }

    function bindEvents() {
        elements.tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(btn.dataset.tab);
            });
        });

        elements.mapSelect.addEventListener('change', function () {
            const value = elements.mapSelect.value;
            state.currentMapId = value ? Number(value) : null;
            loadDataForCurrentMap();
        });

        elements.refreshBtn.addEventListener('click', function () {
            loadMaps().then(loadDataForCurrentMap);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindEvents();
        loadMaps().then(loadDataForCurrentMap);
    });
})();