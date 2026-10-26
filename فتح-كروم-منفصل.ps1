# Chrome 137+ branded builds ignore --load-extension. Use isolated Chrome for Testing.
# Never use the user's Chrome profile, cookies, or existing tabs.
$browserRoot = Join-Path $env:USERPROFILE '.agent-browser\browsers'
$chrome = Get-ChildItem -LiteralPath $browserRoot -Directory -Filter 'chrome-*' -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName 'chrome.exe' } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
if (-not $chrome) {
    $chrome = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'ms-playwright\chromium-*\chrome-win\chrome.exe') -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $chrome) { throw 'محتاج Chrome for Testing أو Chromium. استخدم Load unpacked يدويًا.' }
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
    'chrome://extensions/',
    'https://www.notion.so/profile/integrations'
)
Start-Process -FilePath $chrome -ArgumentList $args
