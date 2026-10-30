# wallpaper-accent

`Set-WallpaperAccent.ps1` берёт обои, строит палитру Material You через [matugen](https://github.com/InioX/matugen) и ставит цвет (по умолчанию `primary`) как акцентный цвет Windows.

## Источники обоев

| Источник | Что берётся |
|---|---|
| Обои Windows (в т.ч. слайд-шоу) | `TranscodedWallpaper` — всегда текущая картинка |
| Wallpaper Engine, тип `video` | первый кадр видео (через ffmpeg); превью — запасной вариант |
| Wallpaper Engine, `scene` / `web` / `application` | превью обоев (`preview.gif/jpg/png`), у GIF берётся первый кадр |
| `-Source File -Path ...` | любой png/jpg/gif/mp4/webm/mkv/... |

В режиме `Auto` (по умолчанию) используется Wallpaper Engine, если он запущен, иначе обои Windows.
Если первый кадр видео почти чёрный (затемнение на старте), берётся кадр на 1 с или 3 с; отключается ключом `-NoBlackSkip`.

## Требования
- Windows 10/11, PowerShell 5.1+
- `matugen` в `PATH` (или `-MatugenPath`)
- `ffmpeg` в `PATH` (или `-FfmpegPath`) — только для видео-обоев

## Использование
```powershell
.\Set-WallpaperAccent.ps1                       # один раз
.\Set-WallpaperAccent.ps1 -Watch                # следить за сменой обоев
.\Set-WallpaperAccent.ps1 -DryRun               # только показать цвет
.\Set-WallpaperAccent.ps1 -Install -ShowOnTaskbar -ShowOnTitleBars   # автозапуск при входе
.\Set-WallpaperAccent.ps1 -Uninstall
```
Полезные параметры: `-Mode Dark|Light` (по умолчанию тема приложений), `-Role primary|secondary|tertiary|primary_container|...`,
`-SchemeType scheme-tonal-spot`, `-WallpaperEngineDir`, `-RestartExplorer` (если панель задач не подхватила цвет), `-Force`.

## Что пишется в реестр (HKCU)
`Explorer\Accent` (`AccentPalette`, `AccentColorMenu`, `StartColorMenu`), `DWM` (`AccentColor`, `ColorizationColor`, `ColorizationAfterglow`),
`Control Panel\Desktop\AutoColorization = 0`, затем рассылается `WM_SETTINGCHANGE`.

## Статус
Скрипт написан без возможности запустить его на Windows: на реальной системе ещё не проверялся.
