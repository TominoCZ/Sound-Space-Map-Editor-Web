let hub = new signalR.HubConnectionBuilder().withAutomaticReconnect().withUrl("/MapperHub").build();
hub.start();

let notes = [];

let noteSpeed = 500;
let screenX = 300;

let lastHit = -1;
let hitIndex = -1;

let brightness = 32;

let soundLink;
let soundTime;
let sound;

let hitSound;
let clickSound;

function setup() {
    createCanvas(windowWidth, windowHeight);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mouseClicked() {

}

function keyPressed(evt) {
    if (sound == null || !evt.isTrusted)
        return;

    console.log(key);

    if (evt.key == ' ') {
        if (sound.isPaused())
            sound.play(sound.currentTime());
        else
            sound.pause();
    }
}

function preload() {
    if (soundLink == null)
        return;

    sound = loadSound(soundLink, soundLoaded);

    if (hitSound == null) {
        hitSound = loadSound("/sounds/hit.wav");
    }
    if (clickSound == null) {
        clickSound = loadSound("/sounds/click.wav");
    }
}

function drawNotes() {
    if (sound == null || notes.length == 0)
        return;

    let songTime = sound.currentTime();

    if (!sound.isPaused())
        soundTime = songTime;
    else
        songTime = soundTime;

    let third = 50 / 3;

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];

        let position = note.Time / 1000 * noteSpeed;
        let songPosition = songTime * noteSpeed;
        let x = screenX + position - songPosition;

        if (x <= screenX){
            hitIndex = Math.max(hitIndex, i);
        }

        stroke('rgb(0,255,255)');

        //rect(x, 10, 50, 50);

        for (let ny = 0; ny < 3; ny++) {
            for (let nx = 0; nx < 3; nx++) {
                if (note.X == nx && note.Y == ny) {
                    fill('rgb(0,200,200)');
                } else {
                    fill('rgb(0,100,100)');
                }
                rect(x + nx * third, 10 + ny * third, third, third);
            }
        }
    }

    if (hitIndex != lastHit){
        lastHit = hitIndex;

        brightness = 128;

        hitSound.play();
    }
}

function draw() {
    brightness = Math.max(32, brightness - deltaTime / 1000 * 512);

    background(Math.floor(brightness));

    stroke(200);
    fill(16);
    rect(0, 0, width, 70.5);

    drawNotes();

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
    container.setAttribute("style", "");
}

function soundLoaded() {
    sound.play();
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