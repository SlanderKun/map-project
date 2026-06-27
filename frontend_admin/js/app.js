(function () {
    'use strict';

    var MODE = 'add-node';
    var mapId = null;
    var map = null;
    var connectSource = null;

    // Local draft: track changes before push
    var nodes = [];   // { id?, tempId?, lat, lon, is_walkable, terrain_type, _status }
    var edges = [];   // { id?, tempId?, source_id/tempSource, target_id/tempTarget, weight, _status }

    var els = {
        mapSelect: document.getElementById('map-select'),
        modeBtns: document.querySelectorAll('[data-mode]'),
        nodePanel: document.getElementById('node-panel'),
        noSelection: document.getElementById('no-selection'),
        nodeId: document.getElementById('node-id'),
        nodeLat: document.getElementById('node-lat'),
        nodeLon: document.getElementById('node-lon'),
        nodeWalkable: document.getElementById('node-walkable'),
        nodeTerrain: document.getElementById('node-terrain'),
        applyNodeBtn: document.getElementById('apply-node-btn'),
        edgePanel: document.getElementById('edge-panel'),
        edgeId: document.getElementById('edge-id'),
        edgeEndpoints: document.getElementById('edge-endpoints'),
        edgeWeight: document.getElementById('edge-weight'),
        applyEdgeBtn: document.getElementById('apply-edge-btn'),
        stats: document.getElementById('stats'),
        pendingStats: document.getElementById('pending-stats'),
        pushBtn: document.getElementById('push-btn'),
        reloadBtn: document.getElementById('reload-btn'),
        toast: document.getElementById('toast'),
    };

    var selectedNodeKey = null; // id or tempId
    var selectedEdgeKey = null;

    var tempCounter = 1;

    function showToast(msg, type) {
        els.toast.textContent = msg;
        els.toast.className = 'toast ' + (type || '');
        setTimeout(function () { els.toast.className = 'toast hidden'; }, 3500);
    }

    function nodeKey(n) { return n.id != null ? 'id:' + n.id : 'temp:' + n.tempId; }
    function edgeKey(e) { return e.id != null ? 'id:' + e.id : 'temp:' + e.tempId; }

    function activeNodes() { return nodes.filter(function (n) { return n._status !== 'deleted'; }); }
    function activeEdges() { return edges.filter(function (e) { return e._status !== 'deleted'; }); }

    function findNode(key) {
        if (!key) return null;
        if (key.indexOf('id:') === 0) {
            var id = Number(key.slice(3));
            return nodes.find(function (n) { return n.id === id; }) || null;
        }
        var tempId = key.slice(5);
        return nodes.find(function (n) { return n.tempId === tempId; }) || null;
    }

    function findEdge(key) {
        if (!key) return null;
        if (key.indexOf('id:') === 0) {
            var id = Number(key.slice(3));
            return edges.find(function (e) { return e.id === id; }) || null;
        }
        var tempId = key.slice(5);
        return edges.find(function (e) { return e.tempId === tempId; }) || null;
    }

    function resolveNodeId(ref) {
        if (typeof ref === 'number') return ref;
        var n = findNode(ref);
        return n && n.id != null ? n.id : null;
    }

    function hasPendingChanges() {
        return nodes.some(function (n) { return n._status !== 'existing'; }) ||
            edges.some(function (e) { return e._status !== 'existing'; });
    }

    function updateStats() {
        var an = activeNodes().length;
        var ae = activeEdges().length;
        els.stats.textContent = an + ' вершин · ' + ae + ' рёбер';
        var pending = nodes.filter(function (n) { return n._status !== 'existing'; }).length +
            edges.filter(function (e) { return e._status !== 'existing'; }).length;
        els.pendingStats.textContent = pending > 0 ? ('Несохранённых изменений: ' + pending) : '';
        els.pushBtn.disabled = !mapId || !hasPendingChanges();
    }

    function nodesGeoJson() {
        return {
            type: 'FeatureCollection',
            features: activeNodes().map(function (n) {
                var key = nodeKey(n);
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [n.lon, n.lat] },
                    properties: {
                        key: key,
                        selected: key === selectedNodeKey,
                        connectSource: key === connectSource,
                    },
                };
            }),
        };
    }

    function edgesGeoJson() {
        var nodeMap = {};
        activeNodes().forEach(function (n) {
            nodeMap[nodeKey(n)] = n;
        });

        return {
            type: 'FeatureCollection',
            features: activeEdges().map(function (e) {
                var srcKey = e.source_id != null ? 'id:' + e.source_id : e.tempSource;
                var tgtKey = e.target_id != null ? 'id:' + e.target_id : e.tempTarget;
                var src = nodeMap[srcKey];
                var tgt = nodeMap[tgtKey];
                if (!src || !tgt) return null;
                var key = edgeKey(e);
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[src.lon, src.lat], [tgt.lon, tgt.lat]],
                    },
                    properties: { key: key, selected: key === selectedEdgeKey },
                };
            }).filter(Boolean),
        };
    }

    function refreshMapLayers() {
        if (!map || !map.getSource('nodes')) return;
        map.getSource('nodes').setData(nodesGeoJson());
        map.getSource('edges').setData(edgesGeoJson());
        updateStats();
    }

    function initMap() {
        map = new maplibregl.Map({
            container: 'map',
            style: 'https://demotiles.maplibre.org/style.json',
            center: [135.07, 48.48],
            zoom: 11,
        });

        map.on('load', function () {
            map.addSource('edges', { type: 'geojson', data: edgesGeoJson() });
            map.addLayer({
                id: 'edges-line',
                type: 'line',
                source: 'edges',
                paint: {
                    'line-color': ['case', ['get', 'selected'], '#f59e0b', '#64748b'],
                    'line-width': ['case', ['get', 'selected'], 3, 2],
                    'line-opacity': 0.8,
                },
            });

            map.addSource('nodes', { type: 'geojson', data: nodesGeoJson() });
            map.addLayer({
                id: 'nodes-circle',
                type: 'circle',
                source: 'nodes',
                paint: {
                    'circle-radius': ['case', ['get', 'selected'], 9, ['case', ['get', 'connectSource'], 8, 6]],
                    'circle-color': ['case', ['get', 'connectSource'], '#16a34a', ['case', ['get', 'selected'], '#f59e0b', '#2563eb']],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                },
            });
            map.addLayer({
                id: 'nodes-label',
                type: 'symbol',
                source: 'nodes',
                layout: {
                    'text-field': ['slice', ['get', 'key'], 3],
                    'text-size': 10,
                    'text-offset': [0, -1.2],
                },
                paint: { 'text-color': '#fff', 'text-halo-color': '#2563eb', 'text-halo-width': 1 },
            });
        });

        map.on('click', onMapClick);
    }

    function onMapClick(e) {
        if (!mapId) { showToast('Сначала выберите карту', 'error'); return; }

        var features = map.queryRenderedFeatures(e.point, { layers: ['nodes-circle'] });
        var clickedNode = features.length > 0 ? features[0].properties.key : null;

        if (MODE === 'add-node' && !clickedNode) {
            addNodeAt(e.lngLat.lat, e.lngLat.lng);
            return;
        }

        if (MODE === 'connect') {
            handleConnect(clickedNode);
            return;
        }

        if (MODE === 'select') {
            if (clickedNode) {
                selectNode(clickedNode);
            } else {
                var edgeFeatures = map.queryRenderedFeatures(e.point, { layers: ['edges-line'] });
                if (edgeFeatures.length > 0) {
                    selectEdge(edgeFeatures[0].properties.key);
                } else {
                    clearSelection();
                }
            }
            return;
        }

        if (MODE === 'delete') {
            if (clickedNode) {
                deleteNode(clickedNode);
            } else {
                var ef = map.queryRenderedFeatures(e.point, { layers: ['edges-line'] });
                if (ef.length > 0) deleteEdge(ef[0].properties.key);
            }
        }
    }

    function addNodeAt(lat, lon) {
        var tempId = 'n' + (tempCounter++);
        nodes.push({
            tempId: tempId,
            lat: lat,
            lon: lon,
            is_walkable: true,
            terrain_type: 'dirt_trail',
            _status: 'new',
        });
        refreshMapLayers();
        selectNode('temp:' + tempId);
        showToast('Вершина добавлена (локально)', 'success');
    }

    function handleConnect(nodeKeyStr) {
        if (!nodeKeyStr) return;
        if (!connectSource) {
            connectSource = nodeKeyStr;
            refreshMapLayers();
            showToast('Выберите вторую вершину', '');
            return;
        }
        if (connectSource === nodeKeyStr) {
            connectSource = null;
            refreshMapLayers();
            return;
        }
        addEdge(connectSource, nodeKeyStr);
        connectSource = null;
        refreshMapLayers();
    }

    function addEdge(srcKey, tgtKey) {
        var src = findNode(srcKey);
        var tgt = findNode(tgtKey);
        if (!src || !tgt) return;

        var payload = {
            tempId: 'e' + (tempCounter++),
            weight: 1.0,
            _status: 'new',
        };

        if (src.id != null) payload.source_id = src.id;
        else payload.tempSource = srcKey;

        if (tgt.id != null) payload.target_id = tgt.id;
        else payload.tempTarget = tgtKey;

        edges.push(payload);
        showToast('Ребро добавлено (локально)', 'success');
        updateStats();
    }

    function deleteNode(key) {
        var n = findNode(key);
        if (!n) return;
        if (n._status === 'new') {
            nodes = nodes.filter(function (x) { return nodeKey(x) !== key; });
            edges = edges.filter(function (e) {
                var sk = e.source_id != null ? 'id:' + e.source_id : e.tempSource;
                var tk = e.target_id != null ? 'id:' + e.target_id : e.tempTarget;
                return sk !== key && tk !== key;
            });
        } else {
            n._status = 'deleted';
            edges.forEach(function (e) {
                var sk = e.source_id != null ? 'id:' + e.source_id : e.tempSource;
                var tk = e.target_id != null ? 'id:' + e.target_id : e.tempTarget;
                if (sk === key || tk === key) {
                    if (e._status === 'new') edges = edges.filter(function (x) { return edgeKey(x) !== edgeKey(e); });
                    else e._status = 'deleted';
                }
            });
        }
        if (selectedNodeKey === key) clearSelection();
        refreshMapLayers();
        showToast('Вершина удалена (локально)', '');
    }

    function deleteEdge(key) {
        var e = findEdge(key);
        if (!e) return;
        if (e._status === 'new') {
            edges = edges.filter(function (x) { return edgeKey(x) !== key; });
        } else {
            e._status = 'deleted';
        }
        if (selectedEdgeKey === key) clearSelection();
        refreshMapLayers();
        showToast('Ребро удалено (локально)', '');
    }

    function selectNode(key) {
        selectedNodeKey = key;
        selectedEdgeKey = null;
        var n = findNode(key);
        if (!n) return;

        els.nodePanel.classList.remove('hidden');
        els.noSelection.classList.add('hidden');
        els.edgePanel.classList.add('hidden');

        els.nodeId.value = n.id != null ? String(n.id) : ('new:' + n.tempId);
        els.nodeLat.value = n.lat;
        els.nodeLon.value = n.lon;
        els.nodeWalkable.value = String(n.is_walkable);
        els.nodeTerrain.value = n.terrain_type;
        refreshMapLayers();
    }

    function selectEdge(key) {
        selectedEdgeKey = key;
        selectedNodeKey = null;
        var e = findEdge(key);
        if (!e) return;

        els.edgePanel.classList.remove('hidden');
        els.nodePanel.classList.add('hidden');
        els.noSelection.classList.add('hidden');

        els.edgeId.value = e.id != null ? String(e.id) : ('new:' + e.tempId);
        els.edgeEndpoints.value = (e.source_id || e.tempSource) + ' → ' + (e.target_id || e.tempTarget);
        els.edgeWeight.value = e.weight;
        refreshMapLayers();
    }

    function clearSelection() {
        selectedNodeKey = null;
        selectedEdgeKey = null;
        els.nodePanel.classList.add('hidden');
        els.edgePanel.classList.add('hidden');
        els.noSelection.classList.remove('hidden');
        refreshMapLayers();
    }

    function applyNodeEdits() {
        var n = findNode(selectedNodeKey);
        if (!n) return;
        n.lat = parseFloat(els.nodeLat.value);
        n.lon = parseFloat(els.nodeLon.value);
        n.is_walkable = els.nodeWalkable.value === 'true';
        n.terrain_type = els.nodeTerrain.value;
        if (n._status === 'existing') n._status = 'modified';
        refreshMapLayers();
        showToast('Изменения применены (локально)', 'success');
    }

    function applyEdgeEdits() {
        var e = findEdge(selectedEdgeKey);
        if (!e) return;
        e.weight = parseFloat(els.edgeWeight.value);
        if (e._status === 'existing') e._status = 'modified';
        refreshMapLayers();
        showToast('Изменения применены (локально)', 'success');
    }

    async function loadMaps() {
        try {
            var maps = await AdminAPI.fetchMaps();
            els.mapSelect.innerHTML = '<option value="">— выберите карту —</option>';
            maps.forEach(function (m) {
                var opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name;
                els.mapSelect.appendChild(opt);
            });
        } catch (err) {
            showToast('Ошибка загрузки карт: ' + err.message, 'error');
        }
    }

    async function loadGraphData() {
        if (!mapId) {
            nodes = [];
            edges = [];
            refreshMapLayers();
            return;
        }
        try {
            var results = await Promise.all([
                AdminAPI.fetchNodes(mapId),
                AdminAPI.fetchEdges(mapId),
            ]);
            nodes = results[0].map(function (n) {
                return {
                    id: n.id,
                    lat: n.lat,
                    lon: n.lon,
                    is_walkable: n.is_walkable,
                    terrain_type: n.terrain_type,
                    _status: 'existing',
                };
            });
            edges = results[1].map(function (e) {
                return {
                    id: e.id,
                    source_id: e.source_id,
                    target_id: e.target_id,
                    weight: e.weight,
                    _status: 'existing',
                };
            });

            if (nodes.length > 0 && map) {
                var avgLon = nodes.reduce(function (s, n) { return s + n.lon; }, 0) / nodes.length;
                var avgLat = nodes.reduce(function (s, n) { return s + n.lat; }, 0) / nodes.length;
                map.flyTo({ center: [avgLon, avgLat], zoom: 12 });
            }

            clearSelection();
            connectSource = null;
            refreshMapLayers();
            showToast('Загружено: ' + nodes.length + ' вершин, ' + edges.length + ' рёбер', 'success');
        } catch (err) {
            showToast('Ошибка загрузки: ' + err.message, 'error');
        }
    }

    async function pushToBackend() {
        if (!mapId) return;
        els.pushBtn.disabled = true;
        els.pushBtn.textContent = 'Сохранение…';

        try {
            // 1. Delete nodes
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n._status === 'deleted' && n.id != null) {
                    await AdminAPI.deleteNode(n.id);
                }
            }

            // 2. Create new nodes, build tempId → id map
            var idMap = {};
            for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];
                if (node._status === 'deleted') continue;
                if (node._status === 'new') {
                    var created = await AdminAPI.createNode({
                        map_id: mapId,
                        lat: node.lat,
                        lon: node.lon,
                        is_walkable: node.is_walkable,
                        terrain_type: node.terrain_type,
                    });
                    idMap['temp:' + node.tempId] = created.id;
                    node.id = created.id;
                    node._status = 'existing';
                    delete node.tempId;
                } else if (node._status === 'modified') {
                    await AdminAPI.updateNode(node.id, {
                        lat: node.lat,
                        lon: node.lon,
                        is_walkable: node.is_walkable,
                        terrain_type: node.terrain_type,
                    });
                    node._status = 'existing';
                }
            }

            // 3. Delete edges
            for (var k = 0; k < edges.length; k++) {
                var edge = edges[k];
                if (edge._status === 'deleted' && edge.id != null) {
                    await AdminAPI.deleteEdge(edge.id);
                }
            }

            // 4. Create new edges
            for (var l = 0; l < edges.length; l++) {
                var e = edges[l];
                if (e._status === 'deleted') continue;

                if (e._status === 'new') {
                    var srcId = e.source_id != null ? e.source_id : idMap[e.tempSource];
                    var tgtId = e.target_id != null ? e.target_id : idMap[e.tempTarget];
                    if (!srcId || !tgtId) throw new Error('Не удалось разрешить ID вершин для ребра');

                    var createdEdge = await AdminAPI.createEdge({
                        map_id: mapId,
                        source_id: srcId,
                        target_id: tgtId,
                        weight: e.weight,
                    });
                    e.id = createdEdge.id;
                    e.source_id = srcId;
                    e.target_id = tgtId;
                    delete e.tempSource;
                    delete e.tempTarget;
                    e._status = 'existing';
                } else if (e._status === 'modified') {
                    await AdminAPI.updateEdge(e.id, { weight: e.weight });
                    e._status = 'existing';
                }
            }

            // Cleanup deleted entries from local state
            nodes = nodes.filter(function (n) { return n._status !== 'deleted'; });
            edges = edges.filter(function (e) { return e._status !== 'deleted'; });

            refreshMapLayers();
            showToast('Сохранено на сервер', 'success');
        } catch (err) {
            showToast('Ошибка сохранения: ' + err.message, 'error');
        } finally {
            els.pushBtn.textContent = 'Сохранить на сервер';
            updateStats();
        }
    }

    function setMode(mode) {
        MODE = mode;
        connectSource = null;
        els.modeBtns.forEach(function (btn) {
            btn.classList.toggle('btn--active', btn.dataset.mode === mode);
        });
        refreshMapLayers();
    }

    function bindEvents() {
        els.modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () { setMode(btn.dataset.mode); });
        });

        els.mapSelect.addEventListener('change', function () {
            mapId = els.mapSelect.value ? Number(els.mapSelect.value) : null;
            loadGraphData();
        });

        els.applyNodeBtn.addEventListener('click', applyNodeEdits);
        els.applyEdgeBtn.addEventListener('click', applyEdgeEdits);
        els.pushBtn.addEventListener('click', pushToBackend);
        els.reloadBtn.addEventListener('click', loadGraphData);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initMap();
        bindEvents();
        loadMaps();
    });
})();
