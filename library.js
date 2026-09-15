const itemGroups = [
  { id: '2D-20260910-00126', name: '人体工学办公椅', note: '用于办公场景资产', owner: '陈建模', time: '今天 11:20', tone: '#dfeafe', threeD: 'not_started', assets: [{ id: '2D-ASSET-20260910-000381', view: '主视角' }, { id: '2D-ASSET-20260910-000382', view: '45°' }, { id: '2D-ASSET-20260910-000384', view: '俯角' }] },
  { id: '2D-20260910-00124', name: '复古皮质行李箱', note: '突出皮质纹理', owner: '陈建模', time: '今天 10:55', tone: '#f4e8d7', threeD: 'generating', batchId: '3D-BATCH-20260911-000036', assets: [{ id: '2D-ASSET-20260910-000383', view: '主视角' }, { id: '2D-ASSET-20260910-000385', view: '45°' }] },
  { id: '2D-20260909-00119', name: '陶瓷花瓶', note: '', owner: '林嘉', time: '昨天 16:18', tone: '#e8e2f5', threeD: 'completed', batchId: '3D-BATCH-20260910-000089', assets: [{ id: '2D-ASSET-20260909-000366', view: '主视角' }] },
  { id: '2D-20260909-00122', name: '原木圆形餐桌', note: '餐桌素材补充批次', owner: '陈建模', time: '昨天 18:46', tone: '#e0eef0', threeD: 'failed', batchId: '3D-BATCH-20260910-000074', assets: [{ id: '2D-ASSET-20260909-000365', view: '主视角' }, { id: '2D-ASSET-20260909-000367', view: '45°' }] }
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
let selectedGroupIds = new Set();
let selectedGroups = [];
let retryBatchId = '';
let currentBatchId = '';
let toastTimer;

const statusLabels = { not_started: '未发起 3D', generating: '生成中', completed: '已完成', failed: '生成失败' };
const selectable = (group) => ['not_started', 'failed'].includes(group.threeD);
function toast(message) { assetToast.textContent = message; assetToast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => assetToast.classList.remove('show'), 2400); }
function filteredGroups() {
  const keyword = assetSearch.value.trim().toLowerCase();
  const owner = assetOwnerFilter.value;
  const status = asset3dFilter.value;
  return itemGroups.filter((group) => (!keyword || group.name.toLowerCase().includes(keyword) || group.id.toLowerCase().includes(keyword)) && (owner === 'all' || group.owner === owner) && (status === 'all' || group.threeD === status));
}
function updateSelectionToolbar() {
  const groups = itemGroups.filter((group) => selectedGroupIds.has(group.id));
  const assetCount = groups.reduce((sum, group) => sum + group.assets.length, 0);
  assetSelectionInfo.textContent = groups.length ? `已选择 ${groups.length} 个物品 / 任务组 · 共 ${assetCount} 张正式 2D Asset` : '未选择物品 / 任务组';
  batchStart3d.disabled = groups.length === 0;
  const eligibleVisible = filteredGroups().filter(selectable);
  assetSelectAll.checked = eligibleVisible.length > 0 && eligibleVisible.every((group) => selectedGroupIds.has(group.id));
  assetSelectAll.indeterminate = eligibleVisible.some((group) => selectedGroupIds.has(group.id)) && !assetSelectAll.checked;
}
function groupAction(group) {
  if (group.threeD === 'not_started') return `<button type="button" class="action-link" data-details="${group.id}">详情</button><button type="button" class="action-link" data-start-group="${group.id}">发起 3D</button>`;
  if (group.threeD === 'failed') return `<button type="button" class="action-link" data-details="${group.id}">详情</button><button type="button" class="action-link" data-retry-group="${group.id}">重试 3D</button>`;
  return `<button type="button" class="action-link" data-details="${group.id}">详情</button><button type="button" class="action-link" data-view-batch="${group.id}">查看 3D 任务</button>`;
}
function renderGroups() {
  const groups = filteredGroups();
  assetBody.innerHTML = groups.map((group) => {
    const views = group.assets.map((asset) => asset.view).join(' · ');
    return `<tr><td><label class="asset-check"><input type="checkbox" data-group-select="${group.id}" ${selectedGroupIds.has(group.id) ? 'checked' : ''} ${selectable(group) ? '' : 'disabled'} aria-label="选择 ${group.name} 任务组"><span></span></label></td><td><div class="asset-thumbnail" style="--asset-tone:${group.tone}">缩略图</div></td><td><div class="task-name"><strong>${group.name}</strong><code>${group.id}</code></div></td><td><div class="group-assets-count"><strong>已入库 ${group.assets.length} 张</strong><span>${views}</span></div></td><td><span class="asset-status ${group.threeD}">${statusLabels[group.threeD]}</span></td><td><span class="task-note" title="${group.note}">${group.note || '—'}</span></td><td><div class="owner"><span class="mini-avatar">${group.owner[0]}</span>${group.owner}</div></td><td><span class="time">${group.time}</span></td><td>${groupAction(group)}</td></tr>`;
  }).join('');
  assetEmpty.classList.toggle('show', groups.length === 0);
  assetCount.textContent = `共 ${groups.length} 个物品 / 任务组`;
  updateSelectionToolbar();
  bindActions();
}
function renderDetailItems(group) {
  return group.assets.map((asset) => `<div class="group-asset-item"><div class="asset-swatch" style="--asset-tone:${group.tone}">2D</div><div><strong>${asset.view}</strong><span>${asset.id}</span></div></div>`).join('');
}
function openGroupDetail(group) {
  document.querySelector('#assetDetailTitle').textContent = group.name;
  document.querySelector('#assetDetailPreview').style.setProperty('--preview-tone', group.tone);
  document.querySelector('#assetDetailPreviewLabel').textContent = `正式 2D Asset · 共 ${group.assets.length} 张`;
  document.querySelector('#assetDetailSourceTask').textContent = group.id;
  document.querySelector('#assetDetailCount').textContent = `${group.assets.length} 张`;
  document.querySelector('#assetDetailInboundTime').textContent = group.time;
  document.querySelector('#assetDetailAuditInbound').textContent = group.time;
  document.querySelector('#assetDetail3dStatus').innerHTML = `<span class="asset-status ${group.threeD}">${statusLabels[group.threeD]}</span>`;
  document.querySelector('#assetDetailItems').innerHTML = renderDetailItems(group);
  document.querySelector('#assetDetailSourceRemark').textContent = `备注：${group.note || '—'}`;
  document.querySelector('#assetDetail3dTask').textContent = group.batchId ? `关联 3D 批次任务：${group.batchId}` : '尚未加入 3D 批次任务';
  document.querySelector('#assetDetail3dRemark').textContent = group.batchId ? '批次状态以整体结果展示；不显示单项处理结果。' : '可在素材库选择该物品组或多个物品组发起 3D。';
  assetDetailModal.hidden = false;
}
function closeAssetDetail() { assetDetailModal.hidden = true; }
function openThreeD(groups, retryId = '') {
  selectedGroups = groups;
  retryBatchId = retryId;
  const assetCount = groups.reduce((sum, group) => sum + group.assets.length, 0);
  const isRetry = Boolean(retryId);
  document.querySelector('#threeDTitle').textContent = isRetry ? '重试 3D 批次任务' : '批量发起 3D';
  document.querySelector('#threeDSubmitSummary').textContent = isRetry ? `重试原 3D 批次任务 · ${groups.length} 个物品 / 任务组 · 共 ${assetCount} 张正式 2D Asset` : `已选择 ${groups.length} 个物品 / 任务组 · 共 ${assetCount} 张正式 2D Asset`;
  document.querySelector('#threeDAssets').innerHTML = groups.map((group) => `<div class="three-d-group"><div class="three-d-group-title"><div class="asset-swatch" style="--asset-tone:${group.tone}">2D</div><div><strong>${group.name}</strong><span>${group.id} · 共 ${group.assets.length} 张</span></div></div><div class="three-d-group-assets">${group.assets.map((asset) => `<span>${asset.view} · ${asset.id}</span>`).join('')}</div></div>`).join('');
  document.querySelector('#threeDSubmit').textContent = isRetry ? '重试原 3D 批次任务' : `提交 1 个 3D 批次任务（含 ${assetCount} 项）`;
  document.querySelector('#threeDTip').textContent = isRetry ? '系统将重试原批次；已成功生成的后台结果会被复用，不重复创建或计费。' : `系统将创建 1 个 3D 批次任务，并为 ${assetCount} 张正式 2D Asset 创建独立生成项；前台仅展示该批次整体状态。`;
  document.querySelector('#threeDRemark').value = '';
  threeDModal.hidden = false;
}
function closeThreeD() { threeDModal.hidden = true; selectedGroups = []; retryBatchId = ''; }
function closeBatchResult() { threeDBatchResultModal.hidden = true; }
function batchId() { return `3D-BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000091`; }
function renderBatchResult(groups, assetCount, retried) {
  document.querySelector('#threeDBatchResultTitle').textContent = retried ? '3D 批次任务已重新提交' : '3D 批次任务已创建';
  document.querySelector('#threeDBatchId').textContent = `3D 批次任务：${currentBatchId}`;
  document.querySelector('#threeDBatchStatus').textContent = '生成中';
  document.querySelector('#threeDBatchAssetCount').textContent = `${assetCount} 张正式 2D Asset`;
  document.querySelector('#threeDBatchGroupList').innerHTML = groups.map((group) => `<div class="batch-result-item"><div class="asset-swatch" style="--asset-tone:${group.tone}">2D</div><div><strong>${group.name}</strong><span>${group.id} · ${group.assets.length} 张正式 2D Asset</span></div></div>`).join('');
  threeDBatchResultModal.hidden = false;
}
function bindActions() {
  assetBody.querySelectorAll('[data-group-select]').forEach((input) => input.addEventListener('change', () => { input.checked ? selectedGroupIds.add(input.dataset.groupSelect) : selectedGroupIds.delete(input.dataset.groupSelect); renderGroups(); }));
  assetBody.querySelectorAll('[data-details]').forEach((button) => button.addEventListener('click', () => openGroupDetail(itemGroups.find((group) => group.id === button.dataset.details))));
  assetBody.querySelectorAll('[data-start-group]').forEach((button) => button.addEventListener('click', () => openThreeD([itemGroups.find((group) => group.id === button.dataset.startGroup)])));
  assetBody.querySelectorAll('[data-retry-group]').forEach((button) => button.addEventListener('click', () => { const group = itemGroups.find((item) => item.id === button.dataset.retryGroup); openThreeD(itemGroups.filter((item) => item.batchId === group.batchId), group.batchId); }));
  assetBody.querySelectorAll('[data-view-batch]').forEach((button) => button.addEventListener('click', () => { const group = itemGroups.find((item) => item.id === button.dataset.viewBatch); toast(`已跳转至 ${group.batchId || 'Gen2Sim'} 3D 任务`); }));
}

assetSearch.addEventListener('input', renderGroups);
assetOwnerFilter.addEventListener('change', renderGroups);
asset3dFilter.addEventListener('change', renderGroups);
document.querySelector('#assetReset').addEventListener('click', () => { assetSearch.value = ''; assetOwnerFilter.value = 'all'; asset3dFilter.value = 'all'; selectedGroupIds.clear(); renderGroups(); });
assetSelectAll.addEventListener('change', () => { filteredGroups().filter(selectable).forEach((group) => assetSelectAll.checked ? selectedGroupIds.add(group.id) : selectedGroupIds.delete(group.id)); renderGroups(); });
batchStart3d.addEventListener('click', () => openThreeD(itemGroups.filter((group) => selectedGroupIds.has(group.id))));
document.querySelectorAll('.asset-detail-close').forEach((button) => button.addEventListener('click', closeAssetDetail));
assetDetailModal.addEventListener('click', (event) => { if (event.target === assetDetailModal) closeAssetDetail(); });
document.querySelectorAll('.three-d-close').forEach((button) => button.addEventListener('click', closeThreeD));
threeDModal.addEventListener('click', (event) => { if (event.target === threeDModal) closeThreeD(); });
document.querySelector('#threeDForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!selectedGroups.length || !event.currentTarget.reportValidity()) return;
  const assetCount = selectedGroups.reduce((sum, group) => sum + group.assets.length, 0);
  currentBatchId = retryBatchId || batchId();
  selectedGroups.forEach((group) => { group.threeD = 'generating'; group.batchId = currentBatchId; });
  const submittedGroups = [...selectedGroups];
  const wasRetry = Boolean(retryBatchId);
  selectedGroupIds.clear();
  closeThreeD(); renderGroups(); renderBatchResult(submittedGroups, assetCount, wasRetry);
});
document.querySelectorAll('.batch-result-close').forEach((button) => button.addEventListener('click', closeBatchResult));
threeDBatchResultModal.addEventListener('click', (event) => { if (event.target === threeDBatchResultModal) closeBatchResult(); });
document.querySelector('#viewBatch3d').addEventListener('click', () => toast(`已跳转至 ${currentBatchId} 3D 任务`));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeAssetDetail(); closeThreeD(); closeBatchResult(); } });
renderGroups();
