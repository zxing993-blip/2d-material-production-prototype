const reviewTasks = [
  { id: '2D-20260910-00126', name: '人体工学办公椅', category: '家具', owner: '陈建模' },
  { id: '2D-20260910-00127', name: '现代玻璃花瓶', category: '家居用品', owner: '陈建模' },
  { id: '2D-20260910-00125', name: '北欧落地灯', category: '灯具', owner: '林嘉' },
  { id: '2D-20260910-00123', name: '工业金属工具柜', category: '工具设备', owner: '王岩' }
];

const reviewItems = Array.from({ length: 12 }, (_, index) => {
  const task = reviewTasks[Math.floor(index / 3)];
  const suggestedMode = ['edit', 'generate', 'edit', 'generate', 'generate', 'edit'][index % 6];
  return { id: index + 1, taskId: task.id, name: task.name, category: task.category, owner: task.owner, suggestedMode, mode: null, status: 'pending', tone: suggestedMode === 'edit' ? '#dfeafe' : '#ede5fb' };
});

const reviewGrid = document.querySelector('#reviewGrid');
const statusFilter = document.querySelector('#reviewStatusFilter');
const reviewTaskFilter = new URLSearchParams(location.search).get('task');
const modeFilter = document.querySelector('#reviewModeFilter');
const searchInput = document.querySelector('#reviewSearch');
const ownerFilter = document.querySelector('#reviewOwnerFilter');
const toast = document.querySelector('#reviewToast');
const sourcePreviewModal = document.querySelector('#sourcePreviewModal');
const sourcePreviewTitle = document.querySelector('#sourcePreviewTitle');
const sourcePreviewIndex = document.querySelector('#sourcePreviewIndex');
const sourcePreviewImage = document.querySelector('#sourcePreviewImage');
const sourcePreviewLabel = document.querySelector('#sourcePreviewLabel');
const sourcePreviewId = document.querySelector('#sourcePreviewId');
const sourcePreviewCategory = document.querySelector('#sourcePreviewCategory');
const sourcePreviewOwner = document.querySelector('#sourcePreviewOwner');
const sourcePreviewRecommended = document.querySelector('#sourcePreviewRecommended');
const sourcePreviewStatus = document.querySelector('#sourcePreviewStatus');
const sourcePreviewPrev = document.querySelector('#sourcePreviewPrev');
const sourcePreviewNext = document.querySelector('#sourcePreviewNext');
const sourcePreviewDecision = document.querySelector('#sourcePreviewDecision');
const configureImagesModal = document.querySelector('#configureImagesModal');
let selected = new Set();
let timer;
let sourcePreviewItemId = null;
let configuredItems = [];

const modeLabel = { edit: '编辑图', generate: '生图' };
const statusLabel = { pending: '待决策', edit: '待编辑处理', generate: '待生图配置', rejected: '已不通过' };

function toastMessage(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => toast.classList.remove('show'), 2000); }
function filteredItems() {
  const keyword = searchInput.value.trim().toLowerCase();
  return reviewItems.filter((item) =>
    (!reviewTaskFilter || item.taskId === reviewTaskFilter) &&
    (statusFilter.value === 'all' || item.status === statusFilter.value) &&
    (modeFilter.value === 'all' || item.mode === modeFilter.value || (!item.mode && item.suggestedMode === modeFilter.value)) &&
    (!keyword || item.name.toLowerCase().includes(keyword) || `src-${String(item.id).padStart(4, '0')}`.includes(keyword)) &&
    (ownerFilter.value === 'all' || item.owner === ownerFilter.value)
  );
}
function selectedItems() { return reviewItems.filter((item) => selected.has(item.id)); }
function updateSummary() {
  const counts = reviewItems.reduce((result, item) => ({ ...result, [item.status]: result[item.status] + 1 }), { pending: 0, edit: 0, generate: 0, rejected: 0 });
  document.querySelector('#pendingCount').textContent = counts.pending;
  document.querySelector('#editCount').textContent = counts.edit;
  document.querySelector('#generateCount').textContent = counts.generate;
  document.querySelector('#rejectedCount').textContent = counts.rejected;
  document.querySelector('#reviewResultCount').textContent = `共 ${filteredItems().length} 张`;
}
function updateSelectionActions() {
  const items = selectedItems();
  const pendingItems = items.filter((item) => item.status === 'pending');
  const editItems = items.filter((item) => item.status === 'edit');
  const generateItems = items.filter((item) => item.status === 'generate');
  const readyItems = [...editItems, ...generateItems];
  document.querySelector('#reviewSelectionInfo').textContent = items.length ? `已选择 ${items.length} 张 · 编辑图 ${editItems.length} 张 · 生图 ${generateItems.length} 张${pendingItems.length ? ` · 待决策 ${pendingItems.length} 张` : ''}` : '未选择图片';
  document.querySelector('#batchSetEdit').disabled = pendingItems.length === 0;
  document.querySelector('#batchSetGenerate').disabled = pendingItems.length === 0;
  document.querySelector('#batchSetReject').disabled = pendingItems.length === 0;
  document.querySelector('#configureImages').disabled = readyItems.length === 0;
}
function card(item) {
  const selectedState = selected.has(item.id) ? 'checked' : '';
  const actions = item.status === 'pending'
    ? `<button data-route="edit" data-item-id="${item.id}">编辑图</button><button class="card-approve" data-route="generate" data-item-id="${item.id}">生图</button><button class="card-reject" data-reject="${item.id}">不通过</button>`
    : item.status === 'edit' || item.status === 'generate'
      ? `<button class="card-approve" data-open-config="${item.id}">配置图片</button>`
        : '<span class="handled-text">已处理</span>';
  return `<article class="review-card source-queue-card suggestion-${item.suggestedMode} ${item.status}">
    <label class="review-select"><input type="checkbox" data-select="${item.id}" ${selectedState}><span></span></label>
    <div class="image-swatch generated-swatch" style="--swatch:${item.tone}"><span>原图 ${String(item.id).padStart(2, '0')}</span><em class="suggested-overlay ${item.suggestedMode}">推荐：${modeLabel[item.suggestedMode]}</em><button class="generated-preview-trigger" type="button" data-source-preview="${item.id}">查看并处理</button></div>
    <div class="review-item-meta"><strong>${item.name}</strong><span>SRC-${String(item.id).padStart(4, '0')}</span></div>
    <div class="source-card-context"><span>${item.taskId}</span><span>${item.owner}</span></div>
    <div class="review-card-footer"><span class="review-status ${item.status}">${statusLabel[item.status]}</span><div class="review-card-actions">${actions}</div></div>
  </article>`;
}
function renderReview() { reviewGrid.innerHTML = filteredItems().map(card).join(''); bindReviewActions(); updateSummary(); updateSelectionActions(); }

function sourcePreviewQueue() { return filteredItems(); }
function renderSourcePreview() {
  const item = reviewItems.find((row) => row.id === sourcePreviewItemId); if (!item) return;
  const queue = sourcePreviewQueue();
  const index = queue.findIndex((row) => row.id === item.id);
  sourcePreviewTitle.textContent = item.name;
  sourcePreviewIndex.textContent = `${index >= 0 ? index + 1 : 1} / ${queue.length || 1}`;
  sourcePreviewImage.style.setProperty('--preview-tone', item.tone);
  sourcePreviewLabel.textContent = `原图 ${String(item.id).padStart(2, '0')}`;
  sourcePreviewId.textContent = `SRC-${String(item.id).padStart(4, '0')}`;
  sourcePreviewCategory.textContent = item.category;
  sourcePreviewOwner.textContent = item.owner;
  sourcePreviewRecommended.textContent = modeLabel[item.suggestedMode];
  sourcePreviewStatus.className = `generated-preview-status ${item.status}`;
  sourcePreviewStatus.textContent = statusLabel[item.status];
  sourcePreviewPrev.disabled = index <= 0;
  sourcePreviewNext.disabled = index < 0 || index >= queue.length - 1;
  sourcePreviewDecision.hidden = item.status !== 'pending';
}
function openSourcePreview(itemId) { sourcePreviewItemId = Number(itemId); sourcePreviewModal.hidden = false; renderSourcePreview(); }
function closeSourcePreview() { sourcePreviewModal.hidden = true; sourcePreviewItemId = null; }
function moveSourcePreview(direction) {
  const queue = sourcePreviewQueue();
  const index = queue.findIndex((item) => item.id === sourcePreviewItemId);
  if (!queue[index + direction]) return;
  sourcePreviewItemId = queue[index + direction].id;
  renderSourcePreview();
}
function nextPending(currentId) {
  const queue = sourcePreviewQueue();
  const index = queue.findIndex((item) => item.id === currentId);
  return queue.slice(index + 1).find((item) => item.status === 'pending') || queue.find((item) => item.status === 'pending') || null;
}
function routeItems(ids, route, fromPreview = false) {
  const current = fromPreview ? reviewItems.find((item) => item.id === sourcePreviewItemId) : null;
  ids.forEach((id) => { const item = reviewItems.find((row) => row.id === id); if (!item || item.status !== 'pending') return; item.mode = route; item.status = route; selected.add(id); });
  renderReview(); toastMessage(route === 'edit' ? '已设为编辑图，待统一编辑规则处理' : '已设为生图，待图生图配置');
  if (!current) return;
  const next = nextPending(current.id);
  if (next) { sourcePreviewItemId = next.id; renderSourcePreview(); } else { closeSourcePreview(); toastMessage('当前筛选队列已无待决策图片'); }
}
function rejectItems(ids, fromPreview = false) {
  const current = fromPreview ? reviewItems.find((item) => item.id === sourcePreviewItemId) : null;
  ids.forEach((id) => { const item = reviewItems.find((row) => row.id === id); if (item) { item.status = 'rejected'; item.mode = null; selected.delete(id); } });
  renderReview(); toastMessage('已标记为不通过');
  if (!current) return;
  const next = nextPending(current.id);
  if (next) { sourcePreviewItemId = next.id; renderSourcePreview(); } else { closeSourcePreview(); toastMessage('当前筛选队列已无待决策图片'); }
}
function generationGroups(items) {
  const groups = new Map();
  items.filter((item) => item.status === 'generate').forEach((item) => {
    if (!groups.has(item.taskId)) groups.set(item.taskId, { ...item, items: [] });
    groups.get(item.taskId).items.push(item);
  });
  return [...groups.values()];
}
function bindConfigChoices(root = document) {
  root.querySelectorAll('[data-config-choice-group]').forEach((group) => group.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
    group.querySelectorAll('button').forEach((choice) => choice.classList.toggle('active', choice === button));
  })));
}
function renderConfigureImagesModal() {
  const edits = configuredItems.filter((item) => item.status === 'edit');
  const groups = generationGroups(configuredItems);
  const editTaskCount = new Set(edits.map((item) => item.taskId)).size;
  document.querySelector('#configureSelectionSummary').textContent = `已选 ${configuredItems.length} 张图片`;
  document.querySelector('#configureEditCount').textContent = `${edits.length} 张`;
  document.querySelector('#configureGenerateCount').textContent = `${configuredItems.filter((item) => item.status === 'generate').length} 张`;
  document.querySelector('#configureEditCountBadge').textContent = `编辑图 ${edits.length} 张`;
  document.querySelector('#configureEditBlock').hidden = edits.length === 0;
  document.querySelector('#configureGenerateSection').hidden = groups.length === 0;
  document.querySelector('#configureEditScope').textContent = edits.length ? `覆盖 ${editTaskCount} 个物品任务 · ${edits.length} 张` : '';
  document.querySelector('#configureGenerateScope').textContent = `${groups.length} 个物品任务`;
  document.querySelector('#configureGenerateBlocks').innerHTML = groups.map((group) => `<section class="config-generate-group"><header><div><strong>${group.name}</strong><span>${group.taskId}</span></div><b>生图 ${group.items.length} 张</b></header><div class="config-modal-grid"><label class="config-prompt-field"><span>Prompt 模板 <em>可编辑</em></span><textarea maxlength="1000">以参考原图的物品主体为基础，保持主体外观、结构、材质与比例一致；生成单一完整物品，背景干净，避免新增无关物体。</textarea><small>仅应用到该物品任务的 ${group.items.length} 张图片。</small></label><div class="config-side-fields"><label class="form-field"><span>模型版本</span><input value="千问图生图 v1.0（默认）" readonly></label><div class="form-field"><span>目标视角 <b>*</b></span><div class="view-options" data-config-choice-group><button type="button" class="active">主视角</button><button type="button">45°</button><button type="button">俯角</button></div></div><label class="form-field"><span>画幅比例</span><input value="1:1 · 1024×1024" readonly></label></div></div><p class="config-output-rule">输入 ${group.items.length} 张 → 输出 ${group.items.length} 张 · N 进 N 出</p></section>`).join('');
  const summary = [edits.length ? '编辑图处理 1 组' : '', groups.length ? `图生图处理 ${groups.length} 组` : ''].filter(Boolean).join(' · ');
  document.querySelector('#configureTotalOutputRule').textContent = `输入 ${configuredItems.length} 张 → 输出 ${configuredItems.length} 张 · N 进 N 出`;
  document.querySelector('#configureSubmitSummary').textContent = `将提交：${summary}`;
  bindConfigChoices(configureImagesModal);
}
function openConfigureImages(items) {
  configuredItems = items.filter((item) => item.status === 'edit' || item.status === 'generate');
  if (!configuredItems.length) { toastMessage('请先确认图片处理方式'); return; }
  renderConfigureImagesModal();
  configureImagesModal.hidden = false;
}
function closeConfigureImages() { configureImagesModal.hidden = true; configuredItems = []; }
function bindReviewActions() {
  reviewGrid.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => { input.checked ? selected.add(Number(input.dataset.select)) : selected.delete(Number(input.dataset.select)); renderReview(); }));
  reviewGrid.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => routeItems([Number(button.dataset.itemId)], button.dataset.route)));
  reviewGrid.querySelectorAll('[data-reject]').forEach((button) => button.addEventListener('click', () => rejectItems([Number(button.dataset.reject)])));
  reviewGrid.querySelectorAll('[data-source-preview]').forEach((button) => button.addEventListener('click', () => openSourcePreview(button.dataset.sourcePreview)));
  reviewGrid.querySelectorAll('[data-open-config]').forEach((button) => button.addEventListener('click', () => openConfigureImages([reviewItems.find((item) => item.id === Number(button.dataset.openConfig))])));
}

statusFilter.addEventListener('change', renderReview);
modeFilter.addEventListener('change', renderReview);
searchInput.addEventListener('input', renderReview);
ownerFilter.addEventListener('change', renderReview);
document.querySelector('#reviewReset').addEventListener('click', () => { statusFilter.value = 'all'; modeFilter.value = 'all'; searchInput.value = ''; ownerFilter.value = 'all'; selected.clear(); renderReview(); });
document.querySelector('#reviewSelectAll').addEventListener('click', () => { filteredItems().forEach((item) => selected.add(item.id)); renderReview(); });
document.querySelector('#reviewInvert').addEventListener('click', () => { filteredItems().forEach((item) => selected.has(item.id) ? selected.delete(item.id) : selected.add(item.id)); renderReview(); });
document.querySelector('#batchSetEdit').addEventListener('click', () => routeItems(selectedItems().filter((item) => item.status === 'pending').map((item) => item.id), 'edit'));
document.querySelector('#batchSetGenerate').addEventListener('click', () => routeItems(selectedItems().filter((item) => item.status === 'pending').map((item) => item.id), 'generate'));
document.querySelector('#batchSetReject').addEventListener('click', () => rejectItems(selectedItems().filter((item) => item.status === 'pending').map((item) => item.id)));
document.querySelector('#configureImages').addEventListener('click', () => openConfigureImages(selectedItems()));
document.querySelectorAll('.source-preview-close').forEach((button) => button.addEventListener('click', closeSourcePreview));
sourcePreviewModal.addEventListener('click', (event) => { if (event.target === sourcePreviewModal) closeSourcePreview(); });
sourcePreviewPrev.addEventListener('click', () => moveSourcePreview(-1));
sourcePreviewNext.addEventListener('click', () => moveSourcePreview(1));
document.querySelector('#sourcePreviewEdit').addEventListener('click', () => routeItems([sourcePreviewItemId], 'edit', true));
document.querySelector('#sourcePreviewGenerate').addEventListener('click', () => routeItems([sourcePreviewItemId], 'generate', true));
document.querySelector('#sourcePreviewReject').addEventListener('click', () => rejectItems([sourcePreviewItemId], true));
document.querySelectorAll('.configure-images-close').forEach((button) => button.addEventListener('click', closeConfigureImages));
configureImagesModal.addEventListener('click', (event) => { if (event.target === configureImagesModal) closeConfigureImages(); });
document.querySelector('#configureImagesForm').addEventListener('submit', (event) => { event.preventDefault(); closeConfigureImages(); toastMessage('已提交图片处理配置，可在生产任务中查看进度'); });
document.addEventListener('keydown', (event) => {
  if (sourcePreviewModal.hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  if (event.key === 'Escape') return closeSourcePreview();
  if (event.key === 'ArrowLeft') return moveSourcePreview(-1);
  if (event.key === 'ArrowRight') return moveSourcePreview(1);
  const item = reviewItems.find((row) => row.id === sourcePreviewItemId);
  if (!item || item.status !== 'pending') return;
  if (event.key.toLowerCase() === 'e') routeItems([sourcePreviewItemId], 'edit', true);
  if (event.key.toLowerCase() === 'g') routeItems([sourcePreviewItemId], 'generate', true);
  if (event.key === 'Delete') { event.preventDefault(); rejectItems([sourcePreviewItemId], true); }
});
renderReview();
