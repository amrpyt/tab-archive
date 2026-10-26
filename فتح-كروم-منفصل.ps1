# A separate Chrome profile: no access to the user's existing tabs or cookies.
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $chrome)) {
    $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
}
if (-not (Test-Path -LiteralPath $chrome)) { throw 'Chrome مش موجود' }
$extension = Join-Path $PSScriptRoot 'extension'
if (-not (Test-Path -LiteralPath (Join-Path $extension 'manifest.json'))) { throw 'مجلد الإضافة مش موجود' }
$profile = Join-Path $env:LOCALAPPDATA 'tab-archive-isolated-chrome'
New-Item -ItemType Directory -Path $profile -Force | Out-Null
$args = @(
    '--user-data-dir="' + $profile + '"',
    '--load-extension="' + $extension + '"',
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    'chrome://extensions/'
)
Start-Process -FilePath $chrome -ArgumentList $args
