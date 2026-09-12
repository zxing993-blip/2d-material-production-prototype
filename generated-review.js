const generatedTasks = [
  { id: '2D-20260910-00126', name: '人体工学办公椅', owner: '陈建模', success: 6 },
  { id: '2D-20260910-00123', name: '工业金属工具柜', owner: '王岩', success: 2 }
];

const generatedItems = Array.from({ length: 8 }, (_, index) => {
  const task = index < 6 ? generatedTasks[0] : generatedTasks[1];
  return {
    id: index + 1,
    taskId: task.id,
    name: task.name,
    owner: task.owner,
    status: 'pending',
    sourceId: String(index + 1).padStart(2, '0'),
    view: index % 3 === 1 ? '45°' : index % 3 === 2 ? '俯角' : '主视角',
    model: '千问图生图 v1.0',
    tone: ['#e2edff', '#e9f1e9', '#f4e8d7', '#e8e2f5', '#e0eef0', '#f3e2e5'][index % 6]
  };
});

const generatedGrid = document.querySelector('#generatedGrid');
const generatedTaskFilter = new URLSearchParams(location.search).get('task');
const generatedStatusFilter = document.querySelector('#generatedStatusFilter');
const generatedSearch = document.querySelector('#generatedSearch');
const generatedOwnerFilter = document.querySelector('#generatedOwnerFilter');
const inboundModal = document.querySelector('#inboundModal');
const generatedPreviewModal = document.querySelector('#generatedPreviewModal');
const generatedPreviewTitle = document.querySelector('#generatedPreviewTitle');
const generatedPreviewIndex = document.querySelector('#generatedPreviewIndex');
const generatedPreviewImage = document.querySelector('#generatedPreviewImage');
const generatedPreviewLabel = document.querySelector('#generatedPreviewLabel');
const generatedPreviewId = document.querySelector('#generatedPreviewId');
const generatedPreviewView = document.querySelector('#generatedPreviewView');
const generatedPreviewModel = document.querySelector('#generatedPreviewModel');
const generatedPreviewStatus = document.querySelector('#generatedPreviewStatus');
const generatedPreviewComplete = document.querySelector('#generatedPreviewComplete');
const generatedPreviewPrev = document.querySelector('#generatedPreviewPrev');
const generatedPreviewNext = document.querySelector('#generatedPreviewNext');
const generatedPreviewDecision = document.querySelector('#generatedPreviewDecision');
const generatedPreviewTaskAction = document.querySelector('#generatedPreviewTaskAction');

let generatedSelected = new Set();
let inboundTask = null;
let previewItemId = null;

function generatedStatusText(status) {
  return ({ pending: '未处理', approved: '已通过', rejected: '已不通过' })[status];
}

function generatedTaskItems(taskId) {
  return generatedItems.filter((item) => item.taskId === taskId);
}

function generatedStats(taskId) {
  const items = generatedTaskItems(taskId);
  return {
    approved: items.filter((item) => item.status === 'approved').length,
    rejected: items.filter((item) => item.status === 'rejected').length,
    pending: items.filter((item) => item.status === 'pending').length,
    selected: items.filter((item) => generatedSelected.has(item.id)).length
  };
}

function filteredGeneratedItems() {
  const keyword = generatedSearch.value.trim().toLowerCase();
  const owner = generatedOwnerFilter.value;
  return generatedItems.filter((item) =>
    (!generatedTaskFilter || item.taskId === generatedTaskFilter) &&
    (generatedStatusFilter.value === 'all' || item.status === generatedStatusFilter.value) &&
    (!keyword || item.name.toLowerCase().includes(keyword)) &&
    (owner === 'all' || item.owner === owner)
  );
}

function generatedControls(task) {
  const stats = generatedStats(task.id);
  if (!stats.pending) return '';
  return `<div class="task-review-controls"><span>已选 ${stats.selected} 张</span><button data-generated-select-all="${task.id}">全选</button><button data-generated-invert="${task.id}">反选</button><button data-generated-batch="rejected" data-generated-task="${task.id}" ${stats.selected ? '' : 'disabled'}>批量不通过</button><button class="task-batch-approve" data-generated-batch="approved" data-generated-task="${task.id}" ${stats.selected ? '' : 'disabled'}>批量通过</button></div>`;
}

function generatedAction(task) {
  const stats = generatedStats(task.id);
  if (task.inbound === 'done') return '<button class="ghost-btn task-action task-ended" disabled>已入库</button>';
  if (task.inbound === 'processing') return '<button class="ghost-btn task-action" disabled>入库中</button>';
  if (task.ended) return '<button class="ghost-btn task-action task-ended" disabled>任务已结束</button>';
  if (stats.pending) return `<button class="ghost-btn task-action" disabled>仍有 ${stats.pending} 张未处理</button>`;
  if (stats.approved) return `<button class="primary-btn task-action" data-open-inbound="${task.id}">确认入库（已通过 ${stats.approved} 张）</button>`;
  return '<button class="ghost-btn task-action task-ended" disabled>任务已自动结束</button>';
}

function generatedCard(item) {
  return `<article class="review-card ${item.status}">
    <label class="review-select"><input type="checkbox" data-generated-select="${item.id}" ${generatedSelected.has(item.id) ? 'checked' : ''}><span></span></label>
    <div class="image-swatch generated-swatch" style="--swatch:${item.tone}">
      <span>生成图 ${String(item.id).padStart(2, '0')}</span>
      <button class="generated-preview-trigger" type="button" data-generated-preview="${item.id}">成图质检</button>
    </div>
    <div class="review-item-meta"><strong>原图 ID：${item.sourceId}</strong><span>GEN-${String(item.id).padStart(4, '0')}</span></div>
    <div class="review-card-footer"><span class="review-status ${item.status}">${generatedStatusText(item.status)}</span><div class="review-card-actions">${item.status === 'pending' ? `<button data-generated-reject="${item.id}">不通过</button><button class="card-approve" data-generated-approve="${item.id}">通过</button>` : '<span class="handled-text">已处理</span>'}</div></div>
  </article>`;
}

function updateGeneratedSummary() {
  const counts = generatedItems.reduce((result, item) => ({ ...result, [item.status]: result[item.status] + 1 }), { pending: 0, approved: 0, rejected: 0 });
  document.querySelector('#generatedApprovedCount').textContent = counts.approved;
  document.querySelector('#generatedRejectedCount').textContent = counts.rejected;
  document.querySelector('#generatedPendingCount').textContent = counts.pending;
  document.querySelector('#generatedResultCount').textContent = `共 ${filteredGeneratedItems().length} 张`;
}

function renderGenerated() {
  const visible = filteredGeneratedItems();
  const groups = generatedTasks.map((task) => ({ task, items: visible.filter((item) => item.taskId === task.id) })).filter((group) => group.items.length);
  generatedGrid.innerHTML = groups.map(({ task, items }) => {
    const stats = generatedStats(task.id);
    return `<section class="task-review-group"><header class="task-review-header"><div><strong>${task.name}</strong><span>${task.id} · ${task.owner}</span></div>${generatedControls(task)}<div class="task-review-progress">生成成功 ${task.success} · 待质检 ${stats.pending}<br>已通过 ${stats.approved} · 已不通过 ${stats.rejected}</div>${generatedAction(task)}</header><div class="task-review-cards">${items.map(generatedCard).join('')}</div></section>`;
  }).join('');
  bindGeneratedActions();
  updateGeneratedSummary();
}

function previewQueue(taskId) {
  return filteredGeneratedItems().filter((item) => item.taskId === taskId);
}

function renderGeneratedPreview(showComplete = false) {
  const item = generatedItems.find((row) => row.id === previewItemId);
  if (!item) return;
  const task = generatedTasks.find((row) => row.id === item.taskId);
  const stats = generatedStats(item.taskId);
  const queue = previewQueue(item.taskId);
  const index = queue.findIndex((row) => row.id === item.id);
  const displayIndex = index >= 0 ? index : generatedTaskItems(item.taskId).findIndex((row) => row.id === item.id);
  const displayTotal = queue.length || generatedTaskItems(item.taskId).length;
  const statusClass = item.status === 'pending' ? 'pending' : item.status;

  generatedPreviewTitle.textContent = item.name;
  generatedPreviewIndex.textContent = `${displayIndex + 1} / ${displayTotal}`;
  generatedPreviewImage.style.setProperty('--preview-tone', item.tone);
  generatedPreviewLabel.textContent = `生成图 ${String(item.id).padStart(2, '0')}`;
  generatedPreviewId.textContent = `GEN-${String(item.id).padStart(4, '0')}`;
  generatedPreviewView.textContent = item.view;
  generatedPreviewModel.textContent = item.model;
  generatedPreviewStatus.className = `generated-preview-status ${statusClass}`;
  generatedPreviewStatus.textContent = generatedStatusText(item.status);
  generatedPreviewPrev.disabled = index <= 0;
  generatedPreviewNext.disabled = index < 0 || index >= queue.length - 1;
  const taskCompleted = stats.pending === 0;
  generatedPreviewDecision.hidden = item.status !== 'pending' || taskCompleted;
  generatedPreviewComplete.hidden = !(showComplete || taskCompleted);
  generatedPreviewTaskAction.hidden = !taskCompleted;
  generatedPreviewTaskAction.innerHTML = '';
  if (taskCompleted && stats.approved > 0 && task.inbound !== 'done') {
    const button = document.createElement('button');
    button.className = 'primary-btn';
    button.type = 'button';
    button.textContent = task.inbound === 'processing' ? '入库中' : `确认入库（已通过 ${stats.approved} 张）`;
    button.disabled = task.inbound === 'processing';
    button.addEventListener('click', () => {
      closeGeneratedPreview();
      openInbound(task.id);
    });
    generatedPreviewTaskAction.append(button);
  } else if (taskCompleted && task.inbound === 'done') {
    generatedPreviewTaskAction.innerHTML = '<span class="handled-text">已入库</span>';
  } else if (taskCompleted) {
    generatedPreviewTaskAction.innerHTML = '<span class="handled-text">全部不通过，任务已自动结束</span>';
  }
}

function openGeneratedPreview(itemId) {
  previewItemId = Number(itemId);
  generatedPreviewModal.hidden = false;
  renderGeneratedPreview();
}

function closeGeneratedPreview() {
  generatedPreviewModal.hidden = true;
  previewItemId = null;
}

function moveGeneratedPreview(direction) {
  const item = generatedItems.find((row) => row.id === previewItemId);
  if (!item) return;
  const queue = previewQueue(item.taskId);
  const index = queue.findIndex((row) => row.id === item.id);
  const next = queue[index + direction];
  if (!next) return;
  previewItemId = next.id;
  renderGeneratedPreview();
}

function findNextPendingPreview(currentId, taskId) {
  const queue = previewQueue(taskId);
  const currentIndex = queue.findIndex((item) => item.id === currentId);
  const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  const next = queue.slice(startIndex).find((item) => item.status === 'pending');
  return next || queue.find((item) => item.status === 'pending') || null;
}

function setGeneratedStatus(ids, status, fromPreview = false) {
  const previewItem = fromPreview ? generatedItems.find((row) => row.id === previewItemId) : null;
  ids.forEach((id) => {
    const item = generatedItems.find((row) => row.id === id);
    if (item) item.status = status;
    generatedSelected.delete(id);
  });
  const affectedTaskIds = [...new Set(ids.map((id) => generatedItems.find((item) => item.id === id)?.taskId).filter(Boolean))];
  affectedTaskIds.forEach((taskId) => {
    const stats = generatedStats(taskId);
    if (stats.pending === 0 && stats.approved === 0) {
      const task = generatedTasks.find((item) => item.id === taskId);
      if (task) task.ended = true;
    }
  });
  renderGenerated();
  const endedTask = affectedTaskIds.find((taskId) => generatedTasks.find((task) => task.id === taskId)?.ended);
  toastMessage(endedTask ? '全部成图不通过，任务已自动结束' : status === 'approved' ? '生成图已通过质检' : '生成图已标记为不通过');

  if (!previewItem) return;
  const next = findNextPendingPreview(previewItem.id, previewItem.taskId);
  if (next) {
    previewItemId = next.id;
    renderGeneratedPreview();
  } else {
    previewItemId = previewItem.id;
    renderGeneratedPreview(true);
  }
}

function openInbound(taskId) {
  const task = generatedTasks.find((item) => item.id === taskId);
  const stats = generatedStats(taskId);
  inboundTask = task;
  document.querySelector('#inboundName').textContent = task.name;
  document.querySelector('#inboundCount').textContent = `${stats.approved} 张`;
  inboundModal.hidden = false;
}

function bindGeneratedActions() {
  generatedGrid.querySelectorAll('[data-generated-select]').forEach((input) => input.addEventListener('change', () => {
    input.checked ? generatedSelected.add(Number(input.dataset.generatedSelect)) : generatedSelected.delete(Number(input.dataset.generatedSelect));
    renderGenerated();
  }));
  generatedGrid.querySelectorAll('[data-generated-select-all]').forEach((button) => button.addEventListener('click', () => {
    generatedTaskItems(button.dataset.generatedSelectAll).filter((item) => item.status === 'pending').forEach((item) => generatedSelected.add(item.id));
    renderGenerated();
  }));
  generatedGrid.querySelectorAll('[data-generated-invert]').forEach((button) => button.addEventListener('click', () => {
    generatedTaskItems(button.dataset.generatedInvert).filter((item) => item.status === 'pending').forEach((item) => generatedSelected.has(item.id) ? generatedSelected.delete(item.id) : generatedSelected.add(item.id));
    renderGenerated();
  }));
  generatedGrid.querySelectorAll('[data-generated-preview]').forEach((button) => button.addEventListener('click', () => openGeneratedPreview(button.dataset.generatedPreview)));
  generatedGrid.querySelectorAll('[data-generated-approve]').forEach((button) => button.addEventListener('click', () => setGeneratedStatus([Number(button.dataset.generatedApprove)], 'approved')));
  generatedGrid.querySelectorAll('[data-generated-reject]').forEach((button) => button.addEventListener('click', () => setGeneratedStatus([Number(button.dataset.generatedReject)], 'rejected')));
  generatedGrid.querySelectorAll('[data-generated-batch]').forEach((button) => button.addEventListener('click', () => setGeneratedStatus(generatedTaskItems(button.dataset.generatedTask).filter((item) => generatedSelected.has(item.id) && item.status === 'pending').map((item) => item.id), button.dataset.generatedBatch)));
  generatedGrid.querySelectorAll('[data-open-inbound]').forEach((button) => button.addEventListener('click', () => openInbound(button.dataset.openInbound)));
}

generatedStatusFilter.addEventListener('change', renderGenerated);
generatedSearch.addEventListener('input', renderGenerated);
generatedOwnerFilter.addEventListener('change', renderGenerated);
document.querySelector('#generatedReset').addEventListener('click', () => {
  generatedStatusFilter.value = 'all';
  generatedSearch.value = '';
  generatedOwnerFilter.value = 'all';
  generatedSelected.clear();
  renderGenerated();
});
document.querySelectorAll('.inbound-close').forEach((button) => button.addEventListener('click', () => inboundModal.hidden = true));
inboundModal.addEventListener('click', (event) => { if (event.target === inboundModal) inboundModal.hidden = true; });
document.querySelector('#inboundConfirm').addEventListener('click', () => {
  if (!inboundTask) return;
  inboundTask.inbound = 'processing';
  inboundModal.hidden = true;
  renderGenerated();
  toastMessage('已提交入库，正在创建 2D Asset');
  setTimeout(() => {
    inboundTask.inbound = 'done';
    renderGenerated();
    toastMessage('入库成功，已创建正式 2D Asset');
  }, 900);
});
document.querySelectorAll('.generated-preview-close').forEach((button) => button.addEventListener('click', closeGeneratedPreview));
generatedPreviewModal.addEventListener('click', (event) => { if (event.target === generatedPreviewModal) closeGeneratedPreview(); });
generatedPreviewPrev.addEventListener('click', () => moveGeneratedPreview(-1));
generatedPreviewNext.addEventListener('click', () => moveGeneratedPreview(1));
document.querySelector('#generatedPreviewApprove').addEventListener('click', () => setGeneratedStatus([previewItemId], 'approved', true));
document.querySelector('#generatedPreviewReject').addEventListener('click', () => setGeneratedStatus([previewItemId], 'rejected', true));
document.addEventListener('keydown', (event) => {
  if (generatedPreviewModal.hidden) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (event.key === 'Escape') return closeGeneratedPreview();
  if (event.key === 'ArrowLeft') return moveGeneratedPreview(-1);
  if (event.key === 'ArrowRight') return moveGeneratedPreview(1);
  const item = generatedItems.find((row) => row.id === previewItemId);
  if (!item || item.status !== 'pending') return;
  if (event.key.toLowerCase() === 'a') setGeneratedStatus([previewItemId], 'approved', true);
  if (event.key === 'Delete') setGeneratedStatus([previewItemId], 'rejected', true);
});

renderGenerated();
