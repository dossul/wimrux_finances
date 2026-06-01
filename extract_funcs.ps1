$old = git -C "c:\wamp64\www\wimrux_finances" show cbef9ee:wimrux_app/src/pages/settings/SettingsPage.vue
$lines = $old -split "`n"
# roleColor: line 1838, loadCompanyForm: 1843, saveAiConfig: 1889, saveCompany: 1920
# Extract lines 1837 to 1959 (0-indexed: 1836 to 1958)
$extract = $lines[1836..1958] -join "`n"
[System.IO.File]::WriteAllText("c:\wamp64\www\wimrux_finances\extracted_funcs.txt", $extract, [System.Text.Encoding]::UTF8)
Write-Host "Done"
