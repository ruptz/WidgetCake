mod install;

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};

/// How often the watcher checks whether a launched app is still running.
const WATCH_EVERY: Duration = Duration::from_millis(400);

/// How long an app gets to shut itself down before it is force-closed.
/// ChatterLayer leaves its Discord call and closes its tunnel on the way out.
const STOP_GRACE: Duration = Duration::from_secs(10);

#[derive(Deserialize, Clone)]
struct AppEntry {
    id: String,
    name: String,
    tagline: String,
    /// Its source folder beside the launcher, used while developing.
    folder: String,
    /// A compiled program inside that folder to run while developing, for apps
    /// that aren't Electron (e.g. Tauri's src-tauri/target/debug build).
    #[serde(default)]
    dev: Option<String>,
    release: Release,
    overlay: Overlay,
    website: Option<String>,
    github: String,
    /// The two-letter badge and its colour, which tell the apps apart.
    mark: String,
    colour: String,
    /// A logo shipped with the launcher, so a card has it before the app is
    /// installed. Until an app has one, the badge stands in.
    #[serde(default)]
    logo: Option<String>,
}

/// Where an app is published and what WidgetCake installs from it.
#[derive(Deserialize, Clone)]
struct Release {
    repo: String,
    /// The program's name, without .exe or .app — see install::program.
    exe: String,
}

/// Where an app's OBS browser source lives, and where it keeps the port when
/// someone changes it. The settings path is relative to the per-user config
/// folder (%APPDATA% on Windows).
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Overlay {
    settings: String,
    port_key: String,
    default_port: u16,
    path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppView {
    id: String,
    name: String,
    tagline: String,
    version: Option<String>,
    installed: bool,
    overlay_url: String,
    website: Option<String>,
    github: String,
    mark: String,
    colour: String,
    logo: Option<String>,
    state: &'static str,
    problem: Option<String>,
}

#[derive(Serialize, Clone)]
struct StateChange {
    id: String,
    state: &'static str,
}

struct Apps {
    list: Vec<AppEntry>,
    running: Arc<Mutex<HashMap<String, Child>>>,
    /// Apps mid-download, so a second click doesn't start another.
    installing: Mutex<HashSet<String>>,
}

impl Apps {
    fn entry(&self, id: &str) -> Result<&AppEntry, String> {
        self.list
            .iter()
            .find(|a| a.id == id)
            .ok_or_else(|| format!("No app called {id}"))
    }

    fn is_running(&self, id: &str) -> bool {
        self.running.lock().unwrap().contains_key(id)
    }
}

/// What an app runs from: its source while developing, or the copy
/// WidgetCake installed.
enum Source {
    /// An Electron app's source folder.
    Dev(PathBuf),
    /// A compiled development build: its folder, and the program in it.
    Program(PathBuf, PathBuf),
    Installed(PathBuf),
}

/// The project folder that holds the launcher and every app beside it.
fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("..")
}

/// Development builds run apps from their source folders. Setting
/// WIDGETCAKE_INSTALLED makes one behave like a user's copy instead.
fn use_dev() -> bool {
    cfg!(debug_assertions) && std::env::var_os("WIDGETCAKE_INSTALLED").is_none()
}

fn electron(dir: &Path) -> PathBuf {
    let dist = dir.join("node_modules").join("electron").join("dist");
    if cfg!(windows) {
        dist.join("electron.exe")
    } else if cfg!(target_os = "macos") {
        dist.join("Electron.app/Contents/MacOS/Electron")
    } else {
        dist.join("electron")
    }
}

fn source(app: &AppEntry, handle: &AppHandle) -> Option<Source> {
    if use_dev() {
        let dir = root().join(&app.folder);
        match &app.dev {
            Some(program) if dir.join(program).is_file() => {
                let exe = dir.join(program);
                return Some(Source::Program(dir, exe));
            }
            None if electron(&dir).is_file() => return Some(Source::Dev(dir)),
            _ => {}
        }
    }
    let dir = install::installed_dir(handle, &app.id)?;
    install::program(&dir, &app.release.exe).map(|_| Source::Installed(dir))
}

/// Why a development copy can't be launched, in words for its card.
fn problem(app: &AppEntry) -> Option<String> {
    let dir = root().join(&app.folder);
    if !use_dev() || !dir.is_dir() {
        return None;
    }
    match &app.dev {
        Some(program) => (!dir.join(program).is_file())
            .then(|| format!("Not built yet. Run npm run dev in {} once.", app.folder)),
        None => (!electron(&dir).is_file())
            .then(|| format!("Not set up yet. Run npm install in {}.", app.folder)),
    }
}

fn version(source: &Source) -> Option<String> {
    match source {
        Source::Dev(dir) | Source::Program(dir, _) => {
            let text = std::fs::read_to_string(dir.join("package.json")).ok()?;
            let json: serde_json::Value = serde_json::from_str(&text).ok()?;
            json.get("version")?.as_str().map(str::to_owned)
        }
        Source::Installed(dir) => install::installed_version(dir),
    }
}

/// The address to paste into OBS, on the port the app is really using.
fn overlay_url(app: &AppEntry, handle: &AppHandle) -> String {
    let o = &app.overlay;
    let port = handle
        .path()
        .config_dir()
        .ok()
        .and_then(|dir| std::fs::read_to_string(dir.join(&o.settings)).ok())
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
        .and_then(|json| {
            o.port_key
                .split('.')
                .try_fold(&json, |v, key| v.get(key))
                .and_then(|v| v.as_u64())
        })
        .and_then(|p| u16::try_from(p).ok())
        .unwrap_or(o.default_port);
    format!("http://127.0.0.1:{port}{}", o.path)
}

/// Starts the app. Every Layer app holds a single-instance lock, so a second
/// start never opens a second copy: it hands its arguments to the running
/// one, which shows its window, or quits for `--quit`.
fn start(app: &AppEntry, handle: &AppHandle, args: &[&str]) -> std::io::Result<Child> {
    let mut command = match source(app, handle) {
        Some(Source::Dev(dir)) => {
            let mut c = Command::new(electron(&dir));
            c.arg(&dir).current_dir(&dir);
            c
        }
        Some(Source::Program(dir, exe)) => {
            let mut c = Command::new(exe);
            c.current_dir(&dir);
            c
        }
        Some(Source::Installed(dir)) => {
            let exe = install::program(&dir, &app.release.exe).ok_or(std::io::ErrorKind::NotFound)?;
            let mut c = Command::new(exe);
            c.current_dir(&dir);
            c
        }
        None => return Err(std::io::ErrorKind::NotFound.into()),
    };
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

/// Ends the app and everything it started, such as ChatterLayer's engine.
fn force_close(child: &mut Child) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = Command::new("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }
    #[cfg(not(windows))]
    let _ = child.kill();
}

/// Asks the app to quit the way its own tray menu would, then force-closes it
/// if it is still there after the grace period. Returns once it has gone.
fn stop_and_wait(app: &AppEntry, handle: &AppHandle, running: &Mutex<HashMap<String, Child>>) {
    if let Ok(mut asker) = start(app, handle, &["--quit"]) {
        let _ = asker.wait();
    }
    let deadline = Instant::now() + STOP_GRACE;
    while Instant::now() < deadline {
        if !running.lock().unwrap().contains_key(&app.id) {
            return;
        }
        thread::sleep(WATCH_EVERY);
    }
    if let Some(child) = running.lock().unwrap().get_mut(&app.id) {
        force_close(child);
    }
}

/// Notices apps that exit, whether stopped from here, quit from their own
/// tray, or crashed, and tells the window.
fn watch(handle: AppHandle, running: Arc<Mutex<HashMap<String, Child>>>) {
    thread::spawn(move || loop {
        let gone: Vec<String> = {
            let mut map = running.lock().unwrap();
            let gone: Vec<String> = map
                .iter_mut()
                .filter_map(|(id, child)| match child.try_wait() {
                    Ok(None) => None,
                    _ => Some(id.clone()),
                })
                .collect();
            for id in &gone {
                map.remove(id);
            }
            gone
        };
        for id in gone {
            let _ = handle.emit("app-state", StateChange { id, state: "off" });
        }
        thread::sleep(WATCH_EVERY);
    });
}

#[tauri::command]
fn list_apps(handle: AppHandle, apps: State<Apps>) -> Vec<AppView> {
    let installing = apps.installing.lock().unwrap().clone();
    apps.list
        .iter()
        .map(|app| {
            let source = source(app, &handle);
            let problem = problem(app);
            let state = if installing.contains(&app.id) {
                "installing"
            } else if apps.is_running(&app.id) {
                "live"
            } else if source.is_some() {
                "off"
            } else if problem.is_some() {
                "missing"
            } else {
                "available"
            };
            AppView {
                id: app.id.clone(),
                name: app.name.clone(),
                tagline: app.tagline.clone(),
                version: source.as_ref().and_then(version),
                installed: matches!(source, Some(Source::Installed(_))),
                overlay_url: overlay_url(app, &handle),
                website: app.website.clone(),
                github: app.github.clone(),
                mark: app.mark.clone(),
                colour: app.colour.clone(),
                logo: app.logo.clone(),
                state,
                problem,
            }
        })
        .collect()
}

#[tauri::command]
fn launch(id: String, handle: AppHandle, apps: State<Apps>) -> Result<(), String> {
    let app = apps.entry(&id)?;
    if let Some(why) = problem(app) {
        return Err(why);
    }
    let mut running = apps.running.lock().unwrap();
    if running.contains_key(&id) {
        return Ok(());
    }
    let child =
        start(app, &handle, &[]).map_err(|e| format!("Couldn't start {}: {e}", app.name))?;
    running.insert(id, child);
    Ok(())
}

/// Brings a running app's window to the front, even from its tray.
#[tauri::command]
fn open(id: String, handle: AppHandle, apps: State<Apps>) -> Result<(), String> {
    let app = apps.entry(&id)?;
    start(app, &handle, &[])
        .map(drop)
        .map_err(|e| format!("Couldn't open {}: {e}", app.name))
}

/// Returns at once; the window hears "off" from the watcher when it's done.
#[tauri::command]
fn stop(id: String, handle: AppHandle, apps: State<Apps>) -> Result<(), String> {
    let app = apps.entry(&id)?.clone();
    let running = apps.running.clone();
    thread::spawn(move || stop_and_wait(&app, &handle, &running));
    Ok(())
}

/// The newest version on GitHub. Only ever asked for when someone clicks.
#[tauri::command]
async fn latest_version(id: String, apps: State<'_, Apps>) -> Result<String, String> {
    let app = apps.entry(&id)?.clone();
    install::latest(&app.release.repo)
        .await
        .map(|l| l.version)
}

/// Installs or updates an app; progress arrives as "install-progress".
#[tauri::command]
async fn install_app(
    id: String,
    handle: AppHandle,
    apps: State<'_, Apps>,
) -> Result<String, String> {
    let app = apps.entry(&id)?.clone();
    if apps.is_running(&id) {
        return Err(format!("Stop {} first, then update it.", app.name));
    }
    if !apps.installing.lock().unwrap().insert(id.clone()) {
        return Err(format!("{} is already downloading.", app.name));
    }
    let r = &app.release;
    let result = install::install(&handle, &id, &r.repo, &r.exe).await;
    apps.installing.lock().unwrap().remove(&id);
    result
}

#[tauri::command]
fn uninstall_app(id: String, handle: AppHandle, apps: State<Apps>) -> Result<(), String> {
    let app = apps.entry(&id)?;
    if apps.is_running(&id) {
        return Err(format!("Stop {} first, then uninstall it.", app.name));
    }
    install::uninstall(&handle, &id)
}

/// Closing the window with apps running asks first; this is the answer.
#[tauri::command]
fn quit(stop_all: bool, handle: AppHandle, apps: State<Apps>) {
    let running = apps.running.clone();
    let list: Vec<AppEntry> = {
        let ids = running.lock().unwrap();
        apps.list
            .iter()
            .filter(|a| ids.contains_key(&a.id))
            .cloned()
            .collect()
    };
    thread::spawn(move || {
        if stop_all {
            let stops: Vec<_> = list
                .into_iter()
                .map(|app| {
                    let (handle, running) = (handle.clone(), running.clone());
                    thread::spawn(move || stop_and_wait(&app, &handle, &running))
                })
                .collect();
            for s in stops {
                let _ = s.join();
            }
        }
        handle.exit(0);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let list: Vec<AppEntry> =
        serde_json::from_str(include_str!("../apps.json")).expect("apps.json is valid");
    let running = Arc::new(Mutex::new(HashMap::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Apps {
            list,
            running: running.clone(),
            installing: Mutex::new(HashSet::new()),
        })
        .setup(move |app| {
            watch(app.handle().clone(), running);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let apps = window.state::<Apps>();
                if !apps.running.lock().unwrap().is_empty() {
                    api.prevent_close();
                    let _ = window.emit("close-requested", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_apps,
            launch,
            open,
            stop,
            latest_version,
            install_app,
            uninstall_app,
            quit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
