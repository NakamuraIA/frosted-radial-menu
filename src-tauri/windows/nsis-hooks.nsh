!macro NSIS_HOOK_POSTINSTALL
  SetShellVarContext current
  CreateShortCut "$DESKTOP\Frosted Radial Menu.lnk" "$INSTDIR\Frosted Radial Menu.exe" "" "$INSTDIR\Frosted Radial Menu.exe" 0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  SetShellVarContext current
  Delete "$DESKTOP\Frosted Radial Menu.lnk"
!macroend
