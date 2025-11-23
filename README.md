# 🏦 ERP Multicajas RD - Sistema de Gestión Empresarial Integrado

![ERP Multicajas RD Logo](https://raw.githubusercontent.com/fborjaz/ERP_MulriCaja/main/assets/icon.png)

Un sistema ERP (Enterprise Resource Planning) completo y moderno, diseñado específicamente para la gestión de múltiples cajas y operaciones comerciales en República Dominicana. Desarrollado con Electron, ofrece una experiencia de aplicación de escritorio rápida y fiable, con una base de datos embebida SQLite.

---

## ✨ Características Principales

*   **Gestión de Ventas (Punto de Venta - POS):**
    *   Búsqueda rápida de productos.
    *   Registro de ventas con múltiples métodos de pago.
    *   Cálculo automático de ITBIS.
    *   Impresión de facturas (funcionalidad a implementar).
*   **Inventario:**
    *   Control de stock actual y mínimo.
    *   Identificación de productos bajo stock.
    *   Valoración del inventario (costo y venta).
*   **Clientes:**
    *   Registro y gestión de información de clientes.
*   **Compras:**
    *   Registro de compras a proveedores.
*   **Despachos:**
    *   Gestión y seguimiento de entregas y conductores.
*   **Apartados y Cotizaciones:**
    *   Control de productos apartados y generación de cotizaciones.
*   **Contabilidad Básica:**
    *   Registro de asientos contables.
    *   Generación de reportes contables (Libro Diario, Libro Mayor, Balance de Comprobación - funcionalidad en desarrollo).
*   **Notas de Crédito:**
    *   Emisión y gestión de notas de crédito.
*   **Configuración:**
    *   Gestión de la información de la empresa.
    *   Funciones de backup y restauración de la base de datos.
*   **Reportes:**
    *   Generación de diversos reportes (ventas, inventario, clientes, financieros).
*   **Base de Datos Embebida:** Utiliza SQLite para una fácil implementación y portabilidad.

---

## 🚀 Tecnologías Utilizadas

Este proyecto combina la potencia de las tecnologías web modernas con la capacidad de ejecución de aplicaciones de escritorio:

*   **[Electron](https://www.electronjs.org/):** Framework para construir aplicaciones de escritorio con JavaScript, HTML y CSS.
*   **[Vite](https://vitejs.dev/):** Empaquetador de próxima generación para un desarrollo frontend rápido.
*   **[Node.js](https://nodejs.org/):** Entorno de ejecución de JavaScript en el lado del servidor y para el proceso principal de Electron.
*   **[SQLite3](https://www.sqlite.org/):** Base de datos ligera y embebida para almacenar toda la información del ERP.
*   **JavaScript:** Lenguaje principal de programación.
*   **HTML5 / CSS3:** Para la estructura y estilos de la interfaz de usuario.
*   **`better-sqlite3`:** Driver de SQLite de alto rendimiento para Node.js.
*   **`bcryptjs`:** Librería para el hashing de contraseñas.
*   **`electron-store`:** Persistencia simple de datos de usuario en Electron.
*   **`jspdf` / `xlsx` / `qrcode`:** Librerías para generación de PDFs, hojas de cálculo y códigos QR (funcionalidades de exportación/impresión).
*   **`moment`:** Librería para manejo de fechas.
*   **`openai`:** Integración potencial con IA (si se usa).

---

## 📋 Requisitos del Sistema

Para ejecutar este proyecto en tu entorno de desarrollo, necesitas tener instalado:

*   **[Node.js](https://nodejs.org/en/download/)** (versión LTS recomendada, v18 o superior).
*   **[npm](https://www.npmjs.com/)** (viene con Node.js) o **[Yarn](https://yarnpkg.com/install)** (gestor de paquetes alternativo).
*   **[Git](https://git-scm.com/downloads)** (para clonar el repositorio).

---

## 📦 Instalación

Sigue estos pasos para configurar el proyecto en tu máquina local:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/fborjaz/ERP_MulriCaja.git
    cd ERP_MulriCaja/erp_multicajas_rd/desktop
    ```
    (Asegúrate de cambiar al subdirectorio `erp_multicajas_rd/desktop` si la estructura de tu clonación lo requiere).

2.  **Instala las dependencias:**
    ```bash
    npm install
    # o si usas Yarn:
    # yarn install
    ```

---

## ▶️ Ejecución del Proyecto

### Modo Desarrollo

Para ejecutar la aplicación en modo desarrollo (con recarga en caliente y herramientas de desarrollo de Electron):

```bash
npm run dev
# o si usas Yarn:
# yarn dev
```

### Construcción (Build) para Producción

Para compilar la aplicación y generar los archivos de instalación (para Windows, macOS o Linux):

1.  **Compilar la aplicación:**
    ```bash
    npm run build
    # o si usas Yarn:
    # yarn build
    ```
    Esto generará los archivos compilados en el directorio `out/`.

2.  **Generar Instalador (Windows):**
    ```bash
    npm run build:win
    # o si usas Yarn:
    # yarn build:win
    ```
    El instalador (`.exe`) se encontrará en el directorio `dist/`.

---

## 📂 Estructura del Proyecto

El proyecto sigue una estructura limpia y modular, separando claramente el proceso principal de Electron del proceso de renderizado (UI):

```
.
├── electron/                 # 📂 Configuración del proceso principal de Electron
│   ├── main.js               #    - Punto de entrada principal
│   ├── preload.js            #    - Script para inyectar APIs de forma segura al renderer
│   └── ipc/                  #    - Manejadores de comunicación interproceso (IPC)
├── src/                      # 🏗️ Código fuente de la aplicación (Frontend)
│   ├── renderer/             #    - Código del proceso de renderizado (UI)
│   │   ├── core/             #       - Lógica central de la app (router, api bridge)
│   │   ├── components/       #       - Componentes reutilizables de UI (modals, toasts)
│   │   ├── modules/          #       - Vistas y lógica de cada módulo (ventas, productos, etc.)
│   │   ├── services/         #       - Servicios frontend (auth, db, print)
│   │   └── utils/            #       - Funciones de utilidad (helpers, validators)
│   └── styles/               #    - Hojas de estilo globales y específicas
├── database/                 # 🗄️ Archivos de esquema y migración de la base de datos (SQLite)
│   └── schema.sql            #    - Definición de la estructura de la base de datos
├── assets/                   # 🖼️ Recursos estáticos (iconos, imágenes)
├── build/                    # ⚙️ Archivos de configuración para el compilador (electron-builder)
├── index.html                # 🌐 Archivo HTML principal del renderizador
├── package.json              # 📄 Configuración del proyecto y scripts
└── README.md                 # 📜 Este archivo
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si encuentras un error o tienes una sugerencia de mejora, por favor, abre un "Issue" o envía un "Pull Request" al repositorio.

---

## 📄 Licencia

Este proyecto está bajo la licencia [ISC](https://opensource.org/licenses/ISC). Consulta el archivo `LICENSE` para más detalles.

---

## ✉️ Contacto

Para cualquier consulta o comentario, puedes contactar al mantenedor del proyecto:

*   **Autor:** [fborjaz](https://github.com/fborjaz)
*   **Repositorio:** [ERP_MulriCaja](https://github.com/fborjaz/ERP_MulriCaja)
