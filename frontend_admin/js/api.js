(function () {
    'use strict';

    var base;
    if (typeof window.API_BASE === 'string') {
        base = window.API_BASE;
    } else if (window.location.port === '8080' || window.location.port === '5173') {
        base = window.location.origin;
    } else {
        base = 'http://localhost:8000';
    }
    const API_BASE = base + '/api/v1';

    async function request(path, options) {
        const response = await fetch(API_BASE + path, options);
        if (!response.ok) {
            const text = await response.text();
            throw new Error('(' + response.status + ') ' + text);
        }
        if (response.status === 204) return null;
        return response.json();
    }

    window.AdminAPI = {
        fetchMaps: function () { return request('/maps'); },
        fetchNodes: function (mapId) { return request('/nodes?map_id=' + mapId); },
        fetchEdges: function (mapId) { return request('/edges?map_id=' + mapId); },
        createNode: function (payload) {
            return request('/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        updateNode: function (id, payload) {
            return request('/nodes/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        deleteNode: function (id) {
            return request('/nodes/' + id, { method: 'DELETE' });
        },
        createEdge: function (payload) {
            return request('/edges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        updateEdge: function (id, payload) {
            return request('/edges/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        deleteEdge: function (id) {
            return request('/edges/' + id, { method: 'DELETE' });
        },
    };
})();
