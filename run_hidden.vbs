Dim shell, fso, scriptDir, batPath

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptDir, "run_menu.bat")

shell.CurrentDirectory = scriptDir
shell.Run Chr(34) & batPath & Chr(34), 0, False
