// Mantén tu función openTab como estaba
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;

    // Ocultar todo el contenido de las pestañas
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Quitar la clase "active" de todos los botones de pestaña
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Mostrar el contenido de la pestaña actual y marcar el botón como activo
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function initializetabs(){
    const tabIds = ["general", "avanzado", "apariencia"];
    tabIds.forEach(id => {
        const elementName = "openTab" + id
        const button = document.getElementById(elementName);
        console.log("button",button,elementName)
        // Verificamos que el botón exista antes de asignarle un evento
        if (button) {
            // Usamos addEventListener que es la práctica recomendada
            button.addEventListener('click', function(event) {
                // 'event' aquí es el objeto real del evento de clic
                openTab(event, id); 
            });
        }
    });
    console.log("initializetabs")


    console.log("tabIds","openTab",{tabIds,openTab})
}
function redirectlistener(){
    const redirect_input = document.getElementById("uniqueId_channel");
    const redirectForm = document.getElementById("redirectForm");
    if (!redirect_input || !redirectForm) return;
    
    redirectForm.addEventListener("submit",(e)=>{
        e.preventDefault();
        console.log(redirect_input.value)
        const urlBase = "https://www.tiktok.com/@{uniqueId}/live"
        const redirect = urlBase.replace("{uniqueId}", redirect_input.value)
        
        // Aquí puedes hacer la redirección
        window.location.href = redirect;
        // O abrir en nueva pestaña: window.open(redirect, '_blank');
    })
}
const defaultWebhook = window.localStorage.webhookUrl || "";
function webhookformlisteners(){
    const webhook_input = document.getElementById("WebhookUrl");
    const WebhookOption = document.getElementById("WebhookOption");
    const webhook_container = document.getElementById("webhook_container");
    if (!webhook_input ||!WebhookOption || !webhook_container) return;
    const changeWebhook = ()=>{
        if (WebhookOption.checked){
            webhook_container.style.display = "flex";
        }else{
            webhook_container.style.display = "none";
        }
    }
    WebhookOption.checked = window.localStorage.WebhookOption === "true";
    changeWebhook();
    WebhookOption.addEventListener("change",()=>{
        changeWebhook();
        window.localStorage.WebhookOption = WebhookOption.checked;
    });

    webhook_input.value = defaultWebhook;
    webhook_input.addEventListener("change",()=>{
        console.log(webhook_input.value)
        window.localStorage.webhookUrl = webhook_input.value;
    });
}

document.addEventListener("DOMContentLoaded",()=>{
         initializetabs();
         redirectlistener();
         webhookformlisteners();
})