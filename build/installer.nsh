; Script de instalación NSIS para ERP Multicajas RD
; Configuración automática de auto-run y base de datos

!macro customInstall
  ; Activar auto-run automáticamente
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ERP Multicajas RD" "$INSTDIR\ERP Multicajas RD.exe"
  
  ; Crear acceso directo en escritorio si no existe
  CreateShortCut "$DESKTOP\ERP Multicajas RD.lnk" "$INSTDIR\ERP Multicajas RD.exe"
  
  ; Mensaje de bienvenida
  MessageBox MB_OK "ERP Multicajas RD instalado correctamente.$\n$\nLa aplicación se iniciará automáticamente al iniciar Windows.$\n$\nCredenciales por defecto:$\nUsuario: admin$\nContraseña: password"
!macroend

!macro customUnInstall
  ; Desactivar auto-run al desinstalar
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ERP Multicajas RD"
  
  ; Eliminar acceso directo del escritorio
  Delete "$DESKTOP\ERP Multicajas RD.lnk"
!macroend

