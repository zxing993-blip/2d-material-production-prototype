const tabButtons=document.querySelectorAll('.quality-tabs button'),tabPanes=document.querySelectorAll('.quality-pane');
function activateTab(tab){const button=[...tabButtons].find(item=>item.dataset.tab===tab);if(!button)return;tabButtons.forEach(item=>item.classList.toggle('active',item===button));tabPanes.forEach(pane=>pane.classList.toggle('active',pane.dataset.pane===tab))}
tabButtons.forEach(button=>button.addEventListener('click',()=>activateTab(button.dataset.tab)));
activateTab(new URLSearchParams(location.search).get('tab')||'source');
