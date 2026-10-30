<#
.SYNOPSIS
    Sets the Windows accent color from the current wallpaper using matugen (Material You).

.DESCRIPTION
    Works with:
      * the normal Windows wallpaper (images, slideshow)
      * Wallpaper Engine (scene / web / application -> preview image, video -> first frame)
      * any file you point it at with -Path (png/jpg/gif/mp4/webm/...)

    Animated sources (GIF, video) are reduced to a single still frame first
    (the first frame; a near-black first frame is skipped unless -NoBlackSkip),
    then matugen builds the Material You palette from that frame and the
    chosen role (default: primary) becomes the Windows accent color.

    Needs: matugen on PATH (or -MatugenPath); ffmpeg on PATH (or -FfmpegPath)
    only for video wallpapers.

.EXAMPLE
    .\Set-WallpaperAccent.ps1
    One-shot: detect the wallpaper, apply the accent.

.EXAMPLE
    .\Set-WallpaperAccent.ps1 -Watch
    Keep running and re-apply whenever the wallpaper changes.

.EXAMPLE
    .\Set-WallpaperAccent.ps1 -Install -ShowOnTaskbar
    Register a hidden logon task that runs -Watch (plus the same options).

.EXAMPLE
    .\Set-WallpaperAccent.ps1 -Source File -Path D:\live\bg.mp4 -Mode Dark
#>
[CmdletBinding()]
param(
    [ValidateSet('Auto', 'Windows', 'WallpaperEngine', 'File')]
    [string]$Source = 'Auto',

    # Used with -Source File
    [string]$Path,

    # Default: follow the system "apps" theme
    [ValidateSet('Dark', 'Light')]
    [string]$Mode,

    # Which Material You color becomes the Windows accent
    [ValidateSet('primary', 'secondary', 'tertiary', 'primary_container', 'secondary_container', 'tertiary_container')]
    [string]$Role = 'primary',

    [string]$SchemeType = 'scheme-tonal-spot',
    [string]$MatugenPath = 'matugen',
    [string]$FfmpegPath = 'ffmpeg',

    # Folder that contains Wallpaper Engine's config.json (auto-detected via Steam if omitted)
    [string]$WallpaperEngineDir,

    [switch]$ShowOnTaskbar,
    [switch]$ShowOnTitleBars,
    [switch]$RestartExplorer,

    # Do not skip a (nearly) black first video frame
    [switch]$NoBlackSkip,

    [switch]$Watch,
    [ValidateRange(1, 3600)]
    [int]$Interval = 5,

    # Re-apply even if the wallpaper did not change
    [switch]$Force,

    # Print the color, do not touch the registry
    [switch]$DryRun,

    [switch]$Install,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$TaskName = 'WallpaperAccent'
$StateDir = Join-Path $env:LOCALAPPDATA 'wallpaper-accent'
$StateFile = Join-Path $StateDir 'state.json'
$VideoExt = '.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.wmv', '.flv'
$DrawingExt = '.gif', '.bmp', '.tif', '.tiff'      # decoded by System.Drawing (first frame)
$DirectExt = '.png', '.jpg', '.jpeg'               # handed to matugen as-is

function Log([string]$Message) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message)
}

# ---------------------------------------------------------------- install / uninstall

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Log "Task '$TaskName' removed."
    return
}

if ($Install) {
    $passthrough = foreach ($key in $PSBoundParameters.Keys) {
        if ($key -in 'Install', 'Uninstall', 'Watch', 'DryRun') { continue }
        $value = $PSBoundParameters[$key]
        if ($value -is [System.Management.Automation.SwitchParameter]) { "-$key" }
        else { "-$key `"$value`"" }
    }
    $arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -Watch {1}' -f $PSCommandPath, ($passthrough -join ' ')
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
        -Description 'Wallpaper -> Windows accent color (matugen)' -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Log "Task '$TaskName' registered and started (runs at logon)."
    return
}

# ---------------------------------------------------------------- native helpers

Add-Type -AssemblyName System.Drawing
if (-not ('WallpaperAccent.Native' -as [type])) {
    Add-Type -Namespace WallpaperAccent -Name Native -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true, CharSet = System.Runtime.InteropServices.CharSet.Auto)]
public static extern System.IntPtr SendMessageTimeout(System.IntPtr hWnd, uint Msg, System.UIntPtr wParam, string lParam, uint flags, uint timeout, out System.UIntPtr result);
'@
}

function Find-Tool([string]$Name, [string]$Hint) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "'$Name' not found. $Hint" }
    return $cmd.Source
}

# ---------------------------------------------------------------- wallpaper sources

function Get-FileSignature([string[]]$Files) {
    ($Files | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | ForEach-Object {
        $i = Get-Item -LiteralPath $_
        '{0}|{1}|{2}' -f $i.FullName, $i.Length, $i.LastWriteTimeUtc.Ticks
    }) -join ';'
}

function Get-WindowsWallpaper {
    # TranscodedWallpaper always holds the *current* image (also for slideshows).
    $transcoded = Join-Path $env:APPDATA 'Microsoft\Windows\Themes\TranscodedWallpaper'
    $registry = (Get-ItemProperty 'HKCU:\Control Panel\Desktop' -Name WallPaper -ErrorAction SilentlyContinue).WallPaper
    $file = $null
    if (Test-Path -LiteralPath $transcoded) { $file = $transcoded }
    elseif ($registry -and (Test-Path -LiteralPath $registry)) { $file = $registry }
    if (-not $file) { return $null }
    [pscustomobject]@{
        Name      = 'Windows'
        Media     = $file
        Fallback  = $null
        Signature = Get-FileSignature @($file, $registry)
    }
}

function Test-WallpaperEngineRunning {
    [bool](Get-Process -Name wallpaper32, wallpaper64 -ErrorAction SilentlyContinue)
}

function Find-WallpaperEngineConfig {
    if ($WallpaperEngineDir) {
        $c = Join-Path $WallpaperEngineDir 'config.json'
        if (Test-Path -LiteralPath $c) { return $c }
        throw "No config.json in -WallpaperEngineDir '$WallpaperEngineDir'."
    }
    $steamRoots = @()
    foreach ($key in 'HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam', 'HKLM:\SOFTWARE\Valve\Steam') {
        $p = Get-ItemProperty $key -ErrorAction SilentlyContinue
        if ($p.SteamPath) { $steamRoots += ($p.SteamPath -replace '/', '\') }
        if ($p.InstallPath) { $steamRoots += $p.InstallPath }
    }
    $libraries = New-Object System.Collections.Generic.List[string]
    foreach ($root in ($steamRoots | Select-Object -Unique)) {
        $libraries.Add($root)
        $vdf = Join-Path $root 'steamapps\libraryfolders.vdf'
        if (Test-Path -LiteralPath $vdf) {
            foreach ($m in [regex]::Matches((Get-Content -LiteralPath $vdf -Raw), '"path"\s+"([^"]+)"')) {
                $libraries.Add($m.Groups[1].Value -replace '\\\\', '\')
            }
        }
    }
    foreach ($lib in ($libraries | Select-Object -Unique)) {
        $c = Join-Path $lib 'steamapps\common\wallpaper_engine\config.json'
        if (Test-Path -LiteralPath $c) { return $c }
    }
    return $null
}

function Get-WallpaperEngineWallpaper {
    $config = Find-WallpaperEngineConfig
    if (-not $config) { return $null }
    # Regex instead of ConvertFrom-Json: config.json has per-user keys and PS 5.1 chokes on some of them.
    $raw = Get-Content -LiteralPath $config -Raw
    $m = [regex]::Match($raw, '"selectedwallpapers"[\s\S]*?"file"\s*:\s*"((?:[^"\\]|\\.)*)"')
    if (-not $m.Success) { return $null }
    $selected = [regex]::Unescape($m.Groups[1].Value)
    if (-not (Test-Path -LiteralPath $selected)) { return $null }

    $dir = Split-Path -Parent $selected
    $projectFile = if ((Split-Path -Leaf $selected) -ieq 'project.json') { $selected } else { Join-Path $dir 'project.json' }

    $media = $selected
    $fallback = $null
    if (Test-Path -LiteralPath $projectFile) {
        $project = Get-Content -LiteralPath $projectFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $dir = Split-Path -Parent $projectFile
        $main = if ($project.file) { Join-Path $dir $project.file } else { $null }
        $preview = if ($project.preview) { Join-Path $dir $project.preview } else { $null }
        if (-not $preview -or -not (Test-Path -LiteralPath $preview)) {
            $preview = Get-ChildItem -LiteralPath $dir -Filter 'preview.*' -File -ErrorAction SilentlyContinue |
                Select-Object -First 1 -ExpandProperty FullName
        }
        if ("$($project.type)" -ieq 'video' -and $main -and (Test-Path -LiteralPath $main)) {
            # real video: take its first frame; the preview is only a fallback
            $media = $main
            $fallback = $preview
        }
        else {
            # scene / web / application have no raw frames to read: the preview is the best stand-in
            $media = $preview
            if (-not $media) { return $null }
        }
    }
    [pscustomobject]@{
        Name      = 'WallpaperEngine'
        Media     = $media
        Fallback  = $fallback
        Signature = Get-FileSignature @($config, $projectFile, $media)
    }
}

function Get-FileSource([string]$File) {
    if (-not $File -or -not (Test-Path -LiteralPath $File)) { throw "-Path '$File' does not exist." }
    $full = (Resolve-Path -LiteralPath $File).Path
    [pscustomobject]@{ Name = 'File'; Media = $full; Fallback = $null; Signature = Get-FileSignature @($full) }
}

function Get-WallpaperSource {
    switch ($Source) {
        'Windows' { return Get-WindowsWallpaper }
        'WallpaperEngine' { return Get-WallpaperEngineWallpaper }
        'File' { return Get-FileSource $Path }
        default {
            if (Test-WallpaperEngineRunning) {
                $we = Get-WallpaperEngineWallpaper
                if ($we) { return $we }
            }
            return Get-WindowsWallpaper
        }
    }
}

# ---------------------------------------------------------------- still frame

function Test-MostlyBlack([string]$Png) {
    $bmp = New-Object System.Drawing.Bitmap $Png
    $small = New-Object System.Drawing.Bitmap $bmp, 16, 16
    try {
        $sum = 0.0
        for ($x = 0; $x -lt 16; $x++) {
            for ($y = 0; $y -lt 16; $y++) {
                $p = $small.GetPixel($x, $y)
                $sum += 0.2126 * $p.R + 0.7152 * $p.G + 0.0722 * $p.B
            }
        }
        return (($sum / 256) -lt 8)
    }
    finally { $small.Dispose(); $bmp.Dispose() }
}

function Export-VideoFrame([string]$Video, [string]$Out) {
    $ffmpeg = Find-Tool $FfmpegPath 'Install it (e.g. "winget install Gyan.FFmpeg") or pass -FfmpegPath.'
    $ErrorActionPreference = 'Continue'
    $times = if ($NoBlackSkip) { @(0) } else { @(0, 1, 3) }
    foreach ($t in $times) {
        if (Test-Path -LiteralPath $Out) { Remove-Item -LiteralPath $Out -Force }
        & $ffmpeg -v error -y -ss $t -i $Video -frames:v 1 $Out 2>$null
        if (-not (Test-Path -LiteralPath $Out)) { continue }
        if ($NoBlackSkip -or -not (Test-MostlyBlack $Out)) { return $true }
        Log "Frame at ${t}s is nearly black, trying a later one."
    }
    return (Test-Path -LiteralPath $Out)
}

function Get-StillFrame($Src) {
    New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
    $out = Join-Path $StateDir 'frame.png'
    foreach ($candidate in @($Src.Media, $Src.Fallback)) {
        if (-not $candidate -or -not (Test-Path -LiteralPath $candidate)) { continue }
        $ext = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
        try {
            if ($VideoExt -contains $ext) {
                if (Export-VideoFrame $candidate $out) { return $out }
            }
            elseif ($DrawingExt -contains $ext) {
                $img = [System.Drawing.Image]::FromFile($candidate)   # loads frame 0 of animated GIFs
                try { $img.Save($out, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $img.Dispose() }
                return $out
            }
            elseif ($DirectExt -contains $ext -or [string]::IsNullOrEmpty($ext)) {
                # TranscodedWallpaper has no extension (it is a JPEG/PNG); matugen sniffs the format
                $copy = Join-Path $StateDir 'frame.src'
                Copy-Item -LiteralPath $candidate -Destination $copy -Force
                return $copy
            }
            else {
                # webp etc.: let ffmpeg decode it
                if (Export-VideoFrame $candidate $out) { return $out }
            }
        }
        catch { Log "Could not read '$candidate': $($_.Exception.Message)" }
    }
    throw 'No usable still frame could be produced from the wallpaper.'
}

# ---------------------------------------------------------------- matugen

function ConvertTo-HexString($Value) {
    if ($null -eq $Value) { return $null }
    if ($Value -is [string]) { return $Value }
    foreach ($name in 'hex', 'color', 'default') {
        if ($Value.PSObject.Properties[$name]) { return ConvertTo-HexString $Value.$name }
    }
    return $null
}

function Get-MatugenColor([string]$Image, [string]$ThemeMode) {
    $exe = Find-Tool $MatugenPath 'Get it from https://github.com/InioX/matugen/releases or "cargo install matugen".'
    $ErrorActionPreference = 'Continue'   # native stderr must not become a terminating error
    $base = @('image', $Image, '--json', 'hex', '--mode', $ThemeMode.ToLower(), '--type', $SchemeType)
    # --dry-run keeps matugen from running the user's templates/hooks; very old/new builds may not know it
    $out = & $exe @($base + '--dry-run') 2>$null
    if ($LASTEXITCODE -ne 0) { $out = & $exe @base 2>$null }
    if ($LASTEXITCODE -ne 0 -or -not $out) { throw "matugen failed (exit $LASTEXITCODE)." }

    $json = ($out -join "`n") | ConvertFrom-Json
    $key = $ThemeMode.ToLower()
    $hex = $null
    # layout A: colors.<role>.<mode>     layout B: colors.<mode>.<role>
    if ($json.colors.PSObject.Properties[$Role]) {
        $entry = $json.colors.$Role
        $hex = if ($entry.PSObject.Properties[$key]) { ConvertTo-HexString $entry.$key } else { ConvertTo-HexString $entry }
    }
    if (-not $hex -and $json.colors.PSObject.Properties[$key]) {
        $hex = ConvertTo-HexString $json.colors.$key.$Role
    }
    if (-not $hex -or $hex -notmatch '^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$') {
        throw "Could not find role '$Role' in matugen's JSON output."
    }
    $hex = $hex.TrimStart('#')
    return [int[]]@(
        [Convert]::ToInt32($hex.Substring(0, 2), 16),
        [Convert]::ToInt32($hex.Substring(2, 2), 16),
        [Convert]::ToInt32($hex.Substring(4, 2), 16))
}

# ---------------------------------------------------------------- applying the color

function Get-Shade([int[]]$Rgb, [int[]]$Target, [double]$Amount) {
    , [int[]]@(0..2 | ForEach-Object { [int][Math]::Round($Rgb[$_] + ($Target[$_] - $Rgb[$_]) * $Amount) })
}

function ConvertTo-Dword([uint32]$Value) {
    [BitConverter]::ToInt32([BitConverter]::GetBytes($Value), 0)
}

function Set-Dword([string]$Key, [string]$Name, [uint32]$Value) {
    if (-not (Test-Path $Key)) { New-Item -Path $Key -Force | Out-Null }
    Set-ItemProperty -Path $Key -Name $Name -Value (ConvertTo-Dword $Value) -Type DWord
}

function Set-WindowsAccent([int[]]$Rgb) {
    $white = 255, 255, 255
    $black = 0, 0, 0
    # lightest -> darkest, slot 3 is the accent itself (same layout Settings writes)
    $palette = @(
        (Get-Shade $Rgb $white 0.6), (Get-Shade $Rgb $white 0.4), (Get-Shade $Rgb $white 0.2),
        $Rgb,
        (Get-Shade $Rgb $black 0.2), (Get-Shade $Rgb $black 0.4), (Get-Shade $Rgb $black 0.6)
    )
    $bytes = New-Object System.Collections.Generic.List[byte]
    foreach ($c in $palette) { $bytes.AddRange([byte[]]@($c[0], $c[1], $c[2], 0)) }
    $bytes.AddRange([byte[]]@(0xF7, 0x63, 0x0C, 0))   # slot 7 is unused; this is Windows' default value

    $abgr = { param($c) [uint32](4278190080 -bor ($c[2] -shl 16) -bor ($c[1] -shl 8) -bor $c[0]) }
    $argb = { param($c) [uint32](3288334336 -bor ($c[0] -shl 16) -bor ($c[1] -shl 8) -bor $c[2]) }

    $accentKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent'
    if (-not (Test-Path $accentKey)) { New-Item -Path $accentKey -Force | Out-Null }
    Set-ItemProperty -Path $accentKey -Name AccentPalette -Value $bytes.ToArray() -Type Binary
    Set-Dword $accentKey 'AccentColorMenu' (& $abgr $Rgb)
    Set-Dword $accentKey 'StartColorMenu' (& $abgr $palette[4])

    $dwm = 'HKCU:\Software\Microsoft\Windows\DWM'
    Set-Dword $dwm 'AccentColor' (& $abgr $Rgb)
    Set-Dword $dwm 'ColorizationColor' (& $argb $Rgb)
    Set-Dword $dwm 'ColorizationAfterglow' (& $argb $Rgb)
    if ($ShowOnTitleBars) { Set-Dword $dwm 'ColorPrevalence' 1 }

    if ($ShowOnTaskbar) {
        Set-Dword 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'ColorPrevalence' 1
    }
    # stop Windows from re-deriving the accent itself ("Automatic")
    Set-Dword 'HKCU:\Control Panel\Desktop' 'AutoColorization' 0

    $r = [UIntPtr]::Zero
    foreach ($setting in 'ImmersiveColorSet', 'WindowsThemeElement') {
        [void][WallpaperAccent.Native]::SendMessageTimeout([IntPtr]0xFFFF, 0x1A, [UIntPtr]::Zero, $setting, 2, 5000, [ref]$r)
    }
    if ($RestartExplorer) {
        Stop-Process -Name explorer -Force
        Start-Sleep -Milliseconds 500
        if (-not (Get-Process -Name explorer -ErrorAction SilentlyContinue)) { Start-Process explorer.exe }
    }
}

# ---------------------------------------------------------------- main

function Get-ThemeMode {
    if ($Mode) { return $Mode }
    $v = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -Name AppsUseLightTheme -ErrorAction SilentlyContinue).AppsUseLightTheme
    if ($v -eq 1) { 'Light' } else { 'Dark' }
}

function Read-State {
    if (Test-Path -LiteralPath $StateFile) {
        try { return Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json } catch { }
    }
    return $null
}

function Invoke-Once {
    $src = Get-WallpaperSource
    if (-not $src) { Log 'No wallpaper source found.'; return }
    $themeMode = Get-ThemeMode
    $stamp = "$($src.Signature)#$themeMode#$Role#$SchemeType"
    $state = Read-State
    if (-not $Force -and -not $DryRun -and $state -and $state.Stamp -eq $stamp) { return }

    Log "Source: $($src.Name) -> $($src.Media)"
    $frame = Get-StillFrame $src
    $rgb = Get-MatugenColor $frame $themeMode
    Log ("Accent ({0}, {1}): #{2:X2}{3:X2}{4:X2}" -f $Role, $themeMode, $rgb[0], $rgb[1], $rgb[2])

    if (-not $DryRun) {
        Set-WindowsAccent $rgb
        New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
        @{ Stamp = $stamp } | ConvertTo-Json | Set-Content -LiteralPath $StateFile -Encoding UTF8
    }
}

if ($Watch) {
    Log "Watching every ${Interval}s. Ctrl+C to stop."
    while ($true) {
        try { Invoke-Once } catch { Log "Error: $($_.Exception.Message)" }
        Start-Sleep -Seconds $Interval
    }
}
else {
    Invoke-Once
}
