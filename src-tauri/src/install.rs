//! Installing and updating apps from their GitHub releases.
//!
//! Each app publishes a zip of the unpacked app for every platform beside its
//! installers (see `asset_suffix`).
//! WidgetCake downloads that zip, unpacks it next to the copy already there,
//! and swaps the new one in only once it is complete, so a failed or cancelled
//! download never leaves an app half-installed.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

/// Written into each installed app's folder: what WidgetCake put there.
const MARKER: &str = "widgetcake.json";

/// How often a download reports progress to the window.
const PROGRESS_EVERY: Duration = Duration::from_millis(150);

fn api_base() -> String {
    // Lets a development build talk to a stand-in for GitHub while testing.
    if cfg!(debug_assertions) {
        if let Ok(url) = std::env::var("WIDGETCAKE_GITHUB_API") {
            return url;
        }
    }
    "https://api.github.com".into()
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(concat!("WidgetCake/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| format!("Couldn't start a download: {e}"))
}

/// Where installed apps live, one folder per app id.
pub fn apps_root(handle: &AppHandle) -> Option<PathBuf> {
    handle.path().app_local_data_dir().ok().map(|dir| dir.join("apps"))
}

pub fn installed_dir(handle: &AppHandle, id: &str) -> Option<PathBuf> {
    Some(apps_root(handle)?.join(id))
}

#[derive(Serialize, Deserialize)]
struct Marker {
    version: String,
}

/// The end of the release file built for this computer. Every app publishes
/// one per platform; Windows's keeps the name it has always had.
pub fn asset_suffix() -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", _) => "-win.zip",
        ("macos", "aarch64") => "-macos-arm64.zip",
        ("macos", _) => "-macos-x64.zip",
        ("linux", "aarch64") => "-linux-arm64.zip",
        _ => "-linux-x64.zip",
    }
}

/// The program inside an app's folder: `<name>.exe` on Windows, `<name>` on
/// Linux, and on macOS the executable inside `<name>.app`.
pub fn program(dir: &Path, name: &str) -> Option<PathBuf> {
    if cfg!(target_os = "macos") {
        let bin = dir.join(format!("{name}.app")).join("Contents").join("MacOS");
        return fs::read_dir(bin).ok()?.flatten().map(|e| e.path()).find(|p| p.is_file());
    }
    let file = if cfg!(windows) { dir.join(format!("{name}.exe")) } else { dir.join(name) };
    file.is_file().then_some(file)
}

pub fn installed_version(dir: &Path) -> Option<String> {
    let text = fs::read_to_string(dir.join(MARKER)).ok()?;
    serde_json::from_str::<Marker>(&text).ok().map(|m| m.version)
}

#[derive(Deserialize)]
struct GhRelease {
    tag_name: String,
    assets: Vec<GhAsset>,
}

#[derive(Deserialize)]
struct GhAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

pub struct Latest {
    pub version: String,
    url: String,
    size: u64,
}

/// The newest published release and its download for WidgetCake. Drafts and
/// pre-releases are skipped, because GitHub leaves them out of "latest".
pub async fn latest(repo: &str) -> Result<Latest, String> {
    let suffix = asset_suffix();
    let url = format!("{}/repos/{repo}/releases/latest", api_base());
    let resp = client()?
        .get(&url)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|_| "Couldn't reach GitHub. Check your internet connection.".to_string())?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("This app hasn't published a release yet.".into());
    }
    if !resp.status().is_success() {
        return Err(format!("GitHub didn't answer ({}). Try again in a minute.", resp.status()));
    }
    let release: GhRelease = resp
        .json()
        .await
        .map_err(|_| "GitHub sent something unexpected. Try again in a minute.".to_string())?;
    let version = release.tag_name.trim_start_matches('v').to_owned();
    let asset = release
        .assets
        .into_iter()
        .find(|a| a.name.ends_with(suffix))
        .ok_or_else(|| format!("Version {version} has no download for WidgetCake yet."))?;
    Ok(Latest {
        version,
        url: asset.browser_download_url,
        size: asset.size,
    })
}

#[derive(Serialize, Clone)]
struct Progress {
    id: String,
    received: u64,
    total: u64,
    unpacking: bool,
}

/// Downloads the newest release and installs it, replacing any older copy.
/// Returns the version installed.
pub async fn install(
    handle: &AppHandle,
    id: &str,
    repo: &str,
    exe: &str,
) -> Result<String, String> {
    let latest = latest(repo).await?;
    let root = apps_root(handle).ok_or("There's no folder to install apps into.")?;
    fs::create_dir_all(&root).map_err(|e| format!("Couldn't create the apps folder: {e}"))?;

    let download = root.join(format!("{id}.download"));
    let mut resp = client()?
        .get(&latest.url)
        .send()
        .await
        .map_err(|_| "The download couldn't start. Check your internet connection.".to_string())?;
    if !resp.status().is_success() {
        return Err(format!("The download failed ({}). Try again.", resp.status()));
    }
    let total = resp.content_length().unwrap_or(latest.size);
    let mut file =
        fs::File::create(&download).map_err(|e| format!("Couldn't save the download: {e}"))?;
    let mut received = 0u64;
    let mut reported = Instant::now();
    let report = |received: u64, unpacking: bool| {
        let _ = handle.emit(
            "install-progress",
            Progress { id: id.to_owned(), received, total, unpacking },
        );
    };
    report(0, false);
    loop {
        let chunk = match resp.chunk().await {
            Ok(Some(chunk)) => chunk,
            Ok(None) => break,
            Err(_) => {
                let _ = fs::remove_file(&download);
                return Err("The download stopped partway. Check your connection and try again.".into());
            }
        };
        file.write_all(&chunk)
            .map_err(|e| format!("Couldn't save the download: {e}"))?;
        received += chunk.len() as u64;
        if reported.elapsed() >= PROGRESS_EVERY {
            report(received, false);
            reported = Instant::now();
        }
    }
    drop(file);
    report(received, true);

    let (id, exe, version) = (id.to_owned(), exe.to_owned(), latest.version.clone());
    tauri::async_runtime::spawn_blocking(move || unpack(&root, &id, &download, &exe, &version))
        .await
        .map_err(|e| format!("Unpacking stopped unexpectedly: {e}"))??;
    Ok(latest.version)
}

fn unpack(root: &Path, id: &str, download: &Path, exe: &str, version: &str) -> Result<(), String> {
    let fresh = root.join(format!("{id}.new"));
    let _ = fs::remove_dir_all(&fresh);
    let result = (|| {
        let file = fs::File::open(download).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|_| "The download is damaged.".to_string())?;
        // Refuses entries that would land outside the folder.
        archive.extract(&fresh).map_err(|e| format!("Couldn't unpack it: {e}"))?;

        // The app may sit at the top of the zip or inside a single folder.
        let base = if program(&fresh, exe).is_some() {
            fresh.clone()
        } else {
            let mut dirs = fs::read_dir(&fresh)
                .map_err(|e| e.to_string())?
                .filter_map(Result::ok)
                .map(|e| e.path())
                .filter(|p| program(p, exe).is_some());
            match (dirs.next(), dirs.next()) {
                (Some(dir), None) => dir,
                _ => return Err(format!("The download doesn't contain {exe}.")),
            }
        };

        // Zips usually carry the execute bit, but one made without it would
        // install an app that can't start.
        #[cfg(unix)]
        if let Some(bin) = program(&base, exe) {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&bin, fs::Permissions::from_mode(0o755));
        }

        let marker = serde_json::to_string(&Marker { version: version.to_owned() }).unwrap();
        fs::write(base.join(MARKER), marker).map_err(|e| e.to_string())?;

        let target = root.join(id);
        if target.exists() {
            fs::remove_dir_all(&target).map_err(|_| {
                "Couldn't replace the old version. Make sure the app is closed, then try again."
                    .to_string()
            })?;
        }
        fs::rename(&base, &target).map_err(|e| format!("Couldn't finish installing: {e}"))?;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&fresh);
    let _ = fs::remove_file(download);
    result
}

pub fn uninstall(handle: &AppHandle, id: &str) -> Result<(), String> {
    let dir = installed_dir(handle, id).ok_or("There's no apps folder.")?;
    fs::remove_dir_all(&dir).map_err(|_| {
        "Couldn't remove it. Make sure the app is closed, then try again.".to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_the_program_for_this_platform() {
        let dir = std::env::temp_dir().join(format!("widgetcake-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let bin = if cfg!(target_os = "macos") {
            dir.join("Demo.app/Contents/MacOS/Demo")
        } else if cfg!(windows) {
            dir.join("Demo.exe")
        } else {
            dir.join("Demo")
        };
        fs::create_dir_all(bin.parent().unwrap()).unwrap();
        assert_eq!(program(&dir, "Demo"), None);
        fs::write(&bin, b"").unwrap();
        assert_eq!(program(&dir, "Demo"), Some(bin));
        assert!(asset_suffix().ends_with(".zip"));
        let _ = fs::remove_dir_all(&dir);
    }
}
