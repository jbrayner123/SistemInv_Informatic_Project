import os
import resend
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Credenciales de Email desde variables de entorno (Resend)
resend.api_key = os.environ.get("RESEND_API_KEY", "")

# Correo de envío por defecto (Resend provee onboarding@resend.dev para pruebas)
# Para producción debes verificar tu propio dominio en Resend
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

# Email del administrador del sistema al que llegarán alertas por default
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "prueba@tucorreo.com")

# ─── Plantilla base HTML ────────────────────────────────────────────
def _base_template(title: str, accent_color: str, body_content: str) -> str:
    now = datetime.now().strftime("%d/%m/%Y a las %H:%M:%S")
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f6f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <!-- HEADER -->
            <tr>
              <td style="background:{accent_color};padding:32px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">{title}</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">{now}</p>
              </td>
            </tr>
            <!-- BODY -->
            <tr>
              <td style="padding:32px 40px;">
                {body_content}
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  Generado automáticamente por <strong style="color:#64748b;">SistemInv</strong> - Sistema de Inventario Inteligente
                </p>
                <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">
                  Este correo es informativo. No responda a este mensaje.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def send_email_alert(subject: str, html_content: str, to_address: str = None):
    if not resend.api_key:
        print("[WARNING] Credentials RESEND_API_KEY missing. Email skip.")
        return False
        
    try:
        # Importante: Para usar el dominio onboarding@resend.dev gratis,
        # el correo de destino "to" *DEBE* ser el mismo correo con el que te registraste en Resend.
        # Una vez que verifiques un dominio propio en el dashboard de Resend,
        # podrás enviar a cualquier cuenta de correo.
        to_email = to_address or ADMIN_EMAIL
        
        response = resend.Emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        })
        print(f"[INFO] Correo enviado exitosamente vía Resend: {response}")
        return True
    except Exception as e:
        print(f"[ERROR] No se pudo enviar el correo vía Resend: {e}")
        return False


# ─── Alerta de Nuevo Producto ───────────────────────────────────────
def alert_new_product(product_name: str, sku: str, price: float, user_name: str):
    subject = f"Nuevo Producto Registrado: {product_name}"
    body = f"""
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:16px;">
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">
            El usuario <strong style="color:#4f46e5;">{user_name}</strong> ha registrado un nuevo producto en el catálogo del sistema.
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">SKU</span><br>
                      <span style="color:#1e293b;font-size:16px;font-weight:600;font-family:monospace;">{sku}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Producto</span><br>
                      <span style="color:#1e293b;font-size:16px;font-weight:600;">{product_name}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Precio Unitario</span><br>
                      <span style="color:#10b981;font-size:20px;font-weight:700;">${price:,.0f}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    """
    html = _base_template("Nuevo Producto Registrado", "#4f46e5", body)
    send_email_alert(subject, html)


# ─── Alerta de Stock (Bajo / Agotado) ──────────────────────────────
def alert_stock_status(product_name: str, sku: str, current_stock: int, is_out: bool):
    status = "AGOTADO" if is_out else "STOCK BAJO"
    accent = "#dc2626" if is_out else "#f59e0b"
    status_bg = "#fef2f2" if is_out else "#fffbeb"
    status_text_color = "#dc2626" if is_out else "#d97706"
    
    message = (
        "Este producto se ha <strong>agotado completamente</strong>. Se requiere reabastecimiento urgente."
        if is_out else
        f"El stock ha caído a un nivel crítico. Quedan solo <strong>{current_stock}</strong> unidades disponibles."
    )
    
    subject = f"[{status}] {product_name} ({sku})"
    body = f"""
    <table width="100%" cellpadding="0" cellspacing="0">
      <!-- Alerta visual -->
      <tr>
        <td style="padding-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:{status_bg};border-radius:12px;border:1px solid {accent}20;">
            <tr>
              <td style="padding:20px 24px;text-align:center;">
                <h2 style="margin:0 0 4px;color:{status_text_color};font-size:20px;">{status}</h2>
                <p style="margin:0;color:#64748b;font-size:14px;">{message}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Detalles del producto -->
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">SKU</span><br>
                      <span style="color:#1e293b;font-size:16px;font-weight:600;font-family:monospace;">{sku}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Producto</span><br>
                      <span style="color:#1e293b;font-size:16px;font-weight:600;">{product_name}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Stock Restante</span><br>
                      <span style="color:{status_text_color};font-size:24px;font-weight:700;">{current_stock} unidades</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- CTA -->
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <p style="margin:0;color:#64748b;font-size:13px;font-style:italic;">
            Se recomienda reabastecer este producto a la brevedad posible para evitar interrupciones en las ventas.
          </p>
        </td>
      </tr>
    </table>
    """
    html = _base_template("Alerta de Inventario", accent, body)
    send_email_alert(subject, html)


# ─── Recibo de Venta (POS) ─────────────────────────────────────────
def alert_sale(user_name: str, item_details: list, total_amount: float):
    subject = f"Recibo de Venta - ${total_amount:,.0f}"
    
    # Construir filas de la tabla de items
    rows_html = ""
    for i, item in enumerate(item_details):
        bg = "#ffffff" if i % 2 == 0 else "#f8fafc"
        rows_html += f"""
        <tr style="background:{bg};">
          <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">
            {item}
          </td>
        </tr>
        """
    
    body = f"""
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:16px;">
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">
            El cajero <strong style="color:#4f46e5;">{user_name}</strong> ha completado exitosamente una nueva venta desde el Punto de Venta.
          </p>
        </td>
      </tr>
      <!-- Tabla de artículos -->
      <tr>
        <td style="padding-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#1e293b;padding:12px 16px;">
                <span style="color:#ffffff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Detalle de Artículos</span>
              </td>
            </tr>
            {rows_html}
          </table>
        </td>
      </tr>
      <!-- Total -->
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#4f46e5;border-radius:12px;">
            <tr>
              <td style="padding:24px;text-align:center;">
                <span style="color:rgba(255,255,255,0.8);font-size:14px;text-transform:uppercase;letter-spacing:1px;">Total Recaudado</span>
                <h2 style="margin:8px 0 0;color:#ffffff;font-size:32px;font-weight:800;">${total_amount:,.0f}</h2>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Nota -->
      <tr>
        <td style="padding-top:16px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            El stock de los productos vendidos ha sido descontado automáticamente del inventario.
          </p>
        </td>
      </tr>
    </table>
    """
    html = _base_template("Recibo de Venta", "#4f46e5", body)
    send_email_alert(subject, html)


# ─── Recuperación de Contraseña ────────────────────────────────────
def alert_password_reset(username: str, token: str):
    subject = f"Solicitud de Restablecimiento de Contraseña - {username}"
    
    body = f"""
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:16px;">
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">
            Se ha solicitado restablecer la contraseña para el usuario <strong style="color:#4f46e5;">{username}</strong>.
          </p>
          <p style="margin:16px 0 0;color:#334155;font-size:15px;line-height:1.6;">
            A continuación se muestra el PIN temporal (Token) necesario para configurar la nueva contraseña. Por favor, proporcione este PIN al usuario o ingréselo en el sistema.
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px dashed #4f46e5;">
            <tr>
              <td style="padding:24px;text-align:center;">
                <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">PIN TEMPORAL</span>
                <h2 style="margin:8px 0 0;color:#4f46e5;font-size:36px;font-weight:800;letter-spacing:4px;">{token}</h2>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    """
    html = _base_template("Restablecimiento de Contraseña", "#10b981", body)
    send_email_alert(subject, html)

# ─── Reporte Global de Inventario (Bot) ────────────────────────────
def alert_inventory_report(low_stock_items: list, out_of_stock_items: list, generated_by: str):
    subject = "Reporte de Carencias de Inventario"
    
    rows_html = ""
    for idx, item in enumerate(out_of_stock_items):
        bg = "#fef2f2" if idx % 2 == 0 else "#fff5f5"
        rows_html += f"""
        <tr style="background:{bg};">
          <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;color:#b91c1c;font-size:14px;"><strong>{item['id']}</strong></td>
          <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;color:#b91c1c;font-size:14px;">{item['nombre']}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;color:#b91c1c;font-size:14px;font-weight:bold;">AGOTADO</td>
        </tr>
        """
        
    for idx, item in enumerate(low_stock_items):
        bg = "#fffbeb" if idx % 2 == 0 else "#fff8ec"
        rows_html += f"""
        <tr style="background:{bg};">
          <td style="padding:10px 16px;border-bottom:1px solid #fef3c7;color:#b45309;font-size:14px;"><strong>{item['id']}</strong></td>
          <td style="padding:10px 16px;border-bottom:1px solid #fef3c7;color:#b45309;font-size:14px;">{item['nombre']}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #fef3c7;color:#b45309;font-size:14px;font-weight:bold;">{item['cantidad']} / min: {item.get('stock_minimo', 5)}</td>
        </tr>
        """
        
    if not low_stock_items and not out_of_stock_items:
        rows_html = "<tr><td colspan='3' style='padding:20px;text-align:center;color:#64748b;'>No hay productos en estado crítico. Todo el stock es saludable.</td></tr>"

    body = f"""
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-bottom:16px;">
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">
            El asistente virtual (solicitado por <strong style="color:#f59e0b;">{generated_by}</strong>) ha generado el reporte de revisión de existencias actual.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;text-align:left;">
            <tr>
              <th style="background:#f1f5f9;padding:12px 16px;color:#475569;font-size:12px;text-transform:uppercase;">SKU</th>
              <th style="background:#f1f5f9;padding:12px 16px;color:#475569;font-size:12px;text-transform:uppercase;">Producto</th>
              <th style="background:#f1f5f9;padding:12px 16px;color:#475569;font-size:12px;text-transform:uppercase;">Stock Actual</th>
            </tr>
            {rows_html}
          </table>
        </td>
      </tr>
    </table>
    """
    html = _base_template("Reporte de Existencias Críticas", "#f59e0b", body)
    send_email_alert(subject, html)

