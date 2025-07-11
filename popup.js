// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('cambiarColor');
  function getrandomColor(){
    const newcolor = 
    `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    return newcolor;
  }
  button.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const newcolor = getrandomColor();
    console.log("getrandomColor",newcolor)
    chrome.tabs.sendMessage(tab.id, {
      action: 'cambiarColor',
      color: newcolor
    });
  });
});