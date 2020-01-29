let hub = new signalR.HubConnectionBuilder().withAutomaticReconnect().withUrl("/MapperHub").build();
hub.start();

let notes = [];

let noteSpeed = 500;
let screenX = 300;

let startNote;
let gridSize = 300;

let lastHit = -1;
let hitIndex = -1;

let brightness = 32;

let soundLink;
let soundTime = 0;
let soundTimeLast = 0;
let sound = null;

let hitSound;
let clickSound;

let bypass = false;

function Sound(path, loadedEvt) {
    this.sound = loadSound(path, loadedEvt);
    this.time = 0;
    this.lastTimePlayed = 0;
    this.synced = false;
    this.isPlaying = false;
    this.isPaused = false;

    this.isLoaded = () => {
        return this.sound.isLoaded();
    };

    this.GetTime = () => {
        return this.time;
    };

    this.Tick = (delta) => {
        if (!this.isLoaded())
            return;

        if (!this.synced && this.isPlaying && this.sound.isPlaying) {
            let current = this.sound.currentTime();

            if (current !== 0 && current !== this.lastTimePlayed) {
                this.synced = true;

                this.time += this.sound.currentTime() - this.lastTimePlayed;
            }
        } else if (this.isPlaying) {
            this.time += delta;
        }
    };
    this.Play = () => {
        this.isPlaying = true;
        this.isPaused = false;

        this.sound.play(this.GetTime());
    };
    this.Pause = () => {
        this.isPlaying = false;
        this.isPaused = true;
        this.synced = false;

        this.lastTimePlayed = this.sound.currentTime();

        this.sound.pause();
    };
    this.Stop = () => {
        this.isPlaying = false;
        this.isPaused = false;

        this.synced = false;

        this.time = 0;
        this.lastTimePlayed = 0;

        this.sound.stop();
    };
    this.SetVolume = (v) => {
        this.sound.setVolume(v);
    };
}

function setup() {
    createCanvas(windowWidth, windowHeight, P2D);
}

function windowResized() {
    bypass = true;
    resizeCanvas(windowWidth, windowHeight);
    bypass = false;
}

function mouseClicked() {

}

function keyPressed(evt) {
    if (sound == null || !evt.isTrusted)
        return;

    if (evt.key == ' ') {
        if (!sound.isPlaying)
            sound.Play(); //sound.currentTime());
        else
            sound.Pause();
    }
}

function preload() {
    if (soundLink == null)
        return;

    sound = new Sound(soundLink, soundLoaded);
    sound.SetVolume(0.1);

    if (hitSound == null) {
        hitSound = loadSound("/sounds/hit.wav");
        hitSound.setVolume(0.3);
    }
    if (clickSound == null) {
        clickSound = loadSound("/sounds/click.wav");
        clickSound.setVolume(0.3);
    }
}

function getTime() {
    if (sound == null)
        return { Actual: 0, Smooth: 0 };

    /*
    let songTime = sound.GetTime();
    let newTime = songTime;

    let diff = songTime - soundTimeLast;

    if (sound.isPaused && sound.GetTime() == 0) {
        songTime = soundTime;
        //newTime = soundTime;
    }
    else if (sound.isPlaying && sound.GetTime() > 0) {
        diff = deltaTime / 1000 - diff;

        newTime += diff;// - deltaTime / 1000 / 2;
        soundTime = songTime;
    }

    soundTimeLast = songTime;

    return { Actual: songTime, Smooth: Math.max(0, newTime) };
    */
    return { Actual: sound.GetTime(), Smooth: sound.GetTime() };
}

function gridRect(s) {
    let cx = windowWidth / 2;
    let cy = windowHeight / 2;

    let x = cx - s / 2;
    let y = cy - s / 2;

    return { X: Math.floor(x) + 0.5, Y: Math.floor(y) + 0.5 }
}

function drawNote(note, x, y, s, a) {
    if (a == null)
        a = 1;

    let third = s / 3;

    stroke('rgba(0,255,255,' + a + ')');

    for (let ny = 0; ny < 3; ny++) {
        for (let nx = 0; nx < 3; nx++) {
            if (note.X == nx && note.Y == ny) {
                fill('rgba(0,200,200,' + a + ')');
            } else {
                fill('rgba(0,100,100,' + a + ')');
            }
            rect(x + nx * third, y + ny * third, third, third);
        }
    }
}

function drawGridNote(x, y, s, a) {
    if (a == null)
        a = 1;

    stroke('rgba(0,255,255,' + a + ')');
    fill('rgba(0,200,200,' + a * 0.5 + ')');

    x = Math.floor(x);
    y = Math.floor(y);

    //if (strokeWidth % 2 != 0) {
    x = 0.5 + x;
    y = 0.5 + y;
    //}

    rect(x, y, s, s);
}

function drawNotes(songTime, smoothTime) {
    if (sound == null || notes.length == 0)
        return null;

    let toPass = [];

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];

        let position = note.Time / 1000 * noteSpeed;
        let songPosition = smoothTime * noteSpeed;
        let x = screenX + position - songPosition;
        let passed = songTime > note.Time / 1000; //x <= screenX;

        if (passed) {
            hitIndex = Math.max(hitIndex, i);
        } else {
            toPass.push(note);
        }

        if (x >= windowWidth)
            break;
        if (x < -50)
            continue;

        drawNote(note, x, 10, 50, passed ? 0.5 : 1);
    }

    if (hitIndex != lastHit) {
        lastHit = hitIndex;

        brightness = 64;

        if (hitSound != null && hitSound.isLoaded())
            hitSound.play();
    }

    return toPass;
}

function getCursor(songTime, last, next) {
    if (last == null)
        last = startNote;

    if (next == null)
        next = last;

    var timeDiff = (next.Time - last.Time) / 1000;
    var timePos = songTime - last.Time / 1000;

    var progress = Math.max(0, Math.min(1, timeDiff == 0 ? 1 : timePos / timeDiff));

    progress = Math.sin(progress * Math.PI / 2);

    var s = Math.sin(progress * Math.PI);

    let lx = last.X;
    let ly = last.Y;

    let nx = next.X;
    let ny = next.Y;

    var x = lx + (nx - lx) * progress;
    var y = ly + (ny - ly) * progress;

    return { X: x, Y: y, Scale: s }
}

function drawGrid(songTime, toPass) {
    let r = gridRect(gridSize);

    strokeWeight(3);
    fill(8);
    stroke(200);
    rect(r.X, r.Y, gridSize, gridSize);

    if (toPass == null || toPass.length == 0)
        return;

    let size = gridSize / 3;
    let scaledSize = size * 0.75;
    let gapSize = (size - scaledSize) / 2;

    for (let i = 0; i < toPass.length; i++) {
        let note = toPass[i];

        let left = note.Time / 1000 - songTime;
        let alpha = Math.pow(1 - Math.min(1, left / 1), 3);

        if (alpha < 0.05)
            break;

        let x = r.X + (note.X * size + gapSize);
        let y = r.Y + (note.Y * size + gapSize);

        drawGridNote(x, y, scaledSize, alpha);
    }

    if (notes.length > 0) {
        let last = notes[hitIndex];
        let next = hitIndex < notes.length - 1 ? notes[hitIndex + 1] : null;

        let c = getCursor(songTime, last, next);

        let x = r.X + (c.X * size + gapSize);
        let y = r.Y + (c.Y * size + gapSize);

        let scale = 1 + c.Scale * 0.5;
        let s = scaledSize * 0.25 * scale;

        stroke('rgba(255,255,255,1)');
        fill('rgba(200,200,200,0.5)');
        rect(x - s / 2 + scaledSize / 2, y - s / 2 + scaledSize / 2, s, s);
    }

    strokeWeight(1);
}

function draw() {
    if (bypass)
        return;

    blendMode(BLEND);

    brightness = Math.max(32, brightness - deltaTime / 1000 * 256);

    background(Math.floor(brightness));

    if (sound != null)
        sound.Tick(deltaTime / 1000);

    stroke(200);
    fill(16);
    rect(0, 0, width, 70.5);

    blendMode(LIGHTEST);

    let times = getTime();

    let toPass = drawNotes(times.Actual, times.Smooth);

    drawGrid(times.Smooth, toPass);

    stroke('rgb(255,200,0)');
    line(screenX + 0.5, 0, screenX + 0.5, 70);
}

function loadMap(text) {
    notes = [];

    let splits = text.split(',');

    let link = splits[0];
    let segments = splits.splice(1, splits.length);

    for (let i = 0; i < segments.length; i++) {
        let segment = segments[i];

        let data = segment.split('|');

        let x = 2 - data[0];
        let y = 2 - data[1];
        let ms = data[2];

        let note = new Note(x, y, ms);

        notes.push(note);
    }

    startNote = { X: 1, Y: 1, Time: 0 };

    soundLink = link;

    preload();
}

function loadClicked() {
    let container = $("#sse-menu-main")[0];
    let tbData = $("#sse-tb-data")[0];

    container.setAttribute("style", "display: none");

    hub.invoke("AttemptLoad", tbData.value);
}

function onLoadSuccess(data) {
    loadMap(data);
}
function onLoadFail() {
    let container = $("#sse-menu-main")[0];
    container.setAttribute("style", "");
}

function soundLoaded() {
    sound.Play();
}

function Note(x, y, ms) {
    this.X = x;
    this.Y = y;
    this.Time = ms;
}

window.onload = () => {
    let btnLoad = $("#sse-btn-load")[0];
    btnLoad.addEventListener("click", loadClicked);

    hub.on("LoadSuccess", onLoadSuccess);
    hub.on("LoadFail", onLoadFail);
}