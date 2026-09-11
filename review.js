const reviewTasks = [
  { id: '2D-20260910-00126', name: '人体工学办公椅', category: '家具', owner: '陈建模' },
  { id: '2D-20260910-00127', name: '现代玻璃花瓶', category: '家居用品', owner: '陈建模' },
  { id: '2D-20260910-00125', name: '北欧落地灯', category: '灯具', owner: '林嘉' },
  { id: '2D-20260910-00123', name: '工业金属工具柜', category: '工具设备', owner: '王岩' }
];

const reviewItems = Array.from({ length: 12 }, (_, index) => {
  const task = reviewTasks[Math.floor(index / 3)];
  return { id: index + 1, taskId: task.id, name: task.name, category: task.category, owner: task.owner, status: 'pending', tone: ['#dfeafe', '#e8f0e9', '#f3e7d5', '#e7e0f5', '#dfecef', '#f2e1e3'][index % 6] };
});

const reviewGrid = document.querySelector('#reviewGrid');
const statusFilter = document.querySelector('#reviewStatusFilter');
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
const sourcePreviewStatus = document.querySelector('#sourcePreviewStatus');
const sourcePreviewComplete = document.querySelector('#sourcePreviewComplete');
const sourcePreviewPrev = document.querySelector('#sourcePreviewPrev');
const sourcePreviewNext = document.querySelector('#sourcePreviewNext');
const sourcePreviewDecision = document.querySelector('#sourcePreviewDecision');
const sourcePreviewTaskAction = document.querySelector('#sourcePreviewTaskAction');
let selected = new Set();
let timer;
let sourcePreviewItemId = null;

function toastMessage(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => toast.classList.remove('show'), 1800); }
function statusText(status) { return ({ pending: '未处理', approved: '已通过', rejected: '已不通过' })[status]; }
function filteredItems() { const keyword = searchInput.value.trim().toLowerCase(), owner = ownerFilter.value; return reviewItems.filter((item) => (statusFilter.value === 'all' || item.status === statusFilter.value) && (!keyword || item.name.toLowerCase().includes(keyword)) && (owner === 'all' || item.owner === owner)); }
function taskItems(taskId) { return reviewItems.filter((item) => item.taskId === taskId); }
function taskStats(taskId) { const items = taskItems(taskId); return { approved: items.filter((item) => item.status === 'approved').length, rejected: items.filter((item) => item.status === 'rejected').length, pending: items.filter((item) => item.status === 'pending').length, selected: items.filter((item) => selected.has(item.id)).length }; }

function taskAction(task) {
  const stats = taskStats(task.id);
  if (task.ended) return '<button class="ghost-btn task-action task-ended" disabled>任务已自动结束</button>';
  if (stats.pending) return `<button class="ghost-btn task-action" disabled>仍有 ${stats.pending} 张未处理</button>`;
  if (stats.approved) return `<a class="primary-btn task-action" href="image-to-image.html?task=${task.id}&count=${stats.approved}">进入图生图配置（已通过 ${stats.approved} 张）</a>`;
  return '<button class="ghost-btn task-action task-ended" disabled>任务已自动结束</button>';
}
function taskControls(task) { const stats = taskStats(task.id); if (!stats.pending) return ''; return `<div class="task-review-controls"><span>已选 ${stats.selected} 张</span><button data-select-all="${task.id}">全选</button><button data-invert-selection="${task.id}">反选</button><button data-task-batch="rejected" data-task-id="${task.id}" ${stats.selected ? '' : 'disabled'}>批量不通过</button><button class="task-batch-approve" data-task-batch="approved" data-task-id="${task.id}" ${stats.selected ? '' : 'disabled'}>批量通过</button></div>`; }
function card(item) { return `<article class="review-card ${item.status}"><label class="review-select"><input type="checkbox" data-select="${item.id}" ${selected.has(item.id) ? 'checked' : ''}><span></span></label><div class="image-swatch generated-swatch" style="--swatch:${item.tone}"><span>原图 ${String(item.id).padStart(2, '0')}</span><button class="generated-preview-trigger" type="button" data-source-preview="${item.id}">原图复核</button></div><div class="review-card-footer"><span class="review-status ${item.status}">${statusText(item.status)}</span><div class="review-card-actions">${item.status === 'pending' ? `<button data-reject="${item.id}">不通过</button><button class="card-approve" data-approve="${item.id}">通过</button>` : '<span class="handled-text">已处理</span>'}</div></div></article>`; }
function updateSummary() { const counts = reviewItems.reduce((result, item) => ({ ...result, [item.status]: result[item.status] + 1 }), { pending: 0, approved: 0, rejected: 0 }); document.querySelector('#approvedCount').textContent = counts.approved; document.querySelector('#rejectedCount').textContent = counts.rejected; document.querySelector('#pendingCount').textContent = counts.pending; document.querySelector('#reviewResultCount').textContent = `共 ${filteredItems().length} 张`; }
function renderReview() { const visible = filteredItems(), groups = reviewTasks.map((task) => ({ task, items: visible.filter((item) => item.taskId === task.id) })).filter((group) => group.items.length); reviewGrid.innerHTML = groups.map(({ task, items }) => { const stats = taskStats(task.id); return `<section class="task-review-group"><header class="task-review-header"><div><strong>${task.name}</strong><span>${task.id} · ${task.owner}</span></div>${taskControls(task)}<div class="task-review-progress">已通过 ${stats.approved} · 已不通过 ${stats.rejected} · 未处理 ${stats.pending}</div>${taskAction(task)}</header><div class="task-review-cards">${items.map(card).join('')}</div></section>`; }).join(''); bindReviewActions(); updateSummary(); }

function sourcePreviewQueue(taskId) { return filteredItems().filter((item) => item.taskId === taskId); }
function renderSourcePreview(showComplete = false) {
  const item = reviewItems.find((row) => row.id === sourcePreviewItemId); if (!item) return;
  const task = reviewTasks.find((row) => row.id === item.taskId), stats = taskStats(item.taskId), queue = sourcePreviewQueue(item.taskId), index = queue.findIndex((row) => row.id === item.id), displayIndex = index >= 0 ? index : taskItems(item.taskId).findIndex((row) => row.id === item.id), displayTotal = queue.length || taskItems(item.taskId).length;
  sourcePreviewTitle.textContent = item.name; sourcePreviewIndex.textContent = `${displayIndex + 1} / ${displayTotal}`; sourcePreviewImage.style.setProperty('--preview-tone', item.tone); sourcePreviewLabel.textContent = `原图 ${String(item.id).padStart(2, '0')}`; sourcePreviewId.textContent = `SRC-${String(item.id).padStart(4, '0')}`; sourcePreviewCategory.textContent = item.category; sourcePreviewOwner.textContent = item.owner; sourcePreviewStatus.className = `generated-preview-status ${item.status}`; sourcePreviewStatus.textContent = statusText(item.status); sourcePreviewPrev.disabled = index <= 0; sourcePreviewNext.disabled = index < 0 || index >= queue.length - 1;
  const taskCompleted = stats.pending === 0;
  sourcePreviewDecision.hidden = item.status !== 'pending' || taskCompleted;
  sourcePreviewComplete.hidden = !(showComplete || taskCompleted);
  sourcePreviewTaskAction.hidden = !taskCompleted;
  sourcePreviewTaskAction.innerHTML = '';
  if (taskCompleted && stats.approved > 0) { const button = document.createElement('button'); button.className = 'primary-btn'; button.type = 'button'; button.textContent = `进入图生图配置（已通过 ${stats.approved} 张）`; button.addEventListener('click', () => { location.href = `image-to-image.html?task=${task.id}&count=${stats.approved}`; }); sourcePreviewTaskAction.append(button); } else if (taskCompleted) sourcePreviewTaskAction.innerHTML = '<span class="handled-text">全部不通过，任务已自动结束</span>';
}
function openSourcePreview(itemId) { sourcePreviewItemId = Number(itemId); sourcePreviewModal.hidden = false; renderSourcePreview(); }
function closeSourcePreview() { sourcePreviewModal.hidden = true; sourcePreviewItemId = null; }
function moveSourcePreview(direction) { const item = reviewItems.find((row) => row.id === sourcePreviewItemId); if (!item) return; const queue = sourcePreviewQueue(item.taskId), index = queue.findIndex((row) => row.id === item.id), next = queue[index + direction]; if (!next) return; sourcePreviewItemId = next.id; renderSourcePreview(); }
function findNextPendingSourcePreview(currentId, taskId) { const queue = sourcePreviewQueue(taskId), currentIndex = queue.findIndex((item) => item.id === currentId), startIndex = currentIndex >= 0 ? currentIndex + 1 : 0; return queue.slice(startIndex).find((item) => item.status === 'pending') || queue.find((item) => item.status === 'pending') || null; }

function applyStatus(ids, status, fromPreview = false) {
  const previewItem = fromPreview ? reviewItems.find((row) => row.id === sourcePreviewItemId) : null;
  ids.forEach((id) => { const item = reviewItems.find((row) => row.id === id); if (item) item.status = status; selected.delete(id); });
  const affectedTaskIds = [...new Set(ids.map((id) => reviewItems.find((item) => item.id === id)?.taskId).filter(Boolean))];
  affectedTaskIds.forEach((taskId) => { const stats = taskStats(taskId); if (stats.pending === 0 && stats.approved === 0) { const task = reviewTasks.find((item) => item.id === taskId); if (task) task.ended = true; } });
  renderReview();
  const endedTask = affectedTaskIds.find((taskId) => reviewTasks.find((task) => task.id === taskId)?.ended);
  toastMessage(endedTask ? '全部原图不通过，任务已自动结束' : status === 'approved' ? '原图已通过复核' : '原图已标记为不通过');
  if (!previewItem) return;
  const next = findNextPendingSourcePreview(previewItem.id, previewItem.taskId);
  if (next) { sourcePreviewItemId = next.id; renderSourcePreview(); } else { sourcePreviewItemId = previewItem.id; renderSourcePreview(true); }
}

function bindReviewActions() {
  reviewGrid.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => { input.checked ? selected.add(Number(input.dataset.select)) : selected.delete(Number(input.dataset.select)); renderReview(); }));
  reviewGrid.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', () => applyStatus([Number(button.dataset.approve)], 'approved')));
  reviewGrid.querySelectorAll('[data-reject]').forEach((button) => button.addEventListener('click', () => applyStatus([Number(button.dataset.reject)], 'rejected')));
  reviewGrid.querySelectorAll('[data-select-all]').forEach((button) => button.addEventListener('click', () => { taskItems(button.dataset.selectAll).filter((item) => item.status === 'pending').forEach((item) => selected.add(item.id)); renderReview(); }));
  reviewGrid.querySelectorAll('[data-invert-selection]').forEach((button) => button.addEventListener('click', () => { taskItems(button.dataset.invertSelection).filter((item) => item.status === 'pending').forEach((item) => selected.has(item.id) ? selected.delete(item.id) : selected.add(item.id)); renderReview(); }));
  reviewGrid.querySelectorAll('[data-task-batch]').forEach((button) => button.addEventListener('click', () => { const ids = taskItems(button.dataset.taskId).filter((item) => selected.has(item.id) && item.status === 'pending').map((item) => item.id); applyStatus(ids, button.dataset.taskBatch); }));
  reviewGrid.querySelectorAll('[data-source-preview]').forEach((button) => button.addEventListener('click', () => openSourcePreview(button.dataset.sourcePreview)));
}

statusFilter.addEventListener('change', renderReview);
searchInput.addEventListener('input', renderReview);
ownerFilter.addEventListener('change', renderReview);
document.querySelector('#reviewReset').addEventListener('click', () => { statusFilter.value = 'all'; searchInput.value = ''; ownerFilter.value = 'all'; selected.clear(); renderReview(); });
document.querySelectorAll('.source-preview-close').forEach((button) => button.addEventListener('click', closeSourcePreview));
sourcePreviewModal.addEventListener('click', (event) => { if (event.target === sourcePreviewModal) closeSourcePreview(); });
sourcePreviewPrev.addEventListener('click', () => moveSourcePreview(-1));
sourcePreviewNext.addEventListener('click', () => moveSourcePreview(1));
document.querySelector('#sourcePreviewApprove').addEventListener('click', () => applyStatus([sourcePreviewItemId], 'approved', true));
document.querySelector('#sourcePreviewReject').addEventListener('click', () => applyStatus([sourcePreviewItemId], 'rejected', true));
document.addEventListener('keydown', (event) => { if (sourcePreviewModal.hidden) return; if (event.key === 'Escape') closeSourcePreview(); if (event.key === 'ArrowLeft') moveSourcePreview(-1); if (event.key === 'ArrowRight') moveSourcePreview(1); });
renderReview();
