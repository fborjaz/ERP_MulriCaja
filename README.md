# ERP Multicajas RD

Sistema de Gestión Empresarial (ERP) completo para República Dominicana, desarrollado con Electron y SQLite.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

## 📋 Descripción

**ERP Multicajas RD** es una aplicación de escritorio robusta y completa diseñada específicamente para empresas en República Dominicana. Incluye todos los módulos necesarios para la gestión empresarial moderna:

- ✅ Punto de Venta (POS) multi-caja
- ✅ Gestión de Inventario
- ✅ Facturación Electrónica con cumplimiento DGII
- ✅ Contabilidad integrada
- ✅ Recursos Humanos y Nómina
- ✅ Reportes DGII (606, 607, 608, 609)
- ✅ Inteligencia Artificial para recomendaciones
- ✅ Base de datos embebida (sin servidor)

---

## 🎯 Características Principales

### Gestión Comercial

- **Punto de Venta**: Interfaz rápida e intuitiva para ventas
- **Productos**: Control completo de inventario con códigos de barras
- **Clientes**: Gestión de clientes con RNC, límites de crédito
- **Proveedores**: Administración de proveedores y compras

### Facturación Electrónica

- **NCF Automáticos**: Generación de Números de Comprobante Fiscal
- **Tipos de Comprobantes**: B01, B02, B14, B15
- **Validación RNC**: Validación automática de RNC
- **XML para DGII**: Exportación en formato requerido

### Reportes DGII

- **606**: Reporte de Compras
- **607**: Reporte de Ventas
- **608**: Reporte de Cancelaciones
- **609**: Reporte de Operaciones con Exterior
- **Formatos**: TXT, CSV, Excel, PDF

### Operaciones Especiales

- **Apartados**: Reserva de productos con pagos parciales
- **Cotizaciones**: Generación y seguimiento de cotizaciones
- **Despachos**: Control de entregas con conductores
- **Notas de Crédito**: Devoluciones y ajustes

### Contabilidad

- **Asientos Contables**: Registro de transacciones
- **Balance General**: Estados financieros
- **Estado de Resultados**: P&L automático
- **Integración**: Sincronización automática con ventas/compras

### Recursos Humanos

- **Empleados**: Gestión completa de personal
- **Nómina**: Cálculo automático de salarios
- **Deducciones**: AFP, SFS, ISR automáticos
- **Recibos**: Generación de recibos de pago

### Inteligencia Artificial

- **Recomendaciones de Compra**: Basadas en historial de ventas
- **Predicción de Demanda**: Análisis de tendencias
- **Optimización de Precios**: Sugerencias de precios óptimos
- **Análisis de Tendencias**: Productos y categorías más vendidos

---

## 💻 Requisitos del Sistema

### Mínimos

- **Sistema Operativo**: Windows 10 (64-bit) o superior
- **Procesador**: Intel Core i3 o equivalente
- **RAM**: 4 GB
- **Espacio en Disco**: 500 MB
- **Resolución**: 1280x720

### Recomendados

- **Sistema Operativo**: Windows 11 (64-bit)
- **Procesador**: Intel Core i5 o superior
- **RAM**: 8 GB o más
- **Espacio en Disco**: 1 GB
- **Resolución**: 1920x1080 o superior

---

## 📥 Instalación

### Instalación desde Ejecutable (Recomendado)

1. Descargue el instalador `ERP Multicajas RD Setup 1.0.0.exe`
2. Ejecute el instalador
3. Siga las instrucciones del asistente de instalación
4. Seleccione la carpeta de instalación (por defecto: `C:\Program Files\ERP Multicajas RD`)
5. Marque "Crear acceso directo en el escritorio" si lo desea
6. Haga clic en "Instalar"
7. Una vez completada la instalación, haga clic en "Finalizar"

El sistema se configurará automáticamente para iniciar con Windows.

### Instalación para Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/fborjaz/ERP_MulriCaja.git
cd ERP_MulriCaja

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Crear instalador
npm run build:win
```

---

## 🚀 Configuración Inicial

### Primer Inicio

1. **Inicio de Sesión**

   - Usuario por defecto: `admin`
   - Contraseña por defecto: `admin` (cámbiela inmediatamente)
   - Seleccione la caja: `Caja Principal`

2. **Configuración de Empresa**

   - Vaya a **Configuración** → **Datos de la Empresa**
   - Complete:
     - Nombre de la empresa
     - RNC
     - Dirección
     - Teléfono
     - Email
     - Logo (opcional)

3. **Configuración de Impuestos**

   - Vaya a **Configuración** → **Impuestos**
   - Verifique el ITBIS (por defecto: 18%)
   - Configure otros impuestos si aplica

4. **Configuración de NCF**

   - Vaya a **Configuración** → **Facturación Electrónica**
   - Configure las secuencias de NCF:
     - B01 (Crédito Fiscal)
     - B02 (Consumidor Final)
     - B14 (Régimen Especial)
     - B15 (Gubernamental)

5. **Crear Usuarios**

   - Vaya a **Configuración** → **Usuarios**
   - Cree usuarios para cada empleado
   - Asigne roles: Administrador, Vendedor, Supervisor

6. **Configurar Cajas**
   - Vaya a **Configuración** → **Cajas**
   - Agregue las cajas necesarias
   - Asigne cajas a usuarios

---

## 📖 Guía de Uso Básico

### Realizar una Venta

1. Inicie sesión y seleccione su caja
2. Vaya al módulo **Ventas** (o presione `F2`)
3. Busque el producto por código, nombre o código de barras
4. Ingrese la cantidad y haga clic en "Agregar"
5. Repita para todos los productos
6. Seleccione el método de pago (Efectivo, Tarjeta, Transferencia)
7. Si es efectivo, ingrese el monto recibido
8. Haga clic en "Procesar Venta"
9. La factura se imprimirá automáticamente

### Agregar un Producto

1. Vaya al módulo **Productos** (o presione `F3`)
2. Haga clic en "Nuevo Producto"
3. Complete la información:
   - Código (único)
   - Nombre
   - Categoría
   - Precio de costo
   - Precio de venta
   - Stock inicial
   - Stock mínimo
   - Código de barras (opcional)
4. Haga clic en "Guardar"

### Crear un Cliente

1. Vaya al módulo **Clientes**
2. Haga clic en "Nuevo Cliente"
3. Complete:
   - Nombre
   - RNC o Cédula
   - Teléfono
   - Email
   - Dirección
   - Límite de crédito (opcional)
4. Haga clic en "Guardar"

### Generar Reporte DGII

1. Vaya al módulo **Reportes**
2. Seleccione el tipo de reporte (606, 607, 608, 609)
3. Seleccione el mes y año
4. Haga clic en "Generar Reporte"
5. Seleccione el formato de exportación (TXT, CSV, Excel, PDF)
6. El archivo se guardará en la ubicación seleccionada

### Realizar Backup

1. Vaya a **Configuración** → **Backup y Restauración**
2. Haga clic en "Crear Backup"
3. Seleccione la ubicación donde guardar el backup
4. El sistema creará una copia de la base de datos

**Recomendación**: Realice backups diarios y guárdelos en una ubicación externa.

---

## 🔧 Módulos del Sistema

### Dashboard

Vista general con estadísticas del día, productos bajo stock y métricas clave.

### Ventas

Punto de venta completo con búsqueda rápida, carrito dinámico y múltiples métodos de pago.

### Productos

Gestión completa de productos, categorías, precios y stock.

### Clientes

Administración de clientes con historial de compras y límites de crédito.

### Compras

Registro de compras a proveedores con actualización automática de inventario.

### Inventario

Control de stock, movimientos, ajustes y alertas de stock bajo.

### Facturación

Generación de facturas con NCF, validación de RNC y exportación de XML.

### Reportes

Reportes DGII (606, 607, 608, 609) y reportes gerenciales personalizados.

### Despachos

Gestión de entregas con asignación de conductores y seguimiento.

### Apartados

Reserva de productos con sistema de abonos y conversión a venta.

### Cotizaciones

Creación de cotizaciones con conversión a venta y seguimiento de vencimiento.

### Contabilidad

Asientos contables, balance general, estado de resultados y libro mayor.

### Notas de Crédito

Emisión de notas de crédito por devoluciones o ajustes.

### RRHH

Gestión de empleados, nómina, deducciones y recibos de pago.

### Configuración

Configuración general del sistema, usuarios, cajas, impuestos y NCF.

---

## ⌨️ Atajos de Teclado

- `F1` - Dashboard
- `F2` - Ventas
- `F3` - Productos
- `Ctrl + S` - Guardar (en formularios)
- `Esc` - Cerrar modal

---

## 🔒 Seguridad

### Características de Seguridad

- ✅ **Autenticación**: Login con usuario y contraseña
- ✅ **Encriptación**: Contraseñas hasheadas con bcrypt
- ✅ **Rate Limiting**: Protección contra fuerza bruta (5 intentos, bloqueo 15 min)
- ✅ **Roles**: Control de acceso por rol (Administrador, Vendedor, Supervisor)
- ✅ **Auditoría**: Logs de operaciones críticas
- ✅ **Backup**: Sistema de respaldo integrado

### Recomendaciones

1. **Cambie la contraseña por defecto** inmediatamente
2. **Realice backups diarios** en ubicación externa
3. **Use contraseñas fuertes** (mínimo 8 caracteres, mayúsculas, números)
4. **Asigne roles apropiados** a cada usuario
5. **Revise los logs** periódicamente

---

## 🐛 Troubleshooting

### La aplicación no inicia

**Solución**:

1. Verifique que cumple los requisitos mínimos del sistema
2. Ejecute como Administrador
3. Reinstale la aplicación
4. Verifique el antivirus (puede estar bloqueando)

### Error de base de datos

**Solución**:

1. Cierre completamente la aplicación
2. Restaure desde un backup reciente
3. Si persiste, contacte soporte

### No imprime facturas

**Solución**:

1. Verifique que la impresora esté conectada y encendida
2. Configure la impresora por defecto en Windows
3. Vaya a Configuración → Impresión y verifique la configuración

### Problemas con NCF

**Solución**:

1. Verifique que las secuencias estén configuradas correctamente
2. Asegúrese de tener NCF disponibles
3. Verifique la fecha de vencimiento de los NCF

### Aplicación lenta

**Solución**:

1. Realice un backup y restaure la base de datos
2. Cierre otras aplicaciones que consuman recursos
3. Verifique el espacio en disco disponible
4. Considere actualizar el hardware

---

## 👨‍💻 Desarrollo

### Estructura del Proyecto

```
desktop/
├── electron/          # Proceso principal de Electron
├── src/
│   ├── main/         # Código del proceso principal
│   ├── renderer/     # Código del renderer
│   └── styles/       # Estilos CSS
├── database/         # Esquemas SQL
└── assets/           # Recursos estáticos
```

### Tecnologías Utilizadas

- **Electron** 39.2.3 - Framework desktop
- **Vite** 7.2.4 - Build tool
- **better-sqlite3** 12.4.6 - Base de datos
- **bcryptjs** 2.4.3 - Encriptación
- **jsPDF** 2.5.1 - Generación de PDF
- **xlsx** 0.18.5 - Exportación Excel

### Scripts Disponibles

```bash
npm run dev              # Modo desarrollo
npm run build            # Compilar
npm run start            # Iniciar compilado
npm run build:win        # Crear instalador Windows
npm run dist             # Crear distribución
```

### Contribuir

1. Fork el proyecto
2. Cree una rama para su feature (`git checkout -b feature/AmazingFeature`)
3. Commit sus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abra un Pull Request

---

## 📞 Soporte

Para soporte técnico o consultas:

- **Email**: soporte@erpmulticajas.com
- **Teléfono**: (809) 555-1234
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

---

## 📄 Licencia

ISC License - Copyright (c) 2025 ERP Multicajas RD

---

## 🙏 Agradecimientos

Desarrollado con ❤️ para empresas dominicanas.

---

**Versión**: 1.0.0  
**Última actualización**: Noviembre 2025
