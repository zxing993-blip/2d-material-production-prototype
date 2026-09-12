const assets = [
  { id: '2D-ASSET-20260910-000381', name: '人体工学办公椅', source: '2D-20260910-00126', sourceImage: 'SRC-0001', generatedImage: 'GEN-0001', note: '用于办公场景资产', owner: '陈建模', time: '今天 11:20', threeD: 'not_started', tone: '#dfeafe' },
  { id: '2D-ASSET-20260910-000382', name: '人体工学办公椅', source: '2D-20260910-00126', sourceImage: 'SRC-0002', generatedImage: 'GEN-0002', note: '用于办公场景资产', owner: '陈建模', time: '今天 11:20', threeD: 'not_started', tone: '#e9f1e9' },
  { id: '2D-ASSET-20260910-000383', name: '复古皮质行李箱', source: '2D-20260910-00124', sourceImage: 'SRC-0004', generatedImage: 'GEN-0004', note: '突出皮质纹理', owner: '陈建模', time: '今天 10:55', threeD: 'generating', threeDTask: '3D-20260911-000036', tone: '#f4e8d7' },
  { id: '2D-ASSET-20260909-000366', name: '陶瓷花瓶', source: '2D-20260909-00119', sourceImage: 'SRC-0007', generatedImage: 'GEN-0007', note: '', owner: '林嘉', time: '昨天 16:18', threeD: 'completed', threeDTask: '3D-20260910-000089', tone: '#e8e2f5' },
  { id: '2D-ASSET-20260909-000365', name: '原木圆形餐桌', source: '2D-20260909-00122', sourceImage: 'SRC-0011', generatedImage: 'GEN-0011', note: '餐桌素材补充批次', owner: '陈建模', time: '昨天 18:46', threeD: 'failed', threeDTask: '3D-20260910-000074', tone: '#e0eef0' }
];

const assetBody = document.querySelector('#assetBody');
const assetSearch = document.querySelector('#assetSearch');
const assetOwnerFilter = document.querySelector('#assetOwnerFilter');
const asset3dFilter = document.querySelector('#asset3dFilter');
const assetEmpty = document.querySelector('#assetEmpty');
const assetCount = document.querySelector('#assetCount');
const assetToast = document.querySelector('#assetToast');
const assetSelectAll = document.querySelector('#assetSelectAll');
const assetSelectionInfo = document.querySelector('#assetSelectionInfo');
const batchStart3d = document.querySelector('#batchStart3d');
const assetDetailModal = document.querySelector('#assetDetailModal');
const threeDModal = document.querySelector('#threeDModal');
const threeDBatchResultModal = document.querySelector('#threeDBatchResultModal');
let selectedAssetIds = new Set();
let detailAsset = null;
let threeDAssets = [];
let failedBatchAssetIds = [];
let toastTimer;

const threeDLabels = { not_started: '未发起 3D', generating: '生成中', completed: '已完成', failed: '生成失败' };
const eligibleFor3D = (asset) => ['not_started', 'failed'].includes(asset.threeD);

function toast(message) { assetToast.textContent = message; assetToast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => assetToast.classList.remove('show'), 2000); }
function filteredAssets() { const keyword = assetSearch.value.trim().toLowerCase(), owner = assetOwnerFilter.value, status = asset3dFilter.value; return assets.filter((asset) => (!keyword || asset.name.toLowerCase().includes(keyword) || asset.id.toLowerCase().includes(keyword)) && (owner === 'all' || asset.owner === owner) && (status === 'all' || asset.threeD === status)); }
function action(asset) { if (asset.threeD === 'not_started') return `<button type="button" class="action-link" data-details="${asset.id}">详情</button><button type="button" class="action-link" data-start-id="${asset.id}">发起 3D</button>`; if (asset.threeD === 'failed') return `<button type="button" class="action-link" data-details="${asset.id}">详情</button><button type="button" class="action-link" data-start-id="${asset.id}">重试 3D</button>`; return `<button type="button" class="action-link" data-details="${asset.id}">详情</button><button type="button" class="action-link" data-view-id="${asset.id}">查看 3D 任务</button>`; }
function updateSelectionToolbar() { const count = selectedAssetIds.size; assetSelectionInfo.textContent = count ? `已选择 ${count} 张可发起素材` : '未选择素材'; batchStart3d.disabled = count === 0; const eligibleVisible = filteredAssets().filter(eligibleFor3D); assetSelectAll.checked = eligibleVisible.length > 0 && eligibleVisible.every((asset) => selectedAssetIds.has(asset.id)); assetSelectAll.indeterminate = eligibleVisible.some((asset) => selectedAssetIds.has(asset.id)) && !assetSelectAll.checked; }
function renderAssets() {
  const rows = filteredAssets();
  assetBody.innerHTML = rows.map((asset) => `<tr><td><label class="asset-check"><input type="checkbox" data-asset-select="${asset.id}" ${selectedAssetIds.has(asset.id) ? 'checked' : ''} ${eligibleFor3D(asset) ? '' : 'disabled'} aria-label="选择 ${asset.name}"><span></span></label></td><td><div class="asset-thumbnail" style="--asset-tone:${asset.tone}">缩略图</div></td><td><div class="task-name"><strong>${asset.name}</strong><code>${asset.id}</code></div></td><td><span class="asset-status ${asset.threeD}">${threeDLabels[asset.threeD]}</span></td><td><code class="source-id">${asset.source}</code></td><td><span class="task-note" title="${asset.note}">${asset.note || '—'}</span></td><td><div class="owner"><span class="mini-avatar">${asset.owner[0]}</span>${asset.owner}</div></td><td><span class="time">${asset.time}</span></td><td>${action(asset)}</td></tr>`).join('');
  assetEmpty.classList.toggle('show', rows.length === 0);
  assetCount.textContent = `共 ${rows.length} 条`;
  updateSelectionToolbar();
  bindActions();
}

function openAssetDetail(asset) {
  detailAsset = asset;
  document.querySelector('#assetDetailTitle').textContent = asset.name;
  document.querySelector('#assetDetailPreview').style.setProperty('--preview-tone', asset.tone);
  document.querySelector('#assetDetailId').textContent = asset.id;
  document.querySelector('#assetDetailInboundTime').textContent = asset.time;
  document.querySelector('#assetDetailAuditInbound').textContent = asset.time;
  document.querySelector('#assetDetail3dStatus').textContent = threeDLabels[asset.threeD];
  document.querySelector('#assetDetailSourceTask').textContent = asset.source;
  document.querySelector('#assetDetailSourceImage').textContent = asset.sourceImage;
  document.querySelector('#assetDetailGeneratedImage').textContent = asset.generatedImage;
  document.querySelector('#assetDetailSourceRemark').textContent = `素材备注：${asset.note || '—'}`;
  document.querySelector('#assetDetail3dTask').textContent = asset.threeDTask ? `3D 任务：${asset.threeDTask} · ${threeDLabels[asset.threeD]}${asset.threeDFaces ? ` · ${asset.threeDFaces.toLocaleString()} 面` : ''}` : '尚未发起 3D 任务';
  document.querySelector('#assetDetail3dRemark').textContent = `3D 备注：${asset.threeDRemark || '—'}`;
  const actionArea = document.querySelector('#assetDetailAction');
  actionArea.innerHTML = '';
  if (eligibleFor3D(asset)) { const button = document.createElement('button'); button.className = 'primary-btn'; button.type = 'button'; button.textContent = asset.threeD === 'failed' ? '重试 3D' : '发起 3D'; button.addEventListener('click', () => { assetDetailModal.hidden = true; openThreeD([asset]); }); actionArea.append(button); } else { const button = document.createElement('button'); button.className = 'ghost-btn'; button.type = 'button'; button.textContent = '查看 3D 任务'; button.addEventListener('click', () => toast(`已跳转至 ${asset.threeDTask || 'Gen2Sim'} 3D 任务`)); actionArea.append(button); }
  assetDetailModal.hidden = false;
}

function closeAssetDetail() { assetDetailModal.hidden = true; detailAsset = null; }
function openThreeD(selectedAssets) {
  threeDAssets = selectedAssets.filter(eligibleFor3D);
  if (!threeDAssets.length) { toast('请选择未发起或生成失败的 2D 素材'); return; }
  const isBatch = threeDAssets.length > 1;
  document.querySelector('#threeDTitle').textContent = isBatch ? '批量发起 3D' : '单图发起 3D';
  document.querySelector('#threeDAssets').innerHTML = threeDAssets.map((asset) => `<div class="three-d-asset"><div class="asset-swatch" style="--asset-tone:${asset.tone}">2D</div><div><strong>${asset.name}</strong><span>${asset.id}</span></div></div>`).join('');
  document.querySelector('#threeDSubmit').textContent = isBatch ? `提交 ${threeDAssets.length} 个 3D 任务` : '提交 3D 生成';
  document.querySelector('#threeDSubmitSummary').textContent = `输入 ${threeDAssets.length} 张 2D 素材 · 将创建 ${threeDAssets.length} 个独立 3D 任务`;
  document.querySelector('#threeDTip').textContent = isBatch ? `共 ${threeDAssets.length} 个 2D Asset；系统将为每张素材创建一个独立的单图 3D 任务，并自动带入对应 Asset ID 与图片地址。` : '系统将自动带入正式 2D Asset ID 与图片地址，创建后可在 Gen2Sim 查看生成任务。';
  document.querySelector('#threeDRemark').value = '';
  threeDModal.hidden = false;
}
function closeThreeD() { threeDModal.hidden = true; threeDAssets = []; }
function closeBatchResult() { threeDBatchResultModal.hidden = true; failedBatchAssetIds = []; }

function taskId(index) { return `3D-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(91 + index).padStart(5, '0')}`; }
function setGenerating(asset, faces, remark, index) {
  asset.threeD = 'generating';
  asset.threeDTask = taskId(index);
  asset.threeDFaces = faces;
  asset.threeDRemark = remark;
  asset.threeDFailureReason = '';
}
function renderBatchResult(successes, failures) {
  document.querySelector('#threeDBatchSuccessCount').textContent = `${successes.length} 个`;
  document.querySelector('#threeDBatchFailureCount').textContent = `${failures.length} 个`;
  document.querySelector('#threeDBatchSuccessList').innerHTML = successes.map((asset) => `<div class="batch-result-item"><div class="asset-swatch" style="--asset-tone:${asset.tone}">2D</div><div><strong>${asset.name}</strong><span>${asset.id}</span></div><em class="batch-result-success">已创建 ${asset.threeDTask}</em></div>`).join('');
  document.querySelector('#threeDBatchFailureList').innerHTML = failures.map((asset) => `<div class="batch-result-item"><div class="asset-swatch" style="--asset-tone:${asset.tone}">2D</div><div><strong>${asset.name}</strong><span>${asset.id}</span></div><em class="batch-result-failed">${asset.threeDFailureReason || '服务提交失败'}</em></div>`).join('');
  document.querySelector('#retryFailed3d').hidden = failures.length === 0;
  threeDBatchResultModal.hidden = false;
}

function bindActions() {
  assetBody.querySelectorAll('[data-asset-select]').forEach((input) => input.addEventListener('change', () => { input.checked ? selectedAssetIds.add(input.dataset.assetSelect) : selectedAssetIds.delete(input.dataset.assetSelect); renderAssets(); }));
  assetBody.querySelectorAll('[data-start-id]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); const asset = assets.find((item) => item.id === button.dataset.startId); if (!asset) { toast('未找到该素材，请刷新页面后重试'); return; } openThreeD([asset]); }));
  assetBody.querySelectorAll('[data-details]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); openAssetDetail(assets.find((asset) => asset.id === button.dataset.details)); }));
  assetBody.querySelectorAll('[data-view-id]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); const asset = assets.find((item) => item.id === button.dataset.viewId); toast(`已跳转至 ${asset?.threeDTask || 'Gen2Sim'} 3D 任务`); }));
}

assetSearch.addEventListener('input', renderAssets);
assetOwnerFilter.addEventListener('change', renderAssets);
asset3dFilter.addEventListener('change', renderAssets);
document.querySelector('#assetReset').addEventListener('click', () => { assetSearch.value = ''; assetOwnerFilter.value = 'all'; asset3dFilter.value = 'all'; selectedAssetIds.clear(); renderAssets(); });
assetSelectAll.addEventListener('change', () => { filteredAssets().filter(eligibleFor3D).forEach((asset) => assetSelectAll.checked ? selectedAssetIds.add(asset.id) : selectedAssetIds.delete(asset.id)); renderAssets(); });
batchStart3d.addEventListener('click', () => openThreeD(assets.filter((asset) => selectedAssetIds.has(asset.id))));
document.querySelectorAll('.asset-detail-close').forEach((button) => button.addEventListener('click', closeAssetDetail));
assetDetailModal.addEventListener('click', (event) => { if (event.target === assetDetailModal) closeAssetDetail(); });
document.querySelectorAll('.three-d-close').forEach((button) => button.addEventListener('click', closeThreeD));
threeDModal.addEventListener('click', (event) => { if (event.target === threeDModal) closeThreeD(); });
document.querySelector('#threeDForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!threeDAssets.length || !event.currentTarget.reportValidity()) return;
  const remark = document.querySelector('#threeDRemark').value.trim();
  const faces = Number(document.querySelector('#threeDFaces').value);
  const submittedAssets = [...threeDAssets];
  if (submittedAssets.length === 1) {
    setGenerating(submittedAssets[0], faces, remark, 0);
    selectedAssetIds.delete(submittedAssets[0].id);
    closeThreeD(); renderAssets(); toast('3D 生成任务已创建，正在跳转 Gen2Sim');
    return;
  }
  const successes = submittedAssets.filter((_, index) => index % 2 === 0);
  const failures = submittedAssets.filter((_, index) => index % 2 === 1);
  successes.forEach((asset, index) => { setGenerating(asset, faces, remark, index); selectedAssetIds.delete(asset.id); });
  failures.forEach((asset) => { asset.threeD = 'failed'; asset.threeDFailureReason = '服务提交超时，请稍后重试'; selectedAssetIds.delete(asset.id); });
  failedBatchAssetIds = failures.map((asset) => asset.id);
  closeThreeD(); renderAssets(); renderBatchResult(successes, failures);
});
document.querySelectorAll('.batch-result-close').forEach((button) => button.addEventListener('click', closeBatchResult));
threeDBatchResultModal.addEventListener('click', (event) => { if (event.target === threeDBatchResultModal) closeBatchResult(); });
document.querySelector('#retryFailed3d').addEventListener('click', () => {
  const retryAssets = assets.filter((asset) => failedBatchAssetIds.includes(asset.id) && asset.threeD === 'failed');
  retryAssets.forEach((asset, index) => setGenerating(asset, asset.threeDFaces || 50000, asset.threeDRemark || '', index));
  const count = retryAssets.length;
  closeBatchResult(); renderAssets(); toast(`已仅重试 ${count} 个失败项，成功项不会重复创建`);
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeAssetDetail(); closeThreeD(); closeBatchResult(); } });
renderAssets();
