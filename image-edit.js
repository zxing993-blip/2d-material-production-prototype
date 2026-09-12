const editTasks = {
  '2D-20260910-00126': '人体工学办公椅',
  '2D-20260910-00127': '现代玻璃花瓶',
  '2D-20260910-00125': '北欧落地灯',
  '2D-20260910-00123': '工业金属工具柜'
};
const editParams = new URLSearchParams(location.search);
const editTaskId = editParams.get('task') || '2D-20260910-00126';
const editCount = Number(editParams.get('count')) || 1;
const editToast = document.querySelector('#editConfigToast');
let editTimer;

document.querySelector('#editConfigName').textContent = editTasks[editTaskId] || '已选图片';
document.querySelector('#editConfigTask').textContent = editTaskId;
document.querySelector('#editInputCount').textContent = `${editCount} 张`;
document.querySelector('#editOutputRule').textContent = `输入 ${editCount} 张 → 目标输出 ${editCount} 张 · 白底编辑图`;
document.querySelectorAll('#editViewOptions button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('#editViewOptions button').forEach((item) => item.classList.toggle('active', item === button));
}));
document.querySelector('#imageEditForm').addEventListener('submit', (event) => {
  event.preventDefault();
  editToast.textContent = '编辑图任务已创建，正在进入生产任务列表';
  editToast.classList.add('show');
  clearTimeout(editTimer);
  editTimer = setTimeout(() => { location.href = `index.html?editSubmitted=${encodeURIComponent(editTaskId)}&count=${editCount}`; }, 900);
});
